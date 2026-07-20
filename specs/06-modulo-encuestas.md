# 06 · Módulo Encuestas

## Objetivo
Sondear a la comunidad de forma **informal**: la gestión publica una encuesta
(p. ej. "¿qué mejora prefieres para el portal?"), los vecinos votan y hay un
resultado ganador. **No tiene valor legal ni oficial**; sirve para conocer la
opinión de la comunidad. Sustituye al `mailto:` de "Sugerencias" en su faceta de
participación (el feedback sobre la app va al módulo 14; las propuestas abiertas,
al tablón de anuncios, módulo 13).

## Encuestas de tipo JUNTA (mig. 0052)

Un tipo especial de encuesta (`encuestas.es_junta`) para las **juntas de vecinos**.
Cada **punto** del orden del día es una pregunta con dos opciones fijas
**Aprobar / Rechazar** (se crean solas). Flujo del vecino al abrirla:

1. **"¿Asistirás a la junta?"** — Sí / No.
2. Si **No** → **"¿Quieres votar desde la app?"** — Sí / No.
3. Vota cada punto (Aprobar/Rechazar) y confirma.

**Clasificación del voto** (tabla `junta_participacion(encuesta_id, vivienda,
asiste, vota_app)`): es **REAL** solo si `asiste=false AND vota_app=true`; en
cualquier otro caso (asiste, o no vota por la app) es **SONDEO**. Los reales se
trasladan al conteo presencial de la junta.

**Visibilidad** (impuesta en RLS/funciones security-definer, no en la interfaz):
- **General (todos los activos, EN VIVO, anónimo):** por punto, totales
  **Aprobar/Rechazar** = sondeo + reales (`junta_resultados`).
- **Detalle REAL por piso (solo administrador de finca + app_admin):** qué votó
  cada piso votante real, + asistencia (`junta_detalle_real`, `junta_participantes`,
  guardadas por `es_admin_finca_o_app()`). Los vecinos **no** ven quién votó qué
  (RLS de `encuesta_votos`: cada uno solo ve su voto).

UI: creación con modo **"Junta"** (lista de puntos) en `CreateEncuestaPage`;
voto y resultados en `JuntaVote` (usado por `VotePage` y `ResultsPage` cuando
`es_junta`). Reutiliza `encuestas/encuesta_preguntas/encuesta_opciones/encuesta_votos`.

## Encuesta protagonista en la Home

Mientras haya una encuesta **abierta** y el vecino **no haya votado todas sus
preguntas**, la Home muestra una **tarjeta hero** (diseño handoff
`encuesta_home` 2a) como primer elemento, antes del Tablón: degradado azul,
chip "Cierra en N días", barra de participación (viviendas votantes/total) y
botón "Votar ahora" (toda la tarjeta navega a la votación). A **≤3 días** del
cierre pasa a **ámbar urgente** con icono de reloj de arena. Cuando el vecino ya
votó (todas las preguntas), la tarjeta desaparece.

El **denominador** ("X de Y viviendas") cuenta solo los **pisos reales**
(`viviendas.es_piso`); las viviendas especiales (Conserje/Administrador/Tester)
no cuentan ni como total ni como votantes. Votar exige el permiso
`votar_encuestas` (configurable; RLS `puede_votar_encuestas`, mig. 0023).

## Historias de usuario
- Como **gestión** (app_admin/presidente/vicepresidente/junta/adm. finca),
  quiero publicar una encuesta con opciones y fechas.
- Como **vecino**, quiero votar una opción y ver el resultado.

## Requisitos funcionales
1. **Crear encuesta** (solo gestión): título, descripción, tipo
   (`opción única` u `opción múltiple`), lista de opciones, fecha de apertura y
   cierre.
2. **Estados**: `programada` → `abierta` → `cerrada` (según fechas; cierre
   forzable).
3. **Votar**: **un voto por vivienda** (no por cuenta).
   - Cualquiera de las 2 cuentas de la vivienda puede emitir el voto; se guarda a
     nivel de **vivienda** (una fila por opción marcada; detalle en módulo 04).
   - En `opción única` la vivienda marca exactamente una opción; en
     `opción múltiple` puede marcar varias (cualquier subconjunto), y sigue
     contando como **una participación** de la vivienda.
   - El voto se puede **cambiar hasta el cierre** (se sustituyen las opciones
     marcadas); sigue contando como uno.
   - Solo se puede votar con la encuesta `abierta`.
4. **Resultados**:
   - Durante la votación se puede mostrar solo "han votado X de Y viviendas" para
     no influir (configurable con `mostrar_participacion`); nunca los conteos
     por opción antes del cierre.
   - Al cerrar, se muestran los conteos por opción y el **ganador** (la opción
     más marcada; en opción múltiple puede haber lectura por opción sin un único
     ganador).

## Reglas y aclaraciones
- Etiqueta visible: "Encuesta informativa, sin valor oficial". La validez de
  acuerdos sigue rigiéndose por la junta presencial y la LPH.
- Sin ponderación por coeficiente en v1 (1 vivienda = 1 voto).

## Seguridad (ver módulo 11)
- Cómputo de resultados en base de datos (agregado), no en el cliente.
- RLS estricta en `encuesta_votos`: cada vivienda solo su voto; sin leer votos
  ajenos; solo con encuesta abierta.
