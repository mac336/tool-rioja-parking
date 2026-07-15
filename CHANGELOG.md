# Changelog — Rioja 25

Cambios funcionales relevantes, más recientes arriba. Cada entrada nueva se añade
al implementar el cambio (ver `CLAUDE.md` → Forma de trabajo).

## 2026-07-15

- **v1.29.1 · Firma "Developer":** se añade "Developer" a las firmas elegibles del
  formulario de mensajes (el "atte." del post-it).

- **v1.29.0 · Post-its de temporada + importancia:** los mensajes del tablón
  pueden llevar un **estilo estacional** opcional (Primavera, Verano, Otoño,
  Halloween, Navidad, S. Valentín, Carnaval, S. Santa): papel de temporada, cinta
  washi, marca de agua y nombre de temporada, en los 3 sitios (Home, visor y
  tarjeta de gestión). Avisos e incidencias añaden **importancia** (Normal /
  **IMPORTANTE** / **URGENTE**), con sello y, en urgente, cinta y marco rojos. Sin
  estilo, el post-it queda como siempre con su icono de tipo (⚠️/aspa). Campos
  cosméticos `estilo` e `importancia` (mig. 0043); sin cambios de RLS.

- **v1.28.1 · Fix notificaciones del tablón por tipo:** la Edge Function
  `notificar` seguía comprobando el permiso retirado `publicar_mensajes`, así que
  un aviso/incidencia publicado por el **conserje** no mandaba push a los vecinos.
  Ahora autoriza por `publicar_<tipo>` y **envía solo a quien puede ver ese tipo**
  (`ver_<tipo>`), no a todos. Requiere `supabase functions deploy notificar`.

- **v1.28.0 · Mi Comunidad configurable + anuncios en Inicio:**
  - **Mi Comunidad** deja de ser solo del desarrollador: ahora la visibilidad la
    controla el permiso configurable **`ver_mi_comunidad`** (grupo "Mi Comunidad"
    en el panel). Por defecto lo ven **todos menos el conserje y el administrador
    de finca**. La RLS de `comunidad_datos` pasa a exigir ese permiso. Mig. 0041.
  - **Anuncios/avisos en el tablón de Inicio:** si tienen **caducidad** se muestran
    **hasta que caducan**; si no, solo mientras son recientes. Al **editar** un
    mensaje **reaparece** en Inicio (nueva columna `mensajes.updated_at` + trigger,
    mig. 0042).

- **v1.27.0 · Circulares:** nuevo apartado en **Más → Circulares** con las normas
  de uso de la **piscina y zonas comunes** (temporada y horario 2026 + normas por
  bloques). Contenido público, sin datos personales. Ver `specs/20`.

- **v1.26.0 · Permisos por tipo y reservas de aprobación directa:**
  - **Permisos reorganizados** en grupos (Tablón · Reservas · Buzón · Encuestas ·
    Gestión) en el panel del app_admin, para que escale al crecer.
  - **Tablón por tipo:** ver y publicar/editar se controlan **por cada tipo**
    (aviso/anuncio/incidencia/sugerencia) y por rol. Por defecto el **conserje**
    ve y publica solo **avisos e incidencias** (no ve anuncios ni sugerencias).
    Retirado el permiso único `publicar_mensajes`. Migraciones 0038 y 0040.
  - **Reservas de aprobación directa:** se elimina la cola de aprobación; la
    reserva queda confirmada al crearse. Nuevo permiso **"reservar para otras
    viviendas"** (p. ej. el conserje elige el piso). El servicio de Reservas se
    **oculta** a quien no tenga permiso (antes salía el botón deshabilitado).
    Migración 0039 (pendientes → aprobadas; retirado `aprobar_reservas`).
  - **Gating de servicios:** Votaciones y Reservas se ocultan en Inicio y en
    Servicios (y el hero de encuesta) según el permiso del rol.

- **v1.25.0 · "Mi Comunidad" (dashboard económico, en pruebas):** nuevo apartado
  que resume las cuentas de la comunidad a partir de las actas: presupuesto del
  año y variación, **en qué se gasta** (por destino), **si sube o baja** cada
  capítulo, **derramas** (importe/cuota/periodo, sin detallar quién paga),
  cuentas de cierre (impagados solo como total agregado) y **decisiones de las
  juntas** (aprobado/rechazado con la votación; Junta Rectora solo por cargos).
  Cada capítulo de "¿sube o baja?" tiene una **"i" con el motivo** del cambio, y
  el panel muestra un **aviso** de que es solo informativo (ante dudas, consultar
  las actas en PDF).
  Comparativa 2025↔2026. **Solo visible para `app_admin` (developer)** mientras
  se decide si se abre a los vecinos. Datos en tabla `comunidad_datos` con **RLS
  de solo lectura para app_admin** (migración 0037); la migración no lleva datos
  y el seed va **fuera de git** por ser el repo/web públicos.

## 2026-07-11

- **v1.24.0 · Fotos también en anuncios:** el adjuntar 1–2 fotos (mismo flujo
  optimizado y privado que las incidencias) se habilita también en los anuncios
  de vecinos (p. ej. “vendo bici” con foto).
- **v1.23.0 · Fotos en las incidencias:** al reportar una incidencia (Buzón →
  Publicar → Incidencia) se pueden adjuntar **1–2 fotos**. Se **optimizan en el
  propio móvil** antes de subir (WebP, lado máx. 1600px, ≤~800 KB) y se les
  **borra el EXIF/geolocalización**. Se guardan en un bucket **privado** y se
  muestran con URL firmada de caducidad corta en el tablón, en "Mis
  publicaciones" y en el panel de moderación. Al borrar la incidencia se borran
  también las fotos (cascade + trigger a Storage). Migración 0036.
- **v1.22.0 · Avisos de moderación y reservas:** al **crear una reserva** ahora
  llega **push a los aprobadores** (`aprobar_reservas`); al **rechazar** una
  publicación, el **autor recibe push** ("Tu incidencia/anuncio/sugerencia no se
  ha publicado"). Y una publicación **ya enviada a aprobar (pendiente) deja de
  ser editable** por el autor: solo la tocan los moderadores (puede retirarla
  borrándola). Migración 0035; Edge `notificar` con kinds `reserva_nueva` y
  `publicacion_rechazada`.
- **v1.21.0 · Auditoría integral (código muerto, RLS y coherencia):** revisión
  completa de la app con arreglos: **RLS endurecida** (mig. 0034: el tester vuelve
  a ser solo lectura en mensajes/likes; el autor no puede borrar su publicación ya
  publicada; quitar un "me gusta" lo puede hacer cualquier cuenta de la vivienda;
  los moderadores ven la cola aunque no tengan permiso `panel`). `notificar`
  autoriza también a los aprobadores (el push de "publicado" ya no se pierde),
  etiqueta bien las sugerencias y solo anuncia lo realmente publicado. La campana
  muestra la cola de reservas solo a quien tiene `aprobar_reservas` (antes, a
  cualquier rol ≠ vecino). **Limpieza de código muerto**: retirados el formulario
  y la Edge Function `enviar-sugerencia` (el feedback va por el chat del buzón;
  el histórico sigue legible en el Dashboard), `ocupacionZonaDia`, `listCesiones`,
  `puedeUsarBuzon`, `Fab` y tipos sin uso. **Tests RLS ampliados** (publicaciones,
  auto-aprobación, likes por vivienda, tester, grants de profiles). Specs y
  CHANGELOG reestructurados y puestos al día.
- **v1.20.2 · Sugerencias:** el texto introductorio pasa a ser una nota de
  ayuda (sin recuadro ni icono) para no confundirse con una sugerencia más.
- **v1.20.1 · Sugerencias:** el botón de alta pasa a la cabecera (“+ Nueva”),
  como en Mensajes.
- **v1.20.0 · "Sugerencias" pasa a ser el tablón de la comunidad:** la pantalla
  de Sugerencias ya no es el formulario de feedback al desarrollador (eso ahora
  se hace por el chat del buzón). Ahora **lista las sugerencias aprobadas** con su
  autor y un botón de **me gusta** (uno por vivienda), y el **administrador**
  (permiso `publicar_mensajes`) puede **añadir una nueva** directamente publicada.
  Los vecinos siguen proponiendo desde el buzón (Publicar → Sugerencia, moderado).
- **v1.19.1 · Arreglos de coherencia (mensajes/campana):** al tocar una
  notificación de mensaje ahora abre el **tablón** (Home, los post-its), no la
  pantalla Mensajes. La campana solo muestra mensajes **publicados y para todos**
  (ya no cuela borradores/pendientes ni los privados a administración) y etiqueta
  bien las **sugerencias**. La pantalla Mensajes de gestión añade pestaña
  **Sugerencias** (solo lectura; se aprueban en Gestión → Publicaciones).
- **v1.19.0 · Sugerencias de la comunidad (autor + likes):** nueva clase de
  mensaje "sugerencia" (Buzón → Publicar → Sugerencia), con el **autor visible**
  y **likes (1 por vivienda)**. Mismo flujo de moderación que incidencias/
  anuncios; el tablón muestra un botón de me gusta en el visor. Migraciones
  0032/0033 (tipo + tabla `mensaje_likes`). No se toca la pantalla privada de
  "Comentarios y sugerencias" (feedback al desarrollador).
- **v1.18.0 · Publicaciones de vecinos (incidencias/anuncios con moderación):**
  desde el Buzón, sección "Publicar", el vecino reporta una incidencia o publica
  un anuncio (con fechas, máx. 2 meses) y elige si va **para todos** (pendiente
  de aprobar → tablón) o **solo a administración** (privado). Se guarda en
  `mensajes` con estado (borrador/pendiente/publicado/rechazado) y destino
  (migración 0031). Nueva pestaña **"Publicaciones"** en el panel para
  aprobar/rechazar (permisos `aprobar_incidencias`/`aprobar_anuncios`).
- **v1.17.0 · Notificaciones y limpieza:** la campana pasa a llamarse
  **"Notificaciones"**; las ya vistas se muestran en gris (leído) y las nuevas
  resaltadas con etiqueta **"Nuevo"**. El icono 💬 de la cabecera muestra un
  **punto rojo** cuando hay un mensaje de buzón sin leer. **Reciclaje** sale de
  Servicios y pasa al menú **Más**.
- **v1.16.1 · Limpieza de Servicios (Home):** fuera **Buzón** (duplicado: ya está
  arriba en la cabecera como 💬) y **Mensajes** para quien no publica (el vecino
  ya lo lee en el tablón).
- **v1.16.0 · Purga de cesiones de parking:** las cesiones canceladas o ya
  pasadas quedan como histórico y se **borran automáticamente a los 10 días**
  (job diario `pg_cron`, migración 0030). Aviso en la UI.
- **v1.15.1 · Firma "Vecinos":** nueva opción de firma en los mensajes del
  tablón (junto a Administrador/Conserje/la Junta y los pisos).
- **v1.15.0 · Auditoría de seguridad y correcciones:** revisadas RLS, grants y
  Edge Functions. Cerrada la **escalada de privilegios**: solo el app_admin puede
  asignar/crear roles de gestión (antes cualquiera con `aprobar_altas` podía
  fabricar un `app_admin`); `notificar-admin` deja de ser anónimo; `notificar`
  exige permiso/visibilidad; `grupoId` validado como UUID; `log_audit` sin
  EXECUTE público (migración 0029). Ver `specs/11`.
- **v1.14.1 · Botón "Gestión" en el footer:** los roles con panel ven la barra
  inferior como **Inicio / Gestión / Más**; el resto sigue con Inicio y Más.
- **v1.14.0 · Avisos vistos en BD + seguridad:** la última visita a la campana
  se guarda en el perfil (`avisos_vistos_at`) → el contador de avisos nuevos es
  el mismo en el móvil y en la web. De paso, **cerrado un agujero de seguridad**:
  el UPDATE de `profiles` queda limitado a nombre/normas/avisos (antes permitía
  a un usuario cambiarse su propio rol). Migración 0028.
- **v1.13.1 · Guía de instalación en iPhone corregida:** 3 pasos reales del
  Safari actual — tres puntos (⋯) abajo a la derecha → Compartir → bajar hasta
  "Añadir a pantalla de inicio". Flecha animada apuntando al botón ⋯.
- **v1.13.0 · La gestión escribe a los vecinos:** nuevo permiso configurable
  `escribir_vecinos` (desarrollador/administrador/conserje por defecto). Botón
  "Escribir a un vecino" en el buzón con buscador; el chat se crea en el canal
  del rol (RLS, mig. 0027) y al vecino le llega **push + correo a los correos
  registrados de su piso**.
- **v1.12.0 · Sugerencias guardadas y visibles:** cada sugerencia se guarda en
  BD (tabla `sugerencias`, mig. 0026) y el app_admin las lee en **Dashboard →
  Sugerencias**. Antes solo viajaban en el push/correo y podían perderse (bug).
- **v1.11.0 · Alta directa con invitación:** al dar de alta a alguien desde el
  panel se le envía un correo de **invitación en español** con botón "Entrar en
  la app" (enlace directo a la app). Plantilla de invitación personalizada.
- **v1.10.0 · Gadget de reserva en la Home:** si la vivienda tiene una reserva
  vigente aparece bajo el parking (zonas, fecha/hora, estado → Mis reservas).
  El hueco libre se reparte entre tablón, parking/reserva y servicios; sin
  parking ni reserva queda aire y los servicios abajo.
- **v1.9.1 · Home:** post-its con tope de altura, espacio repartido y servicios
  con aire sobre el footer.
- **v1.9.0 · Home rediseñada como panel de gadgets (sin scroll):** el tablón
  pasa a **una línea** (un post-it grande deslizable; al tocarlo, **visor a
  pantalla completa** que se pasa con el dedo; orden incidencias → avisos →
  anuncios) y es **elástico**: crece o se comprime según la pantalla y según
  haya encuesta/parking. **Servicios** queda como pieza clave pegada al footer,
  siempre visible. La barra inferior queda con **solo Inicio y Más**, y "Más"
  solo contiene lo que no está en la Home. Retirados TablonBoard/PostItNote/
  PostItPadModal.
- **v1.8.0 · Buzón:** Administración y Conserje aparecen como contactos **pausados (solo lectura)**; al tocarlos, aviso de que la función está pausada hasta aprobar el uso completo de la app.
- **v1.7.3 · Buzón:** descripción de uso al entrar (chat privado para contactar con la comunidad) + rótulo "Contactar con".
- **v1.7.2 · Textos de sugerencias:** la sección pasa a **"Comentarios y
  sugerencias"** (comentario / sugerencia / mejora, no solo mejoras). Añadida
  una 4ª opción ("Es muy difícil de usar") a la encuesta de satisfacción.

## 2026-07-10

- **v1.7.0 · Acceso directo (temporal) + bienvenida en 2 pasos:** los vecinos ya
  aprobados entran **solo con su correo, sin código** (flag `ACCESO_DIRECTO`;
  Edge `acceso-directo` genera sesión sin enviar correo), para no liar a la gente
  mayor. Reversible poniendo el flag a `false`. La **bienvenida** añade un
  segundo paso que invita a **instalar la app** en el móvil.
- **v1.7.1 · Recordar el correo:** el login prefija el último correo usado
  (no hay que reescribirlo cada vez).
- **v1.6.0 · Adopción por piso: entrado vs sin entrar:** la tabla de Adopción
  marca en cada vivienda con cuenta si **ha entrado** (ya inició sesión) o está
  **sin entrar** (aprobada pero no ha accedido — típicamente correo en spam).
  Función `stats_acceso_por_vivienda` (mig. 0025). Aclara que "con cuenta" no es
  lo mismo que "ha entrado".
- **v1.5.0 · Adopción + normas:** el Dashboard → Adopción muestra ahora
  **cuántas cuentas han conseguido entrar** alguna vez (`stats_acceso`, mig.
  0024). La pantalla de **normas** (primer acceso) fija el botón "Acepto" abajo,
  siempre visible, arreglando el problema de scroll en Android.
- **v1.5.1 · Aviso de spam (login):** también en el paso de escribir el correo.
- **v1.4.1 · Aviso de spam:** la pantalla de bienvenida y el paso del código de
  acceso recuerdan revisar la carpeta de spam si el correo no llega.
- **v1.4.0 · Dashboard de la app:** el menú "Adopción" pasa a **Dashboard** (solo
  app_admin) con dos secciones: **Adopción** (la de antes) y **Reservas**
  (estadísticas: aprobadas mes/año, canceladas año, total año y ranking de quién
  ha reservado y cuántas veces este año).
- **v1.3.2 · Sin vivienda soportado:** una cuenta puede no tener piso (p. ej. un
  tester). Opción "Sin vivienda" en el alta/edición; el servidor la guarda como
  null; se muestra como "Sin vivienda" y no afecta a parking ni conteos.
- **v1.3.1 · Fix:** el buscador de Vecinos ya no falla ("null is not an object")
  cuando un vecino tiene la vivienda/nombre sin rellenar; además busca por
  piso, nombre y correo.
- **v1.3.0 · Viviendas especiales + permisos votar/reservar:** el alta directa
  ofrece además Conserje/Administrador/Tester como "vivienda" (`es_piso=false`,
  migración 0023) para cuentas que no son un piso; **no cuentan** en votaciones,
  censo ni parking. Dos permisos configurables nuevos en el panel: **Votar en
  encuestas** y **Realizar reservas** (RLS `puede_votar_encuestas` /
  `puede_hacer_reservas`; por defecto todos menos tester).
- **v1.2.0 · Gestión unificada + rol Tester:** la pestaña "Vecinos" une las
  altas de acceso (arriba del todo, se aprueban primero) con la gestión de
  vecinos; **alta directa** por el admin sin registro ("Añadir vecino": crea la
  cuenta y la persona entra con su código). Nuevo **rol `tester`** de solo
  lectura (RLS + UI) cuya única acción es **chatear por el buzón**; nuevo
  permiso configurable **`usar_buzon`** (migraciones 0021/0022).
- **Solo vertical en móvil:** manifest `portrait` + overlay "gira el móvil" si
  se usa en horizontal.
- **Versionado visible:** cada subida incrementa la versión (`package.json`) y
  se muestra en pequeño al pie de la pantalla de bienvenida (v1.1.0).
- **Escritorio:** scroll normal de la ventana (sin barra interna); la Sidebar
  queda pegajosa. El modo app-fijada es solo móvil.
- **Buzón estilo WhatsApp:** la bandeja es una lista de contactos/chats (hoy
  solo "Desarrollador de la app"); tocar el contacto abre directamente el chat
  (sin asunto ni formulario; el hilo se crea con el primer mensaje). Staff ve
  sección "Vecinos" con un chat por vecino.
- **Encuesta protagonista en la Home** (handoff `encuesta.zip`, 2a): tarjeta
  hero azul antes del tablón con participación y "Votar ahora"; ámbar urgente a
  ≤3 días; desaparece al votar. Sustituye a la fila discreta.
- **Auto-arreglo del layout:** tocar cualquier pestaña del menú cierra el
  teclado y re-sincroniza el viewport (si algo quedó descuadrado, Inicio lo
  recompone).
- **Sin zoom** (pellizco/doble toque): interfaz mobile-first
  (`user-scalable=no` + `touch-action: manipulation`).
- **Campana de avisos:** ordenados del más nuevo al más antiguo y **contador
  rojo de no vistos** en la campana de la Home (se limpia al abrirla).
- **Fix iOS teclado (general):** la app sigue al viewport visible también en su
  **desplazamiento** (`--vv-top`), no solo en altura. Clase `.app-viewport` en el
  shell, el chat del buzón y todos los modales con formulario (hoja scrollable):
  al escribir ya no se descuadra la pantalla ni se oculta lo escrito
  (`specs/10`, `specs/18`).
- **Reservas · anulación:** solo hasta **24 h antes** del inicio (trigger
  `reservas_anulacion_24h`, migración 0020; la gestión puede siempre). La UI
  oculta el botón y lo explica.
- **Reservas · archivo:** las aprobadas ya terminadas se muestran como
  **"Celebrada"** (Mis reservas y agenda de gestión): queda el historial de
  quién usó cada zona y cuándo.
- **Ver como (app_admin):** previsualizar la app con otro rol y volver con la
  barra "Viendo como…".
- **Adopción de la app (app_admin):** gráfico + tabla por piso (dentro / por
  inscribir).
- **Correos de notificación desactivados** (flag `CORREOS_NOTIFICACION`): los
  avisos van por push (solicitudes, reservas, sugerencias → push al app_admin).
  Se mantienen el código de login y la invitación de alta.
- **Buzón:** borrar conversación (migración 0019); en pruebas solo el canal
  "Desarrollador de la app"; aviso automático para activar notificaciones; push
  al recibir nuevas solicitudes de acceso.
- **Layout app-shell general:** la app se fija al viewport visible (`--app-h`
  vía VisualViewport); cabecera y TabBar siempre fijos, solo scrollea el
  contenido. Arregla el desplazamiento de toda la pantalla con el teclado en iOS.
- **Buzón · canal "Desarrollador de la app"** → lo atiende el `app_admin`
  (migración 0018). Ya existían Administración/Presidencia/Conserje.
- **Buzón por canales privados dirigidos** (migración 0017): el vecino elige a
  quién escribe (Administración → administrador_finca; Presidencia → presidente+
  vicepresidente; Conserje → conserje). Privado por rol; ni el app_admin husmea
  otros canales. Push dirigido al canal. Ver `specs/17`.
- **Rol nuevo `conserje`** (migración 0016), asignable y configurable como el resto.
- **Mensajes:** firma seleccionable (Administrador/Conserje/la Junta + viviendas;
  migración 0015) que aparece en el post-it; fecha de caducidad opcional
  prefijada a mañana con papelera para quitarla (migración 0014).
- **Rediseño de Inicio (diseño 2a):** "Tablón de la comunidad" con post-its
  pinchados por tipo; pila con contador que abre un bloc de post-its (gesto de
  despegar hoja). Strip de parking contextual (solo ≤7 días antes / durante /
  cuenta atrás ≤3). Servicios en círculo. Fuente manuscrita Caveat.
- **Instalar app:** Android con instalador nativo (botón); iPhone con guía
  animada (solo Safari). Icono de mensajes junto a la campana → buzón.

## 2026-07-09 — 07-08

- **Mensajería (mensajes públicos + buzón):** modelo unificado de "mensajes"
  (tipo aviso/anuncio/incidencia) que publica solo la gestión; buzón privado
  vecino↔administración (migración 0012). **Retirado por completo** el sistema
  viejo de incidencias y anuncios creados por vecinos (código y BD, migración
  0013). Ver `specs/16`.
- **Permisos personalizables** (migración 0010): tabla `role_permissions`;
  el app_admin (SUPERADMIN) configura permisos por rol; los helpers RLS los leen.
- **Notificaciones push** (Web Push/VAPID, migración 0011) para reservas, mensajes
  y buzón. Correo (Gmail SMTP) para código de acceso, altas, reservas y sugerencias.
- **Gestión de vecinos:** editar (nombre/vivienda), suspender y **dar de baja**
  reversible (estado `baja`, migración 0009). Panel de gestión unificado.
- **Reservas multi-zona** (migraciones 0006/0008): una reserva puede abarcar
  varias zonas en el mismo horario (grupo); 1 reserva vigente por vivienda.
- **Incidencias con aprobación previa** (migración 0007) — luego retirado por el
  modelo de mensajes.
- **Login:** paso a **código OTP de 6 dígitos** por correo (sin Google ni enlace
  mágico). Sugerencias envían correo real (Edge Function + Gmail SMTP).

## 2026-07-06 — 07-07 · Base

- Esqueleto de la app (React+Vite+Supabase), esquema inicial, RLS, triggers,
  vistas y storage (migraciones 0001–0005). Módulos: incidencias, encuestas,
  reservas, parking, contactos, anuncios, sugerencias. Despliegue en Vercel +
  Supabase. Ver specs 01–15.
