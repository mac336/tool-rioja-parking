# Handoff: Rioja 25 — App de comunidad de vecinos (PWA)

## Overview
Rioja 25 es una **PWA mobile-first en español** para una comunidad de ~40 viviendas.
Sustituye avisos en papel y correos sueltos: reúne incidencias, propuestas y
votaciones, reservas de zonas comunes, reparto de parking, contactos y gestión de
la comunidad en un solo sitio, con sensación de "todo ordenado y de confianza".

Personalidad: **cercana, familiar, moderna y muy legible** (hay vecinos mayores →
la claridad y el tamaño táctil son prioridad absoluta). Tres roles con vistas
distintas: **vecino**, **junta**, **admin**.

## About the Design Files
Los archivos de este paquete son **referencias de diseño creadas en HTML** — prototipos que
muestran el aspecto y el comportamiento deseados, **no código de producción para copiar tal cual**.
La tarea es **recrear estos diseños en el entorno del proyecto destino** (React + CSS/Tailwind,
Vue, SwiftUI, etc.) usando sus patrones y librerías establecidos. Si aún no existe entorno,
elige el framework más adecuado para una PWA (recomendado: **React + Vite + PWA plugin**, o Next.js)
e impleméntalos ahí.

Los `.dc.html` son "Design Components" con una sintaxis propia (`<x-dc>`, `dc-import`, `{{ }}`).
**No los ejecutes ni los importes** como código — léelos como especificación visual. `StatusBar.dc.html`
y `TabBar.dc.html` son cromo de dispositivo/navegación reutilizable; en producción la barra de estado
la pinta el sistema operativo (no se implementa), y la `TabBar` sí es un componente real.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciados, radios y estados son finales.
Recrea la UI de forma fiel usando las librerías del codebase. Las pantallas están
diseñadas a **392 px de ancho** (móvil) y con vistas de **escritorio** para Home y Admin.

---

## Design Tokens

### Color — modo claro (roles)
| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#F1F5F2` | Fondo de pantalla |
| `--surface` | `#FFFFFF` | Tarjetas, cabeceras, campos |
| `--surface-2` | `#F6F9F6` | Fondos sutiles, filas de tabla, skeletons |
| `--ink` | `#132520` | Texto principal (verde tinta) |
| `--muted` | `#5C6E66` | Texto secundario |
| `--faint` | `#8DA096` | Metadatos, overlines, placeholders |
| `--primary` | `#10A26C` | Verde de marca / acciones primarias |
| `--primary-700` | `#0B7E52` | Hover/activo del primario, texto sobre soft |
| `--primary-soft` | `#DCF5E8` | Fondos de énfasis primario |
| `--accent` | `#F2793B` | **Acento naranja cálido** (marca "25", eventos, "junta") |
| `--accent-soft` | `#FFE8D6` | Fondos de acento |
| `--border` | `#E3E9E4` | Bordes/divisores suaves |
| `--border-strong` | `#CBD6CE` | Bordes de campos/botón secundario |
| `--success` | `#1B9E5A` · soft `#E1F3E7` | Estado resuelto/confirmado |
| `--warn` | `#CF8A17` · soft `#FBEED2` | Pendiente/aviso |
| `--danger` | `#D2453E` · soft `#FBE4E3` | Abierta/error/rechazar |
| `--info` | `#2F76C9` · soft `#E3EEFA` | En curso/votación |

Colores de fondo de los tiles de módulo (Home): coral `#FFE4DB`/`#D9542B`,
azul `#DFEDFC`/`#2F76C9`, menta `#DCF5E8`/`#0B7E52`, lila `#EAE5FA`/`#7059C9`,
arena `#FFF0D0`/`#A87414`, verde `#E5F4D9`/`#58991F`.

### Color — modo oscuro
| Rol | Hex |
|---|---|
| Fondo | `#0E1714` |
| Superficie | `#16221D` |
| Borde | `#26332D` |
| Ink | `#EAF2EE` |
| Muted | `#9DB0A7` |
| Primary | `#34C08A` (más brillante en oscuro) |
| Acento | `#FF9D66` |

Regla: texto ≥ 4.5:1 sobre superficies (AA). Anillo de foco visible de 3–4 px
en `--primary-soft`.

### Tipografía
- **Display / titulares y logo:** `Bricolage Grotesque` (400–800), `letter-spacing:-.015em`. Pesos 700.
- **UI / cuerpo:** `Figtree` (400/500/600/700/800).
- Escala: Display 40–48px · Título sección 26/700 · Encabezado tarjeta 19/700 ·
  Cuerpo 16/500 (interlineado ~1.55) · Secundario 13px · Overline 11.5px uppercase
  700 `letter-spacing:.14em`.

### Espaciado, radios, sombras
- Espaciado base 4: escala **4 / 8 / 12 / 16 / 24 / 32**.
- Radios: sm 8 · md 14 · lg 20 · **pill 999px** (botones y chips) · avatares 50%.
- Sombras: sutil `0 2px 5px -2px rgba(20,40,30,.25)`; media `0 10px 24px -12px rgba(20,40,30,.4)`;
  elevada `0 24px 50px -20px rgba(20,40,30,.5)`.

### Iconografía
Iconos de línea estilo Lucide: `stroke-width:1.9`, `stroke-linecap/linejoin:round`,
tamaño 22–24px. Sin relleno. El **logo** es un badge redondeado (radio 22–26px) con
degradado `#16B478→#0B7E52`, un **tejado con chimenea** (SVG de líneas blancas) sobre
el número **"25"** en Bricolage — se lee como una casita.

---

## Componentes (con estados)

- **Botón primario:** alto ≥48px (móvil 52–54), `background:--primary`, texto #fff 700,
  `border-radius:999px`, sombra `0 12px 24px -10px rgba(16,162,108,.65)`.
  Estados: hover −2% brillo / activo pressed / foco anillo 4px `rgba(16,162,108,.12)` /
  deshabilitado `--surface-2` + texto `--faint`, `cursor:not-allowed`.
- **Botón secundario:** `1.5px solid --border-strong`, fondo `--surface`, texto `--ink`, pill.
- **Botón de texto:** transparente, texto `--primary` 700.
- **Botón peligro:** `--danger` #fff, o outline `1.5px solid --danger` texto danger sobre #fff.
- **Campo:** alto 48–50px, `1.5px solid --border-strong`, radio 12–13px, fondo #fff, texto 15px.
  Foco: `2px solid --primary` + `box-shadow:0 0 0 4px --primary-soft`, label en `--primary-700`.
  Error: `1.5px solid --danger`, fondo `--danger-soft`, mensaje 12px en `--danger`.
- **Chips de estado (incidencias):** pill, texto 700 12px + punto de color 7px.
  Abierta (danger-soft/#a3341f) · En curso (info-soft/#1f5aa3) · Resuelta (success-soft/#0f6b3f) ·
  Cerrada (surface-2/muted).
- **Badges de rol:** radio 8px, 700 11.5px. Vecino (surface-2/muted) · Junta (accent-soft/#9C5220) ·
  Admin (primary #fff).
- **Chips de categoría:** pill, surface-2 + borde, 600 12px.
- **Tarjeta de lista:** `1px solid --border`, radio 16px, padding 15–16px, fondo `--surface`.
- **Tabla:** contenedor radio 14px + borde; cabecera `--surface-2` overline; filas separadas por
  `1px solid --border`; fila destacada con fondo `--primary-soft`.
- **Avisos/toast:** toast oscuro `#132520` texto claro + icono circular; avisos info/warn con
  fondo soft + borde + icono.
- **Avatares:** círculo (50%), iniciales 700; color de fondo según contexto.
- **TabBar (móvil):** 5 ítems (Inicio, Incidencias, Reservas, Parking, Más), alto 78px,
  fondo `--surface`, borde superior; ítem activo en `--primary` 700, resto `--faint` 500.
  Ver `TabBar.dc.html` (los paths SVG están ahí).
- **FAB:** 58×58, radio 18px, `--primary`, "+" #fff, sombra fuerte; esquina inferior derecha
  sobre la lista.

---

## Screens / Views

Todas las pantallas móvil van dentro de un marco de 392 px con: cabecera (barra de estado
del SO + header propio), contenido y, en las pantallas de nivel superior, la TabBar inferior.
La barra de estado NO se implementa (la pinta iOS/Android).

**IA / navegación:** Tabs inferiores = Inicio, Incidencias, Reservas, Parking, Más.
Propuestas, Contactos, Reciclaje y Junta cuelgan de "Más" y de accesos del Home; se abren
como subpáginas con botón "‹ atrás" (sin TabBar).

### 01 · Login / Entrada
- **Propósito:** entrar o solicitar acceso; inspirar confianza, muy simple.
- **Layout:** fondo degradado `#DFF6EA→#F1F5F2`. Centro: logo 88px, título display
  "Bienvenido a Rioja 25", subtítulo. Abajo, columna de acciones.
- **Acciones (de arriba a abajo):** "Entrar con Google" (secundario, con disco de color Google) ·
  "Recibir enlace por correo" (primario) · divisor "¿Aún no tienes acceso?" ·
  "Solicitar acceso" (outline primario sobre `--primary-soft`). Pie: "Solo vecinos verificados".

### 02 · Solicitar acceso
- **Propósito:** formulario breve de alta.
- **Campos:** Nombre y apellidos · Piso (**select**, ej. "2º C Dcha") · Correo · Comentario (opcional, textarea).
- **CTA fija abajo:** "Enviar solicitud" (primario, ancho completo). Header con back.

### 03 · Solicitud enviada / pendiente
- **Propósito:** confirmación + estado.
- Icono de éxito circular grande, título "Solicitud enviada", texto personalizado
  ("La junta revisará tu acceso para el 2º C Dcha…"), pill de estado **"Pendiente de aprobación"**
  (warn). Botón secundario "Volver a la entrada".

### 04 · Inicio / Home (móvil)  ← pantalla central
- **Propósito:** vistazo rápido + accesos a módulos.
- **Header con degradado primario:** saludo "¡Hola, Marta! 👋" (display) + fecha, campana con
  punto de aviso (acento) y avatar circular "MR". El contenido monta sobre el header con
  esquinas `20px 20px 0 0` (`margin-top:-10px`).
- **"Hoy en tu comunidad":**
  1. Tarjeta oscura de **parking**: "Esta quincena aparcas en la · Plaza P-14 · nivel −1" con icono coche en acento.
  2. Dos tarjetas: **Votación** (punto info, "Horario de piscina · cierra en 4 días") y **Junta**
     (punto acento, "Reunión anual · 18 jul 19:00").
  3. Banner cálido de **vida vecinal** (accent-soft): "Cena de vecinos en el patio · sáb 19 · 21:00"
     con botón pill "Voy".
- **"¿Qué necesitas?":** rejilla 3 columnas de tiles con icono en cuadrado de color + etiqueta.
  Incidencias (coral, badge "2" danger), Votaciones (azul), Reservas (menta), Parking (lila),
  Contactos (arena), Reciclaje (verde).
- **TabBar** activa "Inicio".

### 05 · Incidencias · lista
- Header con back + chips de filtro (Todas·4 activa / Abiertas·2 / En curso). Lista de tarjetas:
  título, chip de estado, meta ("Portal · reportada por 3º B · hace 2 h"), chip de categoría +
  contador de comentarios. Resueltas con opacidad reducida. **FAB "+"** para nueva. TabBar "Incidencias".

### 06 · Incidencia · detalle
- Header "Incidencia #128" + menú ⋮. Chip de estado, título display, meta.
- **Stepper de estado horizontal:** Abierta ✓ → En curso → Resuelta → Cerrada (pasos futuros con
  círculo punteado).
- Dos miniaturas de foto (placeholder gris con icono imagen), descripción, sección **Comentarios**
  (avatar + burbuja con autor/rol y tiempo). **Input de comentario fijo abajo** (pill) + botón enviar circular.

### 07 · Nueva incidencia
- Header con "×". Campos: Título · **Categoría** (chips seleccionables, uno activo primario) ·
  Descripción (textarea) · **Foto** (cuadro punteado "Añadir" 82×82 + miniatura con "×" de borrar).
  CTA fija "Crear incidencia".

### 08 · Propuestas y votaciones · lista
- Subpágina (back). Tarjeta destacada de votación abierta con borde primario: chip "● Votación abierta",
  título, barra de progreso de participación (23/40), botón "Votar ahora". Debajo: propuesta Sí/No
  ("Ya votaste ✓") y propuesta cerrada ("Aprobada · Ver resultados").

### 09 · Votación
- Título display + regla "un voto por vivienda, editable hasta el cierre". **Opciones tipo radio**
  como tarjetas grandes; la seleccionada con borde primario 2px, fondo soft, radio relleno y anillo.
  Pie: sello "Voto anónimo y verificado" (icono candado) + CTA "Confirmar mi voto".

### 10 · Resultados
- 3 tarjetas de resumen (votos 38 · participación 95% · **Quórum ✓** en success). Barras horizontales
  por opción con %, la ganadora con pill "Ganadora" primaria; resto en `--border-strong`.
  Aviso "Tu voto … fue registrado".

### 11 · Reservas · zonas comunes
- Header + chips de zona (Sala social activa / Piscina / Barbacoa). Selector de día (fila de tarjetas
  de fecha, hoy resaltado en primario). **Franjas** en rejilla 2 col: Libre (borde normal, "Libre" success),
  Ocupada (surface-2, opacidad, deshabilitada), Seleccionada (borde primario + anillo). Barra inferior
  con resumen + "Reservar franja". TabBar "Reservas".

### 12 · Mis reservas / confirmación
- Toast oscuro "Reserva confirmada · Sala social · sáb 12 · 16–19 h". Sección "Próximas": tarjetas con
  cuadro de fecha (mes+día), zona, horario y pill de acción (Activa / Cancelar). TabBar "Reservas".

### 13 · Parking · reparto quincenal
- Tarjeta grande con degradado primario: "Esta quincena · te toca la · **Plaza P-14**" + icono coche
  translúcido de fondo. Tabla "Próximas quincenas · 6 plazas": columnas Quincena / Tu plaza, la actual
  resaltada en `--primary-soft`. TabBar "Parking".

### 14 · Contactos · directorio
- Secciones por categoría: **Administración** (avatar iniciales, botones circulares tel + email),
  **Conserjería** (con horario), **Proveedores** (lista con icono + chevron). Teléfono/email son pulsables
  (`tel:` / `mailto:`).

### 15 · Panel de administración (móvil)
- Aspecto "zona de gestión": **header oscuro** `#132520`, badge "ADMIN" (acento), fondo de pantalla `#F3F4F1`.
  Control segmentado Solicitudes(3) / Vecinos(38). Tarjeta de solicitud: avatar + nombre + correo + pill
  "Pendiente", cita del comentario, **selects de Piso y Rol**, botones "Aprobar" (primario) / "Rechazar" (outline danger).

### 16 · Estados (vacío / cargando / error)
- **Vacío:** icono en cuadro soft, título display amable ("Todo en orden por aquí"), texto, CTA.
- **Cargando:** skeletons (círculo + barras `--surface-2`).
- **Error:** icono danger, "No hemos podido cargar", CTA "Reintentar".

### D1 · Inicio (escritorio)
- Chrome de navegador (rioja25.app). **Sidebar 238px** con degradado verde oscuro: logo, nav
  (Inicio activo con fondo translúcido, Incidencias con badge, Votaciones, Reservas, Parking, Contactos),
  bloque de usuario abajo con badge de rol. **Main:** topbar (saludo display + fecha, buscador, campana),
  "Hoy en tu comunidad" en rejilla 3 col (tarjeta parking ancha + votación + junta), banner de cena de
  vecinos, "¿Qué necesitas?" en rejilla de 6 tiles.

### D2 · Panel de administración (escritorio)
- Misma sidebar en modo "Gestión" (Solicitudes activo con badge 3, Vecinos, Ajustes; usuario = Fincas Aguirre / ADMIN).
- **Main:** título "Solicitudes de acceso" + pill "3 pendientes", pestañas Pendientes/Aprobadas/Rechazadas.
  **Tabla** columnas: Solicitante (avatar+nombre+tiempo) · Piso · Correo · **Rol (select)** · Acciones
  (Aprobar primario / Rechazar outline). Fila = una solicitud.

---

## Interactions & Behavior
- **Navegación:** tabs inferiores (móvil) / sidebar (escritorio). Módulos secundarios y detalles → push con back.
- **Login:** Google OAuth y magic-link por correo. Sin acceso → flujo Solicitar (02→03).
- **Solicitud de acceso:** crea registro `pending`; el admin la aprueba/rechaza (15/D2), asignando piso y rol.
- **Incidencias:** crear con foto adjunta; ciclo de estado Abierta→En curso→Resuelta→Cerrada (stepper);
  comentarios en hilo.
- **Votaciones:** un voto por vivienda, editable hasta el cierre; tipos Sí/No o múltiple; resultados con
  quórum y participación.
- **Reservas:** elegir zona → día → franja libre → confirmar (toast + aparece en "Mis reservas"); cancelable.
- **Parking:** rotación quincenal de 6 plazas; mostrar plaza actual y próximas.
- **Estados:** cada lista/pantalla necesita variantes vacío / cargando (skeleton) / error (reintentar).
- **Táctil/accesibilidad:** objetivos ≥ 44px, foco visible (anillo 3–4px), contraste AA, tipografía legible.
- **Transiciones:** suaves y discretas (150–250ms ease); sin animaciones llamativas.

## State Management
- `session/user`: { id, nombre, piso, rol: 'vecino'|'junta'|'admin', estado: 'pending'|'active' }.
- `accessRequests[]`: solicitudes con estado; acciones aprobar/rechazar + set piso/rol.
- `incidents[]`: { titulo, categoria, estado, fotos[], reportadoPor, comentarios[] }.
- `proposals[]` + `votes`: opciones, voto del usuario, recuento, cierre, quórum.
- `reservations[]`: zona, fecha, franja, estado; disponibilidad por zona/día.
- `parking`: asignación por quincena (6 plazas) → plaza del usuario.
- `contacts[]` por categoría. UI: tab/ruta activa, modo claro/oscuro, toasts.
- Datos vía API/fetch por módulo; cada vista maneja loading/empty/error.

## PWA
- Instalable: manifest con icono de app (badge casita "25", fondo primario) + splash.
- `theme-color`: `#10A26C` (claro) / `#0E1714` (oscuro).
- Persistir posición/estado ligero en cliente cuando aplique; funcionar offline básico (cache shell).

## Assets
- **Sin imágenes externas.** Logo e iconos son SVG inline (líneas, estilo Lucide) — reimplementar con
  el set de iconos del codebase (p. ej. lucide-react). Fotos de incidencias son placeholders → las suben los usuarios.
- Fuentes: **Bricolage Grotesque** y **Figtree** (Google Fonts).

## Archivos listos para copiar/pegar (empieza por aquí — ahorran trabajo)
- `BUILD_GUIDE.md` — stack recomendado, estructura de carpetas, inventario de primitivos, orden de implementación.
- `tokens.css` — variables CSS (claro + oscuro). Cópialo tal cual.
- `tokens.json` — mismos tokens como datos.
- `tailwind.tokens.js` — fragmento para `tailwind.config.js`.
- `types.ts` — modelos de datos TypeScript.
- `mock-data.json` — datos de ejemplo en español para poblar toda la UI.
- `icons.svg.txt` — paths SVG exactos + equivalencias con lucide-react.

## Files (referencias de diseño)
- `Rioja 25 v2.dc.html` — diseño completo: guía de estilo (color claro/oscuro, tipografía, espaciado,
  radios, sombras), librería de componentes, 16 pantallas móvil y 2 de escritorio (Home + Admin).
- `TabBar.dc.html` — navegación inferior; contiene los paths SVG de los iconos de tab.
- `StatusBar.dc.html` — barra de estado simulada (solo para el mockup; NO implementar).

> Los `.dc.html` usan una sintaxis de plantilla propia (`<x-dc>`, `{{ }}`, `dc-import`). Trátalos como
> **especificación visual**: abre y lee el marcado inline (colores/medidas están literales en los `style`),
> no los ejecutes como componentes.
