# Bandas MX

Proyecto Final de **Programación Web**.

Bandas MX es un sitio web que funciona como base de datos de bandas mexicanas. Cada registro guarda la **foto** de la banda, su **nombre**, la **ciudad** de donde proviene, su **género** y su **discografía**. Los usuarios pueden agregar bandas nuevas, buscarlas por nombre, actualizar sus datos y eliminarlas.

## Descripción del proyecto

| Página | Archivo | Qué hace |
|---|---|---|
| Inicio | `index.html` | Presenta el sitio y lleva al listado o al formulario. |
| Bandas (listado) | `bandas.html` | Muestra todas las bandas en tarjetas, permite buscar por nombre y eliminar. |
| Detalle | `detalle.html` | Muestra una banda completa con su discografía; permite editar o eliminar. |
| Formulario | `formulario.html` | Crea una banda nueva o edita una existente (`?id=N`). |

**CRUD completo** sobre las bandas:

- **Crear:** formulario de "Agregar banda".
- **Leer:** listado en tarjetas + página de detalle.
- **Actualizar:** el mismo formulario en modo edición.
- **Eliminar:** botón "Eliminar" con ventana de confirmación.

Después de cada operación la información en pantalla se actualiza automáticamente con los datos de la base de datos.

## Tecnologías utilizadas

- **HTML5** semántico (`header`, `nav`, `main`, `section`, `article`, `footer`, `fieldset`)
- **CSS3** + **Bootstrap 5.3** (diseño responsivo, desde CDN)
- **JavaScript** (validación de formularios, manipulación del DOM, `fetch`, alertas y modales)
- **PHP 8** (API que conecta las páginas con la base de datos)
- **SQLite** con **PDO** (base de datos)
- **WAMP64** (Apache + PHP en Windows)

## Estructura

```
bandas-mx/
├── index.html
├── bandas.html
├── detalle.html
├── formulario.html
├── css/styles.css
├── js/
│   ├── comun.js            # Funciones compartidas
│   ├── bandas.js           # Listado, búsqueda y eliminación
│   ├── detalle.js          # Detalle de una banda
│   └── formulario.js       # Crear / editar con validación
├── api/
│   ├── conexion.php        # Conexión a SQLite con PDO
│   └── bandas.php          # API para el CRUD de bandas
├── database/
│   ├── schema.sql          # Esquema de la base de datos
│   ├── seed.sql            # Datos iniciales (5 bandas)
│   ├── bandas.db           # Base de datos SQLite
│   └── .htaccess           # Impide descargar la base desde el navegador
├── uploads/                # Fotos de las bandas
├── GUIA.md                 # Funcionamiento paso a paso y guía de usuario
└── README.md
```

## Base de datos

Dos tablas relacionadas (una banda tiene muchos discos):

```sql
CREATE TABLE bandas (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    ciudad  TEXT    NOT NULL,
    genero  TEXT    NOT NULL,
    foto    TEXT    NOT NULL
);

CREATE TABLE discos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    banda_id  INTEGER NOT NULL,
    titulo    TEXT    NOT NULL,
    anio      INTEGER NOT NULL,
    FOREIGN KEY (banda_id) REFERENCES bandas(id) ON DELETE CASCADE
);
```

El esquema completo está en `database/schema.sql`.

## Instrucciones de ejecución

Requisitos: **WAMP64** (con PHP 8) y conexión a internet (Bootstrap se carga desde CDN).

1. Instalar y abrir **WAMP64**. Esperar a que el ícono de la barra de tareas se ponga **verde**.
2. Copiar la carpeta `bandas-mx` dentro de `C:\wamp64\www\`, o clonar el repositorio ahí:
   ```bash
   cd C:\wamp64\www
   git clone <URL-del-repositorio> bandas-mx
   ```
3. Verificar que la extensión de SQLite esté activa: clic izquierdo en el ícono de WAMP → **PHP** → **Extensiones PHP** → debe estar marcada **`pdo_sqlite`** (si no, marcarla; WAMP se reinicia solo).
4. Abrir en el navegador: **http://localhost/bandas-mx/**

Para empezar con la base de datos limpia (solo las 5 bandas iniciales), borrar `database/bandas.db` y recargar la página; el archivo se crea de nuevo con `schema.sql` y `seed.sql`.

> Las bandas iniciales usan una imagen provisional como foto. Se pueden reemplazar desde el sitio con **Editar**.

## API (`api/bandas.php`)

| Método | URL | Descripción |
|---|---|---|
| GET | `api/bandas.php` | Lista todas las bandas |
| GET | `api/bandas.php?nombre=texto` | Busca bandas por nombre |
| GET | `api/bandas.php?id=N` | Una banda con su discografía |
| POST | `api/bandas.php` | Crea una banda (formulario con foto) |
| POST | `api/bandas.php?id=N` | Actualiza una banda (la foto es opcional) |
| DELETE | `api/bandas.php?id=N` | Elimina una banda, su foto y sus discos |
