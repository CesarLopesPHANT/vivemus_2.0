-- ============================================================================
-- VIVEMUS 1.0 - Schema Completo do Banco de Dados (Supabase/PostgreSQL)
-- Versao: 3.0
-- Atualizado: 2026-02-08
-- ============================================================================

-- ============================================================================
-- TABELAS CORE DO SISTEMA
-- ============================================================================

-- Configuracoes do sistema (API keys, preferencias)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de auditoria de chamadas API e alteracoes de sistema
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action_type TEXT NOT NULL,
  provider TEXT,
  resource TEXT,
  description TEXT,
  payload JSONB,
  response_status TEXT DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_action ON api_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_api_logs_date ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_resource ON api_logs(resource);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(response_status);

-- Conversas de IA
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens de chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notificacoes push
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

-- ============================================================================
-- TABELAS DE TELEMEDICINA (Integracao Doutor ao Vivo)
-- ============================================================================

-- Pacientes vinculados ao sistema DAV
CREATE TABLE IF NOT EXISTS telemedicina_pacientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id TEXT UNIQUE,
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

-- Historico de atendimentos (consultas e fila virtual)
CREATE TABLE IF NOT EXISTS telemedicina_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id TEXT UNIQUE NOT NULL,
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

-- Documentos medicos (receitas, atestados, exames)
CREATE TABLE IF NOT EXISTS telemedicina_documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT UNIQUE,
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicina_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicina_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicina_documentos ENABLE ROW LEVEL SECURITY;

-- Notifications: usuario ve apenas suas notificacoes
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "service_role_all_notifications" ON notifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Pacientes: usuario ve apenas seu registro
CREATE POLICY "paciente_select_own" ON telemedicina_pacientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "paciente_update_own" ON telemedicina_pacientes
  FOR UPDATE USING (auth.uid() = user_id);

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
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
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

-- Notificar Edge Functions ao criar usuario (para sync com DAV)
CREATE OR REPLACE FUNCTION notify_new_user_for_dav_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'event', 'USER_CREATED',
    'user_id', NEW.id,
    'email', NEW.email,
    'created_at', NEW.created_at
  );
  PERFORM pg_notify('dav_sync', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION notify_new_user_for_dav_sync();

-- Notificar ao mudar plan_status (sync financeiro com DAV)
CREATE OR REPLACE FUNCTION notify_plan_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
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

-- ============================================================================
-- VAULT SECRETS (executar manualmente no Supabase Dashboard > SQL Editor)
-- ============================================================================
-- SELECT vault.create_secret('DAV_API_KEY', 'SUA_CHAVE_AQUI', 'API Key Doutor ao Vivo');
-- SELECT vault.create_secret('DAV_BASE_URL', 'https://api.v2.doutoraovivo.com.br', 'URL base API DAV');
-- SELECT vault.create_secret('DAV_TAG_ID', '3b928922-efa6-42c0-92dc-c8d57ab4b261', 'Tag ID Vivemus');
