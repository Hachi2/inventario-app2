/* =========================================================
   theme.js — claro / oscuro / imagen de fondo + logo de marca
   Todo se guarda en IndexedDB (store "config"), así que
   persiste sin conexión y no depende de ningún servidor.
   ========================================================= */

const Theme = {
  async init() {
    const modo = await DB.get("config", "tema_modo");
    const imagen = await DB.get("config", "tema_imagen");
    const opacidad = await DB.get("config", "tema_opacidad");
    const paleta = await DB.get("config", "paleta");

    const modoActual = modo ? modo.valor : "light";
    document.body.setAttribute("data-theme", modoActual);
    document.body.setAttribute("data-paleta", paleta ? paleta.valor : "ambar");

    if (imagen && imagen.valor) {
      document.body.style.setProperty("--bg-image", `url(${imagen.valor})`);
    }
    if (opacidad) {
      document.body.style.setProperty("--bg-opacity", (opacidad.valor / 100).toString());
      document.getElementById("bg-opacity").value = opacidad.valor;
      document.getElementById("bg-opacity-value").textContent = opacidad.valor + "%";
    }

    this._marcarActivo(modoActual);
    this._marcarPaletaActiva(paleta ? paleta.valor : "ambar");
    if (modoActual === "image") {
      document.getElementById("bg-image-controls").hidden = false;
    }

    await Logo.aplicar();
  },

  _marcarActivo(modo) {
    document.querySelectorAll(".theme-swatch").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === modo);
    });
  },

  _marcarPaletaActiva(paleta) {
    document.querySelectorAll(".paleta-swatch").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.paleta === paleta);
    });
  },

  async setPaleta(paleta) {
    document.body.setAttribute("data-paleta", paleta);
    await DB.put("config", { clave: "paleta", valor: paleta });
    this._marcarPaletaActiva(paleta);
    if (typeof Dashboard !== "undefined") Dashboard.render();
    mostrarToast("Paleta de colores actualizada");
  },

  async setModo(modo) {
    document.body.setAttribute("data-theme", modo);
    await DB.put("config", { clave: "tema_modo", valor: modo });
    this._marcarActivo(modo);
    document.getElementById("bg-image-controls").hidden = modo !== "image";
    if (typeof Dashboard !== "undefined") Dashboard.render();
  },

  async setImagen(base64) {
    await DB.put("config", { clave: "tema_imagen", valor: base64 });
    document.body.style.setProperty("--bg-image", `url(${base64})`);
    await this.setModo("image");
  },

  async quitarImagen() {
    await DB.delete("config", "tema_imagen");
    document.body.style.removeProperty("--bg-image");
    await this.setModo("light");
  },

  async setOpacidad(valor) {
    await DB.put("config", { clave: "tema_opacidad", valor: Number(valor) });
    document.body.style.setProperty("--bg-opacity", (valor / 100).toString());
    document.getElementById("bg-opacity-value").textContent = valor + "%";
  },
};

const Logo = {
  async guardar(base64) {
    await DB.put("config", { clave: "logo", valor: base64 });
    await this.aplicar();
  },

  async quitar() {
    await DB.delete("config", "logo");
    await this.aplicar();
  },

  async obtener() {
    const registro = await DB.get("config", "logo");
    return registro ? registro.valor : null;
  },

  async aplicar() {
    const base64 = await this.obtener();
    const loginImg = document.getElementById("login-logo-img");
    const loginFallback = document.getElementById("login-logo-fallback");
    const headerLogo = document.getElementById("header-logo");
    const sidebarImg = document.getElementById("sidebar-logo-img");
    const sidebarFallback = document.getElementById("sidebar-logo-fallback");

    if (base64) {
      loginImg.src = base64;
      loginImg.hidden = false;
      loginFallback.hidden = true;
      headerLogo.src = base64;
      headerLogo.hidden = false;
      sidebarImg.src = base64;
      sidebarImg.hidden = false;
      sidebarFallback.hidden = true;
    } else {
      loginImg.hidden = true;
      loginFallback.hidden = false;
      headerLogo.hidden = true;
      sidebarImg.hidden = true;
      sidebarFallback.hidden = false;
    }
  },

  async usarComoFondo() {
    const base64 = await this.obtener();
    if (!base64) {
      mostrarToast("Primero sube un logo");
      return;
    }
    await Theme.setImagen(base64);
    mostrarToast("Logo aplicado como fondo");
  },
};
