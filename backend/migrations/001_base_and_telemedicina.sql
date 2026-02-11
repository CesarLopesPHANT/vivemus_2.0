-- ============================================================================
-- MIGRATION: Tabelas de Telemedicina (Supabase + Doutor ao Vivo)
-- Cria estrutura local para espelhar dados da API DAV
-- ============================================================================

-- 1. TABELA: telemedicina_pacientes
-- Vincula person_id (UUID da DAV) ao user_id do Supabase Auth
CREATE TABLE IF NOT EXISTS telemedicina_pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id TEXT UNIQUE,                          -- UUID retornado pela API Person da DAV
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  celular TEXT,
  plan_id TEXT,
  plan_status TEXT DEFAULT 'ACTIVE' CHECK (plan_status IN ('ACTIVE', 'BLOCKED')),
  timezone TEXT DEFAULT 'America/Cuiaba',
  tag_id TEXT DEFAULT '3b928922-efa6-42c0-92dc-c8d57ab4b261',
  data_nascimento DATE,
  plan_type TEXT DEFAULT 'basic' CHECK (plan_type IN ('basic', 'standard', 'premium', 'enterprise')),
  ultimo_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_paciente_user UNIQUE (user_id),
  CONSTRAINT uq_paciente_cpf UNIQUE (cpf)
);

CREATE INDEX IF NOT EXISTS idx_telemedicina_pacientes_cpf ON telemedicina_pacientes(cpf);
CREATE INDEX IF NOT EXISTS idx_telemedicina_pacientes_person_id ON telemedicina_pacientes(person_id);
CREATE INDEX IF NOT EXISTS idx_telemedicina_pacientes_user_id ON telemedicina_pacientes(user_id);

-- 2. TABELA: telemedicina_historico
-- Registra atendimentos finalizados (consultas e fila virtual)
CREATE TABLE IF NOT EXISTS telemedicina_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id TEXT UNIQUE NOT NULL,               -- ID do protocolo na DAV
  paciente_id UUID NOT NULL REFERENCES telemedicina_pacientes(id) ON DELETE CASCADE,
  data_atendimento TIMESTAMPTZ NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FILA_VIRTUAL', 'ELETIVO')),
  medico_nome TEXT,
  especialidade TEXT,
  status TEXT NOT NULL DEFAULT 'FINALIZADO',
  duracao_minutos INTEGER,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_paciente ON telemedicina_historico(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON telemedicina_historico(data_atendimento DESC);
CREATE INDEX IF NOT EXISTS idx_historico_protocol ON telemedicina_historico(protocol_id);

-- 3. TABELA: telemedicina_documentos
-- Metadados de documentos medicos (receitas, atestados, exames)
CREATE TABLE IF NOT EXISTS telemedicina_documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT UNIQUE,                        -- ID do documento na DAV
  atendimento_id UUID REFERENCES telemedicina_historico(id) ON DELETE SET NULL,
  paciente_id UUID NOT NULL REFERENCES telemedicina_pacientes(id) ON DELETE CASCADE,
  tipo_doc TEXT NOT NULL CHECK (tipo_doc IN ('Receita', 'Atestado', 'Encaminhamento', 'Exame', 'Outro')),
  url_pdf TEXT NOT NULL,
  data_emissao TIMESTAMPTZ,
  protocol_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_paciente ON telemedicina_documentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_atendimento ON telemedicina_documentos(atendimento_id);

-- ============================================================================
-- RLS (Row Level Security) - Paciente so ve seus proprios dados
-- ============================================================================

ALTER TABLE telemedicina_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicina_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicina_documentos ENABLE ROW LEVEL SECURITY;

-- Pacientes: usuario ve apenas seu proprio registro
CREATE POLICY "paciente_select_own" ON telemedicina_pacientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "paciente_update_own" ON telemedicina_pacientes
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role pode fazer tudo (Edge Functions e triggers)
CREATE POLICY "service_role_all_pacientes" ON telemedicina_pacientes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Historico: paciente ve apenas seus atendimentos
CREATE POLICY "historico_select_own" ON telemedicina_historico
  FOR SELECT USING (
    paciente_id IN (SELECT id FROM telemedicina_pacientes WHERE user_id = auth.uid())
  );

CREATE POLICY "service_role_all_historico" ON telemedicina_historico
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Documentos: paciente ve apenas seus documentos
CREATE POLICY "documentos_select_own" ON telemedicina_documentos
  FOR SELECT USING (
    paciente_id IN (SELECT id FROM telemedicina_pacientes WHERE user_id = auth.uid())
  );

CREATE POLICY "service_role_all_documentos" ON telemedicina_documentos
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. TABELA: notifications
-- Notificacoes push para pacientes
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'GENERAL',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuario ve apenas suas proprias notificacoes
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

-- Usuario pode marcar como lida suas proprias notificacoes
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Service role pode fazer tudo (Edge Functions, webhooks)
CREATE POLICY "service_role_all_notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- VAULT: Armazenar API Key com seguranca
-- ============================================================================

-- Insere a DAV_API_KEY no Supabase Vault (secrets encriptados)
-- NOTA: Executar manualmente no SQL Editor do Supabase Dashboard
-- SELECT vault.create_secret('DAV_API_KEY', 'SUA_CHAVE_AQUI', 'API Key do Doutor ao Vivo');
-- SELECT vault.create_secret('DAV_BASE_URL', 'https://api.v2.doutoraovivo.com.br', 'URL base da API DAV');
-- SELECT vault.create_secret('DAV_TAG_ID', '3b928922-efa6-42c0-92dc-c8d57ab4b261', 'Tag ID Vivemus na DAV');

-- ============================================================================
-- TRIGGER: updated_at automatico
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON telemedicina_pacientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TRIGGER: Sincronizar com DAV ao criar usuario no auth.users
-- Dispara Edge Function via pg_net para POST /person na API DAV
-- ============================================================================

-- Funcao que dispara webhook para Edge Function de cadastro
CREATE OR REPLACE FUNCTION notify_new_user_for_dav_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Monta payload com dados do novo usuario
  payload := jsonb_build_object(
    'event', 'USER_CREATED',
    'user_id', NEW.id,
    'email', NEW.email,
    'created_at', NEW.created_at
  );

  -- Dispara notificacao via pg_notify (capturada pela Edge Function)
  PERFORM pg_notify('dav_sync', payload::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION notify_new_user_for_dav_sync();

-- ============================================================================
-- TRIGGER: Sincronizar status financeiro com DAV
-- Quando plan_status muda em telemedicina_pacientes, notifica Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_plan_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- So dispara se plan_status realmente mudou
  IF OLD.plan_status IS DISTINCT FROM NEW.plan_status THEN
    payload := jsonb_build_object(
      'event', 'PLAN_STATUS_CHANGED',
      'user_id', NEW.user_id,
      'person_id', NEW.person_id,
      'cpf', NEW.cpf,
      'old_status', OLD.plan_status,
      'new_status', NEW.plan_status
    );

    PERFORM pg_notify('dav_sync', payload::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_plan_status_changed
  AFTER UPDATE OF plan_status ON telemedicina_pacientes
  FOR EACH ROW EXECUTE FUNCTION notify_plan_status_change();
