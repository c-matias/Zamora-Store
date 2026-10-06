# Automação (n8n) e IA

## Princípio
A IA e as automações **sugerem e informam; não compram**. Entre a encomenda do cliente e a compra ao fornecedor existe sempre aprovação humana
(a transição `Confirmed → Supplier Order` só acontece por ação de um utilizador no admin).

## Eventos de saída (app → n8n)
`POST $N8N_WEBHOOK_URL` com JSON `{ name, occurredAt, payload }` e cabeçalhos:
- `X-Timestamp`: milissegundos desde epoch
- `X-Signature`: HMAC-SHA256 hex de `${X-Timestamp}.${corpo}` com `N8N_WEBHOOK_SECRET`

| Evento | Quando |
|---|---|
| `order.created` | checkout com preço configurado; conversão de cotação |
| `quote.created` | pedido personalizado, checkout sem preço, cotação criada no admin |
| `quote.accepted` | cotação marcada como aceite |
| `payment.confirmed` | pagamento marcado como pago |
| `supplier.order.created` | estado → Supplier Order (decisão humana) |
| `product.received` | estado → Received |
| `quality_check.completed` | Quality Check → Ready to Ship |
| `shipment.created` | estado → Shipped |
| `shipment.delivered` | estado → Delivered |

Os payloads só têm IDs e contexto (sem dados pessoais). No n8n, validar a assinatura e rejeitar timestamps com mais de 5 minutos.

## Endpoint de entrada (n8n → app)
`POST /api/automation/supplier-listings` — atualiza preço/disponibilidade/URL de uma listagem de fornecedor.
```json
{ "listingId": "<uuid>", "supplierPrice": 45000, "availability": "available", "supplierUrl": "https://..." }
```
`supplierPrice` em cêntimos. Mesma assinatura (`X-Timestamp`, `X-Signature`). Falha fechada sem `N8N_WEBHOOK_SECRET`. Só atualiza informação; não cria encomendas nem compras.

## IA
Todas as funcionalidades têm fallback determinístico e a saída de LLM é sempre validada (zod / guarda de conteúdo).
| Funcionalidade | Onde | Notas |
|---|---|---|
| Pesquisa em linguagem natural | campo “Descreva o que procura” em `/products`, `POST /api/ai/search` | só aplica filtros que existem nos dados; reporta o que ignorou |
| Descrição/título | admin → produto → “Gerar rascunho” | rascunho para revisão; nada é gravado até “Guardar”; `copy-guard` bloqueia superlativos, escassez e promessas |
| Ranking | admin → Ranking | consultivo, interno (usa custos); dados em falta = neutros e assinalados |
| Apoio ao cliente | `/faq`, `POST /api/ai/support` | só responde com a base verificada em `src/ai/faq.ts`; sem correspondência, encaminha para contacto humano |

LLM opcional: definir `ANTHROPIC_API_KEY` (e `AI_MODEL`). Interface em `src/ai/provider.ts`. A integração com o LLM não foi testada contra a API real nesta entrega.
