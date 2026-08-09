/* =========================================================
   dashboard.js — panel con KPIs y gráficos para la vista de
   escritorio (PC). Se arma con los datos del almacén que esté
   seleccionado en ese momento — el mismo Excel que se ve en
   Consulta, Entrada, Salida, etc. No modifica ningún dato.

   Los 4 gráficos son circulares (dona), como se pidió:
   1) Total de piezas vs Stock final   (Stock final = Total - Conteo - Entregado)
   2) Total de piezas vs Total entregado
   3) Cantidad disponible por producto (Disponible = Total - Entregado)
   4) Total de piezas vs Conteo, con el % contado en el centro
   ========================================================= */

const PALETAS_DASHBOARD = {
  ambar: ["#E8A93A", "#6FAE8C", "#D97A5C", "#7C9CC9", "#B08AD1", "#D4B25A"],
  azul: ["#3E6FA8", "#6FA8D6", "#4FA490", "#D97A5C", "#8C7AC9", "#7C9CC9"],
  verde: ["#2F8F5B", "#6FAE3E", "#D97A3F", "#3E9E8F", "#C9A227", "#4F7A2F"],
};

// Plugin de Chart.js casero para escribir el % en el centro de una dona
// (sin depender de ninguna librería extra).
const pluginTextoCentral = {
  id: "textoCentral",
  afterDraw(chart) {
    const texto = chart.options.plugins && chart.options.plugins.textoCentral && chart.options.plugins.textoCentral.texto;
    if (!texto) return;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillStyle = chart.options.plugins.textoCentral.color || "#3A362E";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x, y);
    ctx.restore();
  },
};
if (typeof Chart !== "undefined") Chart.register(pluginTextoCentral);

const Dashboard = {
  graficos: {},

  render() {
    const cont = document.getElementById("dashboard-contenido");
    const sinDatos = document.getElementById("dashboard-sin-datos");
    document.getElementById("dashboard-almacen-nombre").textContent = Almacenes.nombreActual() || "";

    if (!Inventario.cache.length) {
      cont.hidden = true;
      sinDatos.hidden = false;
      return;
    }
    sinDatos.hidden = true;
    cont.hidden = false;

    this._renderKpis();
    this._renderCharts();
  },

  _agregados() {
    const items = Inventario.cache;
    const num = (v) => (v === "" || v == null ? 0 : Number(v) || 0);
    const totalPiezas = items.reduce((s, i) => s + num(i["TOTAL PIEZAS"]), 0);
    const totalConteo = items.reduce((s, i) => s + num(i["CONTEO"]), 0);
    const totalEntregado = items.reduce((s, i) => s + num(i["ENTREGADO"]), 0);
    const totalStockFinal = items.reduce((s, i) => s + num(i["STOCK FINAL"]), 0);
    return { items, totalPiezas, totalConteo, totalEntregado, totalStockFinal };
  },

  /* 6 tarjetas — se quitaron "Filas cargadas" y "Filas ya contadas" a
     pedido. Se dejó "Códigos distintos" porque, al permitir la app varios
     lotes con el mismo CODIGO, esta cifra es la única forma de ver de un
     vistazo cuántos artículos distintos hay en el almacén (las "filas
     cargadas" mezclan lotes repetidos y confunden esa lectura). */
  _renderKpis() {
    const { items, totalPiezas, totalConteo, totalEntregado, totalStockFinal } = this._agregados();
    const porcContado = totalPiezas > 0 ? (totalConteo / totalPiezas) * 100 : 0;
    const codigosUnicos = new Set(items.map((i) => i.CODIGO).filter(Boolean)).size;

    const tarjetas = [
      { valor: codigosUnicos.toLocaleString("es"), etiqueta: "Códigos distintos" },
      { valor: totalPiezas.toLocaleString("es"), etiqueta: "Total piezas" },
      { valor: totalConteo.toLocaleString("es"), etiqueta: "Total contado" },
      { valor: totalEntregado.toLocaleString("es"), etiqueta: "Total entregado" },
      { valor: totalStockFinal.toLocaleString("es"), etiqueta: "Stock final" },
      { valor: `${porcContado.toFixed(0)}%`, etiqueta: "% del stock contado", destacado: true },
    ];

    document.getElementById("dashboard-kpis").innerHTML = tarjetas.map((t) => `
      <div class="dash-kpi${t.destacado ? " dash-kpi-destacado" : ""}">
        <div class="dash-kpi-valor">${t.valor}</div>
        <div class="dash-kpi-etiqueta">${t.etiqueta}</div>
      </div>`).join("");
  },

  /* Agrupa por DESCRIPCIÓN (o CODIGO si no hay descripción), sumando
     cantidades — así funciona igual aunque el mismo código esté repartido
     en varios galpones/lotes. */
  _agruparPorProducto(topN = 8) {
    const mapa = new Map();
    Inventario.cache.forEach((item) => {
      const clave = item["DESCRIPCIÓN"] || item.CODIGO || "(sin descripción)";
      if (!mapa.has(clave)) mapa.set(clave, { total: 0, conteo: 0, entregado: 0, stockFinal: 0 });
      const g = mapa.get(clave);
      g.total += Number(item["TOTAL PIEZAS"]) || 0;
      g.conteo += item["CONTEO"] === "" || item["CONTEO"] == null ? 0 : Number(item["CONTEO"]) || 0;
      g.entregado += Number(item["ENTREGADO"]) || 0;
      g.stockFinal += Number(item["STOCK FINAL"]) || 0;
    });
    return [...mapa.entries()];
  },

  _colorTema() {
    const oscuro = document.body.getAttribute("data-theme") === "dark";
    const nombrePaleta = document.body.getAttribute("data-paleta") || "ambar";
    return {
      texto: oscuro ? "#EDECEA" : "#3A362E",
      muted: oscuro ? "rgba(255,255,255,0.14)" : "rgba(20,18,14,0.10)",
      paleta: PALETAS_DASHBOARD[nombrePaleta] || PALETAS_DASHBOARD.ambar,
    };
  },

  _destruirGrafico(id) {
    if (this.graficos[id]) {
      this.graficos[id].destroy();
      delete this.graficos[id];
    }
  },

  /* Dona de "progreso": 2 franjas (la parte que se mide vs el resto),
     con el % escrito en el centro. Así se muestran las comparaciones
     "X vs total de piezas" de forma circular, como se pidió. */
  _donaProgreso(canvasId, idInterno, tema, valorMedido, total, colorMedido, etiquetaMedido) {
    const restante = Math.max(total - valorMedido, 0);
    const pct = total > 0 ? Math.round((valorMedido / total) * 100) : 0;
    this._destruirGrafico(idInterno);
    this.graficos[idInterno] = new Chart(document.getElementById(canvasId), {
      type: "doughnut",
      data: {
        labels: [etiquetaMedido, "Resto"],
        datasets: [{ data: [valorMedido, restante], backgroundColor: [colorMedido, tema.muted], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        cutout: "68%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12 } },
          textoCentral: { texto: `${pct}%`, color: tema.texto },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.raw.toLocaleString("es")} (${total > 0 ? Math.round((ctx.raw / total) * 100) : 0}%)`,
            },
          },
        },
      },
      plugins: [pluginTextoCentral],
    });
  },

  _renderCharts() {
    if (typeof Chart === "undefined") return; // sin conexión la primera vez: no rompe el resto del dashboard
    const tema = this._colorTema();
    Chart.defaults.color = tema.texto;
    Chart.defaults.font.family = "Arial, sans-serif";
    const { totalPiezas, totalConteo, totalEntregado, totalStockFinal } = this._agregados();

    // 1) Total de piezas vs Stock final
    this._donaProgreso("chart-stock-vs-final", "stockVsFinal", tema, totalStockFinal, totalPiezas, tema.paleta[0], "Stock final");

    // 2) Total de piezas vs Total entregado
    this._donaProgreso("chart-conteo-vs-total", "totalVsEntregado", tema, totalEntregado, totalPiezas, tema.paleta[2], "Entregado");

    // 3) Cantidad disponible por producto (Disponible = Total - Entregado,
    //    es decir, basada en las salidas/entregas — como se pidió)
    const porProducto = this._agruparPorProducto()
      .map(([nombre, v]) => [nombre, Math.max(v.total - v.entregado, 0)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    this._destruirGrafico("disponiblePorProducto");
    this.graficos.disponiblePorProducto = new Chart(document.getElementById("chart-por-galpon"), {
      type: "doughnut",
      data: {
        labels: porProducto.map(([nombre]) => nombre),
        datasets: [{ data: porProducto.map(([, v]) => v), backgroundColor: tema.paleta, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        cutout: "55%",
        plugins: { legend: { position: "right", labels: { boxWidth: 12 } } },
      },
    });

    // 4) Total de piezas vs Conteo, con el % contado en el centro
    this._donaProgreso("chart-entregado-vs-disponible", "totalVsConteo", tema, totalConteo, totalPiezas, tema.paleta[1], "Contado");
  },
};
