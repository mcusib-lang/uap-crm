-- ============================================================
-- UAP CRM - Schema para Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Tabla de usuarios (equipo comercial)
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text,
  created_at timestamp with time zone default now()
);

-- Tabla principal de contactos/leads
create table if not exists contactos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text not null,
  segmento text check (segmento in ('industrial', 'ayuntamiento', 'itv', 'otros')) default 'industrial',
  subsector text,
  cargo text,
  email text,
  telefono text,
  ciudad text,
  provincia text,
  comunidad text,
  web text,
  zbe boolean default false,
  valor_estimado numeric(12,2),
  probabilidad_cierre numeric(5,2),
  responsable_id uuid references usuarios(id),
  estado text default 'Nuevo Lead' check (estado in (
    'Nuevo Lead', 'Contactado', 'En conversación',
    'Propuesta enviada', 'Reunión agendada', 'Negociación',
    'Cliente', 'Stand by', 'Descartado'
  )),
  fecha_ultimo_contacto date,
  proxima_accion text,
  fecha_proxima_accion date,
  notas text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tabla de interacciones (llamadas, emails, reuniones...)
create table if not exists interacciones (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid not null references contactos(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  tipo text check (tipo in ('llamada', 'email', 'reunión', 'whatsapp', 'visita', 'otro')) default 'llamada',
  resumen text,
  proxima_accion text,
  fecha_proxima_accion date,
  created_at timestamp with time zone default now()
);

-- Tabla historial de cambios de estado
create table if not exists historial_estados (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid not null references contactos(id) on delete cascade,
  estado_anterior text,
  estado_nuevo text,
  usuario_id uuid references usuarios(id),
  created_at timestamp with time zone default now()
);

-- Índices para performance
create index if not exists idx_contactos_estado on contactos(estado);
create index if not exists idx_contactos_segmento on contactos(segmento);
create index if not exists idx_contactos_responsable on contactos(responsable_id);
create index if not exists idx_contactos_fecha_proxima on contactos(fecha_proxima_accion);
create index if not exists idx_interacciones_contacto on interacciones(contacto_id);
create index if not exists idx_historial_contacto on historial_estados(contacto_id);

-- Deshabilitar RLS para desarrollo (ajustar en producción)
alter table usuarios disable row level security;
alter table contactos disable row level security;
alter table interacciones disable row level security;
alter table historial_estados disable row level security;

-- Datos de ejemplo: usuarios
insert into usuarios (nombre, email) values
  ('Ana García', 'ana@universalair.es'),
  ('Carlos Martínez', 'carlos@universalair.es'),
  ('María López', 'maria@universalair.es'),
  ('Pedro Sánchez', 'pedro@universalair.es')
on conflict do nothing;

-- ============================================================
-- MÓDULO DE PROYECTOS
-- ============================================================

create table if not exists proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cliente_id uuid references contactos(id) on delete set null,
  tipo text check (tipo in ('piloto', 'final')) default 'piloto',
  modelo_uap text check (modelo_uap in ('S', 'M', 'L', 'XL', 'XXL')),
  num_unidades integer default 1,
  estado text default 'Anteproyecto' check (estado in (
    'Anteproyecto', 'Visita técnica', 'Propuesta enviada', 'Piloto activo',
    'Fabricación', 'Instalación', 'Puesta en marcha', 'Post-venta',
    'Mantenimiento', 'Cerrado'
  )),
  fecha_inicio date,
  fecha_entrega_estimada date,
  fecha_entrega_real date,
  valor_venta numeric(12,2),
  coste_estimado numeric(12,2),
  coste_real numeric(12,2) default 0,
  responsable_comercial uuid references usuarios(id),
  responsable_tecnico uuid references usuarios(id),
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists fases_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  nombre text not null,
  orden integer not null default 0,
  fecha_inicio_plan date,
  fecha_fin_plan date,
  fecha_inicio_real date,
  fecha_fin_real date,
  completada boolean default false,
  responsable_id uuid references usuarios(id),
  notas text,
  created_at timestamptz default now()
);

create table if not exists materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text default 'General',
  proveedor text,
  precio_base numeric(10,2) default 0,
  plazo_entrega_dias integer default 0,
  stock_actual numeric(10,2) default 0,
  stock_minimo numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists historial_precios (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materiales(id) on delete cascade,
  precio numeric(10,2) not null,
  fecha date default current_date,
  usuario_id uuid references usuarios(id),
  created_at timestamptz default now()
);

create table if not exists proyecto_materiales (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  material_id uuid references materiales(id) on delete set null,
  nombre_material text,
  cantidad numeric(10,2) default 1,
  precio_estimado numeric(10,2) default 0,
  precio_real numeric(10,2),
  proveedor text,
  fecha_pedido date,
  fecha_entrega_estimada date,
  fecha_entrega_real date,
  estado text default 'pendiente' check (estado in (
    'pendiente', 'pedido', 'en_tránsito', 'recibido', 'cancelado'
  )),
  notas text,
  created_at timestamptz default now()
);

create table if not exists proyecto_gastos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  tipo text check (tipo in (
    'mano_obra', 'desplazamiento', 'sensor', 'instalacion',
    'informe', 'subcontrata', 'otro'
  )) default 'otro',
  descripcion text,
  importe numeric(10,2) default 0,
  fecha date default current_date,
  responsable_id uuid references usuarios(id),
  created_at timestamptz default now()
);

-- Índices módulo proyectos
create index if not exists idx_proyectos_estado on proyectos(estado);
create index if not exists idx_proyectos_cliente on proyectos(cliente_id);
create index if not exists idx_fases_proyecto on fases_proyecto(proyecto_id, orden);
create index if not exists idx_pmat_proyecto on proyecto_materiales(proyecto_id);
create index if not exists idx_pgastos_proyecto on proyecto_gastos(proyecto_id);
create index if not exists idx_hprecios_material on historial_precios(material_id, created_at);

-- RLS deshabilitado para desarrollo
alter table proyectos disable row level security;
alter table fases_proyecto disable row level security;
alter table materiales disable row level security;
alter table historial_precios disable row level security;
alter table proyecto_materiales disable row level security;
alter table proyecto_gastos disable row level security;
