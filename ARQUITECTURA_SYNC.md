# Arquitectura de sincronización — plan técnico

Alcance confirmado: 6-20 dispositivos/usuarios, internet intermitente,
Firebase (plan gratuito) aceptado.

## 1. Por qué Firestore y no un servidor propio

Un servidor propio (Node.js + una base de datos + hosting) nos obligaría a
programar nosotros mismos toda la lógica de "qué hago si no hay señal,
cómo sé qué cambió mientras estaba desconectado, cómo evito que dos
personas se pisen" — que es exactamente lo difícil de este problema.
Firestore (parte de Firebase, de Google) ya trae eso resuelto: el SDK
guarda una copia local en el dispositivo, seguís trabajando sin conexión,
y cuando vuelve la señal sincroniza solo. Para 6-20 usuarios, el plan
gratuito de Firebase alcanza de sobra (50,000 lecturas y 20,000 escrituras
gratis por día).

## 2. Modelo de datos (colecciones de Firestore)

```
usuarios/{uid}
  nombre, rol (Coordinador | Analista | Auxiliar)
  → uid es el mismo ID que genera Firebase Authentication

almacenes/{almacenId}
  nombre, creadoPor, fechaCreacion

inventario/{itemId}
  almacenId  ← qué almacén es (reemplaza el campo _almacenId de hoy)
  CODIGO, DESCRIPCIÓN, TOTAL PIEZAS, CONTEO, ENTREGADO, STOCK FINAL,
  GALPÓN, SISTEMA, PEDIDO/ÍTEM, PESO NETO, OBSERVACIONES, UBICACIÓN,
  PERSONA, DEPARTAMENTO, TRASPASO, AUTORIZADO POR,
  USUARIO, FECHA MODIFICACIÓN
  (son los mismos campos que ya tiene la app hoy)

auditoria/{registroId}
  fecha, usuario, accion, codigoItem, campo, valorAnterior, valorNuevo
  (solo se agregan documentos, nunca se editan ni se borran)
```

Es prácticamente el mismo modelo que ya tiene `db.js` en IndexedDB — el
cambio real no es "rediseñar los datos", es "que vivan en la nube en vez
de en un solo navegador".

## 3. Cómo se evita que dos personas se pisen sin señal

Cuando dos dispositivos hacen una Salida del mismo artículo mientras
ambos están sin conexión, y luego los dos recuperan señal, hay que
sumar las dos salidas, no que la segunda tape a la primera. Por eso los
campos numéricos (`TOTAL PIEZAS`, `CONTEO`, `ENTREGADO`) se van a escribir
con `increment()` de Firestore — una operación atómica de "sumale esto",
no un "leí 100, le sumo 20, guardo 120". Así, aunque lleguen las dos
escrituras fuera de orden, el resultado final es correcto.

## 4. Seguridad

Ver `firestore.rules` — reglas ya escritas, listas para pegar en la
consola de Firebase apenas tengamos el proyecto:
- Cualquier operación requiere haber iniciado sesión (Firebase
  Authentication, no la contraseña hasheada a mano que usamos hoy).
- Crear o borrar un almacén (osea, cargar un Excel nuevo) requiere ser
  Coordinador o Analista.
- El registro de auditoría es de solo agregar — ni siquiera un
  Coordinador puede editarlo o borrarlo desde la app.

## 5. Plan de migración (para no romper nada de un día para otro)

1. ✅ **Fase 1 (lista):** módulo `js/firebase-sync.js` construido.
2. 🔄 **Fase 2 (en curso):** configuración real cargada (proyecto
   `inventario-almacen2`). Falta que confirmes, desde **Ajustes →
   Sincronización en la nube → Probar conexión**, que efectivamente
   conecta desde tu navegador — yo no tengo salida a internet real desde
   donde trabajo para probarlo por ti. Reglas de Firestore (`firestore.rules`)
   listas para publicar en la consola de Firebase.
3. ⏳ **Fase 3:** migrar `db.js` para que lea y escriba en Firestore en vez
   de IndexedDB (Firestore ya trae su propio caché offline, así que en
   la práctica se simplifica, no se complica).
4. ⏳ **Fase 4:** botón de "subir mis datos actuales a la nube" para pasar
   lo que ya tengas cargado localmente, una sola vez.
5. ⏳ **Fase 5:** apagar el sistema de usuarios hecho a mano, dejar
   Firebase Authentication como único método de login.

Cada fase se prueba y se entrega por separado — no vamos a reemplazar
todo de un salto.

## 6. Cómo probar la Fase 2

1. Sube esta versión a tu hosting (GitHub Pages/Netlify) como siempre.
2. En la consola de Firebase, pega el contenido de `firestore.rules` en
   Firestore Database → pestaña "Reglas" → Publicar (si todavía no lo
   hiciste, la prueba de conexión va a fallar por permisos).
3. Abre la app → Ajustes → Sincronización en la nube → **Probar
   conexión**. Debería decir "Conectado — escritura y lectura
   confirmadas" con la fecha y hora. Si da error, cópiame el mensaje
   exacto y lo resolvemos.
