# Changelog — Rioja 25

Cambios funcionales relevantes, más recientes arriba. Cada entrada nueva se añade
al implementar el cambio (ver `CLAUDE.md` → Forma de trabajo).

## 2026-07-10

- **v1.7.0 · Acceso directo (temporal) + bienvenida en 2 pasos:** los vecinos ya
  aprobados entran **solo con su correo, sin código** (flag `ACCESO_DIRECTO`;
  Edge `acceso-directo` genera sesión sin enviar correo), para no liar a la gente
  mayor. Reversible poniendo el flag a `false`. La **bienvenida** añade un
  segundo paso que invita a **instalar la app** en el móvil.
- **v1.6.0 · Adopción por piso: entrado vs sin entrar:** la tabla de Adopción
  marca en cada vivienda con cuenta si **ha entrado** (ya inició sesión) o está
  **sin entrar** (aprobada pero no ha accedido — típicamente correo en spam).
  Función `stats_acceso_por_vivienda` (mig. 0025). Aclara que "con cuenta" no es
  lo mismo que "ha entrado".
- **v1.5.0 · Adopción + normas:** el Dashboard → Adopción muestra ahora
  **cuántas cuentas han conseguido entrar** alguna vez (`stats_acceso`, mig.
  0024). La pantalla de **normas** (primer acceso) fija el botón "Acepto" abajo,
  siempre visible, arreglando el problema de scroll en Android.
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
  Supabase. Ver specs 01–15.- **v1.9.0 · Home rediseñada como panel de gadgets (sin scroll):** el tablón
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

