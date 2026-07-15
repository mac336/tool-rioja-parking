# 20 · Circulares (normas de piscina y zonas comunes)

## Objetivo
Apartado informativo con las **normas de uso de la piscina y las zonas comunes**,
accesible desde **Más → Circulares**. Contenido **público** (sin datos personales).

## Estado actual
- Ruta `/circulares` (`src/features/misc/CircularesPage.tsx`), enlazada desde
  `MasPage`. Visible para cualquier vecino (no depende de permisos).
- Contenido estático en el propio componente (como Reciclaje/Normas): temporada y
  horario de piscina + normas por bloques (zonas de recreo, celebraciones,
  piscina, mobiliario, sala, reservas/convivencia).
- Fuente/análisis: `actas/analisis/piscina-normas.json` (**no versionado**),
  extraído de la circular de 10-06-2026 y de las normas aprobadas en Junta
  (03-04-2013, revisadas en la Junta de 25-06-2026).

## Futuro
- Poder añadir más circulares (una por año/tema) y, con la skill de actas,
  actualizar temporada/horario y normas automáticamente cada año.
