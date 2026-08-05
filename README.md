# Inventario Offline — instrucciones (v2)

App web instalable (PWA): se agrega a la pantalla de inicio del teléfono
como una app más y funciona **sin internet** en el día a día.

## Novedades de esta versión

- **Pantalla de inicio rediseñada**, con saludo personal y 4 botones grandes
  de colores: Entrada de almacén, Salida de almacén, Traspaso y Conteo
  físico.
- **Logo de la empresa**: se sube una sola vez desde Ajustes y aparece
  automáticamente en la pantalla de inicio de sesión y en el encabezado de
  la app. El mismo logo se puede usar como imagen de fondo con un botón.
- **La base de datos es el Excel que cargues**: en **Ajustes → Base de
  datos**, el Coordinador o Analista sube el Excel con el inventario y esa
  pasa a ser la información con la que trabaja toda la app (búsqueda,
  Entrada, Salida, Traspaso, Conteo) — todos los que entren después ven esos
  mismos datos.
- **Búsqueda corregida:** si el mismo CODIGO aparece en varias filas del
  Excel (distintos lotes o galpones), la búsqueda ahora muestra **todas**
  las coincidencias por separado — como el filtro de Excel — en vez de
  quedarse con una sola.
- **Entrada de almacén**: para registrar mercancía que llega. Suma la
  cantidad al `TOTAL PIEZAS` del artículo.
- **Salida de almacén**: para registrar mercancía que sale. Suma la
  cantidad al `ENTREGADO` del artículo (disponible también para el rol
  Auxiliar).
- **Traspaso**: mueve un artículo de un galpón a otro.
- **Conteo físico** (nuevo): para cuando cuentas la mercancía a mano. Busca
  el artículo, escribe la cantidad contada (reemplaza el `CONTEO` anterior,
  no lo suma) y, si quieres, deja una observación. Disponible también para
  el rol Auxiliar.
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
   - **Coordinador / Analista**: acceso total — Entrada, Salida, Traspaso,
     Conteo físico, cargar el Excel, Usuarios y Registro.
   - **Auxiliar**: solo puede usar **Salida de almacén** y **Conteo
     físico** (que cubre CONTEO, ENTREGADO y OBSERVACIONES). Las tarjetas
     de Entrada y Traspaso aparecen desactivadas porque afectan columnas
     que un Auxiliar no debe tocar directamente.
4. En **Ajustes → Base de datos**, toca **Cargar Excel** y sube tu
   inventario con las columnas: `VOLUMEN MAESTRO, VOLUMENES INTERMEDIOS,
   CODIGO, DESCRIPCIÓN, VOL. INTERMEDIOS, CANT. PZA VOL. INTERMEDIO, TOTAL
   PIEZAS, GALPÓN, SISTEMA, PEDIDO/ÍTEM, PESO NETO, OBSERVACIONES, CONTEO,
   ENTREGADO`. Ese archivo pasa a ser la base de datos de todos — el CODIGO
   puede repetirse si tienes varios lotes del mismo artículo, no hay
   problema.

## Cómo se usa cada botón de Inicio

- **Entrada de almacén:** cuando llega mercancía. Busca el artículo,
  escribe cuánto llegó, tócalo para agregarlo a la lista de trabajo y
  repite con todos los artículos que quieras. Al final, presiona
  **Finalizar** para aplicar todo junto (o **Limpiar lista** para
  descartar sin guardar nada).
- **Salida de almacén:** igual que Entrada, pero para lo que sale.
- **Traspaso:** además de buscar el artículo, indica a qué galpón se
  mueve antes de agregarlo a la lista.
- **Conteo físico:** busca el artículo, escribe la cantidad que contaste a
  mano (esto **reemplaza** el conteo anterior, no lo suma) y, si hace
  falta, deja una observación — por ejemplo "faltan 5 por revisar". Al
  finalizar, se actualiza el CONTEO y las OBSERVACIONES de ese artículo.

> **Nota honesta sobre Traspaso:** en esta versión cada código de artículo
> vive en un único galpón a la vez (no se reparte el mismo código entre dos
> galpones). Por eso un traspaso mueve el artículo completo a su nuevo
> galpón; la cantidad que escribes queda guardada como referencia en el
> registro de actividad, pero no "divide" el stock entre dos ubicaciones. Si
> más adelante necesitas manejar el mismo código en varios galpones a la
> vez con cantidades independientes, es un cambio de estructura de datos
> más grande — avísame si quieres que lo evaluemos.

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

**¿Puedo cambiar los colores de las 4 tarjetas de Inicio?**
Sí — están definidos como variables al principio de `css/styles.css`
(`--card-entrada-bg`, `--card-salida-bg`, `--card-traspaso-bg`,
`--card-conteo-bg`, y su versión `-fg` para el color del texto), fáciles de
ajustar a los colores de tu marca.

**¿Y si no tengo forma de subir esto a GitHub?**
Dímelo y preparamos otra vía, o te guío paso a paso con capturas.

**¿Varios teléfonos pueden compartir el mismo inventario en tiempo real?**
No en esta versión — cada teléfono guarda su propia copia local para poder
funcionar sin internet. Está pensada para un dispositivo por
almacén/turno, que luego exporta el Excel para consolidar. Si necesitas
que varios teléfonos vean el mismo inventario al instante, eso requiere un
servidor central — es un proyecto distinto, avísame si te interesa
explorarlo.
