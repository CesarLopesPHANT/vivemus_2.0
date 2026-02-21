-- ============================================================================
-- TCLE VIVEMUS - Termo de Consentimento Livre e Esclarecido
-- Gatekeeper: bloqueia teleconsulta ate o aceite do termo
-- Resolucao CFM 2.314/2022 + Lei 13.709/2018 (LGPD)
-- ============================================================================

-- Termos de consentimento versionados
CREATE TABLE IF NOT EXISTS lgpd_consent_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term_type TEXT NOT NULL CHECK (term_type IN ('tcle_vivemus', 'privacy_policy', 'teleconsulta_cfm', 'data_processing', 'medical_records')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_term_type_version UNIQUE (term_type, version)
);

-- Registro de aceite do usuario (auditoria completa)
CREATE TABLE IF NOT EXISTS lgpd_consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES lgpd_consent_terms(id),
  term_type TEXT NOT NULL,
  term_version TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT uq_user_term UNIQUE (user_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON lgpd_consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_term ON lgpd_consent_records(term_type);
CREATE INDEX IF NOT EXISTS idx_consent_accepted ON lgpd_consent_records(user_id, term_type, accepted);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE lgpd_consent_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_consent_records ENABLE ROW LEVEL SECURITY;

-- Termos: todos podem ler (publico)
CREATE POLICY "terms_select_all" ON lgpd_consent_terms
  FOR SELECT USING (true);

-- Termos: apenas service_role pode inserir/atualizar
CREATE POLICY "terms_admin_all" ON lgpd_consent_terms
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Registros: usuario ve apenas seus consentimentos
CREATE POLICY "consent_select_own" ON lgpd_consent_records
  FOR SELECT USING (auth.uid() = user_id);

-- Registros: usuario pode inserir seus proprios consentimentos
CREATE POLICY "consent_insert_own" ON lgpd_consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Registros: usuario pode revogar (update) seus consentimentos
CREATE POLICY "consent_update_own" ON lgpd_consent_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Registros: service_role tem acesso total
CREATE POLICY "consent_service_all" ON lgpd_consent_records
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TCLE VIVEMUS v1.0 (Termo unificado - gatekeeper obrigatorio)
-- ============================================================================

INSERT INTO lgpd_consent_terms (term_type, version, title, content, is_active, is_required) VALUES
(
  'tcle_vivemus',
  '1.0',
  'Termo de Consentimento Livre e Esclarecido (TCLE) - Vivemus',
  E'1. Objeto e Natureza do Atendimento\nO usuario declara compreender que o atendimento realizado pela Vivemus ocorre via Telemedicina, utilizando a plataforma tecnologica da Doutor ao Vivo. Este servico e destinado a atendimentos de baixa complexidade e orientacoes medicas. Em caso de emergencias graves (risco de vida), o usuario deve procurar atendimento presencial imediato.\n\n2. Compartilhamento de Dados (LGPD)\nPara viabilizar o atendimento, a Vivemus compartilhara com a Doutor ao Vivo dados de identificacao (Nome, CPF, E-mail) e dados de saude necessarios para a consulta. O processamento desses dados segue protocolos rigorosos de criptografia e seguranca cibernetica.\n\n3. Privacidade e Sigilo Medico\nAs consultas sao confidenciais, protegidas pelo sigilo medico conforme normas do CFM. O usuario compromete-se a realizar a consulta em ambiente privado e seguro. O sistema gera registros (prontuarios e receitas) que ficarao armazenados de forma segura e acessiveis ao paciente.\n\n4. Limitacoes da Telemedicina\nO medico assistente tem autonomia para interromper o atendimento virtual e solicitar uma avaliacao presencial, caso entenda que as condicoes tecnicas ou clinicas nao permitem uma conduta segura a distancia.\n\n5. Consentimento\nAo clicar em "Aceito e Continuar", o usuario declara que leu, compreendeu e aceita os termos acima, autorizando o tratamento de seus dados para fins de prestacao de servicos de saude.',
  true,
  true
)
ON CONFLICT (term_type, version) DO NOTHING;

-- ============================================================================
-- FUNCAO HELPER: Verifica se usuario aceitou o TCLE (para uso em RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_tcle_accepted(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM lgpd_consent_records cr
    JOIN lgpd_consent_terms ct ON cr.term_id = ct.id
    WHERE cr.user_id = p_user_id
      AND ct.term_type = 'tcle_vivemus'
      AND ct.is_active = true
      AND cr.accepted = true
      AND cr.revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
