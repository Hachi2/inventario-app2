/* =========================================================
   app.js — arranque, navegación y wiring de eventos
   ========================================================= */

let pantallaActual = "home"; // home | auditoria | usuarios | ajustes | movimiento | consulta

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
  document.getElementById("home-avatar").textContent = (Auth.currentUser.nombre || "?").trim().charAt(0).toUpperCase();
  document.getElementById("home-rol-pill").textContent = Auth.currentUser.rol;
  document.querySelector('.nav-btn[data-tab="usuarios"]').hidden = !Auth.isGestor();

  // Un Auxiliar no gestiona Entrada ni Traspaso (afectan columnas que no puede editar)
  document.querySelector('[data-screen="entrada"]').disabled = !Auth.isGestor();
  document.querySelector('[data-screen="traspaso"]').disabled = !Auth.isGestor();

  cambiarTab("home");
  cargarAlmacenActual();
}

async function cargarAlmacenActual() {
  await Almacenes.listar();
  await Almacenes.actual();
  await Inventario.cargarDesdeDB();
  actualizarPillAlmacen();
  actualizarEstadoBD();
  Dashboard.render();
}

function actualizarPillAlmacen() {
  const nombre = Almacenes.nombreActual();
  document.getElementById("almacen-pill-texto").textContent = nombre
    ? `Almacén: ${nombre}`
    : (Almacenes.cacheLista.length === 0 ? "Sin almacén cargado — toca para cargar uno" : "Elige un almacén");
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
  if (tab === "ajustes") actualizarEstadoBD();
  if (tab === "home") Dashboard.render();
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

function abrirPantallaConsulta() {
  pantallaActual = "consulta";
  document.querySelectorAll(".tab-view, .pushed-view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-consulta").classList.add("active");

  document.getElementById("btn-header-back").hidden = false;
  document.getElementById("header-logo").hidden = true;
  document.getElementById("header-title").textContent = "Consulta";
  const sub = document.getElementById("header-subtitle");
  sub.textContent = "Solo consulta — no modifica nada.";
  sub.hidden = false;
  document.getElementById("header-search-row").hidden = false;
  document.getElementById("search-input").disabled = false;
  document.getElementById("search-input").value = "";
  document.getElementById("btn-clear-search").hidden = true;
  document.getElementById("header-actions").innerHTML = "";

  document.getElementById("bottom-nav").hidden = true;
  document.getElementById("bottom-actionbar").hidden = true;
  Consulta.abrir();
}

/* -------- Selector de almacén -------- */
function abrirModalAlmacenes() {
  renderListaAlmacenes();
  abrirModal("modal-almacenes");
}

function renderListaAlmacenes() {
  const cont = document.getElementById("lista-almacenes-modal");
  if (Almacenes.cacheLista.length === 0) {
    cont.innerHTML = `<p class="muted small">Todavía no hay ningún almacén cargado.</p>`;
    return;
  }
  cont.innerHTML = Almacenes.cacheLista.map((a) => `
    <div class="user-item" data-id="${a.id}" style="cursor:pointer;${a.id === Almacenes.actualId ? "border:1px solid var(--accent);" : ""}">
      <div>
        <div class="u-name">${escapeHtml(a.nombre)}</div>
        <div class="u-meta">${a.id === Almacenes.actualId ? "Almacén actual" : "Toca para usar este almacén"}</div>
      </div>
    </div>`).join("");

  cont.querySelectorAll(".user-item").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = el.dataset.id;
      if (id === Almacenes.actualId) { cerrarModal("modal-almacenes"); return; }
      await Almacenes.fijarActual(id);
      await Inventario.cargarDesdeDB();
      actualizarPillAlmacen();
      actualizarEstadoBD();
      cerrarModal("modal-almacenes");
      mostrarToast(`Ahora estás en "${Almacenes.nombreActual()}"`);
      if (pantallaActual === "consulta") Consulta.abrir();
      if (pantallaActual === "home") Dashboard.render();
    });
  });
}

function poblarDatalistAlmacenes() {
  const dl = document.getElementById("lista-almacenes");
  dl.innerHTML = Almacenes.cacheLista.map((a) => `<option value="${escapeHtml(a.nombre)}"></option>`).join("");
}

function abrirModalImport() {
  document.getElementById("import-status").textContent = "";
  document.getElementById("import-file-input").value = "";
  document.getElementById("import-almacen-nombre").value = Almacenes.nombreActual() || "";
  poblarDatalistAlmacenes();
  abrirModal("modal-import");
}

function exportarInventario() {
  if (Inventario.cache.length === 0) {
    mostrarToast("Todavía no hay inventario cargado");
    return;
  }
  Inventario.exportarExcel();
  Auditoria.registrar("Exportación", null, "inventario", "-", "descarga Excel");
  mostrarToast("Descargando Excel…");
}

async function exportarTodoExcel() {
  if (Inventario.cache.length === 0) {
    mostrarToast("Todavía no hay inventario cargado");
    return;
  }
  const libro = XLSX.utils.book_new();
  const hojaInventario = XLSX.utils.json_to_sheet(Inventario.filasParaExportar());
  XLSX.utils.book_append_sheet(libro, hojaInventario, Inventario.nombreHojaAlmacen());
  const hojaRegistro = XLSX.utils.json_to_sheet(await Auditoria.filasParaExportar());
  XLSX.utils.book_append_sheet(libro, hojaRegistro, "Registro de actividad");
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreAlmacenArchivo = (Almacenes.nombreActual() || "inventario")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  XLSX.writeFile(libro, `inventario_completo_${nombreAlmacenArchivo}_${fecha}.xlsx`);
  await Auditoria.registrar("Exportación", null, "todo", "-", "descarga Excel (inventario + registro)");
  mostrarToast("Descargando Excel…");
}

async function actualizarEstadoBD() {
  const estadoEl = document.getElementById("bd-estado");
  const almacenEl = document.getElementById("bd-almacen");
  if (!estadoEl) return;

  if (almacenEl) {
    const nombre = Almacenes.nombreActual();
    almacenEl.textContent = nombre ? `Almacén actual: ${nombre}` : "Ningún almacén cargado.";
  }

  const n = Inventario.cache.length;
  if (n === 0) {
    estadoEl.textContent = Almacenes.actualId ? "Este almacén todavía no tiene datos cargados." : "Todavía no se ha cargado ningún inventario.";
  } else {
    const meta = Inventario.ultimaCarga;
    let cuando = "";
    if (meta && meta.fecha) {
      const f = new Date(meta.fecha);
      cuando = ` · cargado el ${f.toLocaleDateString("es")} por ${meta.usuario || "—"}`;
    }
    estadoEl.textContent = `${n} fila(s) cargadas${cuando}`;
  }
  const btnCargar = document.getElementById("btn-cargar-excel");
  if (btnCargar) btnCargar.hidden = !Auth.isGestor();
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
      if (btn.dataset.screen === "consulta") abrirPantallaConsulta();
      else abrirPantallaMovimiento(btn.dataset.screen);
    });
  });

  document.getElementById("btn-ayuda-inicio").addEventListener("click", () => abrirModal("modal-ayuda"));

  // -------- Selector de almacén --------
  document.getElementById("btn-almacen-actual").addEventListener("click", abrirModalAlmacenes);
  document.getElementById("btn-cambiar-almacen-ajustes").addEventListener("click", abrirModalAlmacenes);
  document.getElementById("btn-nuevo-almacen").addEventListener("click", () => {
    cerrarModal("modal-almacenes");
    document.getElementById("import-almacen-nombre").value = "";
    document.getElementById("import-file-input").value = "";
    document.getElementById("import-status").textContent = "";
    poblarDatalistAlmacenes();
    abrirModal("modal-import");
  });

  // -------- Botón "atrás" del encabezado --------
  document.getElementById("btn-header-back").addEventListener("click", volverAInicio);

  // -------- Búsqueda (dentro de Entrada/Salida/Traspaso/Conteo) --------
  document.getElementById("search-input").addEventListener("input", (e) => {
    const valor = e.target.value;
    document.getElementById("btn-clear-search").hidden = !valor;
    if (pantallaActual === "movimiento") Movimientos.buscar(valor);
    else if (pantallaActual === "consulta") Consulta.buscar(valor);
  });
  document.getElementById("btn-clear-search").addEventListener("click", () => {
    const input = document.getElementById("search-input");
    input.value = "";
    input.dispatchEvent(new Event("input"));
  });
  document.getElementById("btn-scan").addEventListener("click", () => Escaner.abrir());

  // -------- Selector de tipo de traspaso (galpón / otro almacén) --------
  document.querySelectorAll("#traspaso-tipo-toggle .segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => Movimientos.setTraspasoModo(btn.dataset.modo));
  });

  // -------- Selector de tipo de entrada (artículo existente / mercancía nueva) --------
  document.querySelectorAll("#entrada-tipo-toggle .segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => Movimientos.setEntradaModo(btn.dataset.modo));
  });
  document.getElementById("btn-agregar-nueva").addEventListener("click", () => Movimientos.agregarMercanciaNueva());

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
  document.getElementById("btn-cargar-excel").addEventListener("click", abrirModalImport);
  document.getElementById("btn-descargar-excel").addEventListener("click", exportarInventario);
  document.getElementById("btn-exportar-todo").addEventListener("click", () => exportarTodoExcel());

  document.getElementById("btn-dashboard-exportar").addEventListener("click", () => Inventario.exportarExcel());
  document.querySelectorAll(".vista-btn").forEach((btn) => {
    btn.addEventListener("click", () => Dashboard.aplicarVista(btn.dataset.vista));
  });

  document.getElementById("btn-probar-firebase").addEventListener("click", async () => {
    const boton = document.getElementById("btn-probar-firebase");
    const estado = document.getElementById("firebase-estado");
    boton.disabled = true;
    estado.textContent = "Probando conexión…";
    estado.style.color = "";
    const resultado = await FirebaseSync.probarConexion();
    boton.disabled = false;
    estado.textContent = resultado.ok ? resultado.mensaje : `No se pudo conectar: ${resultado.error}`;
    estado.style.color = resultado.ok ? "var(--ok, #2E7D32)" : "var(--danger, #C64040)";
  });
  document.getElementById("btn-confirmar-import").addEventListener("click", async () => {
    const input = document.getElementById("import-file-input");
    const nombreInput = document.getElementById("import-almacen-nombre");
    const status = document.getElementById("import-status");
    const nombre = nombreInput.value.trim();
    if (!nombre) {
      status.textContent = "Escribe un nombre para el almacén.";
      return;
    }
    if (!input.files[0]) {
      status.textContent = "Selecciona un archivo primero.";
      return;
    }
    const existente = await Almacenes.buscarPorNombre(nombre);
    if (existente && !confirm(`Ya existe un almacén llamado "${nombre}". Esto reemplazará SOLO sus datos (los demás almacenes no se tocan). ¿Continuar?`)) {
      return;
    }
    status.textContent = "Cargando…";
    try {
      const resultado = await Inventario.importarArchivo(input.files[0], nombre);
      status.textContent = `Listo: ${resultado.n} filas cargadas en "${resultado.nombre}".`;
      mostrarToast(resultado.esNuevo ? `Almacén "${resultado.nombre}" creado` : "Inventario actualizado");
      await Almacenes.listar();
      actualizarPillAlmacen();
      actualizarEstadoBD();
      if (pantallaActual === "home") Dashboard.render();
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
  document.querySelectorAll(".paleta-swatch").forEach((btn) => {
    btn.addEventListener("click", () => Theme.setPaleta(btn.dataset.paleta));
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
  document.querySelector('[data-close="modal-cantidad"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-import"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-usuario"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-ayuda"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-scan"]').innerHTML = svgIcon("cerrar");
  document.querySelector('[data-close="modal-almacenes"]').innerHTML = svgIcon("cerrar");
  document.querySelector(".home-card-entrada .home-card-icon").innerHTML = svgIcon("entrada");
  document.querySelector(".home-card-salida .home-card-icon").innerHTML = svgIcon("salida");
  document.querySelector(".home-card-traspaso .home-card-icon").innerHTML = svgIcon("traspaso");
  document.querySelector(".home-card-conteo .home-card-icon").innerHTML = svgIcon("conteo");
  document.querySelector(".home-card-consulta .home-card-icon").innerHTML = svgIcon("buscar");
  document.getElementById("almacen-pill-icon").innerHTML = ICONS.caja;
  document.querySelector("#btn-ayuda-inicio .icon").innerHTML = ICONS.ayuda;
  document.querySelector(".nav-btn[data-tab='home'] .nav-icon").innerHTML = ICONS.inicio;
  document.querySelector(".nav-btn[data-tab='auditoria'] .nav-icon").innerHTML = ICONS.lista;
  document.querySelector(".nav-btn[data-tab='usuarios'] .nav-icon").innerHTML = ICONS.usuario;
  document.querySelector(".nav-btn[data-tab='ajustes'] .nav-icon").innerHTML = ICONS.engranaje;

  // -------- Service worker (offline + detectar actualizaciones) --------
  if ("serviceWorker" in navigator) {
    // updateViaCache: "none" evita que el navegador use una copia vieja
    // en caché del propio sw.js al revisar si hay una versión nueva.
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((registro) => {
      // Si ya había un service worker esperando (versión nueva descargada
      // en una visita anterior), avisa ahora.
      if (registro.waiting) mostrarAvisoActualizacion(registro.waiting);

      registro.addEventListener("updatefound", () => {
        const nuevo = registro.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            mostrarAvisoActualizacion(nuevo);
          }
        });
      });

      // Revisa si hay una versión nueva cada vez que la app vuelve a
      // primer plano (por ejemplo, al reabrirla desde el ícono).
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registro.update().catch(() => {});
      });
    }).catch(() => {});

    let recargando = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargando) return;
      recargando = true;
      window.location.reload();
    });
  }
}

function mostrarAvisoActualizacion(swEnEspera) {
  const banner = document.getElementById("banner-actualizacion");
  if (!banner || banner.dataset.mostrado) return;
  banner.dataset.mostrado = "1";
  banner.hidden = false;
  document.getElementById("btn-actualizar-app").addEventListener("click", () => {
    swEnEspera.postMessage({ tipo: "SKIP_WAITING" });
  });
}

document.addEventListener("DOMContentLoaded", iniciar);
