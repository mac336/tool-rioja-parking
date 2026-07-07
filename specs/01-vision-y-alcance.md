# 01 · Visión y alcance

## Objetivo

Convertir el portal informativo de **Rioja 25** en una **app de comunidad**
donde los vecinos, tras identificarse, puedan guardar información compartida,
responder encuestas, reservar zonas comunes, reportar incidencias, publicar
anuncios en un tablón (con aprobación) y consultar el parking.

La app debe ser **ligera**, **mobile-first** (uso mayoritario desde el móvil,
también accesible desde PC), instalable como PWA, **gratuita** de operar y, sobre
todo, **segura**: contiene datos personales de vecinos.

## Usuarios y roles

Seis roles. Los cinco primeros forman el grupo de **gestión** (con distintos
grados de permiso); `vecino` es el rol base.

| Rol | Quién | Resumen |
|-----|-------|---------|
| **app_admin** | Responsable técnico de la app (Miguel) | Puede todo: usuarios, roles, configuración, aprobaciones. |
| **presidente** | Presidente de la comunidad | Gestión: aprueba altas, reservas y anuncios; crea encuestas; gestiona parking e incidencias. |
| **vicepresidente** | Vicepresidente | Como presidente (gestión operativa). |
| **administrador_finca** | Administrador de fincas externo | Aprobaciones y gestión operativa (reservas, incidencias, altas); sin configuración de la app. |
| **junta** | Vocales de la junta rectora | Gestión operativa (moderar, aprobar reservas/anuncios, crear encuestas). |
| **vecino** | Propietario/residente aprobado | Consulta, crea incidencias y anuncios (a aprobar), vota encuestas, reserva zonas comunes (a aprobar), gestiona su plaza. |

> El reparto exacto de cada permiso entre los roles de gestión es
> **configurable** por `app_admin`. La matriz por defecto está en el módulo 03.

## Escenario de identidad

- Comunidad de ~40 viviendas.
- **Hasta 2 cuentas por vivienda** (p. ej. una pareja).
- En **encuestas** y en la **necesidad/donación de plaza**, cuenta **1 por
  vivienda** (aunque existan 2 cuentas), para no duplicar el peso de un piso.
- Cada cuenta se asocia a una **vivienda** y un **rol** tras la aprobación.

## Alcance de la v1

1. **Autenticación y gestión de usuarios**: login (Google + enlace mágico),
   solicitud de acceso, aprobación por administrador, asignación de vivienda y
   rol, activación/suspensión de cuentas (módulo 03).
2. **Incidencias**: crear, listar, seguir estado y cerrar (módulo 05).
3. **Encuestas**: la gestión publica encuestas/sondeos y la comunidad vota; hay
   un resultado ganador **informal** (módulo 06).
4. **Reservas de zonas comunes**: reservar franja con nº de invitados; queda
   **pendiente de aprobación** por la gestión (módulo 07).
5. **Parking**: rotación de las 6 plazas exteriores (portada de la app actual) +
   posibilidad de **donar/ceder** la plaza y medir la demanda (módulo 08).
6. **Contactos**: directorio actual (administrador, proveedores, junta), **movido
   detrás del login** (módulo 09).
7. **Tablón de anuncios**: cualquiera crea un anuncio (con límite de texto y
   formato cuidado); la gestión lo aprueba antes de publicarlo (módulo 13).
8. **Sugerencias de la app**: enviar feedback sobre la propia app por correo a
   `cdelarioja25@gmail.com` (módulo 14).

Se mantiene **Reciclaje** como contenido estático, portado al nuevo frontend.

## Fuera de alcance (v1)

- Sección propia de **Junta** (fecha/orden del día). Cuando haga falta, será un
  **anuncio** en el tablón. La lógica de recordatorio (.ics) puede recuperarse
  más adelante.
- Pagos, cuotas o contabilidad de la comunidad.
- Votaciones con validez legal/oficial (las encuestas son **informales**),
  ponderación por coeficiente, y firma electrónica de delegaciones.
- Chat/mensajería en tiempo real.
- App nativa en tiendas (se entrega como **PWA instalable**).
- Multi-comunidad.

## Criterios de éxito

- Un vecino puede solicitar acceso, ser aprobado y entrar desde el móvil en
  pocos minutos.
- Ningún dato personal de vecinos es accesible sin sesión iniciada y aprobada.
- Una encuesta registra **como máximo un voto por vivienda**.
- Una reserva no aprobada **no** ocupa formalmente el espacio, pero **bloquea/
  avisa** a quien intente reservar la misma franja.
- Coste de operación **0 €** con el volumen de la comunidad.
- La app pasa una revisión de seguridad básica sin hallazgos críticos
  (módulo 11).
