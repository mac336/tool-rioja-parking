# 07 · Módulo Reservas de zonas comunes

## Objetivo
Reservar espacios comunes indicando fecha, horario y nº de invitados. La reserva
es de **aprobación directa**: queda **confirmada al crearse** (ya no hay cola de
aprobación). Quien tenga el permiso **`reservar_otras_viviendas`** (p. ej. el
conserje) puede reservar **a nombre de otra vivienda**.

## Estado actual (multi-zona)

- **Calendario libre** (hasta 6 meses vista) + **hora libre** (desde/hasta).
- Una reserva puede abarcar **una o varias zonas** en el mismo horario: se
  guardan como **N filas con un `grupo_id`** común y se crean/aprueban/cancelan
  en bloque (migraciones 0006/0008). Se valida disponibilidad por zona.
- **1 reserva vigente por vivienda** (puede incluir varias zonas). El anti-solape
  por zona lo impone un constraint de BD.
- La reserva se crea **directamente `aprobada`** (sin avisos de aprobación).
- El **servicio de Reservas** solo aparece a quien tiene `realizar_reservas`
  (si no, no se muestra en Inicio ni en Servicios).
- Privacidad: los vecinos ven solo la ocupación (libre/ocupada) sin identidad.

## Zonas (configurables por app_admin)
- **Jardín**
- **Piscina**
- **Sala comunidad**
- **Lonja Delantera**

(Ampliables/editables desde el panel de administración.)

## Historias de usuario
- Como **vecino**, quiero reservar una franja en una zona indicando invitados y
  que quede confirmada al momento.
- Como **conserje** (permiso `reservar_otras_viviendas`), quiero reservar a
  nombre de la vivienda de un vecino que me lo pide en persona.
- Como **vecino**, quiero ver la disponibilidad y saber si una franja ya está
  ocupada.
- Como **vecino** que ya tiene una reserva, quiero ver **mi reserva actual** y
  poder **anularla**, sin poder pedir otra hasta entonces.

## Requisitos funcionales
1. **Reservar** (exige permiso `realizar_reservas`, configurable; RLS en mig.
   0039, y la vivienda debe ser un piso real): elegir zona, **día / mes / año**,
   **hora de inicio**, **hora de fin** y **número de invitados**. Se crea
   directamente con estado **`aprobada`**. Con `reservar_otras_viviendas` se
   puede además **elegir la vivienda** a nombre de la que se reserva.
2. **Aprobación (configurable)**: flag `app_config.reservas_requieren_aprobacion`
   (Gestión → Configuración; por defecto **OFF** = aprobación directa). Con el
   flag **ON**, la reserva nace `pendiente`, avisa a la gestión y aparece una
   **cola "Pendientes de aprobar"** en el panel (Gestión → Reservas), donde la
   gestión (`es_gestion`) aprueba/rechaza (`resolverReserva` + `notificar-reserva`).
   El permiso `aprobar_reservas` se retiró (mig. 0039); ahora aprueba la gestión.
2b. **Agenda mensual**: un **calendario del mes** marca cada día con reservas
   con un **punto de color por zona** distinta reservada ese día (varias zonas
   el mismo día = varios puntos; leyenda de colores debajo del calendario); se
   navega entre meses (‹ / ›) y al **elegir un día** se listan sus reservas
   (zona, horario, vivienda, solicitante). Componente compartido
   `src/features/bookings/AgendaMensual.tsx`, usado en **dos sitios**:
   - **Panel de gestión → Reservas** (siempre, si se tiene acceso al panel).
   - **Dentro del propio servicio de Reservas** (`/reservas/agenda`, enlace
     "Agenda" junto a "Mis reservas"), para quien tenga el permiso
     **`ver_agenda_reservas`** (configurable; por defecto gestión + **conserje**)
     **sin** necesitar acceso al panel — así el conserje puede ayudar a un
     vecino a encontrar hueco libre. API `reservasGestion(desdeISO, hastaISO)`
     (RLS mig. 0044: `es_gestion()` **o** `tiene_permiso('ver_agenda_reservas')`).
3. **Visibilidad de ocupación**:
   - Una franja con reserva `aprobada` aparece como **ocupada**.
   - **Privacidad:** los vecinos ven solo el **estado** de cada franja (libre /
     ocupada), **sin** la identidad ni la vivienda de quien reservó. La gestión sí
     ve el solicitante. Se implementa con una vista de ocupación (módulo 04), no
     ocultando datos solo en la interfaz.
4. **Mis reservas**: listado propio (aprobadas, pasadas) con opción de **anular**
   la vigente. **Anular solo hasta 24 h antes del inicio** (trigger
   `reservas_anulacion_24h`, mig. 0020; la **gestión** (`es_gestion`) puede anular
   siempre). La UI oculta el botón y avisa cuando quedan menos de 24 h.
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
- Con aprobación directa, la reserva vigente se libera al **anularla** o cuando
  **ya ha pasado**. Al haber una sola por vivienda, no bloquea al resto.

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
