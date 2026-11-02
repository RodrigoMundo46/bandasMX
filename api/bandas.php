<?php
// =========================================================
//  Bandas MX - API (PHP + SQLite)
//
//  GET    api/bandas.php              -> listado de bandas
//  GET    api/bandas.php?nombre=zo    -> buscar por nombre
//  GET    api/bandas.php?id=3         -> una banda con su discografía
//  POST   api/bandas.php              -> crear banda (con foto)
//  POST   api/bandas.php?id=3         -> actualizar banda (foto opcional)
//  DELETE api/bandas.php?id=3         -> eliminar banda
//
//  Todas las respuestas son JSON.
// =========================================================

require __DIR__ . '/conexion.php';

header('Content-Type: application/json; charset=utf-8');

const CARPETA_FOTOS = __DIR__ . '/../uploads';
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2 MB

// Tipos de imagen permitidos => extensión con la que se guardan
const TIPOS_PERMITIDOS = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_WEBP => 'webp',
];

// ---------- Funciones de apoyo ----------

// Envía una respuesta JSON con su código HTTP y termina el script
function responder(int $codigo, $datos): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function responderErrores(int $codigo, array $errores): void
{
    responder($codigo, ['errores' => $errores]);
}

// Regresa una banda con su discografía, o null si no existe
function obtenerBanda(PDO $db, int $id): ?array
{
    $consulta = $db->prepare('SELECT id, nombre, ciudad, genero, foto FROM bandas WHERE id = ?');
    $consulta->execute([$id]);
    $banda = $consulta->fetch();
    if (!$banda) {
        return null;
    }

    $consulta = $db->prepare('SELECT id, titulo, anio FROM discos WHERE banda_id = ? ORDER BY anio, id');
    $consulta->execute([$id]);
    $banda['id'] = (int) $banda['id'];
    $banda['discos'] = array_map(fn($d) => [
        'id' => (int) $d['id'],
        'titulo' => $d['titulo'],
        'anio' => (int) $d['anio'],
    ], $consulta->fetchAll());

    return $banda;
}

// Borra un archivo de foto de la carpeta uploads (si existe)
function borrarFoto(?string $rutaPublica): void
{
    if (!$rutaPublica || strpos($rutaPublica, 'uploads/') !== 0) {
        return;
    }
    $rutaArchivo = CARPETA_FOTOS . '/' . basename($rutaPublica);
    if (is_file($rutaArchivo)) {
        unlink($rutaArchivo);
    }
}

// Revisa y guarda la foto enviada en el campo "foto".
// Regresa la ruta pública (uploads/archivo.jpg), null si no se envió foto,
// o termina con error 400 si la foto no es válida.
function guardarFoto(): ?string
{
    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    $archivo = $_FILES['foto'];

    if (in_array($archivo['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        || $archivo['size'] > TAMANO_MAXIMO) {
        responderErrores(400, ['La foto no puede pesar más de 2 MB.']);
    }
    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        responderErrores(400, ['No se pudo subir la foto.']);
    }

    // getimagesize lee el contenido real del archivo (no confía en la extensión)
    $info = @getimagesize($archivo['tmp_name']);
    if (!$info || !isset(TIPOS_PERMITIDOS[$info[2]])) {
        responderErrores(400, ['La foto debe ser JPG, PNG o WEBP.']);
    }

    if (!is_dir(CARPETA_FOTOS)) {
        mkdir(CARPETA_FOTOS, 0775, true);
    }

    $nombreArchivo = 'banda-' . round(microtime(true) * 1000) . '.' . TIPOS_PERMITIDOS[$info[2]];
    if (!move_uploaded_file($archivo['tmp_name'], CARPETA_FOTOS . '/' . $nombreArchivo)) {
        responderErrores(500, ['No se pudo guardar la foto.']);
    }

    return 'uploads/' . $nombreArchivo;
}

// Valida los datos que llegan del formulario.
// Regresa [errores, datos] con los datos ya limpios.
function validarBanda(array $entrada): array
{
    $errores = [];
    $nombre = trim($entrada['nombre'] ?? '');
    $ciudad = trim($entrada['ciudad'] ?? '');
    $genero = trim($entrada['genero'] ?? '');
    $anioActual = (int) date('Y');

    if ($nombre === '') $errores[] = 'El nombre es obligatorio.';
    if (mb_strlen($nombre) > 100) $errores[] = 'El nombre no puede tener más de 100 caracteres.';
    if ($ciudad === '') $errores[] = 'La ciudad es obligatoria.';
    if (mb_strlen($ciudad) > 100) $errores[] = 'La ciudad no puede tener más de 100 caracteres.';
    if ($genero === '') $errores[] = 'El género es obligatorio.';
    if (mb_strlen($genero) > 60) $errores[] = 'El género no puede tener más de 60 caracteres.';

    $discos = json_decode($entrada['discos'] ?? '[]', true);
    if (!is_array($discos)) {
        $errores[] = 'La discografía no tiene un formato válido.';
        $discos = [];
    } elseif (count($discos) === 0) {
        $errores[] = 'Agrega al menos un disco a la discografía.';
    }

    $limpios = [];
    foreach (array_values($discos) as $i => $disco) {
        $titulo = trim((string) ($disco['titulo'] ?? ''));
        $anio = $disco['anio'] ?? null;
        $numero = $i + 1;

        if ($titulo === '') {
            $errores[] = "El disco $numero no tiene título.";
        }
        if (!is_int($anio) || $anio < 1900 || $anio > $anioActual) {
            $errores[] = "El año del disco $numero debe estar entre 1900 y $anioActual.";
        }
        $limpios[] = ['titulo' => $titulo, 'anio' => $anio];
    }

    return [$errores, [
        'nombre' => $nombre,
        'ciudad' => $ciudad,
        'genero' => $genero,
        'discos' => $limpios,
    ]];
}

// Indica si un error de PDO es por nombre repetido (restricción UNIQUE)
function esNombreRepetido(PDOException $error): bool
{
    return strpos($error->getMessage(), 'UNIQUE constraint failed') !== false;
}

// Inserta la discografía de una banda
function insertarDiscos(PDO $db, int $bandaId, array $discos): void
{
    $consulta = $db->prepare('INSERT INTO discos (banda_id, titulo, anio) VALUES (?, ?, ?)');
    foreach ($discos as $disco) {
        $consulta->execute([$bandaId, $disco['titulo'], $disco['anio']]);
    }
}

// =========================================================
//  Rutas
// =========================================================

$db = obtenerConexion();
$metodo = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

// ---------- READ ----------
if ($metodo === 'GET') {
    // Una banda con su discografía
    if ($id !== null) {
        $banda = obtenerBanda($db, $id);
        if (!$banda) responderErrores(404, ['La banda no existe.']);
        responder(200, $banda);
    }

    // Listado (con búsqueda opcional por nombre, sin importar acentos ni mayúsculas)
    $nombre = trim($_GET['nombre'] ?? '');
    $consulta = $db->prepare(
        "SELECT id, nombre, ciudad, genero, foto FROM bandas
         WHERE sin_acentos(nombre) LIKE '%' || sin_acentos(?) || '%'
         ORDER BY nombre COLLATE NOCASE"
    );
    $consulta->execute([$nombre]);
    $bandas = array_map(function ($b) {
        $b['id'] = (int) $b['id'];
        return $b;
    }, $consulta->fetchAll());
    responder(200, $bandas);
}

// ---------- CREATE (sin id) y UPDATE (con id) ----------
if ($metodo === 'POST') {
    // Si la foto supera post_max_size, PHP deja $_POST vacío
    if (empty($_POST) && empty($_FILES)) {
        responderErrores(400, ['No se recibieron datos. Si subiste una foto, puede que sea demasiado grande.']);
    }

    $anterior = null;
    if ($id !== null) {
        $anterior = obtenerBanda($db, $id);
        if (!$anterior) responderErrores(404, ['La banda no existe.']);
    }

    [$errores, $datos] = validarBanda($_POST);

    $hayFoto = isset($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE;
    if (!$anterior && !$hayFoto) {
        array_unshift($errores, 'La foto es obligatoria.');
    }
    if ($errores) {
        responderErrores(400, $errores);
    }

    $fotoNueva = guardarFoto(); // null si no se mandó foto (solo permitido al editar)

    try {
        // Transacción: si algo falla, no queda nada a medias
        $db->beginTransaction();

        if ($anterior) {
            $foto = $fotoNueva ?? $anterior['foto'];
            $db->prepare('UPDATE bandas SET nombre = ?, ciudad = ?, genero = ?, foto = ? WHERE id = ?')
               ->execute([$datos['nombre'], $datos['ciudad'], $datos['genero'], $foto, $id]);
            $db->prepare('DELETE FROM discos WHERE banda_id = ?')->execute([$id]);
            $bandaId = $id;
        } else {
            $db->prepare('INSERT INTO bandas (nombre, ciudad, genero, foto) VALUES (?, ?, ?, ?)')
               ->execute([$datos['nombre'], $datos['ciudad'], $datos['genero'], $fotoNueva]);
            $bandaId = (int) $db->lastInsertId();
        }

        insertarDiscos($db, $bandaId, $datos['discos']);
        $db->commit();
    } catch (PDOException $error) {
        $db->rollBack();
        borrarFoto($fotoNueva);
        if (esNombreRepetido($error)) {
            responderErrores(409, ['Ya existe una banda con ese nombre.']);
        }
        responderErrores(500, ['Error al guardar la banda.']);
    }

    // Si se reemplazó la foto, se borra el archivo anterior
    if ($anterior && $fotoNueva) {
        borrarFoto($anterior['foto']);
    }

    responder($anterior ? 200 : 201, obtenerBanda($db, $bandaId));
}

// ---------- DELETE ----------
if ($metodo === 'DELETE') {
    if ($id === null) responderErrores(400, ['Falta el id de la banda.']);

    $banda = obtenerBanda($db, $id);
    if (!$banda) responderErrores(404, ['La banda no existe.']);

    // Sus discos se borran en cascada (ON DELETE CASCADE)
    $db->prepare('DELETE FROM bandas WHERE id = ?')->execute([$id]);
    borrarFoto($banda['foto']);
    responder(200, ['mensaje' => 'Banda eliminada.']);
}

responderErrores(405, ['Método no permitido.']);
