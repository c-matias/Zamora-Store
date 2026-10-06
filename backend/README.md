# Backend FastAPI (esqueleto)
Serviço complementar ao Next.js: valida JWT do Supabase, verifica role em `profiles` e recebe eventos assinados (mesmo HMAC do Next.js).
É um ponto de extensão para workers (scraping de fornecedores, tarefas de IA); **não duplica a lógica de margem**, que continua só em `src/services/pricing.ts`.

    pip install -r requirements.txt
    pytest
    uvicorn app.main:app --reload

Endpoints: `GET /health`, `GET /v1/me`, `GET /v1/staff/ping`, `POST /v1/events`.
Deploy: Dockerfile incluído (Fly.io/Render/Railway; não corre na Vercel como serverless sem adaptação).
