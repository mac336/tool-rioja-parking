# 10 · Requisitos no funcionales y privacidad

## Estado actual (PWA, notificaciones, layout)

- **Instalar en el móvil** (`InstallPrompt`):
  - **Android/Chrome:** botón que lanza el instalador nativo (`beforeinstallprompt`).
  - **iPhone:** Apple **no** permite instalar con un botón; se muestra una **guía
    animada** (flecha al botón Compartir) y **solo** si es Safari (si es Chrome
    iOS u otro, se invita a abrir en Safari). Requisito para push en iOS.
- **Notificaciones push** (Web Push/VAPID, `push_subscriptions`): el vecino las
  activa en Ajustes **o** con el aviso automático que aparece al entrar si aún no
  las tiene (`NotificationsPrompt`; "Ahora no" las pospone unos días, siempre
  reversible en Ajustes). En iPhone requieren la app **instalada** (abierta desde
  el icono). No se pueden forzar: el permiso lo concede el usuario. Envío desde
  Edge Functions (`notificar`, `notificar-reserva`, `notificar-admin`) con clave
  privada VAPID en el servidor (la pública va en el cliente). Usos: mensajes
  nuevos, buzón, reservas, **nuevas solicitudes de acceso** y **sugerencias**
  (estas últimas → push al app_admin).
- **Correos:** los **correos de notificación están DESACTIVADOS** (interruptor
  `supabase/functions/_shared/config.ts` → `CORREOS_NOTIFICACION = false`); esos
  avisos van por push. Siguen activos solo los **imprescindibles**: el **código
  de acceso** (login OTP, vía Supabase Auth) y la **invitación al aprobar un
  alta** (`aprobar-solicitud`). Reactivar = poner el flag a `true` y redesplegar.
- **Layout app-shell:** la app se **fija al viewport visible** con la clase
  `.app-viewport` (altura `--app-h` **y desplazamiento `--vv-top`**, ambos
  sincronizados desde VisualViewport en `src/main.tsx`). iOS, al abrir el
  teclado, encoge **y desplaza** el viewport visible; seguirlo en ambas cosas es
  lo que evita que la pantalla "se descuadre". El documento nunca hace scroll
  (se recoloca a 0 si queda scroll residual); **cabecera y TabBar siempre
  fijos** y solo scrollea el contenido. `.app-viewport` se usa en `AppShell`,
  el chat del buzón y **todos los modales con formulario** (hoja inferior con
  `max-h-full overflow-y-auto` para que el propio formulario scrollee sobre el
  teclado). Sincronización en `src/lib/viewport.ts`.
- **Red de seguridad:** pulsar cualquier pestaña del TabBar cierra el teclado y
  re-sincroniza el viewport (`resetViewport`): si una pantalla quedara
  descuadrada, tocar Inicio la recompone.
- **Escritorio (md+):** el app-shell pasa a **flujo normal** — scrollea la
  ventana (sin barra interna) y la Sidebar queda pegajosa (`sticky`). El modo
  fijado al viewport es solo para móvil (teclado iOS).
- **Solo vertical (móvil):** el manifest fija `orientation: portrait` (Android
  instalada); iOS no lo respeta → overlay CSS a pantalla completa que pide girar
  el móvil cuando se usa en horizontal.
- **Sin zoom:** `maximum-scale=1, user-scalable=no` (index.html) +
  `touch-action: manipulation` (body). Interfaz mobile-first; el zoom por
  pellizco/doble toque descuadraba la app instalada.
- **Campana de avisos:** feed DERIVADO (se calcula al vuelo: últimos 3 mensajes
  activos, buzón sin leer, votación abierta, reserva aprobada, cola de gestión),
  ordenado del más nuevo al más antiguo (`ts`). Un aviso desaparece cuando su
  origen deja de estar vigente (mensaje borrado/caducado, hilo leído, votación
  cerrada…). Contador de "no vistos" en la campana de la Home comparando `ts`
  con la última visita a /avisos (localStorage, por dispositivo).
- **Bienvenida** al abrir (una vez por sesión de pestaña) en **dos pasos**:
  (1) mensaje de bienvenida; (2) **invitación a instalar la app** en el móvil
  (Android: instalador nativo; iPhone: guía Compartir → Añadir a pantalla de
  inicio) para que solo se identifiquen una vez. Si ya está instalada (abierta
  desde el icono) el paso 2 se omite.

## Rendimiento
- App ligera: carga inicial rápida en móvil (objetivo < 200 KB JS inicial
  comprimido; *code-splitting* por módulo).
- Listados paginados si crecen (incidencias, reservas).
- Consultas con índices (módulo 04).

## PWA e instalación
- Mantener PWA instalable (manifest + service worker), como hoy.
- **Cuidado con el cacheo:** el service worker cachea la **App Shell** (HTML/CSS/
  JS/iconos), **nunca** datos personales ni respuestas de la API de Supabase.
  Estrategia: *cache-first* para estáticos, *network-only* para datos.
- Al cerrar sesión, limpiar cachés/estado local que pudieran contener datos.

## Accesibilidad
- Contraste suficiente, foco visible, navegable con teclado, etiquetas ARIA en
  controles. Textos de imágenes/adjuntos con alternativa.
- Tamaños táctiles adecuados (móvil).

## Idioma
- Español (es-ES) en toda la interfaz y correos. Estructura preparada para i18n
  por si se añadieran idiomas, pero v1 solo español.

## Compatibilidad
- Navegadores modernos móviles (Safari iOS, Chrome Android) y escritorio.
- Mantener los avisos de instalación para iOS/Android que ya existen.

## Privacidad y RGPD
La app trata **datos personales** de vecinos (nombre, piso, correo, teléfono,
incidencias). Requisitos:
- **Base legal e información:** aviso de privacidad accesible que explique qué
  datos se guardan, para qué (gestión de la comunidad), quién es responsable y
  cómo ejercer derechos (acceso, rectificación, supresión).
- **Minimización:** guardar solo lo necesario. No pedir DNI en la app (la
  delegación de voto sigue en papel).
- **Ubicación de datos:** proyecto Supabase en la **UE**.
- **Acceso restringido:** datos solo visibles tras login y según rol (RLS).
- **Derecho de supresión:** el admin puede suspender y borrar una cuenta y sus
  datos asociados; documentar el procedimiento.
- **Retención:** por defecto **2 años** (configurable por `app_admin`): las
  incidencias cerradas, encuestas cerradas (y sus votos) y anuncios
  archivados/rechazados se borran o anonimizan a los 2 años de su cierre. Puede
  ejecutarse con un job programado (pg_cron en Supabase) o como tarea manual
  documentada del admin. El plazo figura en el aviso de privacidad.
- **Sin terceros de tracking:** no incluir analítica invasiva ni cookies de
  terceros. Si se quiere métrica, usar algo respetuoso y anonimizado.
- **Correos:** enviados desde la cuenta de la comunidad; sin datos personales
  innecesarios en el cuerpo.

## Copias de seguridad y continuidad
- Aprovechar los **backups** de Supabase; documentar frecuencia y cómo
  restaurar. Exportación periódica opcional (p. ej. CSV cifrado) del admin.
- Documentar qué pasa si se supera el free tier (plan de contingencia: el
  volumen esperado está muy por debajo).

## Observabilidad
- Registro de errores del frontend (sin datos personales) y `audit_log` en BD
  para acciones sensibles (módulo 04).
