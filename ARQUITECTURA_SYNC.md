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

Ver `firestore.rules` — reglas ya escritas y pensadas para la situación
real de ahora mismo: como el login por usuario todavía no está conectado
a Firebase Authentication (eso es la Fase 5), cada dispositivo entra a la
nube con una sesión anónima automática, así que las reglas por ahora
solo exigen "estar autenticado" (aunque sea anónimamente), no un rol
específico — el control de qué puede tocar cada rol lo sigue haciendo la
app, igual que hoy. El registro de auditoría es de solo agregar — nadie
puede editarlo ni borrarlo, ni siquiera un Coordinador.

**⚠️ Cada vez que `firestore.rules` cambie en este proyecto, hay que
volver a pegarlo en la consola de Firebase y publicarlo — ese archivo no
se aplica solo. La primera versión de las reglas exigía un rol que la
sesión anónima no tiene, y eso hacía que cargar un Excel nuevo se
rechazara en silencio (por eso "no se sincronizaba"). Ya está corregido
en el archivo, pero si tu proyecto de Firebase todavía tiene la versión
vieja publicada, vas a seguir viendo el mismo problema hasta que
republiques la versión de este ZIP.**

## 5. Plan de migración (para no romper nada de un día para otro)

1. ✅ **Fase 1:** módulo `js/firebase-sync.js` construido.
2. ✅ **Fase 2:** configuración real cargada (proyecto
   `inventario-almacen2`), conexión probada.
3. ✅ **Fase 3 (recién terminada):** `db.js`, `almacenes.js`,
   `inventario.js` y `movimientos.js` ya leen y escriben en Firestore de
   verdad — cargar un Excel, hacer una Entrada/Salida/Traspaso/Conteo, o
   crear un almacén nuevo se sube solo a la nube, y los demás
   dispositivos lo reciben en tiempo real (mientras tengan ese almacén
   abierto) o la próxima vez que entren a él. Todo probado con dos
   sesiones de navegador independientes simulando dos dispositivos.
4. ⏳ **Fase 4:** botón de "subir mis datos actuales a la nube" para
   pasar lo que ya tengas cargado localmente en cada dispositivo, una
   sola vez (para no perder nada de lo que ya cargaste antes de esta
   fase).
5. ⏳ **Fase 5:** apagar el sistema de usuarios hecho a mano, dejar
   Firebase Authentication como único método de login — esto es lo que
   permitiría, además, endurecer `firestore.rules` para exigir el rol
   correcto de cada quien.

Cada fase se prueba y se entrega por separado — no vamos a reemplazar
todo de un salto.

## 6. Cómo confirmar que la Fase 3 funciona en tus dispositivos reales

1. Sube esta versión a tu hosting.
2. **Vuelve a publicar `firestore.rules`** en la consola de Firebase
   (Firestore Database → Reglas → pegar → Publicar) — es el paso que más
   se olvida y el que más causa "no sincroniza".
3. En un dispositivo (o pestaña), carga un Excel en un almacén con un
   nombre que no hayas usado antes.
4. En otro dispositivo (o pestaña de incógnito), entra a la app,
   selecciona ese mismo almacén — deberías ver los mismos datos.
5. Si no aparece, abre la consola del navegador (F12 → pestaña Console)
   y buscá mensajes que empiecen con "No se pudo sincronizar" o "No se
   pudo leer de la nube" — cópiame el texto exacto, ahí dice la causa.
