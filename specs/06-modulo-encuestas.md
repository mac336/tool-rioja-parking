# 06 · Módulo Encuestas

## Objetivo
Sondear a la comunidad de forma **informal**: la gestión publica una encuesta
(p. ej. "¿qué mejora prefieres para el portal?"), los vecinos votan y hay un
resultado ganador. **No tiene valor legal ni oficial**; sirve para conocer la
opinión de la comunidad. Sustituye al `mailto:` de "Sugerencias" en su faceta de
participación (el feedback sobre la app va al módulo 14; las propuestas abiertas,
al tablón de anuncios, módulo 13).

## Encuesta protagonista en la Home

Mientras haya una encuesta **abierta** y el vecino **no haya votado todas sus
preguntas**, la Home muestra una **tarjeta hero** (diseño handoff
`encuesta_home` 2a) como primer elemento, antes del Tablón: degradado azul,
chip "Cierra en N días", barra de participación (viviendas votantes/total) y
botón "Votar ahora" (toda la tarjeta navega a la votación). A **≤3 días** del
cierre pasa a **ámbar urgente** con icono de reloj de arena. Cuando el vecino ya
votó (todas las preguntas), la tarjeta desaparece.

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
