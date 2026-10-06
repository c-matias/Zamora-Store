-- Preparação de pagamentos: referência do fornecedor de pagamento e idempotência de webhooks.
alter table orders add column if not exists payment_provider text;
alter table orders add column if not exists payment_reference text;
alter table orders add column if not exists payment_url text;

create table if not exists payment_events (
  id text primary key,                 -- id do evento do fornecedor (idempotência)
  provider text not null,
  order_id uuid references orders(id) on delete set null,
  type text not null,
  received_at timestamptz not null default now()
);
alter table payment_events enable row level security;
create policy "staff read payment_events" on payment_events for select using (is_staff());
-- Sem policies de escrita: só o webhook (service role) escreve.
