/* =========================================================
   movimientos.js — Entrada, Salida, Traspaso y Conteo físico.
   Comparten una misma pantalla: se busca un artículo, se
   indica una cantidad, se arma una lista de trabajo y al
   presionar "Finalizar" se aplica todo junto.

   Importante: el CODIGO puede repetirse en varias filas del
   Excel (varios lotes/stocks distintos). Por eso cada fila se
   identifica internamente por su "_id" propio, nunca por el
   CODIGO — así, al buscar, aparecen TODAS las coincidencias
   (como el filtro de Excel) y cada una se puede mover por
   separado sin mezclarse con las demás.

   Nota: cada fila vive en un único GALPÓN. Un "Traspaso" mueve
   esa fila completa de un galpón a otro, no reparte cantidades
   entre dos galpones distintos.
   ========================================================= */

const MOVIMIENTOS_CONFIG = {
  entrada: {
    titulo: "Entrada de almacén",
    ayuda: "Busca el artículo que llegó e indica cuánto entró.",
    etiquetaCantidad: "Cantidad que entra",
    accion: "Entrada",
    soloGestor: true,
    pidePersona: true,
    personaLabel: "Nombre y apellido de quien trae el material",
  },
  salida: {
    titulo: "Salida de almacén",
    ayuda: "Busca el artículo que sale e indica cuánto se entrega.",
    etiquetaCantidad: "Cantidad que sale",
    accion: "Salida",
    soloGestor: false,
    pidePersona: true,
    personaLabel: "Nombre y apellido de quien retira el material",
  },
  traspaso: {
    titulo: "Traspaso",
    ayuda: "Busca el artículo, indica a dónde se mueve y la cantidad.",
    etiquetaCantidad: "Cantidad que se traspasa",
    accion: "Traspaso",
    soloGestor: true,
    pideAutorizado: true,
  },
  conteo: {
    titulo: "Conteo físico",
    ayuda: "Busca el artículo y registra cuánto contaste físicamente.",
    etiquetaCantidad: "Cantidad contada",
    accion: "Conteo",
    soloGestor: false,
    absoluto: true,
    permiteNota: true,
    permiteUbicacion: true,
  },
};

const MOSTRAR_MAX_RESULTADOS = 80;

const Movimientos = {
  tipoActual: null,
  carrito: [],
  itemPendiente: null,

  permitido(tipo) {
    const cfg = MOVIMIENTOS_CONFIG[tipo];
    if (!cfg) return false;
    return cfg.soloGestor ? Auth.isGestor() : true;
  },

  abrir(tipo) {
    if (!this.permitido(tipo)) {
      mostrarToast("Tu rol no tiene acceso a esta opción");
      return false;
    }
    if (Inventario.cache.length === 0) {
      mostrarToast("Primero carga el inventario en Ajustes");
    }
    this.tipoActual = tipo;
    this.carrito = [];
    const cfg = MOVIMIENTOS_CONFIG[tipo];

    document.getElementById("mov-persona-wrap").hidden = !cfg.pidePersona;
    document.getElementById("mov-persona-label").textContent = cfg.personaLabel || "Nombre y apellido";
    document.getElementById("mov-persona").value = "";
    document.getElementById("mov-departamento-wrap").hidden = !cfg.pidePersona;
    document.getElementById("mov-departamento").value = "";

    document.getElementById("mov-traspaso-tipo-wrap").hidden = tipo !== "traspaso";
    document.getElementById("mov-autorizado-wrap").hidden = !cfg.pideAutorizado;
    document.getElementById("mov-autorizado-por").value = "";
    this.traspasoModo = "galpon";
    document.querySelectorAll("#traspaso-tipo-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.modo === "galpon"));
    document.getElementById("mov-destino-wrap").hidden = tipo !== "traspaso";
    document.getElementById("mov-destino-galpon").value = "";
    document.getElementById("mov-destino-almacen-wrap").hidden = true;
    this._poblarSelectAlmacenes();

    document.getElementById("entrada-tipo-toggle-wrap").hidden = tipo !== "entrada";
    this.entradaModo = "existente";
    document.querySelectorAll("#entrada-tipo-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.modo === "existente"));
    document.getElementById("entrada-nueva-wrap").hidden = true;
    document.getElementById("entrada-nueva-desc").value = "";
    document.getElementById("entrada-nueva-cantidad").value = "";
    document.getElementById("mov-sugerencias").hidden = false;
    document.getElementById("search-input").disabled = false;
    document.getElementById("search-input").value = "";

    document.getElementById("mov-sugerencias").innerHTML = "";
    document.getElementById("mov-sin-datos").hidden = Inventario.cache.length !== 0;
    this.render();
    return true;
  },

  _poblarSelectAlmacenes() {
    const sel = document.getElementById("mov-destino-almacen");
    const otros = Almacenes.cacheLista.filter((a) => a.id !== Almacenes.actualId);
    sel.innerHTML = otros.length
      ? otros.map((a) => `<option value="${a.id}">${escapeHtml(a.nombre)}</option>`).join("")
      : `<option value="">No hay otro almacén cargado todavía</option>`;
  },

  setTraspasoModo(modo) {
    this.traspasoModo = modo;
    document.querySelectorAll("#traspaso-tipo-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.modo === modo));
    document.getElementById("mov-destino-wrap").hidden = modo !== "galpon";
    document.getElementById("mov-destino-almacen-wrap").hidden = modo !== "almacen";
  },

  setEntradaModo(modo) {
    this.entradaModo = modo;
    document.querySelectorAll("#entrada-tipo-toggle .segmented-btn").forEach((b) => b.classList.toggle("active", b.dataset.modo === modo));
    const esNueva = modo === "nueva";
    document.getElementById("entrada-nueva-wrap").hidden = !esNueva;
    document.getElementById("mov-sugerencias").hidden = esNueva;
    document.getElementById("search-input").value = "";
    document.getElementById("search-input").disabled = esNueva;
  },

  agregarMercanciaNueva() {
    const desc = document.getElementById("entrada-nueva-desc").value.trim();
    const cantidadRaw = document.getElementById("entrada-nueva-cantidad").value;
    const cantidad = Number(cantidadRaw);
    if (!desc) {
      mostrarToast("Escribe la descripción de la mercancía");
      return;
    }
    if (cantidadRaw === "" || isNaN(cantidad) || cantidad <= 0) {
      mostrarToast("Escribe el total de piezas");
      return;
    }
    this.carrito.push({
      id: null, // sin _id: es un artículo nuevo, se crea al Finalizar
      nuevo: true,
      codigo: "(nuevo)",
      galpon: "",
      descripcion: desc,
      cantidad,
    });
    document.getElementById("entrada-nueva-desc").value = "";
    document.getElementById("entrada-nueva-cantidad").value = "";
    this.render();
    mostrarToast("Agregado a la lista");
  },

  /* ---------------- Búsqueda: muestra TODAS las coincidencias ---------------- */
  buscar(texto) {
    const cont = document.getElementById("mov-sugerencias");
    const q = normalizarTexto(texto);
    if (!q) {
      cont.innerHTML = "";
      return;
    }

    const camposBusqueda = ["CODIGO", "DESCRIPCIÓN", "GALPÓN", "SISTEMA", "PEDIDO/ÍTEM", "UBICACIÓN", "VOLUMEN MAESTRO"];
    const todas = Inventario.cache.filter((item) =>
      normalizarTexto(camposBusqueda.map((c) => item[c]).join(" ")).includes(q)
    );

    if (todas.length === 0) {
      cont.innerHTML = `<p class="muted small" style="padding:6px 2px;">Sin coincidencias para "${escapeHtml(texto)}".</p>`;
      return;
    }

    // Coincidencias exactas de código primero, luego el resto
    todas.sort((a, b) => {
      const aExacto = normalizarTexto(a.CODIGO) === q ? 0 : 1;
      const bExacto = normalizarTexto(b.CODIGO) === q ? 0 : 1;
      return aExacto - bExacto;
    });

    const resultados = todas.slice(0, MOSTRAR_MAX_RESULTADOS);
    const contadorTxt = todas.length > MOSTRAR_MAX_RESULTADOS
      ? `Mostrando ${MOSTRAR_MAX_RESULTADOS} de ${todas.length} coincidencias — sigue escribiendo para afinar.`
      : `${todas.length} coincidencia${todas.length === 1 ? "" : "s"}`;

    const esConteo = this.tipoActual === "conteo";

    cont.innerHTML = `<p class="muted small" style="padding:2px 2px 6px;">${contadorTxt}</p>` +
      resultados.map((item) => {
        const yaContado = esConteo && item["CONTEO"] !== "" && item["CONTEO"] != null;
        const chips = [
          item["GALPÓN"] ? `<span class="s-chip">📦 ${escapeHtml(item["GALPÓN"])}</span>` : "",
          item["UBICACIÓN"] ? `<span class="s-chip">📍 ${escapeHtml(item["UBICACIÓN"])}</span>` : "",
          item["PEDIDO/ÍTEM"] ? `<span class="s-chip">${escapeHtml(item["PEDIDO/ÍTEM"])}</span>` : "",
          `<span class="s-chip s-chip-stock">Stock: ${item["STOCK FINAL"]}</span>`,
          yaContado ? `<span class="s-chip s-chip-contado">Ya contado: ${item["CONTEO"]}</span>` : "",
        ].filter(Boolean).join("");
        return `
        <div class="suggestion-item${yaContado ? " suggestion-contada" : ""}" data-id="${item._id}">
          <div class="s-info">
            <div class="s-nombre">${resaltar(item["DESCRIPCIÓN"] || item.CODIGO, texto)}</div>
            <div class="s-codigo">${item.CODIGO ? resaltar(item.CODIGO, texto) : '<span class="muted">(sin código)</span>'}</div>
            <div class="s-chips">${chips}</div>
          </div>
          <button class="btn-agregar" data-ya-contado="${yaContado ? "1" : "0"}">Agregar</button>
        </div>`;
      }).join("");

    cont.querySelectorAll(".suggestion-item").forEach((el) => {
      el.querySelector(".btn-agregar").addEventListener("click", (e) => {
        if (e.currentTarget.dataset.yaContado === "1") {
          if (!confirm("Este artículo ya fue contado. ¿Seguro que quieres volver a contarlo y reemplazar ese conteo?")) return;
        }
        this.pedirCantidad(Number(el.dataset.id));
      });
    });
  },

  pedirCantidad(id) {
    const item = Inventario.cache.find((i) => i._id === id);
    if (!item) return;
    this.itemPendiente = item;
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];
    const esConteo = this.tipoActual === "conteo";

    document.getElementById("cantidad-titulo").textContent = item["DESCRIPCIÓN"] || item.CODIGO;
    let descTxt = `${item.CODIGO}${item["GALPÓN"] ? " · " + item["GALPÓN"] : ""} · Stock actual: ${item["STOCK FINAL"]}`;
    if (esConteo) {
      descTxt += ` · Conteo actual: ${item["CONTEO"] === "" || item["CONTEO"] == null ? "sin contar" : item["CONTEO"]}`;
    }
    document.getElementById("cantidad-item-desc").textContent = descTxt;
    document.getElementById("cantidad-label").textContent = cfg.etiquetaCantidad;
    document.getElementById("cantidad-input").value = esConteo && item["CONTEO"] !== "" && item["CONTEO"] != null ? item["CONTEO"] : "";
    document.getElementById("cantidad-ubicacion-wrap").hidden = !cfg.permiteUbicacion;
    document.getElementById("cantidad-ubicacion").value = esConteo ? (item["UBICACIÓN"] || "") : "";
    document.getElementById("cantidad-nota-wrap").hidden = !cfg.permiteNota;
    document.getElementById("cantidad-nota").value = esConteo ? (item["OBSERVACIONES"] || "") : "";

    abrirModal("modal-cantidad");
    setTimeout(() => document.getElementById("cantidad-input").focus(), 200);
  },

  confirmarCantidad() {
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];
    const valorRaw = document.getElementById("cantidad-input").value;
    const cantidad = Number(valorRaw);
    const valido = valorRaw !== "" && !isNaN(cantidad) && cantidad >= 0 && (cfg.absoluto || cantidad > 0);
    if (!valido) {
      mostrarToast("Escribe una cantidad válida");
      return;
    }
    let destino;
    if (this.tipoActual === "traspaso" && this.traspasoModo === "galpon") {
      destino = document.getElementById("mov-destino-galpon").value.trim();
      if (!destino) {
        mostrarToast("Indica el galpón de destino");
        return;
      }
    } else if (this.tipoActual === "traspaso" && this.traspasoModo === "almacen") {
      const sel = document.getElementById("mov-destino-almacen");
      if (!sel.value) {
        mostrarToast("No hay otro almacén cargado para traspasar");
        return;
      }
      destino = sel.options[sel.selectedIndex].textContent;
    }
    let nota, ubicacion;
    if (cfg.permiteNota) {
      nota = document.getElementById("cantidad-nota").value.trim();
    }
    if (cfg.permiteUbicacion) {
      ubicacion = document.getElementById("cantidad-ubicacion").value.trim();
    }
    this._agregarACarrito(this.itemPendiente, cantidad, destino, nota, ubicacion);
    cerrarModal("modal-cantidad");
    document.getElementById("search-input").value = "";
    document.getElementById("mov-sugerencias").innerHTML = "";
  },

  _agregarACarrito(item, cantidad, destino, nota, ubicacion) {
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];
    const existente = this.carrito.find((l) => l.id === item._id);
    if (existente) {
      existente.cantidad = cfg.absoluto ? cantidad : existente.cantidad + cantidad;
      if (destino) existente.destino = destino;
      if (nota !== undefined) existente.nota = nota;
      if (ubicacion !== undefined) existente.ubicacion = ubicacion;
    } else {
      this.carrito.push({
        id: item._id,
        codigo: item.CODIGO,
        galpon: item["GALPÓN"],
        descripcion: item["DESCRIPCIÓN"] || item.CODIGO,
        cantidad,
        destino,
        nota,
        ubicacion,
      });
    }
    this.render();
    mostrarToast("Agregado a la lista");
  },

  quitarLinea(id) {
    this.carrito = this.carrito.filter((l) => l.id !== id);
    this.render();
  },

  limpiarLista() {
    if (this.carrito.length === 0) return;
    if (confirm("¿Vaciar la lista de trabajo? No se aplicará ningún cambio.")) {
      this.carrito = [];
      this.render();
    }
  },

  render() {
    const cont = document.getElementById("mov-lista-trabajo");
    const vacio = document.getElementById("mov-vacio");
    const contador = document.getElementById("mov-contador");

    contador.textContent = this.carrito.length ? `${this.carrito.length} artículo(s)` : "";
    vacio.hidden = this.carrito.length !== 0 || Inventario.cache.length === 0;

    cont.innerHTML = this.carrito.map((linea) => `
      <div class="item-card" style="cursor:default;">
        <div class="item-card-main">
          <div class="item-cantidad">${linea.cantidad}</div>
          <div class="item-nombre">${escapeHtml(linea.descripcion)}</div>
          <div class="item-sub">${escapeHtml(linea.codigo)}${linea.galpon ? " · " + escapeHtml(linea.galpon) : ""}${linea.destino ? " → " + escapeHtml(linea.destino) : ""}${linea.ubicacion ? " · 📍" + escapeHtml(linea.ubicacion) : ""}${linea.nota ? " · " + escapeHtml(linea.nota) : ""}</div>
        </div>
        <div class="item-card-side">
          <button class="trash-btn" data-id="${linea.id}" aria-label="Quitar">${svgIcon("papelera")}</button>
        </div>
      </div>`).join("");

    cont.querySelectorAll(".trash-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.quitarLinea(Number(btn.dataset.id)));
    });
  },

  async finalizar() {
    if (this.carrito.length === 0) {
      mostrarToast("Agrega al menos un artículo a la lista");
      return;
    }
    const cfg = MOVIMIENTOS_CONFIG[this.tipoActual];

    // -------- Validaciones de los campos que aplican a toda la lista --------
    let persona = "", departamento = "", autorizadoPor = "";
    if (cfg.pidePersona) {
      persona = document.getElementById("mov-persona").value.trim();
      departamento = document.getElementById("mov-departamento").value.trim();
      if (!persona) {
        mostrarToast(`Escribe el ${cfg.personaLabel.toLowerCase()}`);
        return;
      }
      if (!departamento) {
        mostrarToast("Escribe el departamento que solicita");
        return;
      }
    }
    if (cfg.pideAutorizado) {
      autorizadoPor = document.getElementById("mov-autorizado-por").value.trim();
      if (!autorizadoPor) {
        mostrarToast("Escribe quién autoriza el traspaso");
        return;
      }
      if (this.traspasoModo === "almacen" && !document.getElementById("mov-destino-almacen").value) {
        mostrarToast("No hay otro almacén cargado para traspasar — carga uno primero en Ajustes");
        return;
      }
    }

    const actualizados = [];
    const ahora = new Date().toLocaleString("es");
    const nombreOrigen = Almacenes.nombreActual();

    for (const linea of this.carrito) {
      if (linea.nuevo) {
        const nueva = {
          "VOLUMEN MAESTRO": "", "VOLUMENES INTERMEDIOS": "", CODIGO: "",
          "DESCRIPCIÓN": linea.descripcion, "VOL. INTERMEDIOS": "", "CANT. PZA VOL. INTERMEDIO": "",
          "TOTAL PIEZAS": linea.cantidad, "GALPÓN": "", SISTEMA: "", "PEDIDO/ÍTEM": "",
          "PESO NETO": "", OBSERVACIONES: "", CONTEO: "", ENTREGADO: 0,
          "STOCK FINAL": linea.cantidad,
          PERSONA: persona, DEPARTAMENTO: departamento, TRASPASO: "", "AUTORIZADO POR": "",
          "UBICACIÓN": "", USUARIO: Auth.currentUser ? Auth.currentUser.usuario : "",
          "FECHA MODIFICACIÓN": ahora, _almacenId: Almacenes.actualId,
        };
        await DB.put("inventario", nueva);
        await Auditoria.registrar("Entrada", "(mercancía nueva)", "DESCRIPCIÓN", "-",
          `${linea.descripcion}: ${linea.cantidad} uds (trajo: ${persona}, ${departamento})`);
        continue;
      }
      const item = Inventario.cache.find((i) => i._id === linea.id);
      if (!item) continue;
      const ref = `${item.CODIGO}${item["GALPÓN"] ? " · " + item["GALPÓN"] : ""}`;

      if (this.tipoActual === "entrada") {
        const antes = Number(item["TOTAL PIEZAS"]) || 0;
        item["TOTAL PIEZAS"] = antes + linea.cantidad;
        item["STOCK FINAL"] = calcularStockFinal(item);
        item["PERSONA"] = persona;
        item["DEPARTAMENTO"] = departamento;
        await Auditoria.registrar("Entrada", ref, "TOTAL PIEZAS", antes, `${item["TOTAL PIEZAS"]} (trajo: ${persona}, ${departamento})`);
      } else if (this.tipoActual === "salida") {
        const antes = item["ENTREGADO"] === "" || item["ENTREGADO"] == null ? 0 : Number(item["ENTREGADO"]);
        item["ENTREGADO"] = antes + linea.cantidad;
        item["STOCK FINAL"] = calcularStockFinal(item);
        item["PERSONA"] = persona;
        item["DEPARTAMENTO"] = departamento;
        await Auditoria.registrar("Salida", ref, "ENTREGADO", antes, `${item["ENTREGADO"]} (retira: ${persona}, ${departamento})`);
      } else if (this.tipoActual === "traspaso" && this.traspasoModo === "galpon") {
        const antes = item["GALPÓN"];
        item["GALPÓN"] = linea.destino;
        item["TRASPASO"] = `Cambió de galpón: "${antes || "—"}" → "${linea.destino}" · ${linea.cantidad} uds · ${ahora}`;
        item["AUTORIZADO POR"] = autorizadoPor;
        await Auditoria.registrar("Traspaso", ref, "GALPÓN", antes, `${linea.destino} (${linea.cantidad} uds, autorizó: ${autorizadoPor})`);
      } else if (this.tipoActual === "traspaso" && this.traspasoModo === "almacen") {
        await this._traspasarAOtroAlmacen(item, linea, autorizadoPor, ahora, nombreOrigen, ref);
      } else if (this.tipoActual === "conteo") {
        const antes = item["CONTEO"] === "" || item["CONTEO"] == null ? "" : item["CONTEO"];
        item["CONTEO"] = linea.cantidad;
        item["STOCK FINAL"] = calcularStockFinal(item);
        await Auditoria.registrar("Conteo", ref, "CONTEO", antes, item["CONTEO"]);
        if (linea.nota) {
          const notaAntes = item["OBSERVACIONES"] || "-";
          item["OBSERVACIONES"] = linea.nota;
          await Auditoria.registrar("Conteo", ref, "OBSERVACIONES", notaAntes, linea.nota);
        }
        if (linea.ubicacion) {
          const ubicAntes = item["UBICACIÓN"] || "-";
          item["UBICACIÓN"] = linea.ubicacion;
          await Auditoria.registrar("Conteo", ref, "UBICACIÓN", ubicAntes, linea.ubicacion);
        }
      }
      item["USUARIO"] = Auth.currentUser ? Auth.currentUser.usuario : "";
      item["FECHA MODIFICACIÓN"] = ahora;
      actualizados.push(item);
    }

    await DB.bulkPut("inventario", actualizados);
    await Inventario.cargarDesdeDB();
    this.carrito = [];
    this.render();
    mostrarToast(`${cfg.accion} registrada`);
    volverAInicio();
  },

  /* Mueve una cantidad de la fila actual (almacén de origen) hacia una
     fila equivalente en OTRO almacén — dos bases de datos separadas, así
     que no se toca nada del resto de ese otro almacén, solo se suma la
     cantidad a su artículo (o se crea si no existía todavía). */
  async _traspasarAOtroAlmacen(item, linea, autorizadoPor, ahora, nombreOrigen, ref) {
    const almacenDestinoId = document.getElementById("mov-destino-almacen").value;
    const almacenDestino = Almacenes.cacheLista.find((a) => a.id === almacenDestinoId);
    if (!almacenDestino) return;

    const antes = Number(item["TOTAL PIEZAS"]) || 0;
    item["TOTAL PIEZAS"] = Math.max(0, antes - linea.cantidad);
    item["STOCK FINAL"] = calcularStockFinal(item);
    item["TRASPASO"] = `Salió hacia "${almacenDestino.nombre}" · ${linea.cantidad} uds · ${ahora}`;
    item["AUTORIZADO POR"] = autorizadoPor;

    const todos = await DB.getAll("inventario");
    const existente = todos.find((r) => r._almacenId === almacenDestinoId && r.CODIGO === item.CODIGO);
    const notaEntrada = `Entró desde "${nombreOrigen}" · ${linea.cantidad} uds · ${ahora}`;

    if (existente) {
      const antesDestino = Number(existente["TOTAL PIEZAS"]) || 0;
      existente["TOTAL PIEZAS"] = antesDestino + linea.cantidad;
      existente["STOCK FINAL"] = calcularStockFinal(existente);
      existente["TRASPASO"] = notaEntrada;
      existente["AUTORIZADO POR"] = autorizadoPor;
      existente["USUARIO"] = Auth.currentUser ? Auth.currentUser.usuario : "";
      existente["FECHA MODIFICACIÓN"] = ahora;
      await DB.put("inventario", existente);
    } else {
      const nueva = { ...item };
      delete nueva._id;
      nueva._almacenId = almacenDestinoId;
      nueva["TOTAL PIEZAS"] = linea.cantidad;
      nueva["CONTEO"] = "";
      nueva["ENTREGADO"] = 0;
      nueva["STOCK FINAL"] = linea.cantidad;
      nueva["TRASPASO"] = notaEntrada;
      nueva["AUTORIZADO POR"] = autorizadoPor;
      nueva["USUARIO"] = Auth.currentUser ? Auth.currentUser.usuario : "";
      nueva["FECHA MODIFICACIÓN"] = ahora;
      await DB.put("inventario", nueva);
    }

    await Auditoria.registrar("Traspaso", ref, "TOTAL PIEZAS", antes,
      `${item["TOTAL PIEZAS"]} (se enviaron ${linea.cantidad} a "${almacenDestino.nombre}", autorizó: ${autorizadoPor})`);
  },
};

/* Resalta la parte del texto que coincide con la búsqueda */
function resaltar(texto, busqueda) {
  const t = String(texto ?? "");
  if (!busqueda) return escapeHtml(t);
  const q = normalizarTexto(busqueda);
  const tn = normalizarTexto(t);
  const idx = tn.indexOf(q);
  if (idx === -1) return escapeHtml(t);
  return escapeHtml(t.slice(0, idx)) + "<mark>" + escapeHtml(t.slice(idx, idx + busqueda.length)) + "</mark>" + escapeHtml(t.slice(idx + busqueda.length));
}
