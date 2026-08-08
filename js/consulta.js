/* =========================================================
   consulta.js — buscar y ver artículos SIN modificar nada.
   Disponible para cualquier rol, incluido Auxiliar.
   ========================================================= */

const CAMPOS_BUSQUEDA_CONSULTA = ["CODIGO", "DESCRIPCIÓN", "GALPÓN", "SISTEMA", "PEDIDO/ÍTEM"];

const Consulta = {
  abrir() {
    document.getElementById("consulta-sin-datos").hidden = Inventario.cache.length !== 0;
    document.getElementById("consulta-resultados").innerHTML = "";
    document.getElementById("consulta-resumen").hidden = true;
    document.getElementById("consulta-vacio").hidden = Inventario.cache.length === 0;
  },

  buscar(texto) {
    const cont = document.getElementById("consulta-resultados");
    const vacio = document.getElementById("consulta-vacio");
    const resumen = document.getElementById("consulta-resumen");
    const q = normalizarTexto(texto);

    if (Inventario.cache.length === 0) {
      cont.innerHTML = "";
      resumen.hidden = true;
      vacio.hidden = true;
      return;
    }
    if (!q) {
      cont.innerHTML = "";
      resumen.hidden = true;
      vacio.hidden = false;
      vacio.textContent = "Escribe un código, descripción, galpón, sistema o pedido/ítem para consultar.";
      return;
    }

    const resultados = Inventario.cache.filter((item) =>
      normalizarTexto(CAMPOS_BUSQUEDA_CONSULTA.map((c) => item[c]).join(" ")).includes(q)
    );

    if (resultados.length === 0) {
      cont.innerHTML = "";
      resumen.hidden = true;
      vacio.hidden = false;
      vacio.textContent = `Sin coincidencias para "${texto}".`;
      return;
    }
    vacio.hidden = true;

    // Cuadro con la suma de todas las coincidencias (como pidió: "sume toda
    // la coincidencia de ese ítem"), sin importar cuántas filas/lotes sean.
    const totalPiezas = resultados.reduce((s, it) => s + (Number(it["TOTAL PIEZAS"]) || 0), 0);
    const totalStock = resultados.reduce((s, it) => s + (Number(it["STOCK FINAL"]) || 0), 0);
    resumen.hidden = false;
    resumen.innerHTML = `
      <div><span class="valor">${resultados.length}</span><span class="etiqueta">${resultados.length === 1 ? "Coincidencia" : "Coincidencias"}</span></div>
      <div><span class="valor">${totalPiezas.toLocaleString("es")}</span><span class="etiqueta">Total piezas</span></div>
      <div><span class="valor">${totalStock.toLocaleString("es")}</span><span class="etiqueta">Stock final</span></div>
    `;

    const MAX = 60;
    const mostrar = resultados.slice(0, MAX);
    const aviso = resultados.length > MAX
      ? `<p class="muted small" style="padding:2px 2px 6px;">Mostrando ${MAX} de ${resultados.length} — sigue escribiendo para afinar.</p>`
      : "";

    cont.innerHTML = aviso + mostrar.map((item) => this._cardHTML(item, texto)).join("");
  },

  _cardHTML(item, texto) {
    const stock = item["STOCK FINAL"];
    const claseStock = stock < 0 ? "stock-bad" : "stock-ok";
    const filas = [
      ["Galpón", item["GALPÓN"]],
      ["Ubicación", item["UBICACIÓN"]],
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
