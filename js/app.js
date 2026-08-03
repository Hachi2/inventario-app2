/* =========================================================
   app.js — arranque, navegación y wiring de eventos
   ========================================================= */

let pantallaActual = "home"; // home | auditoria | usuarios | ajustes | inventario | movimiento

function abrirModal(id) { document.getElementById(id).hidden = false; }
function cerrarModal(id) { document.getElementById(id).hidden = true; }

let toastTimer;
function mostrarToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

const TITULOS_TAB = {
  home: "Inicio",
  auditoria: "Registro de actividad",
  usuarios: "Usuarios",
  ajustes: "Ajustes",
};

function mostrarApp() {
  document.getElementById("view-login").classList.remove("active");
  document.getElementById("app-shell").hidden = false;

  document.getElementById("home-nombre").textContent = Auth.currentUser.nombre;
  document.querySelector('.nav-btn[data-tab="usuarios"]').hidden = !Auth.isGestor();

  // Un Auxiliar no gestiona Entrada ni Traspaso (afectan columnas que no puede editar)
  document.querySelector('[data-screen="entrada"]').disabled = !Auth.isGestor();
  document.querySelector('[data-screen="traspaso"]').disabled = !Auth.isGestor();

  cambiarTab("home");
  Inventario.cargarDesdeDB();
}

function cambiarTab(tab) {
  pantallaActual = tab;
  document.querySelectorAll(".tab-view, .pushed-view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(`view-${tab}`).classList.add("active");
  const navBtn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (navBtn) navBtn.classList.add("active");

  document.getElementById("btn-header-back").hidden = true;
  document.getElementById("header-logo").hidden = !document.getElementById("login-logo-img").src || document.getElementById("login-logo-img").hidden;
  Logo.aplicar(); // reafirma logo del header según corresponda
  document.getElementById("header-title").textContent = TITULOS_TAB[tab] || "";
  document.getElementById("header-subtitle").hidden = true;
  document.getElementById("header-search-row").hidden = true;
  document.getElementById("header-actions").innerHTML = "";
  document.getElementById("bottom-nav").hidden = false;
  document.getElementById("bottom-actionbar").hidden = true;

  if (tab === "auditoria") Auditoria.render();
  if (tab === "usuarios") Usuarios.render();
}

function abrirPantallaInventario() {
  pantallaActual = "inventario";
  document.querySelectorAll(".tab-view, .pushed-view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-inventario").classList.add("active");

  document.getElementById("btn-header-back").hidden = false;
  document.getElementById("header-logo").hidden = true;
  document.getElementById("header-title").textContent = "Inventario";
  document.getElementById("header-subtitle").hidden = true;
  document.getElementById("header-search-row").hidden = false;
  document.getElementById("search-input").value = "";
  document.getElementById("btn-clear-search").hidden = true;
  document.getElementById("header-actions").innerHTML = `
    <button id="btn-open-import" class="icon-btn" title="Cargar Excel" aria-label="Cargar Excel">${svgIcon("subir")}</button>
    <button id="btn-open-export" class="icon-btn" title="Descargar Excel" aria-label="Descargar Excel">${svgIcon("descargar")}</button>`;
  document.getElementById("btn-open-import").addEventListener("click", abrirModalImport);
  document.getElementById("btn-open-export").addEventListener("click", exportarInventario);

  document.getElementById("bottom-nav").hidden = true;
  document.getElementById("bottom-actionbar").hidden = true;

  Inventario.buscar("");
}

function abrirPantallaMovimiento(tipo) {
  if (!Movimientos.abrir(tipo)) return;
  pantallaActual = "movimiento";
  const cfg = MOVIMIENTOS_CONFIG[tipo];

  document.querySelectorAll(".tab-view, .pushed-view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-movimiento").classList.add("active");

  document.getElementById("btn-header-back").hidden = false;
  document.getElementById("header-logo").hidden = true;
  document.getElementById("header-title").textContent = cfg.titulo;
  const sub = document.getElementById("header-subtitle");
  sub.textContent = cfg.ayuda;
  sub.hidden = false;
  document.getElementById("header-search-row").hidden = false;
  document.getElementById("search-input").value = "";
  document.getElementById("btn-clear-search").hidden = true;
  document.getElementById("header-actions").innerHTML = "";

  document.getElementById("bottom-nav").hidden = true;
  document.getElementById("bottom-actionbar").hidden = false;
}

function volverAInicio() {
  cambiarTab("home");
}

function abrirModalImport() {
  document.getElementById("import-status").textContent = "";
  document.getElementById("import-file-input").value = "";
  abrirModal("modal-import");
}

function exportarInventario() {
  Inventario.exportarExcel();
  Auditoria.registrar("Exportación", null, "inventario", "-", "descarga Excel");
  mostrarToast("Descargando Excel…");
}

/* -------- Escaneo de código con la cámara (si el navegador lo soporta) -------- */
const Escaner = {
  stream: null,
  detector: null,
  activo: false,

  async abrir() {
    if (!("BarcodeDetector" in window)) {
      mostrarToast("Tu navegador no soporta escaneo; escribe el código a mano");
      return;
    }
    try {
      this.detector = new BarcodeDetector();
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.getElementById("scan-video");
      video.srcObject = this.stream;
      await video.play();
      abrirModal("modal-scan");
      this.activo = true;
      this._loop(video);
    } catch (err) {
      mostrarToast("No se pudo abrir la cámara");
    }
  },

  async _loop(video) {
    if (!this.activo) return;
    try {
      const codigos = await this.detector.detect(video);
      if (codigos.length > 0) {
        const valor = codigos[0].rawValue;
        document.getElementById("search-input").value = valor;
        document.getElementById("search-input").dispatchEvent(new Event("input"));
        this.cerrar();
        return;
      }
    } catch (err) { /* seguimos intentando */ }
    if (this.activo) requestAnimationFrame(() => this._loop(video));
  },

  cerrar() {
    this.activo = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    cerrarModal("modal-scan");
  },
};

async function iniciar() {
  await DB.open();
  await DB.seedIfEmpty();
  await Theme.init();

  const sesionActiva = await Auth.restoreSession();
  if (sesionActiva) mostrarApp();

  // -------- Login --------
  document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.getElementById("login-usuario").value;
    const password = document.getElementById("login-password").value;
    const resultado = await Auth.login(usuario, password);
    const errorEl = document.getElementById("login-error");
    if (!resultado.ok) {
      errorEl.textContent = resultado.error;
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    await Auditoria.registrar("Sesión", null, "login", "-", Auth.currentUser.usuario);
    document.getElementById("form-login").reset();
    mostrarApp();
  });

  // -------- Navegación inferior (tabs) --------
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => cambiarTab(btn.dataset.tab));
  });

  // -------- Tarjetas de Inicio --------
  document.querySelectorAll(".home-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pantalla = btn.dataset.screen;
      if (pantalla === "inventario") abrirPantallaInventario();
      else abrirPantallaMovimiento(pantalla);
    });
  });

  document.getElementById("btn-ayuda-inicio").addEventListener("click", () => abrirModal("modal-ayuda"));

  // -------- Botón "atrás" del encabezado --------
  document.getElementById("btn-header-back").addEventListener("click", volverAInicio);

  // -------- Búsqueda (se enruta según la pantalla activa) --------
  document.getElementById("search-input").addEventListener("input", (e) => {
    const valor = e.target.value;
    document.getElementById("btn-clear-search").hidden = !valor;
    if (pantallaActual === "inventario") Inventario.buscar(valor);
    else if (pantallaActual === "movimiento") Movimientos.buscar(valor);
  });
  document.getElementById("btn-clear-search").addEventListener("click", () => {
    const input = document.getElementById("search-input");
    input.value = "";
    input.dispatchEvent(new Event("input"));
  });
  document.getElementById("btn-scan").addEventListener("click", () => Escaner.abrir());

  // -------- Modales genéricos --------
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.close;
      if (id === "modal-scan") Escaner.cerrar(); else cerrarModal(id);
    });
  });
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        if (modal.id === "modal-scan") Escaner.cerrar(); else modal.hidden = true;
      }
    });
  });

  // -------- Importar inventario --------
  document.getElementById("btn-empty-import").addEventListener("click", abrirModalImport);
  document.getElementById("btn-confirmar-import").addEventListener("click", async () => {
    const input = document.getElementById("import-file-input");
    const status = document.getElementById("import-status");
    if (!input.files[0]) {
      status.textContent = "Selecciona un archivo primero.";
      return;
    }
    status.textContent = "Cargando…";
    try {
      const reemplazar = document.getElementById("import-replace").checked;
      const n = await Inventario.importarArchivo(input.files[0], reemplazar);
      status.textContent = `Listo: ${n} filas cargadas.`;
      mostrarToast("Inventario actualizado");
      setTimeout(() => cerrarModal("modal-import"), 700);
    } catch (err) {
      status.textContent = "Error: " + err.message;
    }
  });

  // -------- Cantidad (Entrada/Salida/Traspaso) --------
  document.getElementById("btn-confirmar-cantidad").addEventListener("click", () => Movimientos.confirmarCantidad());

  // -------- Barra inferior de acciones --------
  document.getElementById("btn-limpiar-lista").addEventListener("click", () => Movimientos.limpiarLista());
  document.getElementById("btn-finalizar").addEventListener("click", () => Movimientos.finalizar());

  // -------- Auditoría --------
  document.getElementById("btn-descargar-log").addEventListener("click", () => Auditoria.exportarExcel());
  document.getElementById("btn-borrar-log").addEventListener("click", async () => {
    if (!Auth.isCoordinador()) {
      mostrarToast("Solo el Coordinador puede borrar el registro");
      return;
    }
    if (confirm("¿Borrar todo el registro de actividad? Esta acción no se puede deshacer.")) {
      await Auditoria.limpiar();
      mostrarToast("Registro borrado");
    }
  });

  // -------- Usuarios --------
  document.getElementById("btn-nuevo-usuario").addEventListener("click", () => Usuarios.abrirNuevo());
  document.getElementById("form-usuario").addEventListener("submit", (e) => Usuarios.guardar(e));
  document.getElementById("btn-eliminar-usuario").addEventListener("click", () => Usuarios.eliminar());

  // -------- Logo de la empresa --------
  document.getElementById("logo-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await Logo.guardar(reader.result);
      mostrarToast("Logo actualizado");
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("btn-logo-como-fondo").addEventListener("click", () => Logo.usarComoFondo());
  document.getElementById("btn-quitar-logo").addEventListener("click", async () => {
    await Logo.quitar();
    mostrarToast("Logo eliminado");
  });

  // -------- Temas --------
  document.querySelectorAll(".theme-swatch").forEach((btn) => {
    btn.addEventListener("click", () => Theme.setModo(btn.dataset.theme));
  });
  document.getElementById("bg-image-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => Theme.setImagen(reader.result);
    reader.readAsDataURL(file);
  });
  document.getElementById("bg-opacity").addEventListener("input", (e) => Theme.setOpacidad(e.target.value));
  document.getElementById("btn-quitar-fondo").addEventListener("click", () => Theme.quitarImagen());

  // -------- Sesión / ajustes --------
  document.getElementById("btn-logout").addEventListener("click", async () => {
    await Auditoria.registrar("Sesión", null, "logout", "-", Auth.currentUser.usuario);
    Auth.logout();
    document.getElementById("app-shell").hidden = true;
    document.getElementById("view-login").classList.add("active");
  });

  document.getElementById("btn-cambiar-password").addEventListener("click", async () => {
    const nueva = prompt("Escribe tu nueva contraseña:");
    if (!nueva) return;
    const u = await DB.get("usuarios", Auth.currentUser.usuario);
    u.passwordHash = await Auth.hashPassword(nueva);
    await DB.put("usuarios", u);
    mostrarToast("Contraseña actualizada");
  });

  // -------- Pintar íconos estáticos que dependen de icons.js --------
  document.getElementById("btn-header-back").innerHTML = svgIcon("atras");
  document.querySelector(".search-icon").innerHTML = ICONS.buscar;
  document.getElementById("btn-clear-search").innerHTML = svgIcon("cerrar");
  document.getElementById("btn-scan").innerHTML = svgIcon("camara");
  document.querySelector('[data-close="modal-detalle"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-cantidad"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-import"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-usuario"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-ayuda"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-scan"]').innerHTML = svgIcon("cerrar");
  document.querySelector(".home-card-inventario .home-card-icon").innerHTML = svgIcon("caja");
  document.querySelector(".home-card-entrada .home-card-icon").innerHTML = svgIcon("entrada");
  document.querySelector(".home-card-salida .home-card-icon").innerHTML = svgIcon("salida");
  document.querySelector(".home-card-traspaso .home-card-icon").innerHTML = svgIcon("traspaso");
  document.querySelector("#btn-ayuda-inicio .icon").innerHTML = ICONS.ayuda;
  document.querySelector(".nav-btn[data-tab='home'] .nav-icon").innerHTML = ICONS.inicio;
  document.querySelector(".nav-btn[data-tab='auditoria'] .nav-icon").innerHTML = ICONS.lista;
  document.querySelector(".nav-btn[data-tab='usuarios'] .nav-icon").innerHTML = ICONS.usuario;
  document.querySelector(".nav-btn[data-tab='ajustes'] .nav-icon").innerHTML = ICONS.engranaje;

  // -------- Service worker (offline) --------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", iniciar);
