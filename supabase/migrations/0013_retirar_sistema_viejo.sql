-- 0013 · Retirar el sistema viejo de incidencias y anuncios (limpieza de esquema)
-- El flujo de incidencias/anuncios creados por vecinos se reemplazó por el modelo
-- de "mensajes" (0012) + buzón privado. Estas tablas y objetos quedaron huérfanos.
-- Es una limpieza DESTRUCTIVA e irreversible; no borra datos en uso (esas tablas
-- ya no las escribe ni lee la app).
--
-- NOTA: se conserva a propósito la columna viviendas.puede_publicar_anuncios y su
-- maquinaria (política/trigger/helper puede_bloquear_anuncios), inerte, para no
-- tocar la tabla núcleo `viviendas`.

-- 1) Tablas (cascade retira sus políticas, triggers e índices; y las FKs hijas).
drop table if exists incidencia_adjuntos cascade;
drop table if exists incidencia_comentarios cascade;
drop table if exists incidencia_eventos cascade;
drop table if exists incidencias cascade;
drop table if exists anuncios cascade;
drop table if exists reportes cascade;

-- 2) Funciones trigger huérfanas (sus triggers se fueron con las tablas) y el
--    helper de aprobación de anuncios (sus políticas se fueron con `anuncios`).
drop function if exists incidencia_before_insert() cascade;
drop function if exists incidencia_guard_update() cascade;
drop function if exists incidencia_evento_insert() cascade;
drop function if exists incidencia_evento_update() cascade;
drop function if exists puede_aprobar_anuncios() cascade;

-- 3) Enums ya sin uso.
drop type if exists incident_estado;
drop type if exists anuncio_estado;
drop type if exists reporte_estado;

-- 4) Permisos del tablón antiguo (ya no están en el catálogo de la app).
delete from role_permissions where permiso in ('aprobar_anuncios', 'bloquear_anuncios');

-- 5) Storage: políticas del bucket 'adjuntos' (fotos de incidencias). El bucket
--    en sí se elimina con la Storage API (SQL no permite borrar buckets), como
--    paso operativo aparte.
drop policy if exists adjuntos_read on storage.objects;
drop policy if exists adjuntos_insert on storage.objects;
drop policy if exists adjuntos_delete on storage.objects;
