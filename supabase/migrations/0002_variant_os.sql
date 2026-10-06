-- Sistema operativo por variante (permite o filtro real do catálogo).
alter table product_variants add column if not exists os text;
