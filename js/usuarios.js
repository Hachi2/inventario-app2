/* =========================================================
   usuarios.js — alta de usuarios y asignación de roles
   Solo visible/editable para Coordinador y Analista.
   ========================================================= */

const Usuarios = {
  async render() {
    const usuarios = await DB.getAll("usuarios");
    const lista = document.getElementById("lista-usuarios");
    lista.innerHTML = usuarios.map((u) => `
      <div class="user-item" data-usuario="${escapeHtml(u.usuario)}">
        <div>
          <div class="u-name">${escapeHtml(u.nombre)}</div>
          <div class="u-meta">@${escapeHtml(u.usuario)}</div>
        </div>
        <span class="role-pill">${escapeHtml(u.rol)}</span>
      </div>`).join("");

    lista.querySelectorAll(".user-item").forEach((el) => {
      el.addEventListener("click", () => this.abrirEdicion(el.dataset.usuario));
    });
  },

  abrirNuevo() {
    document.getElementById("usuario-modal-titulo").textContent = "Nuevo usuario";
    document.getElementById("form-usuario").reset();
    document.getElementById("usuario-original").value = "";
    document.getElementById("usuario-nombre-usuario").disabled = false;
    document.getElementById("usuario-password-label").textContent = "Contraseña";
    document.getElementById("usuario-password").required = true;
    document.getElementById("btn-eliminar-usuario").hidden = true;
    document.getElementById("usuario-error").hidden = true;
    abrirModal("modal-usuario");
  },

  async abrirEdicion(usuario) {
    const u = await DB.get("usuarios", usuario);
    if (!u) return;
    document.getElementById("usuario-modal-titulo").textContent = "Editar usuario";
    document.getElementById("usuario-original").value = u.usuario;
    document.getElementById("usuario-nombre-usuario").value = u.usuario;
    document.getElementById("usuario-nombre-usuario").disabled = true;
    document.getElementById("usuario-nombre-completo").value = u.nombre;
    document.getElementById("usuario-rol").value = u.rol;
    document.getElementById("usuario-password").value = "";
    document.getElementById("usuario-password-label").textContent = "Nueva contraseña (opcional)";
    document.getElementById("usuario-password").required = false;
    document.getElementById("btn-eliminar-usuario").hidden = (u.usuario === Auth.currentUser.usuario);
    document.getElementById("usuario-error").hidden = true;
    abrirModal("modal-usuario");
  },

  async guardar(e) {
    e.preventDefault();
    const original = document.getElementById("usuario-original").value;
    const usuario = document.getElementById("usuario-nombre-usuario").value.trim();
    const nombre = document.getElementById("usuario-nombre-completo").value.trim();
    const rol = document.getElementById("usuario-rol").value;
    const password = document.getElementById("usuario-password").value;
    const errorEl = document.getElementById("usuario-error");

    if (!usuario || !nombre) {
      errorEl.textContent = "Completa usuario y nombre.";
      errorEl.hidden = false;
      return;
    }
    if (!original && !password) {
      errorEl.textContent = "La contraseña es obligatoria para un usuario nuevo.";
      errorEl.hidden = false;
      return;
    }
    if (!original) {
      const existente = await DB.get("usuarios", usuario);
      if (existente) {
        errorEl.textContent = "Ese nombre de usuario ya existe.";
        errorEl.hidden = false;
        return;
      }
    }

    const registro = { usuario: original || usuario, nombre, rol };
    if (password) {
      registro.passwordHash = await Auth.hashPassword(password);
    } else {
      const existente = await DB.get("usuarios", original);
      registro.passwordHash = existente.passwordHash;
    }

    await DB.put("usuarios", registro);
    await Auditoria.registrar("Usuarios", null, "usuario", "-", `${original ? "editado" : "creado"}: ${registro.usuario} (${rol})`);
    cerrarModal("modal-usuario");
    await this.render();
    mostrarToast(original ? "Usuario actualizado" : "Usuario creado");
  },

  async eliminar() {
    const usuario = document.getElementById("usuario-original").value;
    if (!usuario) return;
    if (usuario === Auth.currentUser.usuario) return;
    if (!confirm(`¿Eliminar al usuario "${usuario}"?`)) return;
    await DB.delete("usuarios", usuario);
    await Auditoria.registrar("Usuarios", null, "usuario", usuario, "eliminado");
    cerrarModal("modal-usuario");
    await this.render();
    mostrarToast("Usuario eliminado");
  },
};
