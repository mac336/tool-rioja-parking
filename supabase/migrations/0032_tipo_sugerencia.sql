-- 0032 · Nueva clase de mensaje: "sugerencia" (comunidad, con autor y likes)
-- Va en su propia migración: no se puede usar un valor nuevo de enum en la misma
-- transacción en que se crea (lo usa la RLS y la tabla de likes en 0033).
alter type mensaje_tipo add value if not exists 'sugerencia' after 'anuncio';
