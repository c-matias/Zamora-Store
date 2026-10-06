-- Esquema inicial. Valores monetários em cêntimos (bigint), moeda base EUR.
-- Dados de fornecedor ficam em tabelas SÓ de admin (RLS não filtra colunas).
-- gen_random_uuid() é nativo desde o PostgreSQL 13 (não precisa de pgcrypto).

create type category as enum ('laptops','smartphones','tablets','accessories');
create type condition as enum ('excellent','very_good','good','acceptable');
create type product_status as enum ('draft','active','inactive');
create type supplier_availability as enum ('unknown','available','unavailable','on_request');
create type country as enum ('PT','AO');
create type order_status as enum ('pending','quote','confirmed','supplier_order','received','quality_check','ready_to_ship','shipped','delivered','cancelled');
create type payment_status as enum ('to_confirm','paid','refunded','failed');
create type shipping_status as enum ('not_shipped','preparing','shipped','delivered');
create type quote_status as enum ('draft','sent','accepted','rejected','expired','converted');
create type request_status as enum ('new','in_review','quoted','closed');
create type user_role as enum ('admin','staff','customer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand text not null,
  model text not null,
  category category not null,
  description text not null default '',
  condition condition not null,
  status product_status not null default 'draft',
  images text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  cpu text, ram text, storage text, color text,
  condition condition not null,
  selling_price_pt bigint check (selling_price_pt >= 0),
  selling_price_ao bigint check (selling_price_ao >= 0)
);
create index on product_variants(product_id);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text, country text,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text
);

create table supplier_listings (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_variant_id uuid not null references product_variants(id) on delete cascade,
  supplier_url text,
  supplier_price bigint check (supplier_price >= 0),
  availability supplier_availability not null default 'unknown',
  last_checked_at timestamptz
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  country country not null,
  city text not null,
  address text, postal_code text,
  created_at timestamptz not null default now()
);
create index on customers(email);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  product_id uuid references products(id),
  destination country not null,
  supplier_cost bigint not null default 0,
  shipping_cost bigint not null default 0,
  taxes_and_fees bigint not null default 0,
  payment_fees bigint not null default 0,
  margin bigint not null default 0,
  final_price bigint not null default 0,
  status quote_status not null default 'draft',
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  status order_status not null default 'pending',
  payment_status payment_status not null default 'to_confirm',
  shipping_status shipping_status not null default 'not_shipped',
  destination country not null,
  subtotal bigint not null default 0,
  shipping bigint not null default 0,
  taxes_and_fees bigint not null default 0,
  total bigint not null default 0,
  margin bigint not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_variant_id uuid not null references product_variants(id),
  quantity int not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0)
);

create table custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  category category not null,
  requested_brand text, requested_model text,
  budget bigint check (budget >= 0),
  specifications jsonb not null default '{}',
  destination country not null,
  status request_status not null default 'new',
  notes text,
  created_at timestamptz not null default now()
);

-- Autorização
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'));
$$;

alter table profiles enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table suppliers enable row level security;
alter table supplier_listings enable row level security;
alter table customers enable row level security;
alter table quotes enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table custom_requests enable row level security;

-- Público: só lê produtos ativos e respetivas variantes (sem dados de fornecedor)
create policy "public reads active products" on products for select using (status = 'active' or is_staff());
create policy "public reads variants of active products" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active') or is_staff());

-- Staff gere tudo o resto. Escritas públicas (pedidos, requests) passam por API server-side com service role + validação.
create policy "staff all products" on products for all using (is_staff()) with check (is_staff());
create policy "staff all variants" on product_variants for all using (is_staff()) with check (is_staff());
create policy "staff all suppliers" on suppliers for all using (is_staff()) with check (is_staff());
create policy "staff all listings" on supplier_listings for all using (is_staff()) with check (is_staff());
create policy "staff all customers" on customers for all using (is_staff()) with check (is_staff());
create policy "staff all quotes" on quotes for all using (is_staff()) with check (is_staff());
create policy "staff all orders" on orders for all using (is_staff()) with check (is_staff());
create policy "staff all order_items" on order_items for all using (is_staff()) with check (is_staff());
create policy "staff all custom_requests" on custom_requests for all using (is_staff()) with check (is_staff());
create policy "users read own profile" on profiles for select using (id = auth.uid() or is_staff());
-- Sem policy de escrita em profiles: roles só se atribuem via SQL/service role.

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on products for each row execute function touch_updated_at();
