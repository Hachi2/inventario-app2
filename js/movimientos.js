/* =========================================================
   movimientos.js — Entrada de almacén, Salida de almacén
   y Traspaso. Comparten una misma pantalla: se busca un
   artículo, se indica una cantidad, se arma una lista de
   trabajo y al presionar "Finalizar" se aplica todo junto.

   Nota importante: cada CODIGO vive en un único GALPÓN en esta
   versión (no se maneja stock partido por ubicación). Por eso
   un "Traspaso" mueve el artículo completo de un galpón a otro,
   no reparte cantidades entre dos galpones distintos.
   ========================================================= */

const MOVIMIENTOS_CONFIG = {
  entrada: {
    titulo: "Entrada de almacén",
    ayuda: "Busca el artículo que llegó e indica cuánto entró.",
    campo: "TOTAL PIEZAS",
    etiquetaCantidad: "Cantidad que entra",
    accion: "Entrada",
    soloGestor: true,
  },
  salida: {
    titulo: "Salida de almacén",
    ayuda: "Busca el artículo que sale e indica cuánto se entrega.",
    campo: "ENTREGADO",
    etiquetaCantidad: "Cantidad que sale",
    accion: "Salida",
    soloGestor: false,
  },
  traspaso: {
    titulo: "Traspaso entre galpones",
    ayuda: "Busca el artículo, indica a qué galpón se mueve y la cantidad de referencia.",
    campo: "GALPÓN",
    etiquetaCantidad: "Cantidad que se traspasa",
    accion: "Traspaso",
    soloGestor: true,
  },
};

const Movimientos = {
  tipoActual: null,
  carrito: [],
  itemPendiente: null,

  permitido(tipo) {
    const cfg = MOVIMIENTOS_CONFIG[tipo];
    if (!cfg) return false;
    return cfg.soloGestor ? Auth.isGestor() : true;
  },

  abrir(tipo) {
    if (!this.permitido(tipo)) {
      mostrarToast("Tu rol no tiene acceso a esta opción");
      return false;
    }
    this.tipoActual = tipo;
    this.carrito = [];
    document.getElementById("mov-destino-wrap").hidden = tipo !== "traspaso";
    document.getElementById("mov-destino-galpon").value = "";
    document.getElementById("mov-sugerencias").innerHTML = "";
    this.render();
    return true;
  },

  buscar(texto) {
    const cont = document.getElementById("mov-sugerencias");
    const q = normalizarTexto(texto);
    if (!q) {
      cont.innerHTML = "";
      return;
    }
    const resultados = Inventario.cache
      .filter((item) => normalizarTexto(item.CODIGO + " " + item["DESCRIPCIÓN"]).includes(q))
      .slice(0, 6);

    if (resultados.length === 0) {
      cont.innerHTML = `<p class="muted small" style="padding:6px 2px;">Sin coincidencias.</p>`;
      return;
    }
    cont.innerHTML = resultados.map((item) => `
      <div class="suggestion-item" data-codigo="${escapeHtml(item.CODIGO)}">
        <div class="s-info">
          <div class="s-nombre">${escapeHtml(item["DESCRIPCIÓN"] || item.CODIGO)}</div>
          <div class="s-codigo">${escapeHtml(item.CODIGO)} · ${escapeHtml(item["GALPÓN"] || "")}</div>
        </div>
        <button class="btn-agregar">Agregar</button>
      </div>`).join("");

    cont.querySelectorAll(".suggestion-item").forEach((el) => {
      el.querySelector(".btn-agregar").addEventListener("click", () => this.pedirCantidad(el.dataset.codigo));
    });
  },

  pedirCantidad(codigo) {
    const item = Inventario.cache.find((i) => i.CODIGO === codigo);
    if (!item) return;
    this.itemPendiente = item;
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];
    document.getElementById("cantidad-titulo").textContent = item["DESCRIPCIÓN"] || item.CODIGO;
    document.getElementById("cantidad-item-desc").textContent = `${item.CODIGO} · Stock actual: ${item["STOCK FINAL"]}`;
    document.getElementById("cantidad-label").textContent = cfg.etiquetaCantidad;
    document.getElementById("cantidad-input").value = "";
    abrirModal("modal-cantidad");
    setTimeout(() => document.getElementById("cantidad-input").focus(), 200);
  },

  confirmarCantidad() {
    const cantidad = Number(document.getElementById("cantidad-input").value);
    if (!cantidad || cantidad <= 0) {
      mostrarToast("Escribe una cantidad válida");
      return;
    }
    if (this.tipoActual === "traspaso") {
      const destino = document.getElementById("mov-destino-galpon").value.trim();
      if (!destino) {
        mostrarToast("Indica el galpón de destino");
        return;
      }
      this._agregarACarrito(this.itemPendiente, cantidad, destino);
    } else {
      this._agregarACarrito(this.itemPendiente, cantidad);
    }
    cerrarModal("modal-cantidad");
    document.getElementById("search-input").value = "";
    document.getElementById("mov-sugerencias").innerHTML = "";
  },

  _agregarACarrito(item, cantidad, destino) {
    const existente = this.carrito.find((l) => l.codigo === item.CODIGO);
    if (existente) {
      existente.cantidad += cantidad;
      if (destino) existente.destino = destino;
    } else {
      this.carrito.push({
        codigo: item.CODIGO,
        descripcion: item["DESCRIPCIÓN"] || item.CODIGO,
        cantidad,
        destino,
      });
    }
    this.render();
    mostrarToast("Agregado a la lista");
  },

  quitarLinea(codigo) {
    this.carrito = this.carrito.filter((l) => l.codigo !== codigo);
    this.render();
  },

  limpiarLista() {
    if (this.carrito.length === 0) return;
    if (confirm("¿Vaciar la lista de trabajo? No se aplicará ningún cambio.")) {
      this.carrito = [];
      this.render();
    }
  },

  render() {
    const cont = document.getElementById("mov-lista-trabajo");
    const vacio = document.getElementById("mov-vacio");
    const contador = document.getElementById("mov-contador");

    contador.textContent = this.carrito.length ? `${this.carrito.length} artículo(s)` : "";
    vacio.hidden = this.carrito.length !== 0;

    cont.innerHTML = this.carrito.map((linea) => `
      <div class="item-card" style="cursor:default;">
        <div class="item-card-main">
          <div class="item-cantidad">${linea.cantidad}</div>
          <div class="item-nombre">${escapeHtml(linea.descripcion)}</div>
          <div class="item-sub">${escapeHtml(linea.codigo)}${linea.destino ? " → " + escapeHtml(linea.destino) : ""}</div>
        </div>
        <div class="item-card-side">
          <button class="trash-btn" data-codigo="${escapeHtml(linea.codigo)}" aria-label="Quitar">${svgIcon("papelera")}</button>
        </div>
      </div>`).join("");

    cont.querySelectorAll(".trash-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.quitarLinea(btn.dataset.codigo));
    });
  },

  async finalizar() {
    if (this.carrito.length === 0) {
      mostrarToast("Agrega al menos un artículo a la lista");
      return;
    }
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];
    const actualizados = [];

    for (const linea of this.carrito) {
      const item = Inventario.cache.find((i) => i.CODIGO === linea.codigo);
      if (!item) continue;

      if (this.tipoActual === "entrada") {
        const antes = Number(item["TOTAL PIEZAS"]) || 0;
        item["TOTAL PIEZAS"] = antes + linea.cantidad;
        item["STOCK FINAL"] = calcularStockFinal(item);
        await Auditoria.registrar("Entrada", item.CODIGO, "TOTAL PIEZAS", antes, item["TOTAL PIEZAS"]);
      } else if (this.tipoActual === "salida") {
        const antes = item["ENTREGADO"] === "" || item["ENTREGADO"] == null ? 0 : Number(item["ENTREGADO"]);
        item["ENTREGADO"] = antes + linea.cantidad;
        item["STOCK FINAL"] = calcularStockFinal(item);
        await Auditoria.registrar("Salida", item.CODIGO, "ENTREGADO", antes, item["ENTREGADO"]);
      } else if (this.tipoActual === "traspaso") {
        const antes = item["GALPÓN"];
        item["GALPÓN"] = linea.destino;
        await Auditoria.registrar("Traspaso", item.CODIGO, "GALPÓN", antes, `${linea.destino} (${linea.cantidad} uds)`);
      }
      actualizados.push(item);
    }

    await DB.bulkPut("inventario", actualizados);
    await Inventario.cargarDesdeDB();
    this.carrito = [];
    this.render();
    mostrarToast(`${cfg.accion} registrada`);
    volverAInicio();
  },
};
