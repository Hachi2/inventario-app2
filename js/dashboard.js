/* =========================================================
   dashboard.js — panel con KPIs y gráficos para la vista de
   escritorio (PC). Se arma con los datos del almacén que esté
   seleccionado en ese momento — el mismo Excel que se ve en
   Consulta, Entrada, Salida, etc. No modifica ningún dato.
   ========================================================= */

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
    const contados = items.filter((i) => i["CONTEO"] !== "" && i["CONTEO"] != null).length;
    return { items, totalPiezas, totalConteo, totalEntregado, totalStockFinal, contados };
  },

  _renderKpis() {
    const { items, totalPiezas, totalConteo, totalEntregado, totalStockFinal, contados } = this._agregados();
    const porcContado = totalPiezas > 0 ? (totalConteo / totalPiezas) * 100 : 0;
    const codigosUnicos = new Set(items.map((i) => i.CODIGO).filter(Boolean)).size;

    const tarjetas = [
      { valor: items.length.toLocaleString("es"), etiqueta: "Filas cargadas" },
      { valor: codigosUnicos.toLocaleString("es"), etiqueta: "Códigos distintos" },
      { valor: totalPiezas.toLocaleString("es"), etiqueta: "Total piezas" },
      { valor: totalConteo.toLocaleString("es"), etiqueta: "Total contado" },
      { valor: totalEntregado.toLocaleString("es"), etiqueta: "Total entregado" },
      { valor: totalStockFinal.toLocaleString("es"), etiqueta: "Stock final" },
      { valor: `${porcContado.toFixed(0)}%`, etiqueta: "% del stock contado", destacado: true },
      { valor: `${contados}/${items.length}`, etiqueta: "Filas ya contadas" },
    ];

    document.getElementById("dashboard-kpis").innerHTML = tarjetas.map((t) => `
      <div class="dash-kpi${t.destacado ? " dash-kpi-destacado" : ""}">
        <div class="dash-kpi-valor">${t.valor}</div>
        <div class="dash-kpi-etiqueta">${t.etiqueta}</div>
      </div>`).join("");
  },

  /* Agrupa por DESCRIPCIÓN (o CODIGO si no hay descripción), sumando
     cantidades — así funciona igual aunque el mismo código esté repartido
     en varios galpones/lotes. Se queda con los N más grandes para que el
     gráfico se vea claro. */
  _agruparPorProducto(campoValor, topN = 8) {
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
    return [...mapa.entries()]
      .sort((a, b) => b[1][campoValor] - a[1][campoValor])
      .slice(0, topN);
  },

  _agruparPorGalpon() {
    const mapa = new Map();
    Inventario.cache.forEach((item) => {
      const clave = item["GALPÓN"] || "(sin galpón)";
      mapa.set(clave, (mapa.get(clave) || 0) + (Number(item["TOTAL PIEZAS"]) || 0));
    });
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  },

  _colorTema() {
    const oscuro = document.body.getAttribute("data-theme") === "dark";
    return {
      texto: oscuro ? "#EDECEA" : "#3A362E",
      grilla: oscuro ? "rgba(255,255,255,0.08)" : "rgba(20,18,14,0.08)",
      paleta: ["#E8A93A", "#6FAE8C", "#D97A5C", "#7C9CC9", "#B08AD1", "#D4B25A"],
    };
  },

  _destruirGrafico(id) {
    if (this.graficos[id]) {
      this.graficos[id].destroy();
      delete this.graficos[id];
    }
  },

  _renderCharts() {
    if (typeof Chart === "undefined") return; // sin conexión la primera vez: no rompe el resto del dashboard
    const tema = this._colorTema();
    Chart.defaults.color = tema.texto;
    Chart.defaults.font.family = "Arial, sans-serif";

    // 1) Stock total vs Stock final, por producto
    const porTotal = this._agruparPorProducto("total");
    this._destruirGrafico("stockVsFinal");
    this.graficos.stockVsFinal = new Chart(document.getElementById("chart-stock-vs-final"), {
      type: "bar",
      data: {
        labels: porTotal.map(([nombre]) => nombre),
        datasets: [
          { label: "Stock total", data: porTotal.map(([, v]) => v.total), backgroundColor: tema.paleta[3] },
          { label: "Stock final", data: porTotal.map(([, v]) => v.stockFinal), backgroundColor: tema.paleta[0] },
        ],
      },
      options: { responsive: true, scales: { x: { grid: { display: false } }, y: { grid: { color: tema.grilla } } } },
    });

    // 2) Conteo vs Total, con % contado por producto
    this._destruirGrafico("conteoVsTotal");
    this.graficos.conteoVsTotal = new Chart(document.getElementById("chart-conteo-vs-total"), {
      type: "bar",
      data: {
        labels: porTotal.map(([nombre]) => nombre),
        datasets: [
          { label: "Total", data: porTotal.map(([, v]) => v.total), backgroundColor: tema.grilla === "rgba(255,255,255,0.08)" ? "rgba(255,255,255,0.18)" : "rgba(20,18,14,0.12)" },
          { label: "Contado", data: porTotal.map(([, v]) => v.conteo), backgroundColor: tema.paleta[1] },
        ],
      },
      options: {
        responsive: true,
        scales: { x: { grid: { display: false } }, y: { grid: { color: tema.grilla } } },
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: (ctx) => {
                const [, v] = porTotal[ctx[0].dataIndex];
                const pct = v.total > 0 ? ((v.conteo / v.total) * 100).toFixed(0) : 0;
                return `Contado: ${pct}%`;
              },
            },
          },
        },
      },
    });

    // 3) Piezas por galpón
    const porGalpon = this._agruparPorGalpon();
    this._destruirGrafico("porGalpon");
    this.graficos.porGalpon = new Chart(document.getElementById("chart-por-galpon"), {
      type: "doughnut",
      data: {
        labels: porGalpon.map(([g]) => g),
        datasets: [{ data: porGalpon.map(([, v]) => v), backgroundColor: tema.paleta }],
      },
      options: { responsive: true, plugins: { legend: { position: "right", labels: { boxWidth: 12 } } } },
    });

    // 4) Entregado vs disponible (stock final), por producto
    this._destruirGrafico("entregadoVsDisponible");
    this.graficos.entregadoVsDisponible = new Chart(document.getElementById("chart-entregado-vs-disponible"), {
      type: "bar",
      data: {
        labels: porTotal.map(([nombre]) => nombre),
        datasets: [
          { label: "Entregado", data: porTotal.map(([, v]) => v.entregado), backgroundColor: tema.paleta[2] },
          { label: "Disponible (stock final)", data: porTotal.map(([, v]) => v.stockFinal), backgroundColor: tema.paleta[0] },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        scales: { x: { grid: { color: tema.grilla } }, y: { grid: { display: false } } },
      },
    });
  },
};
