-- ============================================================================
-- Rioja 25 · Datos semilla (se aplican con `supabase db reset`)
-- Catálogo real de la comunidad. NO contiene datos de cuentas de vecinos.
-- ============================================================================

-- --- Viviendas (41, idéntico al array PISOS del legacy; no existe "Bajo D") ---
insert into viviendas (codigo, orden) values
  ('Bajo A',1),('Bajo B',2),('Bajo C',3),('Bajo E',4),('Bajo F',5),
  ('1º A Dcha',10),('1º B Dcha',11),('1º C Dcha',12),('1º D Dcha',13),('1º E Dcha',14),('1º F Dcha',15),
  ('2º A Dcha',20),('2º B Dcha',21),('2º C Dcha',22),('2º D Dcha',23),('2º E Dcha',24),('2º F Dcha',25),
  ('3º A Dcha',30),('3º B Dcha',31),('3º C Dcha',32),('3º D Dcha',33),('3º E Dcha',34),('3º F Dcha',35),
  ('1º A Izqda',40),('1º B Izqda',41),('1º C Izqda',42),('1º D Izqda',43),('1º E Izqda',44),('1º F Izqda',45),
  ('2º A Izqda',50),('2º B Izqda',51),('2º C Izqda',52),('2º D Izqda',53),('2º E Izqda',54),('2º F Izqda',55),
  ('3º A Izqda',60),('3º B Izqda',61),('3º C Izqda',62),('3º D Izqda',63),('3º E Izqda',64),('3º F Izqda',65)
on conflict (codigo) do nothing;

-- --- Zonas comunes (specs/07; configurables por app_admin) ---
insert into zonas_comunes (nombre, descripcion, activa, franja_min, franja_max, requiere_invitados, orden) values
  ('Jardín',        'Zona ajardinada común',        true, '09:00', '22:00', true, 1),
  ('Piscina',       'Piscina de la comunidad',      true, '10:00', '21:00', true, 2),
  ('Sala comunidad','Sala social para reuniones',   true, '09:00', '23:00', true, 3),
  ('Lonja Delantera','Lonja de la parte delantera', true, '09:00', '23:00', true, 4)
on conflict do nothing;

-- --- Contactos (migrados del index.html; ya NO en código público) ---
insert into contactos (funcion, nombre, categoria, direccion, telefonos, web_o_email, orden) values
  ('Administrador','Antonio Ortega Martín','administrador','C/ Rodríguez San Pedro nº 2, 2º, Oficina 302 · 28015 Madrid', array['91 594 39 33','91 808 59 88'],'info@fincasortegadelgado.com',1),
  ('Conserje','Iván Rivera Carballada','conserje','', array['647 26 76 48'],null,2),
  ('Presidente','David Seco','junta','1D esc. dcha.', array[]::text[],null,3),
  ('Vicepresidente','Luis Garrigan','junta','2D esc. izq.', array[]::text[],null,4),
  ('Seguro','OCASO','seguro','Nº Póliza: 220960', array['91 703 90 10'],null,5),
  ('Ascensores','ThyssenKrupp Elevadores','proveedor','C/ Villaescusa nº 2', array['91 327 45 46'],null,10),
  ('Antenas y portero','Telyme','proveedor','C/ Tordoman nº 12, Local · 28043 Madrid', array['91 381 49 45'],null,11),
  ('Calefacción','Stic Instalaciones','proveedor','C/ Vicente Gaceo, 21', array['91 314 42 70','670 08 84 30 (fin de semana/festivos)','603 63 90 18 (fin de semana/festivos)'],'info@stic-instalaciones.com',12),
  ('Contraincendios','Seguridad Abex, S.L.','proveedor','C/ Ceuta nº 17 · 28700 S.S. de los Reyes (Madrid)', array['91 652 16 18'],null,13),
  ('Contadores de agua','Monedero','proveedor','Avda. América nº 7 · 28002 Madrid', array['91 411 48 70'],null,14),
  ('Desinsectación','Pest-Rapid','proveedor','C/ Pto. de Maspalomas, 9 · 28029 Madrid', array['91 386 51 07'],'pestrapid@yahoo.es',15),
  ('Jardinería','José Luis Sánchez Bachiller','proveedor','', array['620 034 595'],null,16),
  ('Mant. Piscina','Aquakit','proveedor','Avda. Real de Pinto 87, Nave Mod II Nave F · 28021 Madrid', array['91 665 07 18','610 216 604'],null,17),
  ('Puertas Garaje','Automatizaciones Lázaro','proveedor','C/ Mercedes Arteaga nº 13 · 28019 Madrid', array['91 472 34 10'],null,18)
on conflict do nothing;
