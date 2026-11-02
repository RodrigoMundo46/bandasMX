-- =========================================================
--  Datos iniciales: algunas bandas de México
--  Las fotos iniciales son imágenes provisionales; se pueden
--  reemplazar desde el sitio con la opción "Editar".
-- =========================================================

INSERT INTO bandas (id, nombre, ciudad, genero, foto) VALUES
(1, 'Café Tacvba', 'Ciudad Satélite, Estado de México', 'Rock alternativo', 'uploads/cafe-tacvba.svg'),
(2, 'Caifanes',    'Ciudad de México',                  'Rock',             'uploads/caifanes.svg'),
(3, 'Molotov',     'Ciudad de México',                  'Rap rock',         'uploads/molotov.svg'),
(4, 'Zoé',         'Cuernavaca, Morelos',               'Rock alternativo', 'uploads/zoe.svg'),
(5, 'Maná',        'Guadalajara, Jalisco',              'Pop rock',         'uploads/mana.svg');

INSERT INTO discos (banda_id, titulo, anio) VALUES
-- Café Tacvba
(1, 'Café Tacvba', 1992),
(1, 'Re', 1994),
(1, 'Avalancha de éxitos', 1996),
(1, 'Revés/Yo soy', 1999),
(1, 'Cuatro caminos', 2003),
(1, 'Sino', 2007),
(1, 'El objeto antes llamado disco', 2012),
(1, 'Jei Beibi', 2017),
-- Caifanes
(2, 'Caifanes', 1988),
(2, 'El Diablito', 1990),
(2, 'El silencio', 1992),
(2, 'El nervio del volcán', 1994),
-- Molotov
(3, '¿Dónde jugarán las niñas?', 1997),
(3, 'Apocalypshit', 1999),
(3, 'Dance and Dense Denso', 2003),
(3, 'Con todo respeto', 2004),
(3, 'Eternamiente', 2007),
(3, 'Agua maldita', 2014),
-- Zoé
(4, 'Zoé', 2001),
(4, 'Rocanlover', 2003),
(4, 'Memo Rex Commander y el Corazón Atómico de la Vía Láctea', 2006),
(4, 'Reptilectric', 2008),
(4, 'Programaton', 2013),
(4, 'Aztlán', 2018),
-- Maná
(5, 'Falta amor', 1990),
(5, '¿Dónde jugarán los niños?', 1992),
(5, 'Cuando los ángeles lloran', 1995),
(5, 'Sueños líquidos', 1997),
(5, 'Revolución de amor', 2002),
(5, 'Amar es combatir', 2006),
(5, 'Drama y luz', 2011),
(5, 'Cama incendiada', 2015);
