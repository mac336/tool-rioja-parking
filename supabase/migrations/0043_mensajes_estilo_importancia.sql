-- 0043 · Estilo estacional + importancia en los mensajes (decoración del tablón)
-- ---------------------------------------------------------------------------
-- Campos COSMÉTICOS del mensaje (mismas políticas de escritura que titulo/cuerpo,
-- sin cambios de RLS):
--   · estilo: decoración de temporada del post-it (o null = sin estilo).
--     primavera | verano | otono | halloween | navidad | valentin | carnaval | ssanta
--   · importancia: para avisos e incidencias. null/baja = normal; 'media' = IMPORTANTE;
--     'alta' = URGENTE.
-- Valor null o desconocido ⇒ el post-it se pinta como hasta ahora (sin regresión).

alter table mensajes add column if not exists estilo text;
alter table mensajes add column if not exists importancia text;
