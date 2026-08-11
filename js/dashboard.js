/* =========================================================
   dashboard.js — panel con KPIs y gráficos para la vista de
   escritorio (PC). Se arma con los datos del almacén que esté
   seleccionado en ese momento — el mismo Excel que se ve en
   Consulta, Entrada, Salida, etc. No modifica ningún dato.

   Los gráficos usan MiniChart (js/charts.js), canvas puro sin
   ninguna librería externa — así el dashboard nunca depende de
   que un CDN cargue bien.

   Los 4 gráficos son circulares (dona):
   1) Total de piezas vs Stock final   (Stock final = Total - Conteo - Entregado)
   2) Total de piezas vs Total entregado
   3) Cantidad disponible por producto (Disponible = Total - Entregado)
   4) Total de piezas vs Conteo, con el % contado en el centro

   Se vuelve a pintar solo: al entrar a Inicio, al cambiar de
   almacén, al cargar/reemplazar un Excel, y al cambiar tema o
   paleta de colores (ver app.js y theme.js).
   ========================================================= */

const PALETAS_DASHBOARD = {
  ambar: ["#E8A93A", "#6FAE8C", "#D97A5C", "#7C9CC9", "#B08AD1", "#D4B25A"],
  azul: ["#3E6FA8", "#6FA8D6", "#4FA490", "#D97A5C", "#8C7AC9", "#7C9CC9"],
  verde: ["#2F8F5B", "#6FAE3E", "#D97A3F", "#3E9E8F", "#C9A227", "#4F7A2F"],
};

const Dashboard = {
  _resizeListenerPuesto: false,

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

    // Si la ventana cambia de tamaño (o el usuario expande/colapsa la
    // barra lateral), los canvas deben redibujarse a su nuevo tamaño.
    if (!this._resizeListenerPuesto) {
      this._resizeListenerPuesto = true;
      let temporizador;
      window.addEventListener("resize", () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
          if (pantallaActual === "home" && Inventario.cache.length) this._renderCharts();
        }, 150);
      });
    }
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
  _agruparPorProducto() {
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
      muted: oscuro ? "rgba(255,255,255,0.16)" : "rgba(20,18,14,0.10)",
      // El "hueco" de la dona debe pintarse del mismo color que el fondo
      // de la tarjeta que lo contiene, si no, se ve un círculo desentonado.
      colorTarjeta: oscuro ? "#20242A" : "#FFFFFF",
      paleta: PALETAS_DASHBOARD[nombrePaleta] || PALETAS_DASHBOARD.ambar,
    };
  },

  /* Dona de "progreso": 2 franjas (la parte que se mide vs el resto),
     con el % escrito en el centro y la leyenda con valores debajo. */
  _donaProgreso(canvasId, leyendaId, tema, valorMedido, total, colorMedido, etiquetaMedido) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const restante = Math.max(total - valorMedido, 0);
    const pct = total > 0 ? Math.round((valorMedido / total) * 100) : 0;
    MiniChart.dona(canvas, [
      { label: etiquetaMedido, valor: valorMedido, color: colorMedido },
      { label: "Resto", valor: restante, color: tema.muted },
    ], {
      cutout: 0.68,
      centro: `${pct}%`,
      colorTexto: tema.texto,
      colorHueco: tema.colorTarjeta,
      leyenda: document.getElementById(leyendaId),
    });
  },

  _renderCharts() {
    const tema = this._colorTema();
    const { totalPiezas, totalConteo, totalEntregado } = this._agregados();
    const totalStockFinalActual = this._agregados().totalStockFinal;

    // 1) Total de piezas vs Stock final
    this._donaProgreso("chart-stock-vs-final", "leyenda-stock-vs-final", tema, totalStockFinalActual, totalPiezas, tema.paleta[0], "Stock final");

    // 2) Total de piezas vs Total entregado
    this._donaProgreso("chart-conteo-vs-total", "leyenda-conteo-vs-total", tema, totalEntregado, totalPiezas, tema.paleta[2], "Entregado");

    // 3) Cantidad disponible por producto (Disponible = Total - Entregado,
    //    es decir, basada en las salidas/entregas — como se pidió)
    const porProducto = this._agruparPorProducto()
      .map(([nombre, v]) => ({ label: nombre, valor: Math.max(v.total - v.entregado, 0) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
    const canvasProducto = document.getElementById("chart-por-galpon");
    if (canvasProducto) {
      MiniChart.dona(
        canvasProducto,
        porProducto.map((p, i) => ({ label: p.label, valor: p.valor, color: tema.paleta[i % tema.paleta.length] })),
        { cutout: 0.55, colorHueco: tema.colorTarjeta, leyenda: document.getElementById("leyenda-por-galpon") }
      );
    }

    // 4) Total de piezas vs Conteo, con el % contado en el centro
    this._donaProgreso("chart-entregado-vs-disponible", "leyenda-entregado-vs-disponible", tema, totalConteo, totalPiezas, tema.paleta[1], "Contado");
  },
};
