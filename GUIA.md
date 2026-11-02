# Bandas MX — Funcionamiento del sitio y guía de usuario

Este documento tiene dos partes:

1. **Funcionamiento paso a paso:** cómo está construido el sitio y qué pasa internamente en cada operación.
2. **Guía de usuario:** cómo usar el sitio desde el navegador.

---

# Parte 1. Funcionamiento paso a paso

## 1.1 Arquitectura general

El sitio está dividido en tres capas:

```
 Navegador (HTML + Bootstrap + JavaScript)
        │   fetch()  ── peticiones HTTP; el servidor responde en JSON
        ▼
 Apache + PHP (WAMP64)  →  api/bandas.php
        │   consultas SQL con PDO
        ▼
 Base de datos SQLite  (database/bandas.db)
```

- **Frontend** (archivos `.html`, `css/`, `js/`): cuatro páginas. No traen datos escritos a mano; cada una pide la información a PHP con JavaScript (`fetch`) y la dibuja en el DOM.
- **Backend** (`api/`): Apache ejecuta los archivos PHP. `api/bandas.php` recibe las peticiones, ejecuta el SQL y responde en formato JSON.
- **Base de datos** (`database/`): un archivo SQLite con dos tablas, `bandas` y `discos`.

**¿Por qué hace falta PHP?** Por seguridad, el navegador no puede abrir ni modificar archivos de la computadora, como `bandas.db`. PHP corre en el servidor (Apache), sí puede leer y escribir la base de datos, y le pasa los resultados a la página.

**¿Y MySQL?** WAMP incluye MySQL, pero este proyecto no lo usa. SQLite no necesita un servidor de base de datos: toda la base es un solo archivo (`bandas.db`) y PHP lo abre directamente con PDO.

## 1.2 Cómo se abre la base de datos (`api/conexion.php`)

Cada vez que llega una petición, `api/bandas.php` llama a `obtenerConexion()`:

1. Abre (o crea, si no existe) el archivo `database/bandas.db` con **PDO** (`new PDO('sqlite:...')`).
2. Configura PDO para que los errores lancen excepciones y las filas lleguen como arreglos asociativos (`$fila['nombre']`).
3. Activa las llaves foráneas con `PRAGMA foreign_keys = ON` (SQLite las trae apagadas por defecto).
4. Registra una función SQL propia llamada `sin_acentos()`, que convierte un texto a minúsculas y le quita los acentos. Se usa en la búsqueda.
5. Si la tabla `bandas` no existe, ejecuta `schema.sql` (crea las tablas) y `seed.sql` (inserta 5 bandas con su discografía).

## 1.3 Base de datos

### Tabla `bandas`

| Columna | Tipo | Regla | Descripción |
|---|---|---|---|
| `id` | INTEGER | PK, autoincremental | Identificador |
| `nombre` | TEXT | NOT NULL, UNIQUE (sin distinguir mayúsculas) | Nombre de la banda |
| `ciudad` | TEXT | NOT NULL | Ciudad de origen |
| `genero` | TEXT | NOT NULL | Género musical |
| `foto` | TEXT | NOT NULL | Ruta de la foto, p. ej. `uploads/banda-171….jpg` |

### Tabla `discos`

| Columna | Tipo | Regla | Descripción |
|---|---|---|---|
| `id` | INTEGER | PK, autoincremental | Identificador |
| `banda_id` | INTEGER | FK → `bandas.id`, `ON DELETE CASCADE` | Banda a la que pertenece |
| `titulo` | TEXT | NOT NULL | Título del disco |
| `anio` | INTEGER | NOT NULL | Año de lanzamiento |

**Relación:** una banda tiene muchos discos (1 : N). Por eso la discografía va en una tabla aparte y no en un solo campo de texto. Gracias a `ON DELETE CASCADE`, al borrar una banda sus discos se borran solos.

**¿Por qué la foto se guarda como ruta y no dentro de la base?** El archivo de imagen se guarda en la carpeta `uploads/` y en la base solo se guarda su ruta. Así la base de datos se mantiene ligera y Apache puede mostrar la imagen directamente.

**Protección:** `database/.htaccess` contiene `Require all denied`, que le indica a Apache que no permita descargar `bandas.db` ni los `.sql` desde el navegador. PHP sí puede abrirlos porque los lee directo del disco.

## 1.4 La API (`api/bandas.php`)

Un solo archivo PHP atiende todas las operaciones. Decide qué hacer según el **método HTTP** (`$_SERVER['REQUEST_METHOD']`) y si la URL trae `?id=`:

| Operación | Petición | Qué hace |
|---|---|---|
| Leer todas / buscar | `GET api/bandas.php?nombre=…` | `SELECT` de bandas, filtrando por nombre si viene el parámetro |
| Leer una | `GET api/bandas.php?id=N` | `SELECT` de la banda + `SELECT` de sus discos |
| Crear | `POST api/bandas.php` | Valida, guarda la foto e inserta banda y discos |
| Actualizar | `POST api/bandas.php?id=N` | Valida, actualiza la banda y reemplaza su discografía |
| Eliminar | `DELETE api/bandas.php?id=N` | Borra la banda (y en cascada sus discos) y su archivo de foto |

> La actualización usa `POST` y no `PUT` porque PHP solo procesa los archivos subidos (`$_FILES`) en peticiones POST.

Todas las consultas usan **sentencias preparadas** (`$db->prepare('... WHERE id = ?')` y `execute([$id])`). Los datos del usuario nunca se pegan directo en el SQL, así se evita la inyección SQL.

La función `responder()` convierte el resultado a JSON con `json_encode`, pone el código HTTP y termina el script. Códigos que puede regresar:

- `200` / `201` — operación correcta / banda creada.
- `400` — datos inválidos (lista de mensajes en `errores`).
- `404` — la banda no existe.
- `409` — ya existe una banda con ese nombre.
- `500` — error inesperado al guardar.

## 1.5 Las páginas y su JavaScript

Todas las páginas comparten la misma barra de navegación (Inicio, Bandas, Agregar banda), el mismo pie de página, Bootstrap y `css/styles.css`. Bootstrap 5.3.3 está guardado dentro del proyecto (`css/bootstrap.min.css` y `js/bootstrap.bundle.min.js`), así que el sitio se ve y funciona igual aunque la computadora no tenga internet. El archivo `js/comun.js` tiene funciones que usan varias páginas:

- `escaparHTML(texto)`: convierte caracteres especiales para que lo que escribió un usuario no se ejecute como HTML.
- `obtenerParametro(nombre)`: lee parámetros de la URL, como `?id=3`.
- `mostrarAlerta(contenedor, mensaje, tipo)`: inserta una alerta de Bootstrap (verde para éxito, roja para error).
- `mostrarMensajeDeURL(contenedor)`: si la URL trae `?msg=creada|actualizada|eliminada`, muestra la alerta correspondiente y limpia la URL.
- `confirmarEliminar(banda, alEliminar, alFallar)`: abre el modal de confirmación y, si el usuario acepta, manda el `DELETE`.

### Inicio (`index.html`)

Página de presentación con el nombre del sitio, una descripción breve y dos botones: **Ver bandas** y **Agregar banda**.

### Listado (`bandas.html` + `js/bandas.js`)

1. Al cargar, `cargarBandas()` hace `fetch('api/bandas.php?nombre=')`.
2. PHP regresa un arreglo JSON con las bandas ordenadas por nombre.
3. `pintarBandas()` vacía el contenedor `#listaBandas` y por cada banda crea con `document.createElement` una tarjeta con foto, género, nombre, ciudad y los botones **Ver**, **Editar** y **Eliminar**.
4. Actualiza el contador ("5 bandas registradas").
5. Si no hay resultados, muestra un mensaje en lugar de las tarjetas.

**Búsqueda por nombre:**

1. Cada vez que el usuario escribe en el campo de búsqueda se dispara el evento `input`.
2. Se espera 250 ms sin teclear (con `setTimeout`) para no hacer una petición por cada letra.
3. Se llama `cargarBandas()`, que ahora manda el texto: `api/bandas.php?nombre=zoe`.
4. En PHP la consulta es:
   ```sql
   SELECT id, nombre, ciudad, genero, foto FROM bandas
   WHERE sin_acentos(nombre) LIKE '%' || sin_acentos(?) || '%'
   ORDER BY nombre COLLATE NOCASE
   ```
   Así la búsqueda encuentra coincidencias parciales y no distingue mayúsculas ni acentos ("mana" encuentra "Maná").
5. Las tarjetas se redibujan con los resultados y el contador cambia a "1 resultado para “zoe”".

**Eliminar desde el listado:**

1. Clic en **Eliminar** → se abre un modal de Bootstrap con el nombre de la banda.
2. Si se confirma, se hace `fetch('api/bandas.php?id=ID', { method: 'DELETE' })`.
3. Al responder PHP, se muestra una alerta verde y se vuelve a llamar `cargarBandas()`; la tarjeta desaparece y el contador baja.

### Detalle (`detalle.html` + `js/detalle.js`)

1. Lee el `id` de la URL (`detalle.html?id=1`).
2. Hace `fetch('api/bandas.php?id=1')` y recibe la banda con su arreglo `discos`.
3. Llena la foto, el nombre, la ciudad y el género con `textContent`, y crea un `<li>` por cada disco (título y año), ordenados por año.
4. El botón **Editar** apunta a `formulario.html?id=1`.
5. El botón **Eliminar** abre el mismo modal; al confirmar redirige a `bandas.html?msg=eliminada`.
6. Si el `id` no existe, muestra una alerta con un enlace al listado.

### Formulario (`formulario.html` + `js/formulario.js`)

La misma página sirve para crear y editar:

- **Sin `id`** en la URL → modo **Agregar**: el formulario está vacío y empieza con una fila de disco.
- **Con `id`** (`formulario.html?id=4`) → modo **Editar**: cambia el título a "Editar banda", hace `fetch` de la banda, llena los campos, muestra la foto actual y crea una fila por cada disco.

**Filas de discografía (manipulación del DOM):**

- Hay un `<template id="plantillaDisco">` con una fila (título, año y botón ×).
- **+ Agregar disco** clona la plantilla y la agrega a `#listaDiscos`.
- El botón **×** de cada fila la elimina del DOM.

**Validación en el navegador** (antes de enviar):

| Campo | Regla |
|---|---|
| Foto | Obligatoria al agregar (opcional al editar). Solo JPG, PNG o WEBP. Máximo 2 MB. |
| Nombre | No puede estar vacío. Máximo 100 caracteres. |
| Ciudad | No puede estar vacía. Máximo 100 caracteres. |
| Género | No puede estar vacío. Máximo 60 caracteres. |
| Discografía | Al menos un disco. Cada disco necesita título y un año entero entre 1900 y el año actual. |

- Los campos inválidos se marcan en rojo con la clase `is-invalid` de Bootstrap y muestran su mensaje; los válidos se marcan en verde con `is-valid`.
- Los campos de texto se revalidan mientras el usuario escribe.
- Si algo falla, aparece la alerta "Revisa los campos marcados en rojo." y el cursor se va al primer campo con error.

> El límite de 2 MB coincide con el valor por defecto de `upload_max_filesize` en el PHP de WAMP, así no hay que modificar `php.ini`.

**Envío:**

1. Se arma un `FormData` con la foto (si se eligió), nombre, ciudad, género y la discografía como texto JSON.
2. El botón cambia a "Guardando…" y se desactiva para evitar doble envío.
3. Se manda `POST api/bandas.php` (agregar) o `POST api/bandas.php?id=ID` (editar).
4. En PHP:
   1. Los textos llegan en `$_POST` y la foto en `$_FILES['foto']`.
   2. `validarBanda()` repite la validación (nunca hay que confiar solo en el navegador). La discografía se convierte de JSON a arreglo con `json_decode`.
   3. `guardarFoto()` revisa el tamaño, usa `getimagesize()` para confirmar que el archivo realmente sea una imagen JPG, PNG o WEBP, y la mueve a `uploads/` con un nombre único (`banda-<timestamp>.jpg`) usando `move_uploaded_file()`.
   4. Dentro de una **transacción** (`beginTransaction()` … `commit()`, o `rollBack()` si algo falla) se inserta/actualiza la banda y sus discos. En la edición se borran los discos anteriores y se insertan los del formulario. Si algo falla, no queda nada a medias.
   5. Si se subió una foto nueva en una edición, se borra el archivo de la foto anterior con `unlink()`.
   6. Si el nombre ya existe, responde `409` y se borra la foto recién subida.
5. Si todo sale bien, el navegador redirige a `detalle.html?id=ID&msg=creada` (o `actualizada`) y se muestra la alerta verde con los datos nuevos.
6. Si hay error, se muestran los mensajes de PHP en una alerta roja y el formulario conserva lo escrito.

## 1.6 Diseño

- Bootstrap 5 para la cuadrícula, formularios, botones, alertas y modales.
- Diseño minimal: blanco, negro y grises; esquinas rectas; bordes delgados; el rojo solo se usa para eliminar y para errores.
- Responsivo: en escritorio el listado muestra 4 tarjetas por fila, en tablet 2 y en celular 1; el menú se convierte en botón de hamburguesa en pantallas chicas.

---

# Parte 2. Guía de usuario

## 2.1 Cómo abrir el sitio

1. Abre **WAMP64** y espera a que su ícono en la barra de tareas se ponga **verde**.
2. Asegúrate de que la carpeta del proyecto esté en `C:\wamp64\www\bandas-mx`.
3. La primera vez, revisa que SQLite esté activo: clic en el ícono de WAMP → **PHP** → **Extensiones PHP** → **`pdo_sqlite`** debe estar marcada.
4. Abre tu navegador en **http://localhost/bandas-mx/**

Para apagar el sitio, cierra WAMP (clic derecho en el ícono → **Salir**).

## 2.2 Moverse por el sitio

En la parte superior de todas las páginas está el menú:

- **Bandas MX / Inicio:** página principal.
- **Bandas:** listado de todas las bandas.
- **Agregar banda:** formulario para registrar una banda.

En celular, el menú se abre con el botón ☰ de la esquina superior derecha.

## 2.3 Ver las bandas

1. Entra a **Bandas**.
2. Verás una tarjeta por banda con su foto, género, nombre y ciudad. Arriba se indica cuántas bandas hay registradas.
3. Para ver la discografía completa, da clic en **Ver** o en la foto.

## 2.4 Buscar una banda por nombre

1. Entra a **Bandas**.
2. Escribe en el campo **Buscar por nombre…**
3. Los resultados se actualizan solos mientras escribes. No necesitas escribir el nombre completo, ni respetar mayúsculas o acentos (por ejemplo, `caf` encuentra "Café Tacvba").
4. Para volver a ver todas, borra el texto del campo.

Si no hay coincidencias verás el mensaje "No hay bandas con ese nombre."

## 2.5 Agregar una banda

1. Da clic en **Agregar banda** (en el menú, en Inicio o en el listado).
2. Llena el formulario:
   - **Foto de la banda:** selecciona una imagen JPG, PNG o WEBP de máximo 2 MB.
   - **Nombre:** por ejemplo, *Porter*.
   - **Ciudad de origen:** por ejemplo, *Guadalajara, Jalisco*.
   - **Género:** por ejemplo, *Rock alternativo*.
   - **Discografía:** escribe el título y el año del primer disco. Para agregar más discos, da clic en **+ Agregar disco**. Para quitar uno, da clic en la **×** de su fila.
3. Da clic en **Guardar**.
4. Si todo está bien, se abrirá la página de la banda con el mensaje verde "La banda se agregó correctamente."

**Si algo falta o está mal**, los campos con problema se marcan en rojo con una explicación debajo. Corrígelos y vuelve a dar clic en **Guardar**.

**No se puede registrar dos veces la misma banda.** Si el nombre ya existe verás "Ya existe una banda con ese nombre."

## 2.6 Actualizar los datos de una banda

1. Busca la banda en **Bandas**.
2. Da clic en **Editar** (en la tarjeta o en la página de detalle).
3. El formulario aparecerá con los datos actuales:
   - Cambia cualquier texto que necesites.
   - **Foto:** verás la foto actual. Si no seleccionas otra, se conserva. Si seleccionas una nueva, reemplaza a la anterior.
   - **Discografía:** puedes corregir títulos o años, agregar discos con **+ Agregar disco** o quitar discos con **×**.
4. Da clic en **Guardar cambios**.
5. Se abrirá la página de la banda con el mensaje "Los datos de la banda se actualizaron correctamente."

Para salir sin guardar, da clic en **Cancelar** o en **← Volver al detalle**.

## 2.7 Eliminar una banda

1. Da clic en **Eliminar** (en la tarjeta del listado o en la página de detalle).
2. Aparecerá una ventana preguntando si estás seguro.
3. Da clic en **Eliminar** para confirmar o en **Cancelar** para no hacer nada.
4. Al confirmar, la banda desaparece del listado y verás el mensaje "La banda se eliminó correctamente."

⚠️ Al eliminar una banda también se borran su foto y su discografía. **No se puede deshacer.**

## 2.8 Mensajes y qué significan

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| La banda se agregó / actualizó / eliminó correctamente. | La operación se guardó. | Nada. |
| Revisa los campos marcados en rojo. | Falta información o hay datos inválidos. | Corrige los campos en rojo. |
| Ya existe una banda con ese nombre. | El nombre está repetido. | Usa otro nombre o edita la banda existente. |
| La foto debe ser JPG, PNG o WEBP. / La foto no puede pesar más de 2 MB. | El archivo no es válido. | Elige otra imagen o redúcela. |
| No se pudo cargar el listado… / No se pudo conectar con el servidor. | WAMP está apagado o en naranja/rojo. | Abre WAMP, espera el ícono verde y recarga la página. |
| La banda no existe. | El enlace apunta a una banda que ya fue eliminada. | Regresa al listado. |
