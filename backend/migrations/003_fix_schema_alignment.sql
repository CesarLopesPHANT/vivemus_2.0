-- ============================================================================
-- MIGRATION: Alinhamento Schema <-> Codigo (pos-auditoria)
-- Data: 2026-02-09
-- ============================================================================
--
-- AUDITORIA DO BANCO REAL (2026-02-09):
-- Tabelas existentes: api_logs, companies, conversations, medical_records,
--   messages, partners, patient_registry, profiles, system_settings, user_types
--
-- Tabelas FALTANTES (criadas pela migration 20260208):
--   notifications, telemedicina_pacientes, telemedicina_historico, telemedicina_documentos
--
-- api_logs: ja possui colunas corretas (provider, response_status) - sem alteracao necessaria
--
-- Correcoes aplicadas NO CODIGO (nao no banco):
--   - logService.ts: campo 'resource' mapeado para coluna 'provider' (ja correta)
--   - logService.ts: campo 'status' mapeado para coluna 'response_status' (ja correta)
--   - draovivoService.ts: salvarDocumentosNoBancoLocal reescrito para usar telemedicina_documentos
--   - draovivoService.ts: enviarNotificacaoPush resolve user_id via telemedicina_pacientes
--
-- Esta migration resolve apenas o que faltou na 20260208:
-- ============================================================================

-- Vincular documentos orfaos ao historico via protocol_id (caso a 20260208 ja tenha sido aplicada)
-- Seguro para rodar mesmo que as tabelas tenham acabado de ser criadas (sem dados)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'telemedicina_documentos') THEN
    UPDATE telemedicina_documentos d
    SET atendimento_id = h.id
    FROM telemedicina_historico h
    WHERE d.protocol_id = h.protocol_id
      AND d.atendimento_id IS NULL
      AND d.protocol_id IS NOT NULL;
  END IF;
END $$;
