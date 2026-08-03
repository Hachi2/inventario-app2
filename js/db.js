/* =========================================================
   db.js — capa de almacenamiento local (IndexedDB)
   Todo lo que la app necesita vive en el propio teléfono/PC,
   por eso funciona sin conexión.

   Tablas (object stores):
   - inventario  (key: CODIGO)
   - usuarios    (key: usuario)
   - auditoria   (key autoincrement)
   - config      (key: nombre de la config)
   ========================================================= */

const DB_NAME = "InventarioOfflineDB";
const DB_VERSION = 1;

const DB = {
  _db: null,

  async open() {
    if (this._db) return this._db;
    this._db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("inventario")) {
          db.createObjectStore("inventario", { keyPath: "CODIGO" });
        }
        if (!db.objectStoreNames.contains("usuarios")) {
          db.createObjectStore("usuarios", { keyPath: "usuario" });
        }
        if (!db.objectStoreNames.contains("auditoria")) {
          db.createObjectStore("auditoria", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("config")) {
          db.createObjectStore("config", { keyPath: "clave" });
        }
      };

      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return this._db;
  },

  async _tx(storeName, mode) {
    const db = await this.open();
    return db.transaction(storeName, mode).objectStore(storeName);
  },

  async getAll(storeName) {
    const store = await this._tx(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, key) {
    const store = await this._tx(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, value) {
    const store = await this._tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, key) {
    const store = await this._tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(storeName) {
    const store = await this._tx(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async bulkPut(storeName, values) {
    const db = await this.open();
    const store = db.transaction(storeName, "readwrite").objectStore(storeName);
    return new Promise((resolve, reject) => {
      values.forEach((v) => store.put(v));
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = (e) => reject(e.target.error);
    });
  },

  /* Sembrado inicial: usuario admin por defecto si la BD está vacía */
  async seedIfEmpty() {
    const usuarios = await this.getAll("usuarios");
    if (usuarios.length === 0) {
      const hash = await Auth.hashPassword("admin123");
      await this.put("usuarios", {
        usuario: "admin",
        nombre: "Administrador",
        rol: "Coordinador",
        passwordHash: hash,
      });
    }
  },
};
