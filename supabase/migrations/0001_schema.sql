-- ============================================================================
-- Rioja 25 · Esquema base
-- Ver specs/04-modelo-de-datos.md. RLS se activa en 0003_rls.sql.
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist";  -- EXCLUDE con igualdad + rango

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum
  ('app_admin','presidente','vicepresidente','administrador_finca','junta','vecino');
create type user_estado as enum ('pendiente','activo','suspendido');
create type request_estado as enum ('pendiente','aprobada','rechazada');
create type incident_estado as enum ('abierta','en_curso','resuelta','cerrada');
create type incident_categoria as enum
  ('limpieza','ascensor','garaje','jardin','piscina','ruido','otros');
create type incident_prioridad as enum ('baja','media','alta');
create type encuesta_tipo as enum ('opcion_unica','opcion_multiple');
create type encuesta_estado as enum ('programada','abierta','cerrada');
create type reserva_estado as enum ('pendiente','aprobada','rechazada','cancelada');
create type cesion_tipo as enum ('cede','no_necesita','necesita');
create type cesion_estado as enum ('activa','reasignada','cancelada');
create type anuncio_nivel as enum ('principal','secundario');
create type anuncio_estado as enum ('pendiente','publicado','rechazado','archivado');
create type reporte_entidad as enum ('anuncio','comentario');
create type reporte_estado as enum ('pendiente','atendido','descartado');

-- ---------------------------------------------------------------------------
-- Catálogo de viviendas
-- ---------------------------------------------------------------------------
create table viviendas (
  codigo text primary key,
  orden int not null default 0,
  puede_publicar_anuncios boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Perfiles (extiende auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text not null,
  vivienda text references viviendas(codigo),
  rol user_role not null default 'vecino',
  estado user_estado not null default 'pendiente',
  normas_aceptadas_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_vivienda on profiles(vivienda);
create index idx_profiles_estado on profiles(estado);

-- ---------------------------------------------------------------------------
-- Solicitudes de acceso
-- ---------------------------------------------------------------------------
create table access_requests (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  vivienda text references viviendas(codigo),
  comentario text,
  estado request_estado not null default 'pendiente',
  motivo_rechazo text,
  revisada_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_requests_estado on access_requests(estado);

-- ---------------------------------------------------------------------------
-- Incidencias
-- ---------------------------------------------------------------------------
create table incidencias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references profiles(id),
  autor_vivienda text references viviendas(codigo),
  titulo text not null check (char_length(titulo) <= 140),
  descripcion text not null check (char_length(descripcion) <= 4000),
  categoria incident_categoria not null default 'otros',
  ubicacion text,
  estado incident_estado not null default 'abierta',
  prioridad incident_prioridad,
  comentarios_bloqueados boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_incidencias_estado on incidencias(estado);
create index idx_incidencias_categoria on incidencias(categoria);
create index idx_incidencias_autor on incidencias(autor_id);

create table incidencia_adjuntos (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references incidencias(id) on delete cascade,
  path text not null,
  subido_por uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table incidencia_comentarios (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references incidencias(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  texto text not null check (char_length(texto) <= 2000),
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_coment_incidencia on incidencia_comentarios(incidencia_id);

create table incidencia_eventos (
  id uuid primary key default gen_random_uuid(),
  incidencia_id uuid not null references incidencias(id) on delete cascade,
  estado_anterior incident_estado,
  estado_nuevo incident_estado not null,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_eventos_incidencia on incidencia_eventos(incidencia_id);

-- ---------------------------------------------------------------------------
-- Encuestas
-- ---------------------------------------------------------------------------
create table encuestas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  tipo encuesta_tipo not null default 'opcion_unica',
  apertura timestamptz not null default now(),
  cierre timestamptz not null,
  mostrar_participacion boolean not null default true,
  creada_por uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table encuesta_opciones (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  texto text not null,
  orden int not null default 0
);
create index idx_opciones_encuesta on encuesta_opciones(encuesta_id);

create table encuesta_votos (
  id uuid primary key default gen_random_uuid(),
  encuesta_id uuid not null references encuestas(id) on delete cascade,
  vivienda text not null references viviendas(codigo),
  opcion_id uuid not null references encuesta_opciones(id) on delete cascade,
  emitido_por uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (encuesta_id, vivienda, opcion_id)  -- no repetir la misma opción
);
create index idx_votos_encuesta on encuesta_votos(encuesta_id);
create index idx_votos_vivienda on encuesta_votos(encuesta_id, vivienda);

-- ---------------------------------------------------------------------------
-- Zonas comunes y reservas
-- ---------------------------------------------------------------------------
create table zonas_comunes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  reglas text,
  activa boolean not null default true,
  franja_min time,
  franja_max time,
  duracion_max_min int,
  requiere_invitados boolean not null default false,
  orden int not null default 0
);

create table reservas (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid not null references zonas_comunes(id),
  vivienda text not null references viviendas(codigo),
  solicitada_por uuid not null references profiles(id),
  inicio timestamptz not null,
  fin timestamptz not null,
  num_invitados int not null default 0 check (num_invitados >= 0),
  estado reserva_estado not null default 'pendiente',
  aprobada_por uuid references profiles(id) on delete set null,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  check (fin > inicio),
  -- Anti-solapamiento (crítico): pendiente/aprobada bloquean la franja por zona.
  constraint reservas_no_solapan exclude using gist (
    zona_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado in ('pendiente','aprobada'))
);
create index idx_reservas_zona on reservas(zona_id);
create index idx_reservas_vivienda on reservas(vivienda);
create index idx_reservas_estado on reservas(estado);

-- ---------------------------------------------------------------------------
-- Parking · cesiones y demanda
-- ---------------------------------------------------------------------------
create table parking_cesiones (
  id uuid primary key default gen_random_uuid(),
  vivienda text not null references viviendas(codigo),
  tipo cesion_tipo not null,
  desde date not null,
  hasta date not null,
  nota text,
  estado cesion_estado not null default 'activa',
  gestionada_por uuid references profiles(id) on delete set null,
  reasignada_a text references viviendas(codigo),
  created_at timestamptz not null default now(),
  check (hasta >= desde)
);
create index idx_cesiones_vivienda on parking_cesiones(vivienda);
create index idx_cesiones_estado on parking_cesiones(estado);

-- ---------------------------------------------------------------------------
-- Tablón de anuncios
-- ---------------------------------------------------------------------------
create table anuncios (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references profiles(id),
  vivienda text not null references viviendas(codigo),
  titulo text not null check (char_length(titulo) <= 80),
  cuerpo text not null check (char_length(cuerpo) <= 1500),
  imagen_path text,
  fecha_inicio date not null,
  fecha_fin date not null,
  revision_larga boolean not null default false,
  nivel_solicitado anuncio_nivel not null default 'secundario',
  nivel anuncio_nivel,
  estado anuncio_estado not null default 'pendiente',
  aprobado_por uuid references profiles(id) on delete set null,
  motivo_rechazo text,
  publicado_at timestamptz,
  created_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
-- Uno pendiente por vivienda (predicado inmutable → índice único parcial).
create unique index idx_anuncios_un_pendiente on anuncios(vivienda) where (estado = 'pendiente');
create index idx_anuncios_estado on anuncios(estado);
create index idx_anuncios_publicado on anuncios(publicado_at);

-- ---------------------------------------------------------------------------
-- Contactos
-- ---------------------------------------------------------------------------
create table contactos (
  id uuid primary key default gen_random_uuid(),
  funcion text not null,
  nombre text not null,
  categoria text not null default 'proveedor',
  direccion text,
  telefonos text[] not null default '{}',
  web_o_email text,
  orden int not null default 0
);

-- ---------------------------------------------------------------------------
-- Reportes de contenido
-- ---------------------------------------------------------------------------
create table reportes (
  id uuid primary key default gen_random_uuid(),
  entidad reporte_entidad not null,
  entidad_id uuid not null,
  autor_id uuid not null references profiles(id),
  motivo text not null check (char_length(motivo) <= 500),
  estado reporte_estado not null default 'pendiente',
  resuelto_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entidad, entidad_id, autor_id)  -- 1 reporte por cuenta y contenido
);

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_created on audit_log(created_at);
