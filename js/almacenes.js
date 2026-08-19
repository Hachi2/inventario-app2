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
    // Trae primero lo que haya en la nube (por ejemplo, un almacén que
    // el Coordinador acaba de crear desde otro dispositivo) y lo mezcla
    // con lo local, antes de mostrar la lista.
    if (typeof FirebaseSync !== "undefined" && FirebaseSync.activo) {
      const remotos = await FirebaseSync.obtenerColeccion("almacenes");
      for (const { id, datos } of remotos) {
        const local = await DB.get("almacenes", id);
        if (!local) await DB.put("almacenes", { id, ...datos });
      }
    }
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
    const id = "alm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const datos = { id, nombre, fecha: new Date().toISOString() };
    await DB.put("almacenes", datos);
    await this.listar();
    if (typeof FirebaseSync !== "undefined" && FirebaseSync.activo) {
      FirebaseSync.guardarDocumento("almacenes", id, datos);
    }
    return id;
  },

  async buscarPorNombre(nombre) {
    const lista = await this.listar();
    const norm = nombre.trim().toLowerCase();
    return lista.find((a) => a.nombre.trim().toLowerCase() === norm) || null;
  },

  /* Borra un almacén completo: todas sus filas de inventario, el
     almacén en sí, y su metadata de última carga — local Y en la
     nube (si está conectada). Sin la parte de la nube, el almacén
     "resucitaría" solo la próxima vez que otro dispositivo sincronice
     y lo vuelva a traer — por eso también hay que borrarlo ahí. */
  async eliminar(id) {
    const todos = await DB.getAll("inventario");
    const filasDelAlmacen = todos.filter((it) => it._almacenId === id);
    const idsABorrar = filasDelAlmacen.map((it) => it._id);
    await DB.deleteMany("inventario", idsABorrar);
    await DB.delete("almacenes", id);
    await DB.delete("config", `ultima_carga_${id}`);
    await this.listar();
    if (this.actualId === id) {
      this.actualId = null;
      await this.actual();
    }

    if (typeof FirebaseSync !== "undefined" && FirebaseSync.activo) {
      const uids = filasDelAlmacen.map((it) => it._uid).filter(Boolean);
      FirebaseSync.eliminarLote("inventario", uids);
      FirebaseSync.eliminarDocumento("almacenes", id);
    }
  },
};
