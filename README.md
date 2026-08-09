# Inventario Offline — instrucciones (v6)

App web instalable (PWA): en el teléfono se agrega a la pantalla de inicio
como una app más y funciona **sin internet** en el día a día. En PC o
navegador ancho se ve como una página web normal, con dashboard incluido.

## Sobre "que todos vean el Excel que cargó el Coordinador"

Me lo has pedido un par de veces ya, así que quiero ser claro: **con la
arquitectura actual (sin servidor, para poder funcionar sin internet), esto
no es posible automáticamente** — cada dispositivo guarda su propia copia.
No es algo que se me haya quedado pendiente por descuido; es la
consecuencia directa de que la app funcione offline.

Si de verdad necesitas que varios usuarios, en distintos dispositivos, vean
al instante lo que carga el Coordinador, la única forma real de lograrlo es
agregar un servidor/base de datos en la nube (por ejemplo Firebase, que
tiene un plan gratuito y — buena noticia — también sabe funcionar offline y
sincronizar solo cuando hay señal, así que no perderíamos la parte offline).
Es un cambio de arquitectura de verdad, no un ajuste chico, y necesitaría
que crees una cuenta gratuita y me compartas las claves del proyecto para
conectarlo. Dime si quieres que lo hagamos y lo planificamos como el
siguiente paso grande.

Mientras tanto, la forma de mantener a todos alineados es: el Coordinador
carga el Excel y lo comparte (WhatsApp, correo, drive) con el resto, y cada
quien lo carga en **Ajustes → Base de datos → Cargar Excel** en su propio
dispositivo.

## Novedades de esta versión

- **Entrada de almacén con mercancía nueva (sin código):** al entrar a
  "Entrada de almacén" hay un selector arriba — "Artículo existente" /
  "Mercancía nueva". En "Mercancía nueva" solo pide Descripción y Total de
  piezas, y usa el departamento/persona que ya escribiste arriba; guarda la
  descripción en `DESCRIPCIÓN`, la cantidad en `TOTAL PIEZAS`, y la fecha y
  hora quedan solas en `FECHA MODIFICACIÓN` — sin CODIGO, tal como pediste.
- **Conteo físico bloqueado por artículo:** si un artículo ya fue contado,
  aparece marcado en **rojo** con la etiqueta "Ya contado: N" en la
  búsqueda de Conteo. Si otro auxiliar intenta contarlo de nuevo, la app
  pide confirmación antes de dejarlo reemplazar el conteo — así dos
  personas no cuentan lo mismo por accidente.
- **Dashboard de escritorio:** al entrar desde una PC o navegador ancho,
  debajo de los accesos rápidos aparece un dashboard del almacén
  seleccionado: KPIs (total de piezas, total contado, % del stock contado,
  etc.) y gráficos — Stock total vs. stock final, Conteo vs. total (con el
  % contado), piezas por galpón, y entregado vs. disponible. Se arma solo
  con los datos del Excel que hayas cargado, no hace falta ningún archivo
  aparte, y se actualiza si cargas un Excel distinto.
- **La app en PC ahora se ve como una página web normal:** barra lateral de
  navegación en vez de la barra inferior de teléfono, usando todo el ancho
  de la pantalla. Consulta y el resto de las pantallas de trabajo quedan
  con el mismo diseño de siempre (mismas tarjetas, mismos colores) — solo
  mejor acomodadas, ya no estiradas de punta a punta ni encerradas en un
  panel angosto tipo teléfono.
- **Ubicación en Conteo físico:** al hacer un conteo, ahora puedes anotar
  en qué ubicación (pasillo, estante, etc.) encontraste el material. Se ve
  en Consulta junto al resto de los datos del artículo, y se agregó como
  columna nueva (`UBICACIÓN`) al descargar el Excel.
- **Lee cualquier Excel:** antes, la app esperaba que los encabezados
  estuvieran siempre en la primera fila. Ahora revisa las primeras 20 filas
  de cada hoja del archivo buscando dónde está la columna CODIGO — así
  funciona aunque el Excel tenga un título, un logo o filas en blanco antes
  de la tabla. También es más flexible leyendo números escritos de formas
  distintas (con comas, puntos, unidades como "2,5 kg", etc.).
- **Actualizaciones confiables:** ahora la app avisa (banner arriba, con
  botón "Actualizar") cuando hay una versión nueva, en vez de quedarse
  pegada en una vieja por el caché del teléfono.
- **Búsqueda de Consulta amplia:** busca por código, descripción, galpón,
  sistema, pedido/ítem, ubicación, volumen maestro, persona y departamento
  — si te salía muy limitada, muy probablemente tu teléfono tenía una
  versión vieja en caché (ver el punto de arriba).
- **Consulta suma las coincidencias:** si buscas un código que aparece en
  varios lotes/galpones, arriba de los resultados aparece un cuadro con el
  total de coincidencias, la suma de **Total piezas** y la suma de **Stock
  final** de todo lo que encontró.
- **Traspaso entre almacenes distintos:** además de mover un artículo de un
  galpón a otro (dentro del mismo almacén), puedes elegir "Traspaso entre
  almacenes" para mover cantidad de un almacén hacia otro almacén cargado
  en la app — resta del origen, suma en el destino (o crea el artículo ahí
  si no existía), sin afectar el resto de ninguno de los dos.
- **Nuevos campos en Entrada, Salida y Traspaso:** se pide el **nombre y
  apellido** de quien trae o retira el material, el **departamento que
  solicita**, y en Traspaso además **quién autoriza**. La fecha y hora
  quedan registradas solas. Todo esto se guarda en columnas del Excel de
  ese almacén: `PERSONA`, `DEPARTAMENTO`, `TRASPASO` y `AUTORIZADO POR`.
- **Varios almacenes independientes:** puedes cargar más de un Excel, cada
  uno con el nombre de almacén que tú elijas (por ejemplo "Almacén
  Central", "Depósito Norte"). Sus datos **nunca se mezclan**.
- **Columna "USUARIO" y "FECHA MODIFICACIÓN":** cada Entrada, Salida,
  Traspaso o Conteo actualiza automáticamente estas dos columnas con quién
  lo hizo y cuándo — visibles en Consulta e incluidas al descargar el
  Excel. Aparte queda el Registro de actividad general, con el historial
  completo.
- **Descargar Excel con el nombre del almacén:** tanto el archivo como el
  nombre de la pestaña dentro del Excel llevan el nombre del almacén que
  estás exportando.
- **Colores cálidos:** las 5 tarjetas de Inicio (Consulta, Entrada, Salida,
  Traspaso, Conteo) usan una paleta ámbar/terracota, ninguno oscuro — en
  cuanto me pases tu logo, ajusto los tonos exactos para que combinen.
- **Logo de la empresa:** se sube una vez desde Ajustes y aparece en el
  login y en el encabezado; se puede usar como imagen de fondo con un
  botón.
- Las credenciales del usuario inicial ya **no se muestran en la pantalla
  de login** (quedan solo en este documento, para el administrador).
- Botón de escaneo con la cámara del teléfono (ver limitación abajo).

## Tres bugs que encontré y corregí mientras probaba todo esto

No los reportaste, pero aparecieron al probar los cambios y los arreglé
antes de entregarte la app:
- El dashboard de escritorio no se veía por un error de orden en el CSS
  (una regla que lo escondía quedaba después de la que lo mostraba).
- Si usabas "Mercancía nueva" en Entrada y después entrabas a Conteo,
  Salida o Consulta, la barra de búsqueda se quedaba bloqueada.
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
2. En **Ajustes → Marca de la empresa**, sube tu logo. Aparecerá en la
   pantalla de inicio de sesión y en el encabezado. Si quieres, toca "Usar
   el logo como fondo" para que también se vea (de forma sutil, con
   transparencia) detrás de toda la app.
3. Ve a **Usuarios** y crea las cuentas del equipo con su rol:
   - **Coordinador / Analista**: acceso total — Consulta, Entrada, Salida,
     Traspaso, Conteo físico, cargar el Excel, Usuarios y Registro.
   - **Auxiliar**: puede usar **Consulta**, **Salida de almacén** y
     **Conteo físico** (que cubre CONTEO, ENTREGADO y OBSERVACIONES). Las
     tarjetas de Entrada y Traspaso aparecen desactivadas porque afectan
     columnas que un Auxiliar no debe tocar directamente.
4. En **Ajustes → Base de datos** (o tocando el botón del almacén arriba de
   Inicio), toca **Cargar Excel**. Te va a pedir un **nombre para ese
   almacén** — escribe uno descriptivo, por ejemplo "Almacén Central" — y
   luego sube el archivo con las columnas: `VOLUMEN MAESTRO, VOLUMENES
   INTERMEDIOS, CODIGO, DESCRIPCIÓN, VOL. INTERMEDIOS, CANT. PZA VOL.
   INTERMEDIO, TOTAL PIEZAS, GALPÓN, SISTEMA, PEDIDO/ÍTEM, PESO NETO,
   OBSERVACIONES, CONTEO, ENTREGADO`. No hace falta que agregues las
   columnas `PERSONA`, `DEPARTAMENTO`, `TRASPASO`, `AUTORIZADO POR`,
   `UBICACIÓN`, `USUARIO` ni `FECHA MODIFICACIÓN` — la app las crea sola.
5. **¿Tienes más de un almacén?** Repite el paso 4 con otro nombre (por
   ejemplo "Depósito Norte") — queda guardado aparte. Para cambiar entre
   ellos, toca el botón del almacén arriba de Inicio en cualquier momento.

## Cómo se usa cada botón de Inicio

- **Consulta:** busca un artículo por código, descripción, galpón, sistema,
  pedido/ítem, ubicación, persona o departamento, y ve toda su información,
  incluido quién fue la última persona que lo modificó. Si hay varias
  coincidencias del mismo artículo, arriba se ve el total sumado. No
  cambia nada — es de solo lectura, disponible para cualquier rol.
- **Entrada de almacén:** cuando llega mercancía. Escribe quién la trae y
  el departamento que la solicita, y elige:
  - **Artículo existente:** busca el artículo, indica cuánto llegó.
  - **Mercancía nueva:** para algo que no tiene código todavía — solo pide
    descripción y total de piezas.
  Agrega todo lo que necesites a la lista y presiona **Finalizar** (o
  **Limpiar lista** para descartar sin guardar nada).
- **Salida de almacén:** igual que Entrada (artículo existente), con el
  nombre de quien retira el material.
- **Traspaso:** selector arriba de la pantalla con dos modalidades:
  - **Entre galpones:** mueve el artículo de un galpón a otro dentro del
    mismo almacén.
  - **Entre almacenes:** mueve una cantidad hacia *otro almacén* de los
    que tengas cargados — resta del actual, suma en el destino.
  En ambos casos se pide quién autoriza.
- **Conteo físico:** busca el artículo, escribe la cantidad que contaste a
  mano (reemplaza el conteo anterior, no lo suma) y, si hace falta, una
  ubicación y una observación. Si ya estaba contado, aparece en rojo y pide
  confirmación antes de sobreescribirlo.

Todas las pantallas anteriores (menos Consulta) actualizan automáticamente
las columnas **USUARIO** y **FECHA MODIFICACIÓN** del artículo que tocaste.

> **Nota sobre Traspaso "entre galpones":** cada código de artículo vive en
> un único galpón a la vez dentro del almacén (no se reparte el mismo
> código entre dos galpones). La modalidad "entre almacenes" sí divide
> cantidades libremente, porque cada almacén es una base de datos separada.

## Sobre el botón de escanear (📷)

Usa una función nativa del navegador (sin ninguna librería externa) para
leer códigos de barra con la cámara. Funciona en **Chrome para Android**.
En iPhone (Safari) o navegadores de escritorio todavía no está disponible
a nivel del navegador — en ese caso, el botón avisa que hay que escribir el
código a mano en la barra de búsqueda, que sigue funcionando siempre.

## Apariencia

En **Ajustes** puedes elegir tema claro, oscuro, o imagen de fondo (tu logo
u otra imagen) con una barra para controlar la transparencia. Los colores
de las 5 tarjetas de Inicio y del dashboard están como variables al
principio de `css/styles.css` (`--card-consulta-bg`, etc.), fáciles de
ajustar cuando me pases tu logo.

## Preguntas frecuentes

**¿Y si no tengo forma de subir esto a GitHub?**
Dímelo y preparamos otra vía, o te guío paso a paso con capturas.

**¿El dashboard de escritorio necesita un archivo aparte?**
No — se arma solo con los datos del almacén que tengas seleccionado, los
mismos que ves en Consulta. Si cambias de almacén o cargas un Excel nuevo,
el dashboard se actualiza solo.
