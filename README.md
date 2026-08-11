# Inventario Offline — instrucciones (v9)

App web instalable (PWA): en el teléfono se agrega a la pantalla de inicio
como una app más y funciona **sin internet** en el día a día. En PC o
navegador ancho se ve como una página web normal a pantalla completa, con
un dashboard con gráficos incluido.

## Sobre "que todos vean el Excel que cargó el Coordinador"

Me lo has pedido varias veces, así que quiero ser claro: **con la
arquitectura actual (sin servidor, para poder funcionar sin internet), esto
no es posible automáticamente** — cada dispositivo guarda su propia copia.
No es algo que se me haya quedado pendiente por descuido; es la
consecuencia directa de que la app funcione offline.

La única forma real de lograrlo es agregar un servidor/base de datos en la
nube (por ejemplo Firebase, que tiene un plan gratuito y también sabe
funcionar offline, sincronizando solo cuando hay señal). Es un cambio de
arquitectura de verdad, no un ajuste chico — quedamos en retomarlo aparte,
cuando definamos bien el alcance.

Mientras tanto: el Coordinador carga el Excel y lo comparte (WhatsApp,
correo, drive) con el resto, y cada quien lo carga en **Ajustes → Base de
datos → Cargar Excel** en su propio dispositivo.

## Novedades de esta versión (v9)

- **Los gráficos ya no dependen de ningún servicio externo (el cambio más
  importante):** antes, el dashboard usaba una librería de gráficos
  (Chart.js) que se descargaba de internet la primera vez. Si esa descarga
  fallaba (red restringida, bloqueador de anuncios, o simplemente que
  todavía no había terminado de cargar), las 4 tarjetas de gráficos se
  quedaban en blanco — eso es lo que viste en tu captura. Reescribí los
  gráficos con código propio (un canvas de HTML, sin ninguna librería), así
  que ahora **siempre** se dibujan, incluso la primerísima vez que se abre
  la app sin conexión.
- **Barra lateral colapsable:** en PC, muestra solo tu logo y los íconos de
  cada sección — al pasar el cursor sobre ella, se despliega y muestra las
  etiquetas de cada opción.
- **Los 4 gráficos del dashboard, redefinidos y en forma de dona:**
  1. **Total de piezas vs. stock final** (Stock final = Total − Conteo −
     Entregado), con el % en el centro.
  2. **Total de piezas vs. entregado**, con el % en el centro.
  3. **Cantidad disponible por producto** — calculada como Total menos
     Entregado (es decir, en base a las salidas), repartida por producto.
  4. **Total de piezas vs. conteo**, con el % contado en el centro.
- **Dashboard: se actualiza solo al cambiar de almacén** — no hace falta
  recargar la página.
- **KPIs recortados a 6:** quité "Filas cargadas" y "Filas ya contadas".
  Dejé **"Códigos distintos"** porque, como el mismo CODIGO puede repetirse
  en varios lotes/galpones, es la única cifra que muestra de un vistazo
  cuántos artículos distintos hay — "filas cargadas" mezclaba lotes
  repetidos y confundía esa lectura. Si prefieres que también la quite,
  dímelo.
- **3 paletas de colores:** en **Ajustes → Paleta de colores** puedes
  elegir entre *Ámbar cálido* (la de siempre), *Azul profesional* o *Verde
  esmeralda*. Se aplica a las 5 tarjetas de Inicio y a los colores del
  dashboard.
- **PC a pantalla completa:** la app ya no queda encerrada en un panel de
  ancho fijo — usa todo el espacio de la pantalla. En el teléfono sigue
  adaptándose a su tamaño como siempre.
- **Entrada de almacén con mercancía nueva (sin código):** selector arriba
  — "Artículo existente" / "Mercancía nueva". En "Mercancía nueva" solo
  pide Descripción y Total de piezas; la fecha y hora quedan solas.
- **Conteo físico bloqueado por artículo:** si un artículo ya fue contado,
  aparece marcado en **rojo** con "Ya contado: N". Si alguien intenta
  contarlo de nuevo, la app pide confirmación antes de reemplazarlo.
- **Ubicación en Conteo físico:** anota en qué ubicación (pasillo, estante,
  etc.) encontraste el material — visible en Consulta e incluida al
  descargar el Excel.
- **Lee cualquier Excel:** revisa las primeras 20 filas de cada hoja
  buscando la columna CODIGO, así que funciona aunque haya un título, un
  logo o filas en blanco antes de la tabla. También es flexible con
  números en formatos distintos ("1,250", "2,5 kg", etc.).
- **Búsqueda de Consulta amplia:** por código, descripción, galpón,
  sistema, pedido/ítem, ubicación, volumen maestro, persona y departamento.
- **Consulta suma las coincidencias:** cuadro con el total de
  coincidencias, la suma de Total piezas y la suma de Stock final.
- **Traspaso entre almacenes distintos**, además de entre galpones dentro
  del mismo almacén — con campo de quién autoriza.
- **Nuevos campos en Entrada, Salida y Traspaso:** nombre de quien trae o
  retira, departamento que solicita, y quién autoriza (en Traspaso). Todo
  en columnas nuevas del Excel: `PERSONA`, `DEPARTAMENTO`, `TRASPASO`,
  `AUTORIZADO POR`.
- **Varios almacenes independientes**, cada uno con su propio Excel — sus
  datos nunca se mezclan.
- **Columnas "USUARIO" y "FECHA MODIFICACIÓN"** actualizadas solas en cada
  Entrada/Salida/Traspaso/Conteo.
- **Descargar Excel con el nombre del almacén** en el archivo y en la
  pestaña.
- **Logo de la empresa**, subido una vez desde Ajustes, visible en login,
  encabezado y ahora también en la barra lateral de escritorio.
- Credenciales del usuario inicial ya no visibles en el login.
- Botón de escaneo con la cámara del teléfono (ver limitación abajo).

## Bugs que encontré y corregí mientras probaba todo esto

- **El más importante:** el dashboard dependía de una librería externa
  (Chart.js) que se cargaba desde internet. Ya no depende de nada externo
  — ver el primer punto de "Novedades" arriba.
- El dashboard de escritorio no se veía por un error de orden en el CSS.
- Si usabas "Mercancía nueva" en Entrada, la barra de búsqueda se quedaba
  bloqueada después en otras pantallas.
- Un desfase de índices podía romper la lectura de Excels con filas en
  blanco antes de los encabezados.

## Paso 1: subir los archivos a un hosting gratuito (una sola vez, con internet)

**Opción A — GitHub Pages (recomendada):**
1. Crea una cuenta gratuita en https://github.com si no tienes una.
2. Crea un repositorio nuevo (por ejemplo `inventario-app`), público.
3. Sube TODO el contenido de esta carpeta (`index.html`, `manifest.json`,
   `sw.js`, y las carpetas `css/`, `js/`, `icons/`).
4. Ve a **Settings > Pages**, en "Source" elige la rama `main` y guarda.
5. Tu app quedará en `https://TU-USUARIO.github.io/inventario-app/`

**Opción B — Netlify Drop:** https://app.netlify.com/drop y arrastra la
carpeta completa.

> Si ya tenías la app instalada y subes una versión nueva: en el teléfono
> te va a aparecer el banner de "Actualizar" solo. Si después de un rato
> con internet no aparece, fuerza el refresco una vez: en Chrome, entra al
> sitio → ⋮ → Información del sitio → Borrar datos del sitio, y vuelve a
> abrir el link.

## Paso 2: instalar la app en el teléfono (una sola vez, con internet)

1. Abre el link en Chrome (Android) o Safari (iPhone) y espera a que cargue
   por completo.
2. Android: menú ⋮ → "Instalar aplicación". iPhone: compartir 📤 → "Agregar
   a pantalla de inicio".
3. Desde ahora, ábrela sin necesitar conexión. En PC, simplemente entra al
   link desde el navegador — no hace falta instalar nada.

## Paso 3: pon tu logo, crea los usuarios y carga el Excel

1. Entra con **usuario:** `admin` · **contraseña:** `admin123` y cámbiala de
   inmediato en Ajustes. Esta es la única parte donde queda escrita esa
   contraseña — en la app ya no aparece, solo aquí para ti.
2. En **Ajustes → Marca de la empresa**, sube tu logo. Aparecerá en el
   login, el encabezado y la barra lateral de escritorio. Puedes usarlo
   también como imagen de fondo con un botón.
3. Ve a **Usuarios** y crea las cuentas del equipo con su rol:
   - **Coordinador / Analista**: acceso total.
   - **Auxiliar**: puede usar **Consulta**, **Salida de almacén** y
     **Conteo físico**. Entrada y Traspaso quedan desactivadas.
4. En **Ajustes → Base de datos** (o tocando el botón del almacén arriba de
   Inicio), toca **Cargar Excel**, pon un nombre de almacén (ej. "Almacén
   Central") y sube el archivo con las columnas: `VOLUMEN MAESTRO,
   VOLUMENES INTERMEDIOS, CODIGO, DESCRIPCIÓN, VOL. INTERMEDIOS, CANT. PZA
   VOL. INTERMEDIO, TOTAL PIEZAS, GALPÓN, SISTEMA, PEDIDO/ÍTEM, PESO NETO,
   OBSERVACIONES, CONTEO, ENTREGADO`. Las demás columnas (`PERSONA`,
   `DEPARTAMENTO`, `TRASPASO`, `AUTORIZADO POR`, `UBICACIÓN`, `USUARIO`,
   `FECHA MODIFICACIÓN`) las crea la app sola.
5. **¿Más de un almacén?** Repite el paso 4 con otro nombre — queda
   guardado aparte. Cambia entre ellos con el botón del almacén en Inicio.

## Cómo se usa cada botón de Inicio

- **Consulta:** busca y ve toda la información de un artículo, sin
  modificar nada. Si hay varias coincidencias, arriba se ve el total
  sumado.
- **Entrada de almacén:** "Artículo existente" (buscar y sumar cantidad) o
  "Mercancía nueva" (sin código, solo descripción y cantidad).
- **Salida de almacén:** igual que Entrada existente, resta/entrega stock.
- **Traspaso:** "Entre galpones" (mismo almacén) o "Entre almacenes"
  (resta de uno, suma en otro). Pide quién autoriza.
- **Conteo físico:** cantidad contada (reemplaza el conteo anterior),
  ubicación y observación opcionales. En rojo si ya fue contado.

> **Nota sobre Traspaso "entre galpones":** cada código de artículo vive en
> un único galpón a la vez dentro del almacén. La modalidad "entre
> almacenes" sí divide cantidades libremente, porque cada almacén es una
> base de datos separada.

## Sobre el botón de escanear (📷)

Usa una función nativa del navegador para leer códigos de barra con la
cámara. Funciona en **Chrome para Android**. En iPhone o navegadores de
escritorio, avisa que hay que escribir el código a mano.

## Apariencia

En **Ajustes** puedes elegir tema claro, oscuro, imagen de fondo, y una de
las 3 paletas de colores. Si más adelante me pasas tu logo y quieres una
cuarta paleta calcada a esos colores exactos, la agrego igual que las
otras tres.

## Preguntas frecuentes

**¿Y si no tengo forma de subir esto a GitHub?**
Dímelo y preparamos otra vía, o te guío paso a paso con capturas.

**¿El dashboard necesita un archivo aparte?**
No — se arma solo con los datos del almacén seleccionado, los mismos que
ves en Consulta.
