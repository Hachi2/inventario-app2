/* =========================================================
   inventario.js — importar/exportar Excel (fuente de verdad)
   CODIGO ya no es una clave única: el mismo código puede
   repetirse en varias filas (varios lotes/stocks), tal como
   viene en el Excel.
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

/* Convierte texto de celda a número, tolerando espacios, separador de
   miles ("1,234" o "1.234") y coma decimal ("12,5"). Si no puede
   interpretarlo como número, devuelve "" (igual que una celda vacía). */
function parseNumeroLibre(valor) {
  if (valor === "" || valor == null) return "";
  if (typeof valor === "number") return valor;
  let s = String(valor).trim();
  if (s === "") return "";
  s = s.replace(/[^\d,.\-]/g, ""); // quita símbolos como "kg", "$", espacios
  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");
  if (tieneComa && tienePunto) {
    // el último símbolo es el decimal; el otro es separador de miles
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (tieneComa) {
    // solo coma: puede ser decimal (2,5 / 12,50) o miles (1,250) — si el
    // grupo final tiene 1 o 2 dígitos, se interpreta como decimal
    const partes = s.split(",");
    s = partes[partes.length - 1].length <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? "" : n;
}

const Inventario = {
  cache: [],
  ultimaCarga: null, // { fecha, filas, usuario }

  async cargarDesdeDB() {
    await Almacenes.asegurarPorDefecto();
    const almacenId = await Almacenes.actual();
    const todos = await DB.getAll("inventario");
    this.cache = almacenId ? todos.filter((it) => (it._almacenId || "default") === almacenId) : [];
    const meta = almacenId ? await DB.get("config", `ultima_carga_${almacenId}`) : null;
    this.ultimaCarga = meta ? meta.valor : null;
  },

  /* ---------------- Importar ----------------
     El Excel que sube el Coordinador/Analista se guarda bajo el
     nombre de almacén indicado. Si ese nombre ya existe, se
     reemplazan SOLO las filas de ese almacén — los demás
     almacenes no se tocan. Si es un nombre nuevo, se crea un
     almacén aparte.

     Para poder leer "cualquier" Excel (no solo uno armado a mano
     con encabezados en la fila 1), esta función:
     - revisa TODAS las hojas del archivo, no solo la primera
     - dentro de cada hoja, busca en las primeras 20 filas cuál es
       la fila real de encabezados (por si hay un título, un logo
       o filas en blanco antes de la tabla)
     - es tolerante a espacios de más, mayúsculas/minúsculas y
       números escritos como texto o con separador de miles */
  async importarArchivo(file, nombreAlmacen) {
    const nombre = (nombreAlmacen || "").trim();
    if (!nombre) throw new Error("Escribe un nombre para este almacén.");

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    const { filas, hoja, filaEncabezado } = this._detectarTablaEnLibro(wb);
    if (!filas) {
      throw new Error(
        'No encontré una columna "CODIGO" en ninguna hoja del archivo. ' +
        "Revisa que el Excel tenga una columna con ese nombre (puede llamarse CODIGO o CÓDIGO)."
      );
    }
    if (filas.length === 0) throw new Error(`La hoja "${hoja}" no tiene filas de datos debajo del encabezado.`);

    const mapaEncabezados = {};
    Object.keys(filas[0]).forEach((k) => {
      const limpio = k.toString().trim().replace(/\s+/g, " ").toUpperCase();
      mapaEncabezados[limpio] = k;
    });
    const codigoKey = mapaEncabezados["CODIGO"] || mapaEncabezados["CÓDIGO"];

    let almacen = await Almacenes.buscarPorNombre(nombre);
    const esNuevo = !almacen;
    const almacenId = almacen ? almacen.id : await Almacenes.crear(nombre);

    const nuevos = filas.map((fila) => {
      const item = {};
      COLUMNAS.forEach((col) => {
        const origKey = mapaEncabezados[col.toUpperCase()];
        let valor = origKey !== undefined ? fila[origKey] : "";
        if (COLUMNAS_NUMERICAS.includes(col)) {
          valor = parseNumeroLibre(valor);
        }
        item[col] = valor ?? "";
      });
      item["CODIGO"] = String(fila[codigoKey] ?? "").trim();
      item["STOCK FINAL"] = calcularStockFinal(item);
      item["PERSONA"] = "";
      item["DEPARTAMENTO"] = "";
      item["TRASPASO"] = "";
      item["AUTORIZADO POR"] = "";
      item["UBICACIÓN"] = "";
      item["USUARIO"] = "";
      item["FECHA MODIFICACIÓN"] = "";
      item["_almacenId"] = almacenId;
      return item;
    }).filter((it) => it.CODIGO);

    if (nuevos.length === 0) {
      throw new Error(`Encontré la columna CODIGO en la hoja "${hoja}", pero ninguna fila tiene un código escrito.`);
    }

    // Reemplaza SOLO las filas que ya pertenecían a este almacén
    const todos = await DB.getAll("inventario");
    const idsABorrar = todos.filter((it) => (it._almacenId || "default") === almacenId).map((it) => it._id);
    await DB.deleteMany("inventario", idsABorrar);
    await DB.bulkPut("inventario", nuevos);

    const meta = { fecha: new Date().toISOString(), filas: nuevos.length, usuario: Auth.currentUser ? Auth.currentUser.usuario : "" };
    await DB.put("config", { clave: `ultima_carga_${almacenId}`, valor: meta });
    await Almacenes.fijarActual(almacenId);
    await Auditoria.registrar("Importación", null, "archivo", "-", `${nuevos.length} filas cargadas en "${nombre}"${esNuevo ? " (almacén nuevo)" : " (reemplazo)"}`);
    await this.cargarDesdeDB();
    return { n: nuevos.length, nombre, esNuevo };
  },

  /* Busca, en TODAS las hojas del libro, cuál trae una fila con la
     columna CODIGO — revisando las primeras 20 filas de cada hoja por
     si hay títulos, logos o filas vacías antes de la tabla real. */
  _detectarTablaEnLibro(wb) {
    for (const nombreHoja of wb.SheetNames) {
      const hoja = wb.Sheets[nombreHoja];
      // Sin blankrows:false a propósito: así las filas en blanco se
      // mantienen como [] en su posición real, y el índice "i" que
      // encontramos acá sigue apuntando a la fila correcta cuando lo
      // reusamos abajo como punto de partida para volver a leer la hoja.
      const filasCrudas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
      const MAX_FILAS_A_REVISAR = Math.min(20, filasCrudas.length);
      for (let i = 0; i < MAX_FILAS_A_REVISAR; i++) {
        const fila = filasCrudas[i].map((c) => c.toString().trim().replace(/\s+/g, " ").toUpperCase());
        if (fila.includes("CODIGO") || fila.includes("CÓDIGO")) {
          const filas = XLSX.utils.sheet_to_json(hoja, { defval: "", range: i });
          return { filas, hoja: nombreHoja, filaEncabezado: i };
        }
      }
    }
    return { filas: null, hoja: null, filaEncabezado: -1 };
  },

  /* ---------------- Exportar ---------------- */
  filasParaExportar() {
    const encabezados = [...COLUMNAS, "STOCK FINAL", "PERSONA", "DEPARTAMENTO", "TRASPASO", "AUTORIZADO POR", "UBICACIÓN", "USUARIO", "FECHA MODIFICACIÓN"];
    return this.cache.map((item) => {
      const fila = {};
      encabezados.forEach((col) => (fila[col] = item[col] ?? ""));
      return fila;
    });
  },

  nombreHojaAlmacen() {
    const nombre = Almacenes.nombreActual() || "Inventario";
    // Los nombres de hoja de Excel no admiten : \ / ? * [ ] y tienen máximo 31 caracteres
    return nombre.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Inventario";
  },

  exportarExcel() {
    const encabezados = [...COLUMNAS, "STOCK FINAL", "PERSONA", "DEPARTAMENTO", "TRASPASO", "AUTORIZADO POR", "UBICACIÓN", "USUARIO", "FECHA MODIFICACIÓN"];
    const hoja = XLSX.utils.json_to_sheet(this.filasParaExportar(), { header: encabezados });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, this.nombreHojaAlmacen());
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreAlmacen = (Almacenes.nombreActual() || "inventario")
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    XLSX.writeFile(libro, `inventario_${nombreAlmacen}_${fecha}.xlsx`);
  },
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
