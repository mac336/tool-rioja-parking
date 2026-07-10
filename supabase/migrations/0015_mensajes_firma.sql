-- 0015 · Firma del mensaje (quién lo publica: Administrador / Conserje / la Junta
-- o una vivienda concreta). Se muestra como firma manuscrita en el post-it.
alter table mensajes add column if not exists firma text;
