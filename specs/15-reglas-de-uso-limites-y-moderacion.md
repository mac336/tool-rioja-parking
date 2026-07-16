# 15 · Reglas de uso, límites y moderación

Objetivo: prevenir **abusos** (acaparar, saturar, spam) y **disputas** entre
vecinos, dejando reglas claras y aplicadas por el sistema (no solo por buena
voluntad). Estas reglas complementan la seguridad técnica del módulo 11.

## Principio
Toda regla con impacto se aplica en **base de datos** (constraints/RLS), no solo
en la interfaz. Los límites numéricos son **configurables** por `app_admin`; aquí
se fijan los valores por defecto acordados.

## Normas de uso (primer acceso)

En el primer acceso se muestran y **aceptan** las normas de convivencia
(`src/features/auth/NormasPage.tsx`; se guarda `normas_aceptadas_at` en
`profiles`, sin aceptar no se pasa de esa pantalla). Resumen que ve el vecino:

- **Respeto y convivencia:** la app sustituye avisos en papel; sin ataques
  personales, insultos ni contenido discriminatorio.
- **Tablón:** avisos, anuncios, incidencias y sugerencias. La gestión publica
  directo; el vecino **propone** incidencias/anuncios/sugerencias (con foto
  opcional) desde Buzón → Publicar, y la gestión los **revisa** antes de
  publicar. Las sugerencias muestran autor y admiten un «me gusta» por vivienda.
- **Buzón:** privado, por canales (Administración/Presidencia/Conserje/
  Desarrollador de la app); solo lo ve el destinatario.
- **Reservas:** confirmada al crearla; una vigente por vivienda; anulable hasta
  24 h antes.
- **Votaciones:** sondeos informales sin valor oficial; 1 voto por vivienda.
- **Notificaciones:** push para avisar de mensajes, buzón y reservas.
- **Datos:** tratamiento conforme al RGPD (ver aviso de privacidad).

## Reservas (módulo 07)
- **Una sola reserva vigente por vivienda a la vez**, sin importar la zona (una
  `pendiente` o `aprobada` cuenta como vigente). Índice único parcial en BD.
- Si ya tiene una vigente, la pantalla muestra **su reserva actual + botón
  anular** y **no** deja crear otra hasta anularla o hasta que pase.
- **Sin límite de antelación** (se puede reservar cualquier fecha futura).
- **No solapamiento** por zona (constraint de exclusión): `pendiente` o
  `aprobada` bloquean la franja; a quien lo intente se le avisa de que ya hay una
  reserva en esa fecha.
- **Aprobación directa por defecto**: la reserva queda confirmada al crearse. Con
  el flag `app_config.reservas_requieren_aprobacion` en `true` (Gestión →
  Configuración) pasa a nacer `pendiente` y la aprueba la **gestión** (`es_gestion`).
- **Anulación hasta 24 h antes del inicio** (trigger `reservas_anulacion_24h`); la
  gestión puede anular siempre.

## Tablón: avisos, anuncios, incidencias y sugerencias (módulo 16)
- La **gestión** con el permiso `publicar_<tipo>` publica **directo**. El
  **vecino propone** incidencia/anuncio/sugerencia desde **Buzón → Publicar** y
  queda **pendiente de moderación** (`aprobar_incidencias` / `aprobar_anuncios`),
  salvo las **sugerencias**, que se publican directas con autor visible.
- **Fotos** opcionales (1–2, comprimidas en cliente, EXIF borrado, bucket
  privado) en incidencias y anuncios; sin personas ni matrículas identificables.
- **Sugerencias:** autor visible y **likes 1/vivienda** (`mensaje_likes`).
- **Normas de contenido:** sin ataques personales, insultos, contenido
  discriminatorio ni spam comercial. La gestión puede **editar/despublicar**.
- El vecino puede además mandar **reportes privados** a administración por el
  buzón (módulo 17).

## Encuestas (módulo 06)
- Las crea solo la **gestión** (evita saturación de encuestas).
- **1 voto por vivienda**; se puede cambiar hasta el cierre; cuenta como uno.
- Etiqueta visible "sondeo informal, sin valor oficial".

## Parking – cesiones (módulo 08)
- Reasignación de huecos cedidos por la **gestión**, con prioridad a quien antes
  marcó "necesito" (orden por fecha). Evita el "primero que lo pilla".
- Un hueco reasignado no se puede reclamar; se guarda histórico.
- Conteo **por vivienda**.

## Cuentas y acceso (módulo 03)
- Alta solo por aprobación; **máx. 2 cuentas por vivienda**.
- **1 voto/postura por vivienda** en encuestas y parking (2 cuentas no duplican).
- **Suspensión** de cuentas que incumplan (corta el acceso al refrescar token).
- Aceptación de estas **normas de uso** en el primer acceso (arriba).

## Moderación y resolución de disputas
- **Cola de moderación** para incidencias/anuncios que **proponen** los vecinos
  (permisos `aprobar_incidencias`/`aprobar_anuncios`), en Gestión →
  Publicaciones. Las **reservas** son de aprobación directa por defecto (cola
  solo si se activa el flag; ver `specs/07`).
- **`audit_log`** de acciones sensibles (aprobaciones, bloqueos, borrados,
  reasignaciones) para trazabilidad y transparencia.
- Canal para reclamaciones y feedback de la app: **Buzón** (canal Desarrollador
  de la app) o contacto con la gestión.

## Tabla resumen de límites (por defecto, configurables)

| Ámbito | Límite por defecto |
|--------|--------------------|
| Reservas vigentes por vivienda | **1** (cualquier zona) |
| Antelación de reserva | **sin límite** |
| Anulación de reserva | hasta **24 h** antes del inicio |
| Aprobación de reservas | **directa** (flag para exigir aprobación) |
| Fotos por incidencia/anuncio | **2** |
| Likes de sugerencia | **1 por vivienda** |
| Votos por vivienda y encuesta | **1** |
| Cuentas por vivienda | **2** |
