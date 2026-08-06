/* =========================================================
   almacenes.js — varias bases de datos independientes
   Cada Excel que se carga queda guardado bajo el nombre de
   "almacén" que se le da, sin mezclarse ni pisar los datos de
   los demás. Toda la app (búsqueda, Entrada, Salida, Traspaso,
   Conteo, Consulta) trabaja siempre sobre el almacén elegido.
   ========================================================= */

const Almacenes = {
  actualId: null,
  cacheLista: [],

  async listar() {
    this.cacheLista = await DB.getAll("almacenes");
    this.cacheLista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return this.cacheLista;
  },

  // Si hay filas de una versión anterior (sin _almacenId), las agrupa
  // bajo un almacén llamado "Almacén principal" para no perderlas.
  async asegurarPorDefecto() {
    const todos = await DB.getAll("inventario");
    const huerfanas = todos.filter((it) => !it._almacenId);
    if (huerfanas.length === 0) return;
    const existe = await DB.get("almacenes", "default");
    if (!existe) {
      await DB.put("almacenes", { id: "default", nombre: "Almacén principal", fecha: new Date().toISOString() });
    }
    for (const it of huerfanas) {
      it._almacenId = "default";
      await DB.put("inventario", it);
    }
  },

  async actual() {
    if (this.actualId) return this.actualId;
    const cfg = await DB.get("config", "almacen_actual");
    const lista = await this.listar();
    if (cfg && cfg.valor && lista.some((a) => a.id === cfg.valor)) {
      this.actualId = cfg.valor;
      return this.actualId;
    }
    if (lista.length > 0) {
      this.actualId = lista[0].id;
      return this.actualId;
    }
    return null;
  },

  nombreActual() {
    const a = this.cacheLista.find((x) => x.id === this.actualId);
    return a ? a.nombre : "";
  },

  async fijarActual(id) {
    this.actualId = id;
    await DB.put("config", { clave: "almacen_actual", valor: id });
  },

  async crear(nombre) {
    const id = "alm_" + Date.now();
    await DB.put("almacenes", { id, nombre, fecha: new Date().toISOString() });
    await this.listar();
    return id;
  },

  async buscarPorNombre(nombre) {
    const lista = await this.listar();
    const norm = nombre.trim().toLowerCase();
    return lista.find((a) => a.nombre.trim().toLowerCase() === norm) || null;
  },

  async eliminar(id) {
    const todos = await DB.getAll("inventario");
    const idsABorrar = todos.filter((it) => it._almacenId === id).map((it) => it._id);
    await DB.deleteMany("inventario", idsABorrar);
    await DB.delete("almacenes", id);
    await DB.delete("config", `ultima_carga_${id}`);
    await this.listar();
    if (this.actualId === id) {
      this.actualId = null;
      await this.actual();
    }
  },
};
