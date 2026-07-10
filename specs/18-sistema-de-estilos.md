# 18 · Sistema de estilos (design system)

> **La Home manda en estilos.** Este documento fija el look & feel para no romper
> la estética al añadir pantallas. Las piezas reutilizables viven en
> `src/components/ui`; los tokens en `src/styles/tokens.css`.

## Tipografía

- **Display** (`--font-display`, Bricolage Grotesque): títulos.
- **UI** (`--font-ui`, Figtree): texto general.
- **Manuscrita** (`--font-hand`, Caveat): fechas y firmas del tablón de post-its.

## Cabecera de pantalla — `<ScreenHeader title right? />`

Cabecera **fija** (sticky, se queda arriba mientras el contenido se desplaza) de
una **pantalla principal** (destino de la barra inferior o de un mosaico): título
en **display 22px extrabold**, `border-b`, `bg-surface/95` con `backdrop-blur`,
`safe-top`. Sin botón atrás.

- **Subpáginas** (a las que llegas navegando, con vuelta atrás): usan `SubHeader`
  (con botón ‹ atrás). Ej.: Mis reservas, un chat del buzón, Reciclaje.
- **No** usar tamaños sueltos (26px, etc.): todas las cabeceras principales usan
  `ScreenHeader`.

## Título de sección — `<SectionTitle>` / `.section-title`

Encabezado de un grupo de contenido. Estilo **"Tablón de la comunidad"**:
display, **15px, peso 800, tono `--ink`, sin mayúsculas ni tracking**.

- ❌ **Prohibido** usar el viejo **overline** (mayúsculas + tracking + `--faint`)
  como título de sección. Se retiró de todas las pantallas.
- El `.overline` queda **solo** para **micro-rótulos dentro de tarjetas** (p. ej.
  "Parking exterior" sobre el strip de color, o la función de un contacto).

## Layout (app-shell)

- La app se **fija al viewport visible** con la clase **`.app-viewport`**
  (altura `--app-h` + desplazamiento `--vv-top`, vía VisualViewport). Ver
  `specs/10`.
- **Cabecera y TabBar siempre fijos**; el **único que scrollea es el contenido**.
- El documento nunca hace scroll (evita el descuadre con el teclado en iOS).
- **Toda pantalla tipo chat y todo modal con formulario** usan `.app-viewport`
  (la hoja del modal con `max-h-full overflow-y-auto`): así el input queda
  siempre sobre el teclado. NO usar `fixed inset-0` en overlays con inputs.

## Superficies y color

- Tarjetas: `Card` (blanco/`--surface`, radio 18, borde suave). Diseño **plano**:
  evitar `shadow-neu*` en pantallas nuevas (es del look neumórfico antiguo, en
  retirada). Sombras suaves y sutiles.
- Colores por tokens (`tokens.css`) → modo claro/oscuro y paletas automáticos.
  Acentos y semánticos (success/warn/danger/info) por token, no hex sueltos.
- **Texto sobre papel** (post-its) y sobre fondos de color fijos: usar color
  **fijo** (no tokens `text-ink/…`), que se invierten en oscuro.

## Primitivos (`src/components/ui`)

`Button`, `Card`, `Field`, `Textarea`, `SelectField`, `RoleBadge`, `Avatar`,
`Alert`, `ProgressBar`, `EmptyState`, `ErrorState`, `SkeletonList`, `Fab`,
**`ScreenHeader`**, **`SectionTitle`**, y helper `cx`.

> Al crear una pantalla nueva: `ScreenHeader` arriba + secciones con
> `SectionTitle` + `Card`/primitivos. Nada de overline como título ni de tamaños
> de cabecera ad-hoc.
