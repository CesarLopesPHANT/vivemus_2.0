# Arquitetura Vivemus 2.0

## Visão Geral

```
┌─────────────────────────────────────────────────────┐
│                    Clientes                          │
│                                                     │
│   ┌──────────────┐         ┌──────────────┐        │
│   │ frontend-web │         │  mobile-app  │        │
│   │  (React/Vite)│         │(React Native)│        │
│   └──────┬───────┘         └──────┬───────┘        │
│          │                        │                 │
│          └────────┬───────────────┘                 │
│                   │                                 │
│          ┌────────▼────────┐                        │
│          │ @vivemus/shared │                        │
│          │ (tipos/serviços)│                        │
│          └────────┬────────┘                        │
└───────────────────┼─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│                  Supabase                            │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│   │   Auth   │  │ Postgres │  │ Edge Functions │  │
│   │  (login) │  │ (dados)  │  │  (backend API) │  │
│   └──────────┘  └──────────┘  └───────┬────────┘  │
└───────────────────────────────────────┼────────────┘
                                        │
┌───────────────────────────────────────▼────────────┐
│              Doutor ao Vivo (DAV)                   │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│   │ API REST │  │  Portal  │  │   Webhooks   │    │
│   │  (PSO)   │  │(consulta)│  │(notificações)│    │
│   └──────────┘  └──────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Fluxo de Teleconsulta

```
1. Paciente clica "Pronto Atendimento"
           │
2. Frontend verifica consentimento LGPD
           │ (ConsentModal se necessário)
           │
3. Frontend chama Edge Function pso-proxy
           │
4. pso-proxy valida sessão Supabase Auth
           │
5. pso-proxy envia POST para DAV API
           │ (com DAV_API_KEY via GitHub Secret)
           │
6. DAV retorna PSO token + URL
           │
7. Frontend recebe URL e renderiza:
           │
     ┌──────┴──────┐
     │   Web: iframe │  Mobile: WebView
     │  (EmbeddedBrowser)│  (react-native-webview)
     └──────┬──────┘
           │
8. Consulta acontece no portal DAV
           │
9. DAV envia webhook (CONSULTATION_FINISHED)
           │
10. webhook-handler salva documentos no Supabase
           │
11. Frontend exibe resumo com documentos médicos
```

## Banco de Dados (Supabase Postgres)

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do usuário (nome, CPF, plano, tipo) |
| `system_settings` | Configurações globais (chaves DAV, etc) |
| `api_logs` | Auditoria de todas as chamadas |
| `dav_patients` | Cache de pacientes sincronizados com DAV |
| `patient_history` | Histórico de consultas |
| `patient_documents` | Documentos médicos (receitas, atestados) |
| `consent_terms` | Versões dos termos LGPD/TCLE |
| `consent_records` | Registros de aceite dos termos |
| `companies` | Empresas conveniadas |
| `patient_registry` | Pré-cadastro de beneficiários por empresa |

### Row Level Security (RLS)

- Pacientes: acessam apenas seus próprios dados
- ADM (RH): acessam dados da sua empresa
- MASTER: acesso total

## Módulos Compartilhados (@vivemus/shared)

```
shared/
├── types/          # Interfaces TypeScript por domínio
│   ├── user.ts     # UserData, UserRole, PlanStatus
│   ├── medical.ts  # Doctor, Appointment, MedicalRecord
│   └── partner.ts  # Partner, Notification
├── services/       # Lógica de negócio
│   ├── draovivoService.ts   # Integração DAV (PSO, sync, webhooks)
│   ├── consentService.ts    # Gatekeeper LGPD/TCLE
│   ├── geminiService.ts     # IA Google Gemini
│   └── ...                  # 8 serviços total
└── lib/
    └── supabase.ts  # Cliente Supabase (instância única)
```

## Segurança

- **Autenticação**: Supabase Auth (email/password)
- **Autorização**: RLS no Postgres + verificação de tipo de usuário
- **Secrets**: Chaves sensíveis NUNCA no código — GitHub Secrets + Supabase Vault
- **LGPD**: Consentimento obrigatório antes de qualquer teleconsulta
- **Auditoria**: Todas as ações logadas em `api_logs`
- **PSO**: Gerado server-side via Edge Function (chave DAV nunca exposta ao client)

## CI/CD

| Workflow | Trigger | Ação |
|----------|---------|------|
| `deploy-functions.yml` | Push em `backend/functions/**` | Deploy Edge Functions |
| `deploy-web.yml` | Push em `frontend-web/**` | Build + Deploy web |
