-- 0058 · Festivos NACIONALES de 2027 (los que ya son ciertos)
-- ---------------------------------------------------------------------------
-- Petición del usuario 2026-09-06: «añade ya los festivos laborables de Madrid
-- de 2027». A esa fecha el calendario laboral 2027 de la Comunidad de Madrid
-- NO está publicado (comprobado en comunidad.madrid: solo figura el de 2026,
-- Decreto 75/2025). Se aprueba a finales de septiembre y los 2 festivos locales
-- del municipio los fija el Ayuntamiento en diciembre.
--
-- Por eso se siembran SOLO las fiestas NACIONALES de 2027 que no dependen de
-- ese decreto ni se trasladan (Estatuto de los Trabajadores, art. 37.2):
-- ninguna de las 9 cae en domingo, así que su fecha no cambiará.
--
-- NO se siembran (fecha aún desconocida o decisión pendiente):
--   · Jueves Santo (25-03-2027): lo elige cada año la Comunidad.
--   · Fiesta de la Comunidad de Madrid (02-05-2027): cae DOMINGO → se traslada.
--   · Asunción de la Virgen (15-08-2027): cae DOMINGO → se traslada.
--   · San Isidro (15-05-2027, cae sábado) y Almudena (09-11-2027): locales,
--     los fija el Ayuntamiento en diciembre y puede cambiarlos.
-- Se añadirán en una migración posterior cuando BOCM/BOE los publiquen
-- (specs/21 § Festivos sembrados y operativa anual).
--
-- Idempotente: índice único parcial (fecha, titulo) where tipo='festivo'.
insert into calendario_eventos (tipo, titulo, fecha, fuente) values
  ('festivo','Año Nuevo','2027-01-01','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Epifanía del Señor','2027-01-06','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Viernes Santo','2027-03-26','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Fiesta del Trabajo','2027-05-01','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Fiesta Nacional de España','2027-10-12','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Todos los Santos','2027-11-01','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Día de la Constitución Española','2027-12-06','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Inmaculada Concepción','2027-12-08','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026'),
  ('festivo','Natividad del Señor','2027-12-25','Fiestas nacionales 2027 (Estatuto de los Trabajadores, art. 37.2) · pendientes los festivos autonómicos y locales, que Madrid publica entre septiembre y diciembre de 2026')
on conflict do nothing;
