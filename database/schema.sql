-- =========================================================
--  Esquema de la base de datos: Bandas MX
--  Motor: SQLite 3 (usado desde PHP con PDO)
-- =========================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------
--  Tabla: bandas
--  Guarda los datos generales de cada banda.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bandas (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT    NOT NULL UNIQUE COLLATE NOCASE,  -- nombre de la banda (no se repite)
    ciudad  TEXT    NOT NULL,                        -- ciudad de origen
    genero  TEXT    NOT NULL,                        -- género musical
    foto    TEXT    NOT NULL                         -- ruta de la foto, ej. uploads/archivo.jpg
);

-- ---------------------------------------------------------
--  Tabla: discos
--  Discografía de cada banda (relación 1 banda : N discos).
--  Si se elimina una banda, sus discos se eliminan en cascada.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS discos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    banda_id  INTEGER NOT NULL,
    titulo    TEXT    NOT NULL,                      -- título del disco
    anio      INTEGER NOT NULL,                      -- año de lanzamiento
    FOREIGN KEY (banda_id) REFERENCES bandas(id) ON DELETE CASCADE
);

-- Índice para acelerar la consulta de discos por banda
CREATE INDEX IF NOT EXISTS idx_discos_banda ON discos(banda_id);
