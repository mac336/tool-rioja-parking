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

## Comportamiento (estilo WhatsApp)

- Al entrar, una **descripción** explica que es un chat privado para contactar
  con la comunidad (solo lo ven el vecino y el destinatario).
- La bandeja es una **lista de contactos/chats**, sin formulario de asunto:
  - **Vecino:** un contacto por canal disponible (hoy solo "Desarrollador de la
    app"). Tocar el contacto abre **directamente el chat** (si ya existía
    conversación con ese canal, la retoma: 1 conversación por vecino+canal, la
    más reciente). El hilo se **crea con el primer mensaje** (asunto = nombre
    del canal); punto azul si hay respuesta sin leer.
  - **Staff del canal:** además ve la sección "Vecinos" con un chat por vecino
    (nombre + vivienda + fecha; punto si hay no leído).
- **Fase de pruebas (actual):** solo el canal **desarrollador** es contactable.
  **Administración** y **Conserje** se muestran como contactos **pausados (solo
  lectura)**: al tocarlos avisan de que la función está pausada hasta que se
  apruebe el uso completo de la app (`CANALES_PAUSADOS`). Presidencia queda
  oculta. Reabrir un canal = moverlo de `CANALES_PAUSADOS` a `CANALES`
  (`src/features/buzon/BuzonPage.tsx`).
- El staff puede **responder**, **cerrar/reabrir** y **"Convertir en mensaje
  público"** (si tiene `publicar_mensajes`).
- Estilo **chat fijado al viewport visible** (`--app-h`): cabecera y barra de
  escribir fijas, **solo scrollean los mensajes**; el input queda siempre sobre
  el teclado (no descuadra en iOS).
- **Borrar conversación** (icono papelera en la cabecera del chat): la elimina
  para siempre con sus mensajes (cascade). RLS: el dueño o el rol del canal
  (política `hilo_del`, migración 0019).

## Datos

- `hilos`: `vecino_id`, `asunto`, `canal` (enum `hilo_canal`), `estado`
  (abierto/cerrado), banderas `no_leido_gestion` / `no_leido_vecino`, timestamps.
- `hilo_mensajes`: `hilo_id`, `autor_id`, `de_gestion` (lo fija un trigger:
  `de_gestion = autor ≠ dueño del hilo`), `texto`, `created_at`.

## La gestión escribe a los vecinos (permiso `escribir_vecinos`)

- Nuevo permiso configurable **`escribir_vecinos`** (semilla: administrador_finca
  y conserje; app_admin siempre; editable en Panel → Permisos): quien lo tiene ve
  en el buzón el botón **"Escribir a un vecino"** → selector con buscador
  (directorio de activos) → chat directo.
- El hilo se crea **en el canal del rol** (`canalDeRol`: app_admin→desarrollador,
  administrador_finca→administrador, conserje→conserje, presidente/vice→
  presidencia); la RLS lo exige (`puede_escribir_vecinos()` + `puede_ver_hilo`,
  migración 0027). Si ya había conversación con ese vecino en el canal, se retoma.
- **Aviso al vecino:** push y, además, **correo a los correos registrados de su
  piso** (todas las cuentas activas de la vivienda). Este correo NO lo gobierna
  `CORREOS_NOTIFICACION` (es un mensaje directo de gestión, no una notificación
  masiva); se aplica a todo mensaje `de_gestion` del buzón.

## Seguridad (RLS)

- **Escribir** (crear hilo / responder) exige el permiso **`usar_buzon`**
  (configurable por rol en el panel; por defecto todos los roles, incluido
  `tester`). Helper `puede_usar_buzon()`, migración 0022.

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
