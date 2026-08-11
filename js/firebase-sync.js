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
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");

      const app = initializeApp(FIREBASE_CONFIG);

      // Persistencia offline: Firestore guarda una copia local y sigue
      // funcionando sin conexión, sincronizando solo cuando vuelve la
      // señal — es la pieza clave para que esto no rompa el "sin
      // internet" que ya tiene la app.
      this.db = initializeFirestore(app, { localCache: { kind: "persistent" } });
      this.auth = getAuth(app);
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

  /* Escucha cambios en tiempo real de un almacén — así, cuando el
     Coordinador carga o modifica algo, el resto de los dispositivos
     conectados lo ven aparecer solos, sin recargar la página. Pendiente
     de la Fase 3 (migrar db.js). */
  escucharAlmacen(almacenId, callback) {
    // Implementación pendiente — el diseño ya está definido
    // (ver ARQUITECTURA_SYNC.md), falta conectarlo a la app real.
  },
};

