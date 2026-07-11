# 07 · Módulo Reservas de zonas comunes

## Objetivo
Reservar espacios comunes indicando fecha, horario y nº de invitados. Toda
reserva queda **pendiente de aprobación** (permiso `aprobar_reservas`, por
defecto presidente/app_admin) antes de confirmarse.

## Estado actual (multi-zona)

- **Calendario libre** (hasta 6 meses vista) + **hora libre** (desde/hasta).
- Una reserva puede abarcar **una o varias zonas** en el mismo horario: se
  guardan como **N filas con un `grupo_id`** común y se crean/aprueban/cancelan
  en bloque (migraciones 0006/0008). Se valida disponibilidad por zona.
- **1 reserva vigente por vivienda** (puede incluir varias zonas). El anti-solape
  por zona lo impone un constraint de BD.
- Al aprobar/rechazar → **push** al solicitante (`notificar-reserva`). El correo
  está desactivado por el flag global `CORREOS_NOTIFICACION=false` (ver CLAUDE.md).
- Privacidad: los vecinos ven solo la ocupación (libre/ocupada) sin identidad.

## Zonas (configurables por app_admin)
- **Jardín**
- **Piscina**
- **Sala comunidad**
- **Lonja Delantera**

(Ampliables/editables desde el panel de administración.)

## Historias de usuario
- Como **vecino**, quiero solicitar una franja en una zona indicando invitados y
  esperar la aprobación.
- Como **presidente**, quiero aprobar o rechazar solicitudes.
- Como **vecino**, quiero ver la disponibilidad y saber si una franja ya está
  pedida (aunque esté pendiente).
- Como **vecino** que ya tiene una reserva, quiero ver **mi reserva actual** y
  poder **anularla**, sin poder pedir otra hasta entonces.

## Requisitos funcionales
1. **Solicitar reserva** (exige permiso `realizar_reservas`, configurable; RLS
   `puede_hacer_reservas`, mig. 0023, y la vivienda debe ser un piso real):
   elegir zona, **día / mes / año**, **hora de inicio**, **hora de fin** y
   **número de invitados**. Se crea con estado `pendiente`.
2. **Aprobación** (**presidente**; `app_admin` como respaldo): aprobar
   (`aprobada`) o rechazar (`rechazada`, con motivo opcional). Aviso al
   solicitante (opcional v1.1 por correo).
2b. **Agenda mensual (panel de gestión → Reservas)**: además de la cola de
   pendientes, un **calendario del mes** marca los días con reservas (pendientes
   + aprobadas); se navega entre meses (‹ / ›) y al **elegir un día** se listan
   sus reservas (zona, horario, vivienda, solicitante y estado). API
   `reservasGestion(desdeISO, hastaISO)` (RLS: solo `aprobar_reservas`/app_admin).
3. **Visibilidad de ocupación**:
   - Una franja con reserva `aprobada` aparece como **ocupada**.
   - Una franja con reserva `pendiente` aparece como **"pendiente de aprobar"**:
     si otro intenta reservarla, se le informa de que **ya hay una reserva
     pendiente en esa fecha** y no puede solicitarla.
   - **Privacidad:** los vecinos ven solo el **estado** de cada franja (libre /
     pendiente / ocupada), **sin** la identidad ni la vivienda de quien reservó.
     La gestión (y el presidente en la cola de aprobación) sí ve el solicitante.
     Se implementa con una vista de ocupación (módulo 04), no ocultando datos
     solo en la interfaz.
4. **Mis reservas**: listado propio (pendiente, aprobada, pasadas) con opción de
   **anular** la vigente. **Anular solo hasta 24 h antes del inicio** (trigger
   `reservas_anulacion_24h`, mig. 0020; la gestión con `aprobar_reservas` puede
   anular siempre). La UI oculta el botón y avisa cuando quedan menos de 24 h.
4b. **Archivo**: una reserva aprobada que ya terminó pasa a verse como
   **"Celebrada"** (en Mis reservas y en la agenda mensual de gestión). No se
   borra: queda como historial de **quién usó cada zona y en qué fecha**.
5. **Calendario/agenda** por zona con los estados de cada franja.
6. **Sin límite de antelación**: se puede reservar cualquier fecha futura.

## Límite anti-acaparamiento (regla clave)
- **Una sola reserva vigente por vivienda a la vez**, **sin importar la zona**
  (una reserva `pendiente` o `aprobada` cuenta como vigente).
- Si la vivienda ya tiene una reserva vigente, la pantalla de reservas **no
  permite crear otra**: en su lugar muestra **tu reserva actual** (zona, fecha y
  horario, estado) y un botón para **anular**. Al anular (o cuando la reserva ya
  ha pasado), puede volver a reservar.
- Se aplica en interfaz **y** en base de datos (índice único parcial: máx. una
  fila `estado IN ('pendiente','aprobada')` con `fin >= now()` por `vivienda`).
- No hay caducidad automática de pendientes (de momento): al haber una sola
  reserva por vivienda y aprobar el presidente, no bloquea al resto de forma
  masiva. Revisable más adelante.

## Reglas anti-conflicto (críticas)
- **No solapamiento** entre reservas `pendiente`/`aprobada` de la misma zona:
  constraint de exclusión en base de datos (`tstzrange` + `EXCLUDE USING gist`
  con filtro `estado IN ('pendiente','aprobada')`). Evita condiciones de carrera
  si dos vecinos solicitan a la vez.
- La franja debe caer dentro del horario de la zona (si está definido) y no estar
  en el pasado.

## Seguridad (ver módulo 11)
- RLS: solicitar = activo (a nombre de su vivienda, y solo si no tiene otra
  vigente); aprobar/rechazar = presidente/app_admin; anular = solicitante o
  presidente/app_admin; configurar zonas = app_admin.
- Validación temporal reforzada en base de datos (constraint), además de en la
  interfaz.

## Fuera de alcance v1
- Pagos o fianzas por uso.
- Reglas de aforo automáticas por nº de invitados (se registra el dato; el
  control lo hace la gestión al aprobar).
