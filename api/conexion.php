<?php
// =========================================================
//  Conexión a la base de datos SQLite con PDO.
//  Si database/bandas.db no tiene las tablas, se crean con
//  schema.sql y se cargan los datos iniciales de seed.sql.
// =========================================================

function obtenerConexion(): PDO
{
    $carpetaDb = __DIR__ . '/../database';
    $rutaDb = $carpetaDb . '/bandas.db';

    // PDO::connect existe desde PHP 8.4 y regresa un objeto específico de SQLite;
    // en versiones anteriores se usa new PDO(...)
    $db = method_exists('PDO', 'connect')
        ? PDO::connect('sqlite:' . $rutaDb)
        : new PDO('sqlite:' . $rutaDb);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);       // errores como excepciones
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);  // filas como arreglos asociativos

    // SQLite no activa las llaves foráneas por defecto
    $db->exec('PRAGMA foreign_keys = ON');

    // Función propia para buscar sin importar acentos ni mayúsculas
    // (así "mana" encuentra "Maná")
    $sinAcentos = function ($texto) {
        $texto = strtolower((string) $texto);
        return strtr($texto, [
            'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ñ' => 'n',
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'à' => 'a', 'è' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
            'ä' => 'a', 'ë' => 'e', 'ï' => 'i', 'ö' => 'o', 'ü' => 'u',
            'ñ' => 'n',
        ]);
    };
    if (method_exists($db, 'createFunction')) {
        $db->createFunction('sin_acentos', $sinAcentos, 1);        // PHP 8.4 o superior
    } else {
        $db->sqliteCreateFunction('sin_acentos', $sinAcentos, 1);  // PHP 8.3 o anterior
    }

    $existeTabla = $db
        ->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bandas'")
        ->fetch();

    if (!$existeTabla) {
        $db->exec(file_get_contents($carpetaDb . '/schema.sql'));
        $db->exec(file_get_contents($carpetaDb . '/seed.sql'));
    }

    return $db;
}
