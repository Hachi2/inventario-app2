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
  ultimaCarga: null, // { fecha, filas }

  async cargarDesdeDB() {
    this.cache = await DB.getAll("inventario");
    const meta = await DB.get("config", "ultima_carga_excel");
    this.ultimaCarga = meta ? meta.valor : null;
  },

  /* ---------------- Importar ----------------
     El Excel que sube el Coordinador/Analista SIEMPRE se
     convierte en la base de datos de trabajo: reemplaza por
     completo lo que había, para que todos (Entrada, Salida,
     Traspaso, Conteo) trabajen sobre los mismos datos. */
  async importarArchivo(file) {
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

    await DB.clear("inventario");
    await DB.bulkPut("inventario", nuevos);
    const meta = { fecha: new Date().toISOString(), filas: nuevos.length, usuario: Auth.currentUser ? Auth.currentUser.usuario : "" };
    await DB.put("config", { clave: "ultima_carga_excel", valor: meta });
    await Auditoria.registrar("Importación", null, "archivo", "-", `${nuevos.length} filas cargadas (reemplazo total)`);
    await this.cargarDesdeDB();
    return nuevos.length;
  },

  /* ---------------- Exportar ---------------- */
  filasParaExportar() {
    const encabezados = [...COLUMNAS, "STOCK FINAL"];
    return this.cache.map((item) => {
      const fila = {};
      encabezados.forEach((col) => (fila[col] = item[col] ?? ""));
      return fila;
    });
  },

  exportarExcel() {
    const hoja = XLSX.utils.json_to_sheet(this.filasParaExportar(), { header: [...COLUMNAS, "STOCK FINAL"] });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `inventario_${fecha}.xlsx`);
  },
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
