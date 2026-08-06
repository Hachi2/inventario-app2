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
     almacén aparte. */
  async importarArchivo(file, nombreAlmacen) {
    const nombre = (nombreAlmacen || "").trim();
    if (!nombre) throw new Error("Escribe un nombre para este almacén.");

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

    let almacen = await Almacenes.buscarPorNombre(nombre);
    const esNuevo = !almacen;
    const almacenId = almacen ? almacen.id : await Almacenes.crear(nombre);

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
      item["USUARIO"] = "";
      item["FECHA MODIFICACIÓN"] = "";
      item["_almacenId"] = almacenId;
      return item;
    }).filter((it) => it.CODIGO);

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

  /* ---------------- Exportar ---------------- */
  filasParaExportar() {
    const encabezados = [...COLUMNAS, "STOCK FINAL", "USUARIO", "FECHA MODIFICACIÓN"];
    return this.cache.map((item) => {
      const fila = {};
      encabezados.forEach((col) => (fila[col] = item[col] ?? ""));
      return fila;
    });
  },

  exportarExcel() {
    const encabezados = [...COLUMNAS, "STOCK FINAL", "USUARIO", "FECHA MODIFICACIÓN"];
    const hoja = XLSX.utils.json_to_sheet(this.filasParaExportar(), { header: encabezados });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
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
