/* =========================================================
   auditoria.js — quién modificó qué, y cuándo
   ========================================================= */

const Auditoria = {
  async registrar(accion, codigoItem, campo, valorAnterior, valorNuevo) {
    await DB.put("auditoria", {
      fecha: new Date().toISOString(),
      usuario: Auth.currentUser ? Auth.currentUser.usuario : "desconocido",
      nombre: Auth.currentUser ? Auth.currentUser.nombre : "",
      accion,
      codigoItem: codigoItem || "",
      campo: campo || "",
      valorAnterior: valorAnterior ?? "",
      valorNuevo: valorNuevo ?? "",
    });
  },

  async render() {
    const registros = (await DB.getAll("auditoria")).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const lista = document.getElementById("lista-auditoria");
    if (registros.length === 0) {
      lista.innerHTML = `<p class="muted small" style="text-align:center;margin-top:20px;">Todavía no hay movimientos registrados.</p>`;
      return;
    }
    lista.innerHTML = registros.map((r) => {
      const fecha = new Date(r.fecha);
      const fechaStr = fecha.toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
      const detalle = r.codigoItem && r.campo
        ? `${r.codigoItem} · ${r.campo}: "${r.valorAnterior}" → "${r.valorNuevo}"`
        : `${r.valorNuevo}`;
      return `
        <div class="log-item">
          <div class="log-top"><span>${escapeHtml(r.nombre || r.usuario)}</span><span class="muted">${fechaStr}</span></div>
          <div class="log-detail"><b>${escapeHtml(r.accion)}</b> · ${escapeHtml(detalle)}</div>
        </div>`;
    }).join("");
  },

  async filasParaExportar() {
    const registros = (await DB.getAll("auditoria")).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return registros.map((r) => ({
      Fecha: new Date(r.fecha).toLocaleString("es"),
      Usuario: r.usuario,
      Nombre: r.nombre,
      Acción: r.accion,
      "Código / referencia": r.codigoItem,
      Campo: r.campo,
      "Valor anterior": r.valorAnterior,
      "Valor nuevo": r.valorNuevo,
    }));
  },

  async exportarExcel() {
    const filas = await this.filasParaExportar();
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Registro");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `registro_actividad_${fecha}.xlsx`);
  },

  async limpiar() {
    await DB.clear("auditoria");
    await this.render();
  },
};
