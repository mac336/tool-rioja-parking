# Guía de construcción — Rioja 25

Lee esto primero: reduce el trabajo de derivar cosas del HTML.

## Stack recomendado (si no hay uno)
- **React + Vite + TypeScript**, `vite-plugin-pwa` para instalable/offline.
- **Tailwind** (fusiona `tailwind.tokens.js`) o CSS plano con `tokens.css`.
- Iconos: **lucide-react** (los mocks ya usan iconos estilo Lucide — mismos nombres abajo).
- Router: React Router. Estado servidor: TanStack Query. Estado UI: Zustand/Context.

## Cómo empezar (orden sugerido, barato → caro)
1. Copia `tokens.css` a `src/styles/` e impórtalo en el root. Añade fuentes Google
   (Bricolage Grotesque, Figtree).
2. Copia `types.ts` a `src/types/`. Copia `mock-data.json` a `src/mock/` y sírvelo desde un
   fetch fake mientras no haya API.
3. Construye los **primitivos** (abajo) una vez; reutilízalos en todas las pantallas.
4. Monta el **AppShell** (TabBar móvil / Sidebar escritorio) + rutas.
5. Implementa pantallas en este orden: Login → Home → Incidencias → Reservas → Parking →
   Propuestas → Contactos → Admin → Estados. Cada lista con sus 3 estados (loading/empty/error).

## Estructura de carpetas sugerida
```
src/
  styles/tokens.css
  types/index.ts
  mock/data.json
  lib/api.ts              // fetch por módulo (mock -> real)
  components/
    ui/                   // primitivos reutilizables
      Button.tsx  Field.tsx  Select.tsx  Card.tsx
      StatusChip.tsx  RoleBadge.tsx  CategoryChip.tsx
      Avatar.tsx  Toast.tsx  Alert.tsx  Table.tsx
      EmptyState.tsx  Skeleton.tsx  ErrorState.tsx
      Stepper.tsx  ProgressBar.tsx  Fab.tsx  Logo.tsx
    layout/
      AppShell.tsx  TabBar.tsx  Sidebar.tsx  MobileHeader.tsx  DesktopTopbar.tsx
  features/
    auth/       LoginPage.tsx  RequestAccessPage.tsx  RequestSentPage.tsx
    home/       HomePage.tsx
    incidents/  IncidentsListPage.tsx  IncidentDetailPage.tsx  NewIncidentPage.tsx
    proposals/  ProposalsListPage.tsx  VotePage.tsx  ResultsPage.tsx
    bookings/   BookingsPage.tsx  MyBookingsPage.tsx
    parking/    ParkingPage.tsx
    contacts/   ContactsPage.tsx
    admin/      AdminRequestsPage.tsx  AdminUsersPage.tsx
```

## Inventario de primitivos (props mínimas)
- `Button` — `variant: 'primary'|'secondary'|'ghost'|'danger'`, `size`, `disabled`. Pill, alto ≥44px.
- `Field` — `label`, `error`, estados foco/error (ver tokens.css). `Select` con chevron.
- `Card` — contenedor `1px solid var(--border)`, radio 16px, fondo `--surface`.
- `StatusChip` — `status: 'abierta'|'en_curso'|'resuelta'|'cerrada'` → color+punto (mapa en README).
- `RoleBadge` — `role: 'vecino'|'junta'|'admin'`.
- `CategoryChip`, `Avatar` (círculo, iniciales, color por contexto), `Toast`, `Alert` (info/warn/success).
- `Table` — cabecera overline + filas; soporta fila destacada (`--primary-soft`).
- `Stepper` — pasos con estado done/current/future (detalle de incidencia).
- `ProgressBar`, `Fab`, `EmptyState`, `Skeleton`, `ErrorState`.
- `Logo` — badge redondeado degradado `#16B478→#0B7E52` + tejado SVG + "25" en font-display.

## AppShell / navegación
- **< 900px:** header propio arriba + `TabBar` fija abajo (5 tabs). Subpáginas: header con back, sin TabBar.
- **≥ 900px:** `Sidebar` fija 238px (degradado verde oscuro) + `Topbar`. Admin usa la misma sidebar en modo "Gestión".
- Rutas de tabs: `/` (Inicio), `/incidencias`, `/reservas`, `/parking`, `/mas`.
  Bajo "Más": propuestas, contactos, reciclaje, junta.
- Guard por rol: `/admin/*` solo `admin` (y ciertas acciones para `junta`).

## Iconos (nombres lucide-react equivalentes)
Home→`Home` · Incidencias→`TriangleAlert` · Votaciones→`SquareCheckBig` · Reservas→`CalendarDays` ·
Parking→`SquareParking` (o `Car`) · Más→`Menu` · Contactos/tel→`Phone` · email→`Mail` ·
Reciclaje→`Leaf`/`Recycle` · Vecinos→`Users` · Ajustes→`Settings` · Campana→`Bell` · Buscar→`Search` ·
Enviar→`Send` · Cámara→`Camera` · Evento→`Sparkles`/`PartyPopper`.
Si prefieres no depender de una librería, los paths exactos usados están en `icons.svg.txt`.

## Datos y estados
- Fuente de verdad: `mock-data.json` (reemplazar por API por módulo en `lib/api.ts`).
- Cada vista de lista: `loading` (Skeleton) → `empty` (EmptyState) / `error` (ErrorState) → `ready`.
- Votación: un voto por vivienda, editable hasta `cierraEn`; recalcular % y quórum en resultados.
- Reservas: al confirmar, crear `Reservation` y mostrar `Toast`.

## Accesibilidad (no negociable)
Objetivos táctiles ≥44px · foco visible (`--focus-ring`) · contraste AA · `label` en cada campo ·
navegación por teclado · `prefers-color-scheme` + toggle manual (`data-theme`).
