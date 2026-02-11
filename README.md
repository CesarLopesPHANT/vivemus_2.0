# Vivemus 2.0

Plataforma de saúde digital com teleconsulta, IA e gestão de beneficiários.

## Estrutura

```
vivemus_2.0/
├── backend/          # Supabase Edge Functions + SQL migrations
├── frontend-web/     # React + Vite (painel web)
├── mobile-app/       # React Native (Android + iOS)
└── shared/           # @vivemus/shared — tipos, serviços, lib
```

## Pré-requisitos

- Node.js 18+
- npm 9+
- Supabase CLI (`npm i -g supabase`)
- React Native CLI + Android Studio / Xcode (para mobile)

## Setup Local

```bash
# 1. Clonar
git clone git@github.com:SEU_USER/vivemus_2.0.git
cd vivemus_2.0

# 2. Instalar dependências (workspaces)
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas chaves reais

# 4. Dev web
npm run dev:web

# 5. Dev mobile
npm run dev:mobile
```

## Variáveis de Ambiente

| Variável | Onde configurar | Descrição |
|----------|----------------|-----------|
| `VITE_SUPABASE_URL` | `.env` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Chave anônima do Supabase |
| `GEMINI_API_KEY` | `.env` | Chave da API Google Gemini |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secrets | Token de acesso Supabase (CI/CD) |
| `SUPABASE_PROJECT_ID` | GitHub Secrets | ID do projeto Supabase (CI/CD) |
| `DAV_API_KEY` | GitHub Secrets | Chave da API Doutor ao Vivo |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | Service role key (NUNCA no .env local) |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev:web` | Inicia frontend web (Vite dev server) |
| `npm run dev:mobile` | Inicia app mobile (Metro bundler) |
| `npm run build:web` | Build de produção do frontend web |
| `npm run deploy:functions` | Deploy das Edge Functions ao Supabase |

## Deploy

### Edge Functions (automático)
Push para `main` em `backend/functions/**` dispara deploy automático via GitHub Actions.

### Frontend Web
Push para `main` em `frontend-web/**` dispara build e deploy automático.

### Configurar GitHub Secrets

1. Vá em **Settings > Secrets and variables > Actions**
2. Adicione:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_ID`
   - `DAV_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
