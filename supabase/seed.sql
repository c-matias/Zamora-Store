-- DADOS DE DEMONSTRAÇÃO (is_demo = true). Não são stock real; sem preços nem fornecedores.
-- Os preços ficam a null: o checkout cria uma cotação em rascunho em vez de uma encomenda.
with p as (
  insert into products (name, slug, brand, model, category, description, condition, status, is_demo) values
    ('Dell Latitude 5420','dell-latitude-5420','Dell','Latitude 5420','laptops','Dados de demonstração.','very_good','active',true),
    ('Lenovo ThinkPad T14 Gen 2','lenovo-thinkpad-t14-gen-2','Lenovo','ThinkPad T14 Gen 2','laptops','Dados de demonstração.','very_good','active',true),
    ('HP EliteBook 840 G8','hp-elitebook-840-g8','HP','EliteBook 840 G8','laptops','Dados de demonstração.','good','active',true),
    ('MacBook Air M1','macbook-air-m1','Apple','MacBook Air M1','laptops','Dados de demonstração.','excellent','active',true),
    ('iPhone 13','iphone-13','Apple','iPhone 13','smartphones','Dados de demonstração.','very_good','active',true),
    ('Samsung Galaxy S22','samsung-galaxy-s22','Samsung','Galaxy S22','smartphones','Dados de demonstração.','good','active',true),
    ('iPad','apple-ipad','Apple','iPad','tablets','Dados de demonstração.','good','active',true),
    ('Samsung Galaxy Tab','samsung-galaxy-tab','Samsung','Galaxy Tab','tablets','Dados de demonstração.','good','active',true)
  on conflict (slug) do nothing
  returning id, slug, condition
)
insert into product_variants (product_id, cpu, ram, storage, condition)
select id, case slug when 'macbook-air-m1' then 'Apple M1' end,
  case when slug in ('dell-latitude-5420','lenovo-thinkpad-t14-gen-2','hp-elitebook-840-g8') then '16 GB'
       when slug = 'macbook-air-m1' then '8 GB' end,
  case slug when 'dell-latitude-5420' then '512 GB SSD' when 'lenovo-thinkpad-t14-gen-2' then '512 GB SSD'
            when 'hp-elitebook-840-g8' then '256 GB SSD' when 'macbook-air-m1' then '256 GB SSD'
            when 'iphone-13' then '128 GB' when 'samsung-galaxy-s22' then '128 GB'
            else '64 GB' end,
  condition
from p;
