# Prompt para diseño — App Comunidad Rioja 25

> Copia y pega este texto en la herramienta de diseño. Ajusta lo que quieras
> antes de enviarlo. Al final hay variantes de estilo por si quieres pedir
> varias direcciones.

---

## Prompt

Diseña el **look & feel y las pantallas** de una **app de comunidad de vecinos**
llamada **"Rioja 25"**. Es una PWA **mobile-first** (se usa sobre todo desde el
móvil, instalada en la pantalla de inicio), en **español**, para una comunidad
de ~40 viviendas. Debe transmitir **cercanía, confianza y orden**: es la
herramienta del día a día de los vecinos, no una app corporativa fría.

**Objetivo visual:** algo **fresco, moderno y limpio**, agradable para todas las
edades (hay vecinos mayores), muy legible, con buen contraste y elementos
táctiles grandes. Estética cuidada pero cálida y sencilla de usar.

**Personalidad de marca:** comunidad, hogar, confianza, transparencia. "Rioja
25" es la dirección del portal; el "25" puede ser un elemento gráfico distintivo.

**Punto de partida (opcional):** la versión actual usa una paleta "portal
clásico" en verde profundo y detalles en dorado/latón, con tipografía serif para
titulares. Puedes **partir de ahí y modernizarlo**, o proponer una dirección
nueva más luminosa. Prioriza siempre legibilidad y sensación actual.

**Necesito el diseño de estas pantallas:**

1. **Entrada / Login** — con dos acciones claras: *Entrar* (con Google o enlace
   por correo) y *Solicitar acceso*. Debe inspirar confianza y ser muy simple.
2. **Solicitar acceso** — formulario breve: nombre, vivienda (selector), correo
   y comentario opcional; y un estado de "solicitud enviada / pendiente de
   aprobación".
3. **Inicio (Home)** — panel con accesos a los módulos: Tablón de anuncios,
   Incidencias, Encuestas, Reservas, Parking, Contactos, Reciclaje. Con "vistazo
   en vivo" (p. ej. mi próxima plaza de parking, encuesta abierta, últimos
   anuncios).
4. **Tablón de anuncios** — lista de anuncios publicados (tarjetas con título,
   autor y fecha); pantalla de **crear anuncio** con editor de formato cuidado
   pero limitado (negrita/cursiva/listas/enlace + opción de una imagen), contador
   de caracteres, **fecha de inicio y fin obligatorias** y vista previa; estado
   del anuncio propio (pendiente/publicado/rechazado) y aviso de "solo 1 anuncio
   pendiente a la vez". **Cola de moderación** para roles de gestión
   (aprobar/rechazar/editar), con marca visible si la duración supera 1 año.
5. **Incidencias** — lista con estado y categoría; ficha de detalle con fotos,
   estados (abierta/en curso/resuelta/cerrada) y comentarios; formulario de nueva
   incidencia con adjuntar foto.
6. **Encuestas** — lista de encuestas; pantalla de votación (opción única o
   múltiple, **un voto por vivienda**, con nota "sondeo informal") y
   **resultados** con ganador.
7. **Reservas de zonas comunes** — zonas (Jardín, Piscina, Sala comunidad, Lonja
   Delantera); calendario/agenda que distingue libre / **pendiente de aprobar** /
   reservado (**sin mostrar quién** reservó; eso solo lo ve la gestión);
   formulario con fecha, hora inicio, hora fin y **nº de invitados**;
   estado **"ya tienes una reserva vigente"** que muestra tu reserva (zona, fecha,
   estado) + botón **anular** y bloquea crear otra; "mis reservas"; y **cola de
   aprobación del presidente**.
8. **Parking** — reparto de la quincena actual (6 plazas), "qué plaza me toca",
   tabla/calendario de próximas quincenas, y acción para **donar/ceder mi plaza**
   o **indicar que necesito plaza**; panel de **demanda** para gestión.
9. **Contactos** — directorio por categorías (administrador, conserje,
   proveedores, junta) con teléfono y email pulsables.
10. **Sugerencias de la app** — apartado simple para enviar feedback sobre la app
    (abre un correo prerrellenado).
11. **Panel de administración** — gestión de solicitudes de acceso
    (aprobar/rechazar, asignar **vivienda** y **rol**), usuarios, zonas comunes y
    moderación. Aspecto claro de "zona de gestión". Considera **badges de rol**
    (app admin, presidente, vicepresidente, adm. finca, junta, vecino).
12. **Aceptación de normas de uso** — pantalla del primer acceso con el resumen
    de normas de la comunidad y botón de aceptar (no se puede continuar sin
    aceptar). Y un **aviso de privacidad** accesible (página de texto legible).
13. **Estados vacíos, cargando y error** — mensajes amables cuando no hay datos.

**Requisitos de diseño:**
- **Mobile-first** (diseña primero para móvil ~375–430 px de ancho); indica cómo
  se adapta a escritorio.
- **Sistema de diseño**: paleta (con roles de color y modo claro; opcional
  oscuro), tipografía, escalas de espaciado, radios, sombras, y componentes
  reutilizables (botones, campos, tarjetas, chips de estado, tablas, navegación,
  cabeceras, avisos/toasts, badges de rol).
- **Accesibilidad AA**: contraste suficiente, foco visible, tamaños táctiles
  ≥ 44 px, tipografía legible.
- **Estados** por componente: normal, hover/activo, deshabilitado, error, carga.
- **Iconografía** coherente y sencilla; sin recargar.
- Coherente con instalación como **PWA** (icono de app, pantalla de inicio,
  colores de tema).
- Todos los textos de ejemplo en **español**.

**Entregables deseados:** guía de estilo (tokens de color/tipografía/espaciado),
librería de componentes y las pantallas anteriores en alta fidelidad (móvil, y
al menos Home + Admin también en escritorio). Si es posible, con notas de
interacción.

**Tono de las imágenes/contenido de ejemplo:** realista de una comunidad de
vecinos española (nombres de vivienda tipo "2º C Dcha", zonas reales como
"Piscina", "Sala comunidad" o "Lonja Delantera", incidencias como "Luz fundida
en el portal", anuncios como "Se vende bici").

---

## Variantes de estilo (elige o pide varias)

- **A — "Portal clásico renovado":** parte del verde/dorado actual, moderniza
  tipografía y espaciados. Cálido, señorial pero actual.
- **B — "Fresco y luminoso":** fondos claros, un color de acento vivo (p. ej.
  verde/teal o azul), mucho aire, tarjetas suaves. Muy moderno y accesible.
- **C — "Minimal neutro":** grises cálidos + un acento, foco total en contenido y
  legibilidad. Sobrio y atemporal.

## Contexto útil para quien diseñe
- Usuarios de todas las edades; prioridad absoluta a la **claridad**.
- Uso frecuente y rápido desde el móvil (consultar parking, votar, reservar);
  también accesible desde PC.
- Seis roles: **vecino** (base) y roles de gestión (**app admin**, **presidente**,
  **vicepresidente**, **administrador de finca**, **junta**), que ven además las
  colas de aprobación/moderación y el panel de gestión. Diseña **badges de rol**.
- La app sustituye a avisos en papel y correos sueltos: debe dar sensación de
  "aquí está todo lo de la comunidad, ordenado y de confianza".
