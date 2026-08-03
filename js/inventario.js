/* =========================================================
   inventario.js — importar/exportar Excel, búsqueda, edición
   ========================================================= */

const COLUMNAS = [
  "VOLUMEN MAESTRO", "VOLUMENES INTERMEDIOS", "CODIGO", "DESCRIPCIÓN",
  "VOL. INTERMEDIOS", "CANT. PZA VOL. INTERMEDIO", "TOTAL PIEZAS",
  "GALPÓN", "SISTEMA", "PEDIDO/ÍTEM", "PESO NETO", "OBSERVACIONES",
  "CONTEO", "ENTREGADO",
];
const COLUMNAS_NUMERICAS = ["CANT. PZA VOL. INTERMEDIO", "TOTAL PIEZAS", "PESO NETO", "CONTEO", "ENTREGADO"];

function normalizarTexto(s) {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularStockFinal(item) {
  const total = Number(item["TOTAL PIEZAS"]) || 0;
  const conteo = item["CONTEO"] === "" || item["CONTEO"] == null ? 0 : Number(item["CONTEO"]) || 0;
  const entregado = item["ENTREGADO"] === "" || item["ENTREGADO"] == null ? 0 : Number(item["ENTREGADO"]) || 0;
  return total - conteo - entregado;
}

const Inventario = {
  cache: [],
  filtro: "",

  async cargarDesdeDB() {
    this.cache = await DB.getAll("inventario");
    this.render();
  },

  /* ---------------- Importar ---------------- */
  async importarArchivo(file, reemplazar) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const primeraHoja = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: "" });

    if (filas.length === 0) throw new Error("El archivo no tiene filas de datos.");

    // Normaliza encabezados (tolerante a mayúsculas/espacios extra)
    const mapaEncabezados = {};
    Object.keys(filas[0]).forEach((k) => {
      const limpio = k.trim().toUpperCase();
      mapaEncabezados[limpio] = k;
    });

    const codigoKey = mapaEncabezados["CODIGO"] || mapaEncabezados["CÓDIGO"];
    if (!codigoKey) throw new Error('No se encontró la columna "CODIGO" en el archivo.');

    const nuevos = filas.map((fila) => {
      const item = {};
      COLUMNAS.forEach((col) => {
        const origKey = mapaEncabezados[col.toUpperCase()];
        let valor = origKey !== undefined ? fila[origKey] : "";
        if (COLUMNAS_NUMERICAS.includes(col)) {
          valor = valor === "" ? "" : Number(valor);
        }
        item[col] = valor ?? "";
      });
      item["CODIGO"] = String(fila[codigoKey]).trim();
      item["STOCK FINAL"] = calcularStockFinal(item);
      return item;
    }).filter((it) => it.CODIGO);

    if (reemplazar) {
      await DB.clear("inventario");
    }
    await DB.bulkPut("inventario", nuevos);
    await Auditoria.registrar("Importación", null, "archivo", "-", `${nuevos.length} filas (${reemplazar ? "reemplazo total" : "combinado"})`);
    await this.cargarDesdeDB();
    return nuevos.length;
  },

  /* ---------------- Exportar ---------------- */
  exportarExcel() {
    const encabezados = [...COLUMNAS, "STOCK FINAL"];
    const filas = this.cache.map((item) => {
      const fila = {};
      encabezados.forEach((col) => (fila[col] = item[col] ?? ""));
      return fila;
    });
    const hoja = XLSX.utils.json_to_sheet(filas, { header: encabezados });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `inventario_${fecha}.xlsx`);
  },

  /* ---------------- Búsqueda ---------------- */
  buscar(texto) {
    this.filtro = normalizarTexto(texto);
    this.render();
  },

  itemsFiltrados() {
    if (!this.filtro) return this.cache;
    return this.cache.filter((item) => {
      const concat = COLUMNAS.map((c) => item[c]).concat(item["STOCK FINAL"]).join(" ");
      return normalizarTexto(concat).includes(this.filtro);
    });
  },

  /* ---------------- Render lista ---------------- */
  render() {
    const lista = document.getElementById("lista-inventario");
    const vacio = document.getElementById("empty-state");
    const items = this.itemsFiltrados();

    const subtitulo = document.getElementById("header-subtitle");
    if (subtitulo && pantallaActual === "inventario") {
      if (this.cache.length === 0) {
        subtitulo.hidden = true;
      } else {
        subtitulo.textContent = `${items.length} de ${this.cache.length} ítems`;
        subtitulo.hidden = false;
      }
    }

    if (this.cache.length === 0) {
      vacio.hidden = false;
      lista.innerHTML = "";
      return;
    }
    vacio.hidden = true;

    lista.innerHTML = items.map((item) => this._cardHTML(item)).join("") ||
      `<p class="muted small" style="text-align:center;margin-top:30px;">Sin coincidencias para tu búsqueda.</p>`;

    lista.querySelectorAll(".item-card").forEach((el) => {
      el.addEventListener("click", () => this.abrirDetalle(el.dataset.codigo));
    });
  },

  _estadoStock(item) {
    const total = Number(item["TOTAL PIEZAS"]) || 0;
    const entregado = item["ENTREGADO"] === "" ? 0 : Number(item["ENTREGADO"]) || 0;
    const conteo = item["CONTEO"];
    const stock = item["STOCK FINAL"];

    if (stock < 0) return { clase: "stock-bad", label: `Stock ${stock}` };
    if (conteo !== "" && conteo != null && Number(conteo) !== total - entregado) {
      return { clase: "stock-warn", label: `Stock ${stock} · revisar conteo` };
    }
    return { clase: "stock-ok", label: `Stock ${stock}` };
  },

  _cardHTML(item) {
    const estado = this._estadoStock(item);
    const etiquetas = [item["GALPÓN"], item["SISTEMA"]].filter(Boolean).join(" · ");
    return `
      <div class="item-card" data-codigo="${escapeHtml(item.CODIGO)}">
        <div class="item-card-main">
          <div class="item-nombre">${escapeHtml(item["DESCRIPCIÓN"] || item.CODIGO)}</div>
          <div class="item-sub">${escapeHtml(item.CODIGO)}${etiquetas ? " · " + escapeHtml(etiquetas) : ""}</div>
        </div>
        <div class="item-card-side">
          <span class="stock-pill ${estado.clase}">${estado.label}</span>
        </div>
      </div>`;
  },

  /* ---------------- Detalle / edición ---------------- */
  abrirDetalle(codigo) {
    const item = this.cache.find((i) => i.CODIGO === codigo);
    if (!item) return;
    document.getElementById("detalle-titulo").textContent = `${item.CODIGO}`;
    document.getElementById("detalle-body").innerHTML = this._detalleHTML(item);
    document.getElementById("detalle-body").querySelectorAll("[data-campo]").forEach((input) => {
      input.addEventListener("change", (e) => this._guardarCampo(codigo, e.target.dataset.campo, e.target.value));
    });
    abrirModal("modal-detalle");
  },

  _detalleHTML(item) {
    const filas = COLUMNAS.map((col) => {
      const editable = Auth.puedeEditarCampo(col);
      const valor = item[col] ?? "";
      if (editable) {
        const esNumero = COLUMNAS_NUMERICAS.includes(col) && col !== "OBSERVACIONES";
        const tipo = col === "OBSERVACIONES" ? "textarea" : (esNumero ? "number" : "text");
        const campoId = `campo-${col.replace(/[^a-zA-Z0-9]/g, "")}`;
        const control = tipo === "textarea"
          ? `<textarea id="${campoId}" data-campo="${col}" rows="2">${escapeHtml(valor)}</textarea>`
          : `<input id="${campoId}" data-campo="${col}" type="${tipo}" value="${escapeHtml(valor)}">`;
        return `<label class="field"><span>${col} <span class="editable-badge">editable</span></span>${control}</label>`;
      }
      return `<div class="ro-field"><div class="label">${col}</div><div class="value">${escapeHtml(valor) || "—"}</div></div>`;
    }).join("");

    return filas + `
      <div class="ro-field" style="margin-top:6px;border-top:1px solid var(--border);padding-top:10px;">
        <div class="label">STOCK FINAL (calculado)</div>
        <div class="value" style="font-weight:700;font-size:16px;" id="stock-final-preview">${item["STOCK FINAL"]}</div>
      </div>`;
  },

  async _guardarCampo(codigo, campo, valorNuevo) {
    const item = this.cache.find((i) => i.CODIGO === codigo);
    if (!item) return;
    const valorAnterior = item[campo];
    const esNumero = COLUMNAS_NUMERICAS.includes(campo);
    item[campo] = esNumero ? (valorNuevo === "" ? "" : Number(valorNuevo)) : valorNuevo;
    item["STOCK FINAL"] = calcularStockFinal(item);

    await DB.put("inventario", item);
    await Auditoria.registrar("Edición", codigo, campo, valorAnterior, item[campo]);

    const preview = document.getElementById("stock-final-preview");
    if (preview) preview.textContent = item["STOCK FINAL"];
    this.render();
    mostrarToast("Cambio guardado");
  },
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
