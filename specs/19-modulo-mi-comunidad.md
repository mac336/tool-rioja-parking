# 19 · Módulo "Mi Comunidad" (dashboard económico)

> Estado: **en pruebas, solo visible para `app_admin` (developer)**. Pendiente
> decidir si se abre a los vecinos y en qué forma. Describe el comportamiento
> actual.

## Objetivo

Dar cuentas claras a los vecinos a partir de las **actas de las juntas**: en qué
se gasta el dinero de la comunidad, si los costes suben o bajan año a año, las
**derramas** y las **decisiones** de cada junta (aprobadas y rechazadas, con el
resultado de la votación).

## Alcance actual (v1)

Pantalla propia en `/mi-comunidad`, accesible como **servicio** desde la Home.
Bloques:

1. **Cabecera** — presupuesto del año en curso y variación % frente al anterior.
2. **¿En qué se gasta?** — reparto del gasto por destino (conserje, piscina,
   jardines, ascensores…), en % e importe.
3. **¿Sube o baja cada cosa?** — variación por capítulo (2 ejercicios). Cada
   fila tiene una **"i"** que despliega un texto explicando *por qué* cambió ese
   capítulo (qué concepto lo movió), derivado de comparar los presupuestos.
4. **Derramas activas** — importe total, cuota mensual, periodo y una **barra de
   progreso** con lo pagado y lo que queda (se calcula con la fecha de hoy a
   partir de la fecha de inicio, las mensualidades y la cuota). Las derramas ya
   terminadas se sacan de aquí y se listan, en formato compacto y al final de la
   pantalla, bajo **"Derramas finalizadas recientemente"**; las que acabaron hace
   **más de un año no se muestran**. **No** se detalla quién paga cada derrama
   (mostramos el qué y el cuánto, no el quién).
5. **Las cuentas, claras** — saldo de cierre, saldo en banco, pendiente de cobro
   e **impagados solo como total agregado** (sin identificar viviendas).
6. **Decisiones de la junta** — acuerdos con resultado (aprobado / rechazado /
   condicionado / pendiente) y la votación. No se muestran acuerdos meramente
   informativos ni nombres de quién propuso qué. La Junta Rectora se cita **solo
   por cargos**, sin nombres.
7. **Datos sueltos** — precio del agua caliente (€/m³) y su variación.

Comparativa actual: **2025 vs 2026** (los dos presupuestos vigentes y los dos
ejercicios cerrados consecutivos). Se ampliará con más años.

Arriba de todo se muestra un **aviso**: el panel es solo informativo, puede
contener errores de cálculo y ante dudas hay que consultar las actas en PDF de
la administración.

## Datos y privacidad

- Origen: actas de las juntas (junio 2025 y junio 2026) + circular. La extracción
  y el análisis se mantienen en `actas/analisis/*.json` (**no versionado**).
- Almacén: tabla `comunidad_datos` (`clave` → `payload jsonb`), migración
  **0037**. Filas: `finanzas`, `comparativa`, `acuerdos`.
- **La migración NO contiene datos** (repo y web son públicos). Los datos se
  cargan con un **seed no versionado** (`actas/seed-comunidad-datos.sql`),
  aplicado en local y producción.
- **RLS**: la lectura de `comunidad_datos` está restringida a **`app_admin`**
  (`es_app_admin()`). Ni la anon key ni otros roles pueden leerla. La seguridad
  la impone la RLS, no que la pantalla esté oculta en la interfaz. Cuando se
  decida abrir a vecinos, se relaja la policy de SELECT (nueva migración).
- Regla de contenido: **solo datos generales**. Nada por vivienda, ni números de
  cuenta, ni identidades (impagados, proponentes, miembros de la junta).

## Código

- `src/features/comunidad/MiComunidadPage.tsx` — pantalla y bloques.
- `src/lib/db/comunidad.ts` — `getComunidadDatos()` + tipos del payload.
- `src/lib/api.ts` / `apiMock.ts` / `apiSupabase.ts` — cableado (en demo devuelve
  vacío; los datos reales solo con Supabase).
- Ruta bajo `RequireAppAdmin` en `src/router.tsx`; servicio con flag
  `soloAppAdmin` en `src/features/home/HomePage.tsx`.

## Añadir un año nuevo

Actualizar los JSON de `actas/analisis/`, regenerar el seed y aplicarlo. El
esquema de conceptos se mantiene estable para que la comparación año a año sea
directa (ver `actas/analisis/README.md`). Está previsto automatizarlo con una
**skill** que ingiera el acta anual y actualice datos + comparativa.
