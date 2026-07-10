# 17 · Módulo Buzón privado (vecino ↔ gestión por canales)

## Concepto

Mensajería **privada y dirigida**: el vecino escribe a un **canal** concreto y el
hilo es privado entre él y **los roles de ese canal** (nadie más lo ve, ni
siquiera el `app_admin`, salvo su propio canal).

## Canales

| Canal | Etiqueta | Lo ven y responden |
|-------|----------|--------------------|
| `administrador` | Administración | rol `administrador_finca` |
| `presidencia` | Presidencia | roles `presidente` y `vicepresidente` |
| `conserje` | Conserje | rol `conserje` |
| `desarrollador` | Desarrollador de la app | rol `app_admin` (fallos/ideas de la app) |

**Privacidad estricta:** cada canal solo es visible para su(s) rol(es) + el
vecino que abrió el hilo. El `app_admin` **no** ve Presidencia ni Conserje.

## Comportamiento

- Cualquier vecino activo puede **abrir un hilo** eligiendo el canal ("Para").
- El staff del canal ve en su **bandeja** los hilos de su canal (más los que él
  mismo haya abierto como vecino) y puede **responder**, **cerrar** y
  **"Convertir en mensaje público"** (si tiene `publicar_mensajes`).
- Estilo **chat**; cabecera y barra de escribir fijas, solo scrollean los mensajes.

## Datos

- `hilos`: `vecino_id`, `asunto`, `canal` (enum `hilo_canal`), `estado`
  (abierto/cerrado), banderas `no_leido_gestion` / `no_leido_vecino`, timestamps.
- `hilo_mensajes`: `hilo_id`, `autor_id`, `de_gestion` (lo fija un trigger:
  `de_gestion = autor ≠ dueño del hilo`), `texto`, `created_at`.

## Seguridad (RLS)

- Helper `puede_ver_hilo(canal)`: true si el usuario activo pertenece al rol del
  canal. Políticas de `hilos` y `hilo_mensajes` usan `vecino_id = auth.uid() OR
  puede_ver_hilo(canal)`. Migraciones 0012 (base) y 0017/0018 (canales).
- Verificado en `tests/rls/rls_test.sql` (vecino ajeno no ve; el rol del canal
  sí; el app_admin no husmea otros canales).

## Notificaciones

- **Solo push** (sin correo). `notificar` kind `buzon`:
  - Escribe el vecino → push a los usuarios con los roles del canal.
  - Responde el canal → push al vecino dueño del hilo.
- La campana (`listAvisos`) muestra respuestas a mis hilos y mensajes nuevos de
  mi canal.

## Implementación

- UI: `src/features/buzon/BuzonPage.tsx` (bandeja + chat + "Para").
- Datos: `src/lib/db/buzon.ts` (`listHilos`, `getHilo`, `crearHilo(canal)`,
  `responderHilo`, `cerrarHilo`, `convertirEnMensaje`) / mock. Edge: `notificar`.
- Accesos: mosaico "Buzón" e icono de mensajes en Inicio (junto a la campana).
