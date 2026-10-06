-- Ordem estável das variantes (a "primeira" variante deixa de ser arbitrária).
alter table product_variants add column if not exists created_at timestamptz not null default now();
create index if not exists product_variants_product_created on product_variants (product_id, created_at);
