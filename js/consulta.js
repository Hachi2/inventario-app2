/* =========================================================
   consulta.js — buscar y ver artículos SIN modificar nada.
   Disponible para cualquier rol, incluido Auxiliar.
   ========================================================= */

const CAMPOS_BUSQUEDA_CONSULTA = ["CODIGO", "DESCRIPCIÓN", "GALPÓN", "SISTEMA", "PEDIDO/ÍTEM"];

const Consulta = {
  abrir() {
    document.getElementById("consulta-sin-datos").hidden = Inventario.cache.length !== 0;
    document.getElementById("consulta-resultados").innerHTML = "";
    document.getElementById("consulta-vacio").hidden = Inventario.cache.length === 0;
  },

  buscar(texto) {
    const cont = document.getElementById("consulta-resultados");
    const vacio = document.getElementById("consulta-vacio");
    const q = normalizarTexto(texto);

    if (Inventario.cache.length === 0) {
      cont.innerHTML = "";
      vacio.hidden = true;
      return;
    }
    if (!q) {
      cont.innerHTML = "";
      vacio.hidden = false;
      vacio.textContent = "Escribe un código, descripción, galpón, sistema o pedido/ítem para consultar.";
      return;
    }

    const resultados = Inventario.cache.filter((item) =>
      normalizarTexto(CAMPOS_BUSQUEDA_CONSULTA.map((c) => item[c]).join(" ")).includes(q)
    );

    if (resultados.length === 0) {
      cont.innerHTML = "";
      vacio.hidden = false;
      vacio.textContent = `Sin coincidencias para "${texto}".`;
      return;
    }
    vacio.hidden = true;

    const MAX = 60;
    const mostrar = resultados.slice(0, MAX);
    const aviso = resultados.length > MAX
      ? `<p class="muted small" style="padding:2px 2px 6px;">Mostrando ${MAX} de ${resultados.length} — sigue escribiendo para afinar.</p>`
      : `<p class="muted small" style="padding:2px 2px 6px;">${resultados.length} coincidencia${resultados.length === 1 ? "" : "s"}</p>`;

    cont.innerHTML = aviso + mostrar.map((item) => this._cardHTML(item, texto)).join("");
  },

  _cardHTML(item, texto) {
    const stock = item["STOCK FINAL"];
    const claseStock = stock < 0 ? "stock-bad" : "stock-ok";
    const filas = [
      ["Galpón", item["GALPÓN"]],
      ["Sistema", item["SISTEMA"]],
      ["Pedido/Ítem", item["PEDIDO/ÍTEM"]],
      ["Total piezas", item["TOTAL PIEZAS"]],
      ["Conteo", item["CONTEO"] === "" || item["CONTEO"] == null ? "—" : item["CONTEO"]],
      ["Entregado", item["ENTREGADO"] === "" || item["ENTREGADO"] == null ? "—" : item["ENTREGADO"]],
      ["Peso neto", item["PESO NETO"]],
      ["Volumen maestro", item["VOLUMEN MAESTRO"]],
    ];
    const ultimaMod = item["USUARIO"]
      ? `${escapeHtml(item["USUARIO"])}${item["FECHA MODIFICACIÓN"] ? " · " + escapeHtml(item["FECHA MODIFICACIÓN"]) : ""}`
      : "Sin modificaciones todavía";

    return `
      <div class="consulta-card">
        <div class="consulta-card-top">
          <div>
            <div class="consulta-codigo">${resaltar(item.CODIGO, texto)}</div>
            <div class="consulta-desc">${resaltar(item["DESCRIPCIÓN"] || "", texto)}</div>
          </div>
          <span class="stock-pill ${claseStock}">Stock: ${stock}</span>
        </div>
        <div class="consulta-grid">
          ${filas.map(([label, val]) => `<div><span class="label">${label}</span>${escapeHtml(val ?? "") || "—"}</div>`).join("")}
        </div>
        ${item["OBSERVACIONES"] ? `<div class="consulta-obs">"${escapeHtml(item["OBSERVACIONES"])}"</div>` : ""}
        <div class="consulta-footer">Última modificación: ${ultimaMod}</div>
      </div>`;
  },
};
