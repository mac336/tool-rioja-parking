# 12 · Roadmap por fases

Orden sugerido de construcción. Cada fase deja algo utilizable y verificable.

## Fase 0 · Cimientos y seguridad
- Crear proyecto Supabase (UE) y proyecto en Vercel conectado a GitHub.
- Configurar Auth (Google + enlace mágico) y SMTP con Gmail.
- Esqueleto React + Vite + router + PWA.
- Definir esquema de BD y **RLS en todas las tablas** (módulo 04).
- Cabeceras de seguridad, CSP, limpieza del repo/historial (módulo 11).
- **Salida:** app vacía que autentica y aplica permisos.

## Fase 1 · Cuentas y acceso
- Pantalla de entrada (Entrar / Solicitar acceso).
- Formulario de solicitud con captcha + rate-limit.
- Edge Functions `notificar-admin` y `aprobar-solicitud`.
- Panel de admin: aprobar/rechazar, asignar **vivienda** y rol, suspender
  (máx. 2 cuentas por vivienda).
- **Salida:** los administradores pueden dar de alta vecinos de forma segura.

## Fase 2 · Portar lo existente
- Parking: portar la lógica de rotación + autoselección por vivienda del perfil.
- Contactos migrados a BD, detrás de login (quitar datos del HTML público).
- Reciclaje portado al nuevo frontend. **Junta fuera** (será un anuncio).
- **Salida:** paridad con la app actual, ya con login y datos protegidos.

## Fase 3 · Participación
- Incidencias (crear, listar, adjuntos, estados, comentarios).
- Encuestas (crear por gestión, **1 voto por vivienda**, resultados).
- Tablón de anuncios (creación abierta + moderación/aprobación).
- Sugerencias de la app (email a `cdelarioja25@gmail.com`).
- **Salida:** núcleo participativo funcionando.

## Fase 4 · Reservas y parking avanzado
- Zonas comunes (Jardín, Piscina, Sala comunidad, Lonja Delantera) + calendario +
  reservas con nº de invitados, **aprobación** y anti-solapamiento
  (pendiente/aprobada bloquean franja).
- Parking: donación/cesión de plaza y panel de demanda (por vivienda).
- **Salida:** reservas y gestión de plazas.

## Fase 5 · Pulido y revisión final
- Accesibilidad, rendimiento, textos, aviso de privacidad (RGPD).
- **Revisión de seguridad dedicada** (checklist módulo 11).
- Prueba con un grupo reducido de vecinos antes de abrir a todos.
- **Salida:** app lista para la comunidad.

## Notas
- El **diseño (look & feel)** se aplica en paralelo desde Fase 2, a partir del
  resultado del `design-prompt.md`.
- Las funciones marcadas como opcionales en los módulos (histórico de cesiones
  de parking, notificaciones por email de reservas/incidencias, formulario propio
  de sugerencias) se valoran tras la v1.
