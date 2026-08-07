# Inventario Offline — instrucciones (v4)

App web instalable (PWA): se agrega a la pantalla de inicio del teléfono
como una app más y funciona **sin internet** en el día a día.

## Novedades de esta versión

- **Consulta ahora suma las coincidencias (nuevo):** si buscas un código que
  aparece en varios lotes/galpones, arriba de los resultados aparece un
  cuadro con el total de coincidencias, la suma de **Total piezas** y la
  suma de **Stock final** de todo lo que encontró — así ves de un vistazo
  cuánto hay en total de ese artículo, sin sumar a mano.
- **Traspaso entre almacenes distintos (nuevo):** además de mover un
  artículo de un galpón a otro (dentro del mismo almacén), ahora puedes
  elegir "Traspaso entre almacenes" para mover cantidad de un almacén hacia
  otro almacén cargado en la app — resta del origen, suma en el destino (o
  crea el artículo ahí si no existía), y ninguno de los dos almacenes se ve
  afectado más allá de esa cantidad exacta.
- **Nuevos campos en Entrada, Salida y Traspaso:** ahora se pide el
  **nombre y apellido** de quien trae o retira el material, el
  **departamento que solicita**, y en Traspaso además **quién autoriza**.
  La fecha y hora quedan registradas solas, sin que tengas que escribirlas.
  Todo esto se guarda en columnas nuevas del Excel de ese almacén:
  `PERSONA`, `DEPARTAMENTO`, `TRASPASO` y `AUTORIZADO POR`.
- **Varios almacenes independientes:** puedes cargar más de un Excel, cada
  uno con el nombre de almacén que tú elijas (por ejemplo "Almacén
  Central", "Depósito Norte"). Sus datos **nunca se mezclan** — cambiar de
  almacén, o hacer una Entrada/Salida/Traspaso/Conteo, solo afecta al
  almacén que tengas seleccionado en ese momento. El botón con el nombre
  del almacén actual está arriba de la pantalla de Inicio; tócalo para
  cambiar de almacén o cargar uno nuevo.
- **Pantalla de Consulta:** para buscar y ver la información completa de un
  artículo **sin modificar nada** — pensada para cuando solo necesitas
  revisar datos, no hacer un movimiento. La barra de búsqueda ya no aparece
  al entrar a la app; ahora vive únicamente dentro de Consulta y dentro de
  Entrada/Salida/Traspaso/Conteo (para buscar qué artículo mover).
- **Columna "USUARIO" y "FECHA MODIFICACIÓN":** cada vez que alguien hace
  una Entrada, Salida, Traspaso o Conteo sobre un artículo, esas dos
  columnas (al final de la tabla) se actualizan automáticamente con quién
  lo hizo y cuándo — se ven en Consulta y quedan incluidas cuando descargas
  el Excel. Esto es aparte del Registro de actividad general, que sigue
  llevando el historial completo de todos los cambios.
- **Descargar Excel con el nombre del almacén:** tanto el archivo
  (`inventario_almacen-central_2026-08-07.xlsx`) como el nombre de la
  pestaña dentro del Excel llevan el nombre del almacén que estás
  exportando, para no confundirlos si manejas varios.
- **Colores cálidos:** las 5 tarjetas de Inicio (Consulta, Entrada, Salida,
  Traspaso, Conteo) usan una paleta de tonos ámbar/terracota, ninguno
  oscuro — en cuanto me pases tu logo, ajusto los tonos exactos para que
  combinen con él.
- **Pantalla de inicio rediseñada**, con saludo personal y botones grandes
  de colores.
- **Logo de la empresa**: se sube una sola vez desde Ajustes y aparece
  automáticamente en la pantalla de inicio de sesión y en el encabezado de
  la app. El mismo logo se puede usar como imagen de fondo con un botón.
- **Búsqueda corregida:** si el mismo CODIGO aparece en varias filas del
  Excel (distintos lotes o galpones), la búsqueda ahora muestra **todas**
  las coincidencias por separado — como el filtro de Excel — en vez de
  quedarse con una sola.
- **Exportar todo lo realizado**: en Ajustes hay un botón para descargar un
  Excel con dos pestañas — el inventario actual y el registro completo de
  movimientos — además de la descarga simple del inventario.
- Las credenciales del usuario inicial ya **no se muestran en la pantalla
  de login** (quedan solo aquí, para el administrador).
- Botón de escaneo con la cámara del teléfono (ver limitación abajo).
- Diseño más cuidado: tarjetas redondeadas, íconos propios (sin emojis),
  tipografía más grande y botones más fáciles de tocar para personas sin
  experiencia con apps.

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

## Paso 2: instalar la app en el teléfono (una sola vez, con internet)

1. Abre el link en Chrome (Android) o Safari (iPhone) y espera a que cargue
   por completo.
2. Android: menú ⋮ → "Instalar aplicación". iPhone: compartir 📤 → "Agregar
   a pantalla de inicio".
3. Desde ahora, ábrela sin necesitar conexión.

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
   OBSERVACIONES, CONTEO, ENTREGADO`. Ese archivo pasa a ser la base de
   datos de ese almacén — el CODIGO puede repetirse si tienes varios lotes
   del mismo artículo, no hay problema. No hace falta que agregues las
   columnas `PERSONA`, `DEPARTAMENTO`, `TRASPASO`, `AUTORIZADO POR`,
   `USUARIO` ni `FECHA MODIFICACIÓN` — la app las crea y las llena sola a
   medida que se usan.
5. **¿Tienes más de un almacén?** Repite el paso 4 con otro nombre (por
   ejemplo "Depósito Norte") — queda guardado aparte, sin tocar el primero.
   Para cambiar entre ellos, toca el botón del almacén arriba de Inicio en
   cualquier momento; lo que elijas ahí es lo único que se ve y se modifica
   hasta que vuelvas a cambiarlo.

## Cómo se usa cada botón de Inicio

- **Consulta:** busca un artículo (por código, descripción, galpón, sistema
  o pedido/ítem) para ver toda su información, incluido quién fue la última
  persona que lo modificó. Si hay varias coincidencias del mismo artículo
  (distintos lotes), arriba se ve el total sumado. No cambia nada — es de
  solo lectura, disponible para cualquier rol.
- **Entrada de almacén:** cuando llega mercancía. Escribe el nombre y
  apellido de quien la trae y el departamento que la solicita, busca el
  artículo, indica cuánto llegó y agrégalo a la lista. Repite con todos los
  artículos que quieras y presiona **Finalizar** para aplicar todo junto
  (o **Limpiar lista** para descartar sin guardar nada).
- **Salida de almacén:** igual que Entrada, pero con el nombre de quien
  retira el material.
- **Traspaso:** tiene dos modalidades, con un selector arriba de la
  pantalla:
  - **Entre galpones** (la de siempre): mueve el artículo de un galpón a
    otro dentro del mismo almacén.
  - **Entre almacenes** (nueva): mueve una cantidad del artículo hacia
    *otro almacén* de los que tengas cargados en la app — resta esa
    cantidad del almacén actual y la suma en el almacén destino (creando
    el artículo ahí si todavía no existía). El resto de cada almacén no se
    toca.
  En ambos casos se pide quién autoriza el traspaso.
- **Conteo físico:** busca el artículo, escribe la cantidad que contaste a
  mano (esto **reemplaza** el conteo anterior, no lo suma) y, si hace
  falta, deja una observación — por ejemplo "faltan 5 por revisar". Al
  finalizar, se actualiza el CONTEO y las OBSERVACIONES de ese artículo.

Todas las pantallas anteriores (menos Consulta) actualizan automáticamente
las columnas **USUARIO** y **FECHA MODIFICACIÓN** del artículo que tocaste,
con tu usuario (el que iniciaste sesión) y la fecha/hora — así queda
registrado directamente en los datos, sin que tengas que hacer nada extra.

> **Nota sobre Traspaso "entre galpones":** en esa modalidad, cada código de
> artículo vive en un único galpón a la vez dentro del almacén (no se
> reparte el mismo código entre dos galpones). Si necesitas manejar el
> mismo código en varios galpones del mismo almacén a la vez con
> cantidades independientes, es un cambio de estructura de datos más
> grande — avísame si quieres que lo evaluemos. La modalidad "entre
> almacenes" sí divide cantidades libremente, porque cada almacén es una
> base de datos separada.

## Sobre el botón de escanear (📷)

Usa una función nativa del navegador (sin ninguna librería externa) para
leer códigos de barra con la cámara. Funciona en **Chrome para Android**.
En iPhone (Safari) o navegadores de escritorio todavía no está disponible
a nivel del navegador — en ese caso, el botón avisa que hay que escribir el
código a mano en la barra de búsqueda, que sigue funcionando siempre.

## Apariencia

En **Ajustes** puedes elegir tema claro, oscuro, o imagen de fondo (tu logo
u otra imagen) con una barra para controlar la transparencia.

## Preguntas frecuentes

**¿Puedo cambiar los colores de las 5 tarjetas de Inicio?**
Sí — están definidos como variables al principio de `css/styles.css`
(`--card-consulta-bg`, `--card-entrada-bg`, `--card-salida-bg`,
`--card-traspaso-bg`, `--card-conteo-bg`, y su versión `-fg` para el color
del texto). Ahora mismo son tonos cálidos ámbar/terracota; en cuanto me
compartas tu logo, te dejo los tonos ajustados a él.

**¿Y si no tengo forma de subir esto a GitHub?**
Dímelo y preparamos otra vía, o te guío paso a paso con capturas.

**¿Varios teléfonos pueden compartir el mismo inventario en tiempo real?**
No en esta versión — cada teléfono guarda su propia copia local para poder
funcionar sin internet. Está pensada para un dispositivo por
almacén/turno, que luego exporta el Excel para consolidar. Si necesitas
que varios teléfonos vean el mismo inventario al instante, eso requiere un
servidor central — es un proyecto distinto, avísame si te interesa
explorarlo.
