# 15 · Reglas de uso, límites y moderación

Objetivo: prevenir **abusos** (acaparar, saturar, spam) y **disputas** entre
vecinos, dejando reglas claras y aplicadas por el sistema (no solo por buena
voluntad). Estas reglas complementan la seguridad técnica del módulo 11.

## Principio
Toda regla con impacto se aplica en **base de datos** (constraints/RLS), no solo
en la interfaz. Los límites numéricos son **configurables** por `app_admin`; aquí
se fijan los valores por defecto acordados.

## Reservas (módulo 07)
- **Una sola reserva vigente por vivienda a la vez**, sin importar la zona (una
  `pendiente` o `aprobada` cuenta como vigente). Índice único parcial en BD.
- Si ya tiene una vigente, la pantalla muestra **su reserva actual + botón
  anular** y **no** deja crear otra hasta anularla o hasta que pase.
- **Sin límite de antelación** (se puede reservar cualquier fecha futura).
- **No solapamiento** por zona (constraint de exclusión): `pendiente` o
  `aprobada` bloquean la franja; a quien lo intente se le avisa de que ya hay una
  reserva/solicitud en esa fecha.
- Aprobación por el **presidente** (respaldo `app_admin`).
- Sin caducidad automática de pendientes por ahora (revisable).

## Tablón de anuncios (módulo 13)
- **Un anuncio pendiente por vivienda a la vez.** Al resolverse (aprobado o
  rechazado) puede enviar otro. Índice único parcial en BD.
- **Fechas obligatorias** de inicio y fin; el anuncio solo se muestra dentro de
  esa ventana. Duración por defecto **≤ 1 año**; si se pide más, se **marca** en
  el panel del presidente para que decida (no se bloquea automáticamente).
- **Bloqueo por abuso:** la gestión puede poner `puede_publicar_anuncios = false`
  a una **vivienda** desde la consola (afecta a sus 2 cuentas; flag en
  `viviendas`, módulo 04).
- **Moderación previa:** nada se publica sin aprobación de un rol autorizado.
- **Normas de contenido:** sin ataques personales, insultos, contenido
  discriminatorio ni spam comercial. La gestión puede **despublicar**; los
  vecinos pueden **reportar** un anuncio publicado.

## Incidencias (módulo 05)
- **Anti-spam:** límite de creación por vivienda (por defecto máx. 5/día) y
  control de duplicados (la gestión puede fusionar).
- **Sin señalar a personas:** describen problemas de la comunidad, no acusan a
  vecinos concretos. La gestión puede editar/ocultar y avisar.
- **Comentarios moderables:** ocultar comentarios ofensivos, bloquear hilos.
- **Fotos** sin personas ni matrículas identificables.

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
- Aceptación de estas **normas de uso** en el primer acceso (se guarda
  `normas_aceptadas_at` en `profiles`; sin aceptar no se pasa de esa pantalla —
  módulos 03 y 04).

## Moderación y resolución de disputas
- **Cola de moderación** para anuncios; **cola de aprobación** para reservas.
- **Reportar contenido** (anuncios/comentarios) por parte de vecinos: tabla
  `reportes` (módulo 04), máx. 1 reporte por cuenta y contenido; la gestión
  atiende la cola desde su panel.
- **`audit_log`** de acciones sensibles (aprobaciones, bloqueos, borrados,
  reasignaciones) para trazabilidad y transparencia.
- Canal para reclamaciones: **Sugerencias de la app** (módulo 14) o contacto con
  la gestión.

## Tabla resumen de límites (por defecto, configurables)

| Ámbito | Límite por defecto |
|--------|--------------------|
| Reservas vigentes por vivienda | **1** (cualquier zona) |
| Antelación de reserva | **sin límite** |
| Anuncios pendientes por vivienda | **1** |
| Duración de un anuncio | **≤ 1 año** (más → revisión del presidente) |
| Incidencias por vivienda/día | **5** (anti-spam) |
| Votos por vivienda y encuesta | **1** |
| Cuentas por vivienda | **2** |
