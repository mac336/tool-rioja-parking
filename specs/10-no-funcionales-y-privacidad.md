# 10 · Requisitos no funcionales y privacidad

## Estado actual (PWA, notificaciones, layout)

- **Instalar en el móvil** (`InstallPrompt`):
  - **Android/Chrome:** botón que lanza el instalador nativo (`beforeinstallprompt`).
  - **iPhone:** Apple **no** permite instalar con un botón; se muestra una **guía
    animada** (flecha al botón Compartir) y **solo** si es Safari (si es Chrome
    iOS u otro, se invita a abrir en Safari). Requisito para push en iOS.
- **Notificaciones push** (Web Push/VAPID, `push_subscriptions`): el vecino las
  activa en Ajustes. En iPhone requieren la app **instalada**. Envío desde Edge
  Functions (`notificar`, `notificar-reserva`) con clave privada VAPID en el
  servidor (la pública va en el cliente). Usos: mensajes nuevos, buzón, reservas.
- **Layout app-shell:** la app se **fija al viewport visible** (`--app-h` vía
  VisualViewport, `AppShell` en `position: fixed`). El documento nunca hace
  scroll; **cabecera y TabBar siempre fijos** y solo scrollea el contenido. Evita
  el desplazamiento de toda la pantalla con el teclado en iOS.
- **Bienvenida** al abrir (una vez por sesión) con botón Siguiente.

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
