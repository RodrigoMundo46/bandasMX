<?php
function obtenerConexion(): PDO
{
    $carpetaDb = __DIR__ . '/../database';
    $rutaDb = $carpetaDb . '/bandas.db';
    $db = method_exists('PDO', 'connect')
        ? PDO::connect('sqlite:' . $rutaDb)
        : new PDO('sqlite:' . $rutaDb);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);   
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); 
    $db->exec('PRAGMA foreign_keys = ON');

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
        $db->createFunction('sin_acentos', $sinAcentos, 1);
    } else {
        $db->sqliteCreateFunction('sin_acentos', $sinAcentos, 1);
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
