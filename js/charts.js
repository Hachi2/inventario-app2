/* =========================================================
   charts.js — gráficos de dona en Canvas puro, sin librerías
   externas ni CDN. Se agregó porque depender de un CDN externo
   (Chart.js) causaba que el dashboard se quedara en blanco
   cuando la red del usuario bloqueaba ese dominio, o mientras
   el navegador todavía no había podido descargarlo. Al ser
   parte de la propia app, este módulo siempre está disponible,
   incluso en el primer uso sin conexión.
   ========================================================= */

const MiniChart = {
  /* Dibuja una dona en el <canvas> indicado.
     segmentos: [{ label, valor, color }]
     opciones: { cutout (0-1), centro (texto en el medio), colorTexto,
                 colorHueco (color del "agujero", debe ser el mismo que
                 el fondo de la tarjeta), leyenda (elemento donde pintar
                 la leyenda en HTML, o null para omitirla) } */
  dona(canvas, segmentos, opciones = {}) {
    const cutout = opciones.cutout ?? 0.66;
    const colorHueco = opciones.colorHueco || "#FFFFFF";
    const colorTexto = opciones.colorTexto || "#23221E";
    const total = segmentos.reduce((s, seg) => s + Math.max(seg.valor, 0), 0);

    this._prepararCanvas(canvas);
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const radio = Math.min(w, h) / 2 - 4;

    // Si el canvas todavía no tiene un tamaño real (por ejemplo, la
    // tarjeta se está mostrando justo en este instante y el navegador
    // no terminó de calcular el layout), no hay nada que dibujar
    // todavía — se evita el error de "radio negativo" y simplemente se
    // reintentará en el próximo render() (cambio de almacén, resize, etc.).
    if (radio <= 0) return;

    if (total <= 0 || segmentos.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radio, 0, Math.PI * 2);
      ctx.fillStyle = opciones.colorVacio || "rgba(120,115,105,0.12)";
      ctx.fill();
    } else {
      let anguloInicio = -Math.PI / 2;
      segmentos.forEach((seg) => {
        const valor = Math.max(seg.valor, 0);
        if (valor <= 0) return;
        const anguloFin = anguloInicio + (valor / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radio, anguloInicio, anguloFin);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        anguloInicio = anguloFin;
      });
    }

    if (cutout > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radio * cutout, 0, Math.PI * 2);
      ctx.fillStyle = colorHueco;
      ctx.fill();
    }

    if (opciones.centro) {
      ctx.save();
      ctx.font = "700 22px Arial, sans-serif";
      ctx.fillStyle = colorTexto;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opciones.centro, cx, cy);
      ctx.restore();
    }

    if (opciones.leyenda) {
      this._pintarLeyenda(opciones.leyenda, segmentos, total);
    }
  },

  /* Ajusta la resolución interna del canvas a la densidad de píxeles
     de la pantalla, para que no se vea borroso ni pixelado. */
  _prepararCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || 220;
    const h = canvas.clientHeight || 220;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.getContext("2d").scale(dpr, dpr);
    }
  },

  _pintarLeyenda(contenedor, segmentos, total) {
    contenedor.innerHTML = segmentos.map((seg) => {
      const pct = total > 0 ? Math.round((Math.max(seg.valor, 0) / total) * 100) : 0;
      return `
        <div class="chart-legend-item">
          <span class="chart-legend-dot" style="background:${seg.color}"></span>
          <span class="chart-legend-label">${this._escapar(seg.label)}</span>
          <span class="chart-legend-valor">${Math.max(seg.valor, 0).toLocaleString("es")} (${pct}%)</span>
        </div>`;
    }).join("");
  },

  _escapar(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  },
};
