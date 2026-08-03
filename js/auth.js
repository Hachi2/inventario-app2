/* =========================================================
   auth.js — inicio de sesión, roles y hash de contraseñas
   Las contraseñas nunca se guardan en texto plano: se
   guarda un hash SHA-256 calculado en el propio dispositivo
   (funciona sin conexión, no depende de ningún servidor).
   ========================================================= */

const Auth = {
  currentUser: null, // { usuario, nombre, rol }

  async hashPassword(plain) {
    const enc = new TextEncoder().encode(plain);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  },

  async login(usuario, password) {
    const registro = await DB.get("usuarios", usuario.trim());
    if (!registro) return { ok: false, error: "Usuario o contraseña incorrectos." };
    const hash = await this.hashPassword(password);
    if (hash !== registro.passwordHash) {
      return { ok: false, error: "Usuario o contraseña incorrectos." };
    }
    this.currentUser = { usuario: registro.usuario, nombre: registro.nombre, rol: registro.rol };
    sessionStorage.setItem("sesion_usuario", registro.usuario);
    return { ok: true };
  },

  async restoreSession() {
    const usuario = sessionStorage.getItem("sesion_usuario");
    if (!usuario) return false;
    const registro = await DB.get("usuarios", usuario);
    if (!registro) return false;
    this.currentUser = { usuario: registro.usuario, nombre: registro.nombre, rol: registro.rol };
    return true;
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem("sesion_usuario");
  },

  isGestor() {
    // Coordinador y Analista tienen acceso total
    return this.currentUser && (this.currentUser.rol === "Coordinador" || this.currentUser.rol === "Analista");
  },

  isCoordinador() {
    return this.currentUser && this.currentUser.rol === "Coordinador";
  },

  // Campos del inventario que un Auxiliar puede editar
  camposEditablesAuxiliar: ["CONTEO", "ENTREGADO", "OBSERVACIONES"],

  puedeEditarCampo(campo) {
    if (!this.currentUser) return false;
    if (this.isGestor()) return true;
    return this.camposEditablesAuxiliar.includes(campo);
  },
};
