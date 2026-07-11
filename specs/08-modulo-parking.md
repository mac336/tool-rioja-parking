# 08 · Módulo Parking Exterior

> El módulo se llama **"Parking Exterior"** en toda la interfaz (mosaico, TabBar,
> menú, cabecera).

## Aviso contextual en Inicio

En la Home, el aviso de parking **solo aparece cuando toca** (si no, no se
muestra; el acceso sigue en el círculo de Servicios):
- **≤ 7 días antes** de que empiece tu turno → "En X días te toca la Plaza N".
- **Durante** tu turno → "Esta quincena aparcas en la Plaza N".
- **≤ 3 días para acabar** → cuenta atrás "Te quedan N días…" (con ⏳).
- Al terminar tu turno, desaparece hasta la siguiente ventana que aplique.

## Objetivo
Portar la **rotación automática** existente de las plazas exteriores (detrás del
login) y **añadir** la posibilidad de que un vecino **done/ceda** su plaza y que
la comunidad mida la **demanda** de plazas.

## Parte 1 — Rotación (lógica actual, a preservar)
- **6 plazas** exteriores, **solo turismos** (no camiones ni furgonetas).
- **Quincenas** de 14 días. Origen de cálculo: **31-01-2026**.
- **Ciclo de 7 grupos**: `bajo`, `1D`, `2D`, `3D`, `1I`, `2I`, `3I`.
- Cada grupo tiene **6 slots**; los bajos = **5 vecinos + 1 plaza LIBRE**.
- Rotación **continua** (no se reinicia): cada vez que un grupo vuelve a tocar
  (cada 7 quincenas), todo se **desplaza +1 plaza**.
- Asignación base ("anchor") según hoja oficial (31-01-2026 → 20-06-2026).
- **Límite de cambios de turno:** sábados a las 20:00.

> Implementación de referencia en el `index.html` actual (`quincenaGlobal`,
> `cyclePos`, `patron`, `pintaActual`, `pintaTabla`, `buscarPiso`). Debe
> **portarse con la misma matemática** para no alterar la rotación real.
>
> **Datos fuente (copiar tal cual de `index.html`):** el objeto de grupos con su
> `anchor` y su `base` (asignación de la hoja oficial) y el array `PISOS`
> (catálogo de 41 viviendas, que además alimenta la tabla `viviendas` del
> módulo 04). El mapeo vivienda → grupo se deriva del código: `Bajo *` → `bajo`;
> `Nº * Dcha` → `ND`; `Nº * Izqda` → `NI` (p. ej. `2º C Dcha` → `2D`).
> Las quincenas y el corte del sábado 20:00 se calculan en **Europe/Madrid**
> (módulo 02).

**Requisitos:**
1. Ver el reparto de la **quincena actual** (6 plazas) y las próximas.
2. **"¿Qué plaza me toca?"**: autoseleccionar por la vivienda del perfil
   (sin pedir el piso cada vez).
3. Tabla/calendario de próximas quincenas.
4. Nota informativa (solo turismos; límite sábados 20:00).

## Parte 2 — Donación/cesión de plaza y demanda (nuevo)
Un vecino puede avisar sobre su plaza:
- **Cede** su plaza por un **día, una semana** o un periodo → queda disponible.
- **No la necesita** (indicación general de que no usará su plaza).
- **Necesita** plaza (marca demanda aunque no tenga en esa quincena).

Con esta información:
1. La **gestión** recibe el aviso y puede **reasignar** el hueco cedido a otra
   vivienda que lo necesite.
2. La comunidad ve un **panel de demanda**: cuántas viviendas necesitan plaza y
   cuántas ceden. Útil para decisiones (p. ej. si faltan plazas).
3. El conteo de necesidad/cesión es **por vivienda** (no por cuenta).

**Datos:** tabla `parking_cesiones` (módulo 04). La rotación sigue siendo
cálculo; las cesiones son una capa que **sobrescribe** puntualmente quién usa una
plaza en un periodo concreto. El autor puede **cancelar** su aviso mientras siga
`activa` (una vez `reasignada`, ya no — el hueco está comprometido).

## Reglas de uso (anti-disputa, ver módulo 15)
- **Reasignación por la gestión con criterio público:** un hueco cedido lo
  reasigna la gestión dando **prioridad a la vivienda que antes marcó
  "necesito"** (orden por fecha de solicitud). Así se evita el "primero que lo
  pilla" y las disputas.
- Una vez **reasignado**, el hueco de ese periodo **no puede reclamarse** por otro.
- Se registra **histórico** de cesiones y demanda para estadística y
  transparencia.
- Conteo de necesidad/cesión **por vivienda** (no por cuenta).

## Seguridad
- Todo el módulo tras login (hoy está en web pública → pasa a requerir sesión).
- RLS: donar/necesitar = activo para su vivienda; reasignar/gestionar = gestión.

## Purga de cesiones (histórico corto, mig. 0030)

Las cesiones **canceladas/reasignadas** o **ya pasadas** se mantienen como
histórico en "Mis avisos de plaza", pero un job diario de `pg_cron`
(`purgar_cesiones`, 03:15) las **borra a los 10 días** para no acumular ruido.
