# 13 · Módulo Tablón de anuncios

## Objetivo
Un tablón donde **cualquier miembro** puede crear un anuncio con buen aspecto
(desde "Vendo bici" hasta "Cena de vecinos en el patio" o un aviso de la junta),
pero que **solo se publica tras la aprobación** del `app_admin` o de otros roles
autorizados. Así se combina participación abierta con control de calidad y
moderación. **Es la vía por defecto para cualquier aviso vecinal** (no hay módulo
de eventos ni sección propia de Junta: todo eso son anuncios — módulo 01).

## Dos niveles de tablón (principal / secundario)

Los anuncios publicados viven en uno de dos niveles de visibilidad:

- **Principal (destacado):** un **carrusel rotativo** que pasa los anuncios
  destacados **cada ~10 segundos**. Es el escaparate. Aparece arriba de la
  sección **Anuncios** y en una **versión compacta en el Home** ("Hoy en tu
  comunidad"). Puede contener muchos anuncios; rotan automáticamente.
- **Secundario (listado):** el **listado completo** de anuncios publicados
  vigentes, al que se llega entrando en la sección Anuncios (por debajo del
  carrusel). Todo anuncio publicado aparece aquí; los `principal` aparecen
  **además** en el carrusel.

**Accesibilidad del carrusel (prioritaria — hay vecinos mayores):** rotación
automática de ~10 s **con puntos/flechas para pasar a mano**, **se pausa al
interactuar/hover/foco**, y **no rota solo** si el dispositivo tiene activado
"reducir movimiento" (`prefers-reduced-motion`). Objetivos táctiles ≥ 44 px.

## Historias de usuario
- Como **vecino**, quiero crear un anuncio atractivo (p. ej. "Vendo bici",
  "Se busca…", "Aviso de corte de agua") y enviarlo a revisión.
- Como **gestión** (app_admin y roles autorizados), quiero aprobar, rechazar o
  editar anuncios antes de publicarlos.
- Como **vecino**, quiero ver el tablón con los anuncios ya publicados.

## Requisitos funcionales
1. **Crear anuncio** (cualquier miembro activo): título y cuerpo con **límite de
   texto** (p. ej. título ≤ 80 car., cuerpo ≤ 1.000–1.500 car.), **fecha de
   inicio y fecha de fin obligatorias** (ventana de vigencia del anuncio) y
   **nivel solicitado** (`principal` o `secundario`): el vecino indica dónde le
   gustaría que saliera. Se guarda como `pendiente`.
2. **Formato cuidado pero controlado**: permitir un formato enriquecido *seguro*
   (negrita, cursiva, listas, saltos de línea, enlaces y opcionalmente **una
   imagen**). **No** HTML libre del usuario (ver seguridad). Vista previa antes
   de enviar.
3. **Moderación**: los roles autorizados ven la cola de `pendiente` y deciden,
   además de aprobar/rechazar, **en qué nivel se publica**:
   - **Aprobar en el nivel pedido** por el vecino (`principal` o `secundario`).
   - **Aprobar pero moverlo al secundario** si no quieren que ocupe el
     escaparate principal (el presidente tiene la última palabra sobre el
     principal).
   - **Rechazar** (con motivo) o **editar** antes de publicar.
   - Un anuncio ya publicado se puede **mover** de nivel más adelante (subir a
     principal / bajar a secundario) desde la gestión.

   Por defecto pueden aprobar: `app_admin`, `presidente`, `vicepresidente`,
   `junta`, `administrador_finca` (ajustable por `app_admin`).
4. **Tablón**: los anuncios `publicado` **y vigentes** (dentro de su ventana
   inicio–fin), con autor (nombre + vivienda). Se muestran en dos niveles:
   - **Carrusel principal** con los de nivel `principal` (rotación ~10 s,
     accesible — ver arriba), en Anuncios y en versión compacta en Home.
   - **Listado secundario** con **todos** los publicados vigentes, ordenados por
     fecha (los `principal` también aparecen aquí).
5. **Estados visibles al autor**: el autor ve el estado de sus anuncios
   (`pendiente`/`publicado`/`rechazado`).

## Reglas de uso y límites (clave)
- **Uno pendiente a la vez por vivienda:** una vivienda solo puede tener **un
  anuncio pendiente de aprobación** simultáneamente. Una vez resuelto (aprobado o
  rechazado) puede crear y enviar otro. Se aplica en interfaz y base de datos.
- **Bloqueo por abuso:** desde la consola de gestión, `app_admin` (u otro rol
  autorizado) puede **impedir que una vivienda siga creando anuncios** (flag
  `puede_publicar_anuncios = false` en `viviendas`). El bloqueo es **por
  vivienda** y afecta a sus 2 cuentas — coherente con que el límite de
  pendientes también es por vivienda.
- **Fechas obligatorias:** inicio y fin son obligatorias; `fin >= inicio`. El
  anuncio solo es visible en el tablón dentro de esa ventana.
- **Duración máx. 1 año:** por defecto la ventana no supera **1 año**. Si un
  vecino solicita una fin a más de un año vista, **no se bloquea**, pero el
  anuncio se **marca** en el panel del **presidente** para que lo tenga en cuenta
  al aprobar o rechazar.
- Un anuncio `pendiente` **no** es visible para el resto de vecinos (solo autor y
  gestión).
- Contenido: sin ataques personales ni spam comercial (ver módulo 15). La gestión
  puede despublicar y los vecinos reportar.
- Límites de longitud aplicados en interfaz **y** en base de datos.

## Seguridad (ver módulo 11)
- **Anti-XSS crítico:** el "formato cuidado" se implementa con un editor que
  produce un formato **controlado** (p. ej. Markdown restringido o un conjunto
  cerrado de marcas), y se **sanea** en servidor antes de guardar/mostrar. Nunca
  renderizar HTML arbitrario del usuario (`dangerouslySetInnerHTML` prohibido con
  contenido no saneado).
- Imágenes en **bucket privado**, validadas (tipo/tamaño) y servidas con URL
  firmada.
- RLS: crear = activo; ver publicados = activos; aprobar/editar/rechazar = roles
  autorizados.

## Relación con otros módulos
- Cuando la **Junta** tenga algo que comunicar (fecha, orden del día, acuerdos),
  se publicará como **anuncio** (la sección Junta sale de la v1 — módulo 01).
