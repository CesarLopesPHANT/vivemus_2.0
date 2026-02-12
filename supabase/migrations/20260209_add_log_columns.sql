-- ============================================================================
-- MIGRATION: Adicionar colunas description e resource a api_logs
-- Data: 2026-02-09
-- Motivo: description nunca era persistido; resource era mapeado para provider
-- ============================================================================

-- Adicionar colunas ausentes
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS resource TEXT;

-- Backfill: copiar provider existente para resource
UPDATE api_logs SET resource = provider WHERE resource IS NULL AND provider IS NOT NULL;

-- Indices para filtros no painel admin
CREATE INDEX IF NOT EXISTS idx_api_logs_resource ON api_logs(resource);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(response_status);
