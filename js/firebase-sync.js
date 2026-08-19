/* =========================================================
   firebase-sync.js — sincronización en la nube entre dispositivos
   (Firestore + Authentication), con caché y trabajo offline
   incorporados por la propia librería de Firebase.

   ESTADO: configuración real ya cargada (proyecto
   "inventario-almacen2"), pero la app TODAVÍA sigue trabajando
   con IndexedDB como siempre — esto es Fase 2 del plan
   (ver ARQUITECTURA_SYNC.md): solo se conecta y se puede probar
   la conexión desde Ajustes. Ni el login ni los datos reales se
   tocan todavía, para no arriesgar la app que ya estás usando.
   ========================================================= */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAGYa3CdFOQtNePJplcCfvZDe3wSIuYRwo",
  authDomain: "inventario-almacen2.firebaseapp.com",
  projectId: "inventario-almacen2",
  storageBucket: "inventario-almacen2.firebasestorage.app",
  messagingSenderId: "324783017909",
  appId: "1:324783017909:web:d5bc36e4d84a47787e93fc",
};

const FirebaseSync = {
  activo: Object.keys(FIREBASE_CONFIG).length > 0,
  db: null,
  auth: null,
  _iniciado: false,

  async iniciar() {
    if (!this.activo || this._iniciado) return this._iniciado;

    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
      const { initializeFirestore } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");

      const app = initializeApp(FIREBASE_CONFIG);

      // Persistencia offline: Firestore guarda una copia local y sigue
      // funcionando sin conexión, sincronizando solo cuando vuelve la
      // señal — es la pieza clave para que esto no rompa el "sin
      // internet" que ya tiene la app.
      this.db = initializeFirestore(app, { localCache: { kind: "persistent" } });
      this.auth = getAuth(app);

      // Las reglas de Firestore exigen "estar autenticado" para poder
      // leer/escribir. Como todavía NO migramos el login real de la app
      // a Firebase Authentication (eso es la Fase 5), cada dispositivo
      // inicia sesión de forma anónima —  sin pedirle nada a nadie — solo
      // para que la nube lo deje leer y escribir. Esto es lo que faltaba
      // y por eso nada se estaba sincronizando todavía: las reglas
      // rechazaban en silencio cada intento (quedaba solo en la consola).
      await signInAnonymously(this.auth);

      this._iniciado = true;
      return true;
    } catch (err) {
      console.error("No se pudo iniciar Firebase:", err);
      return false;
    }
  },

  /* Escribe y vuelve a leer un documento de prueba, para confirmar
     desde la propia app (Ajustes → Sincronización en la nube) que el
     proyecto de Firebase está bien conectado, antes de que dependamos
     de él para datos reales. No usa datos sensibles. */
  async probarConexion() {
    const listo = await this.iniciar();
    if (!listo) return { ok: false, error: "No se pudo inicializar Firebase (revisa la configuración)." };

    try {
      const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      const ref = doc(this.db, "_diagnostico", "ping");
      const ahora = new Date().toISOString();
      await setDoc(ref, { ultimaPrueba: ahora, origen: navigator.userAgent.slice(0, 60) });
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().ultimaPrueba === ahora) {
        return { ok: true, mensaje: `Conectado — escritura y lectura confirmadas (${ahora}).` };
      }
      return { ok: false, error: "Se pudo escribir pero la lectura no coincidió. Revisa las reglas de Firestore." };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  },

  /* Suma o resta una cantidad a un campo numérico de forma atómica —
     así, si dos personas registran una Salida del mismo artículo casi
     al mismo tiempo estando ambas sin señal, al sincronizar se suman
     las dos en vez de que una tape a la otra. Se usa en vez de
     "leer -> sumar en el navegador -> guardar" para los campos
     TOTAL PIEZAS, CONTEO y ENTREGADO. Todavía no está conectada a
     movimientos.js — es la pieza que se activa en la Fase 3. */
  async incrementarCampo(coleccion, docId, campo, delta) {
    const { doc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
    await updateDoc(doc(this.db, coleccion, docId), { [campo]: increment(delta) });
  },

  /* ---- Fase 3: helpers genéricos de sincronización ----
     Todos "fallan en silencio" (devuelven false / no hacen nada) si
     Firebase no está activo o si algo sale mal — la app SIEMPRE debe
     poder seguir trabajando con la copia local aunque la nube falle. */

  async guardarDocumento(coleccion, id, datos) {
    if (!this.activo) return false;
    try {
      const listo = await this.iniciar();
      if (!listo) return false;
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      await setDoc(doc(this.db, coleccion, id), datos, { merge: true });
      return true;
    } catch (err) {
      console.warn(`No se pudo sincronizar con la nube (${coleccion}/${id}):`, err.message || err);
      return false;
    }
  },

  /* Escribe varios documentos de una sola vez (por ejemplo, todas las
     filas de un Excel recién cargado). Se parte en grupos de 450
     porque Firestore no permite más de 500 escrituras por lote. */
  async guardarLote(coleccion, documentosConId) {
    if (!this.activo || documentosConId.length === 0) return false;
    try {
      const listo = await this.iniciar();
      if (!listo) return false;
      const { doc, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      for (let i = 0; i < documentosConId.length; i += 450) {
        const grupo = documentosConId.slice(i, i + 450);
        const lote = writeBatch(this.db);
        grupo.forEach(({ id, datos }) => lote.set(doc(this.db, coleccion, id), datos, { merge: true }));
        await lote.commit();
      }
      return true;
    } catch (err) {
      console.warn(`No se pudo sincronizar el lote con la nube (${coleccion}):`, err.message || err);
      return false;
    }
  },

  /* Trae, de una sola vez, todos los documentos de una colección que
     cumplan con un valor de campo (ej. todas las filas de inventario
     de un almacén). Se usa al entrar a un almacén, para traer lo que
     hayan cargado otros dispositivos. */
  async obtenerPorCampo(coleccion, campo, valor) {
    if (!this.activo) return [];
    try {
      const listo = await this.iniciar();
      if (!listo) return [];
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      const q = query(collection(this.db, coleccion), where(campo, "==", valor));
      const snap = await getDocs(q);
      const filas = [];
      snap.forEach((d) => filas.push({ id: d.id, datos: d.data() }));
      return filas;
    } catch (err) {
      console.warn(`No se pudo leer de la nube (${coleccion}):`, err.message || err);
      return [];
    }
  },

  async obtenerColeccion(coleccion) {
    if (!this.activo) return [];
    try {
      const listo = await this.iniciar();
      if (!listo) return [];
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      const snap = await getDocs(collection(this.db, coleccion));
      const filas = [];
      snap.forEach((d) => filas.push({ id: d.id, datos: d.data() }));
      return filas;
    } catch (err) {
      console.warn(`No se pudo leer de la nube (${coleccion}):`, err.message || err);
      return [];
    }
  },

  async eliminarDocumento(coleccion, id) {
    if (!this.activo) return false;
    try {
      const listo = await this.iniciar();
      if (!listo) return false;
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      await deleteDoc(doc(this.db, coleccion, id));
      return true;
    } catch (err) {
      console.warn(`No se pudo borrar de la nube (${coleccion}/${id}):`, err.message || err);
      return false;
    }
  },

  /* Borra varios documentos de una nube de una sola vez (por ejemplo,
     todas las filas de un almacén que se está eliminando). Igual que
     guardarLote, en grupos de 450 por el límite de Firestore. */
  async eliminarLote(coleccion, ids) {
    if (!this.activo || ids.length === 0) return false;
    try {
      const listo = await this.iniciar();
      if (!listo) return false;
      const { doc, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      for (let i = 0; i < ids.length; i += 450) {
        const grupo = ids.slice(i, i + 450);
        const lote = writeBatch(this.db);
        grupo.forEach((id) => lote.delete(doc(this.db, coleccion, id)));
        await lote.commit();
      }
      return true;
    } catch (err) {
      console.warn(`No se pudo borrar el lote de la nube (${coleccion}):`, err.message || err);
      return false;
    }
  },

  /* Escucha cambios en tiempo real de un almacén — así, cuando el
     Coordinador carga o modifica algo, el resto de los dispositivos
     conectados lo ven aparecer solos, sin recargar la página.
     Devuelve una función para dejar de escuchar (se llama al cambiar
     de almacén o de pantalla, para no acumular escuchas de más). */
  async escucharPorCampo(coleccion, campo, valor, callback) {
    if (!this.activo) return () => {};
    try {
      const listo = await this.iniciar();
      if (!listo) return () => {};
      const { collection, query, where, onSnapshot } =
        await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
      const q = query(collection(this.db, coleccion), where(campo, "==", valor));
      return onSnapshot(q, (snap) => {
        // Se ignoran los cambios que salieron de este mismo dispositivo
        // (fromCache/hasPendingWrites) para no procesar nuestro propio eco.
        const filas = [];
        snap.docChanges().forEach((c) => {
          if (c.doc.metadata.hasPendingWrites) return;
          filas.push({ id: c.doc.id, datos: c.doc.data(), tipo: c.type });
        });
        if (filas.length > 0) callback(filas);
      }, (err) => console.warn(`Escucha en tiempo real interrumpida (${coleccion}):`, err.message || err));
    } catch (err) {
      console.warn(`No se pudo escuchar cambios en la nube (${coleccion}):`, err.message || err);
      return () => {};
    }
  },
};

