-- 0021 · Nuevo rol "tester"
-- Cuenta de pruebas SOLO LECTURA: ve la app como un vecino pero no puede
-- ejecutar acciones (reservar, votar, ceder plaza, sugerir…). Única excepción:
-- chatear por el buzón (permiso 'usar_buzon', ver 0022).
-- (El valor del enum se añade en su propia migración: Postgres no permite usar
-- un valor nuevo de enum en la misma transacción en que se crea.)
alter type user_role add value if not exists 'tester' after 'vecino';
