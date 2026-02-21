
import { supabase } from "../lib/supabase";
import { trackApiAction } from "./logService";

// Configuracoes Iniciais da API - Doutor ao Vivo
const BASE_URL = "https://api.v2.doutoraovivo.com.br";
const TAG_ID = "3b928922-efa6-42c0-92dc-c8d57ab4b261"; // ID do Grupo Vivemus

// URLs para Auditoria e Relatorios (Producao)
const REPORT_URL = "https://api.doutoraovivo.com.br/report";
const PROTOCOL_URL = "https://api.v2.doutoraovivo.com.br/protocol";

// URL para Configuracao de Permissoes (Producao)
const AUTH_URL = "https://api.doutoraovivo.com.br/auth";

// Portal Vivemus (dominio white-label Dr. ao Vivo)
const PORTAL_URL = "https://vivemus.dav.med.br";

interface DrAoVivoConfig {
  endpoint: string;
  apiKey: string;
}

interface PersonPayload {
  name: string;
  cpf: string;
  email: string;
  cell_phone: string;
  plan_id: string;
  plan_status: 'ACTIVE' | 'BLOCKED';
  timezone: string;
  tag_id: string;
  birth_date?: string;
  password?: string;
}

interface PersonResponse {
  id: string;
  name: string;
  cpf: string;
  email: string;
  plan_status: 'ACTIVE' | 'BLOCKED';
  [key: string]: any;
}

interface PSOResponse {
  id: string;
  url?: string;
  [key: string]: any;
}

interface IntegrationResult {
  success: boolean;
  url?: string;
  error?: string;
  personId?: string;
  simulated?: boolean;
  networkError?: boolean;
}

// Interfaces para Auditoria e Relatorios
interface FiltrosAuditoria {
  inicio: string; // Data inicio (YYYY-MM-DD)
  fim: string;    // Data fim (YYYY-MM-DD)
  cpf?: string;   // CPF para filtrar protocolos
  periodo?: string; // Periodo para relatorio financeiro
}

export interface ConsultaAgendamento {
  id: string;
  date: string;
  patient_name: string;
  patient_cpf: string;
  doctor_name: string;
  specialty: string;
  status: string;
  duration_minutes?: number;
  [key: string]: any;
}

export interface ProtocoloFilaVirtual {
  id: string;
  protocol_number: string;
  created_at: string;
  patient_cpf: string;
  patient_name: string;
  status: string;
  queue_type: string;
  wait_time_minutes?: number;
  attendance_time_minutes?: number;
  [key: string]: any;
}

interface RegistroFinanceiro {
  id: string;
  date: string;
  patient_cpf: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  description: string;
  [key: string]: any;
}

interface ResultadoAuditoria {
  historicoAgendamentos: ConsultaAgendamento[];
  atendimentosFilaVirtual: ProtocoloFilaVirtual[];
  conciliacaoFinanceira: RegistroFinanceiro[];
}

// Interfaces para Permissoes de Paciente
type PerfilPlano = 'basic' | 'standard' | 'premium' | 'enterprise';

interface PermissoesPaciente {
  allow_schedule: boolean;      // Permite agendamento eletivo
  allow_virtual_queue: boolean; // Permite fila virtual (pronto atendimento)
  allow_reports: boolean;       // Permite acesso a relatorios internos
  view_medical_record: boolean; // Permite visualizar o proprio prontuario
}

interface ResultadoPermissoes {
  success: boolean;
  status?: string;
  configuracoes?: PermissoesPaciente;
  error?: string;
}

const getConfig = async (): Promise<DrAoVivoConfig> => {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    return { endpoint: BASE_URL, apiKey: '' };
  }
  const envKey = (typeof process !== 'undefined' && process.env?.DAV_API_KEY) || '';
  if (envKey) {
    return { endpoint: BASE_URL, apiKey: envKey };
  }
  try {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'api_gateways').single();
    return {
      endpoint: data?.value?.draovivo_endpoint || BASE_URL,
      apiKey: data?.value?.draovivo_api_key || ''
    };
  } catch (err) {
    return { endpoint: BASE_URL, apiKey: '' };
  }
};

// ============================================================================
// CLASSE DE ERRO ESTRUTURADA E VALIDADORES
// Permite recovery automatico baseado no codigo HTTP
// ============================================================================

class DrAoVivoAPIError extends Error {
  statusCode: number;
  body: any;

  constructor(statusCode: number, message: string, body?: any) {
    super(message);
    this.name = 'DrAoVivoAPIError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Valida se a string e um timezone IANA valido
 * Previne erro 400 por timezone ausente ou invalido
 */
const validarTimezoneIANA = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida formato de data YYYY-MM-DD
 * Previne erro 400 por formato de data invalido
 */
const validarFormatoData = (data: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(data)) return false;
  const parsed = new Date(data + 'T00:00:00Z');
  return !isNaN(parsed.getTime());
};

/**
 * Pre-valida payload antes de enviar para a API
 * Previne erros 400 (Bad Request) por dados invalidos
 *
 * @returns null se valido, mensagem de erro se invalido
 */
const validarPayloadPessoa = (payload: PersonPayload): string | null => {
  if (!payload.timezone) {
    return 'Timezone obrigatorio. Use formato IANA (ex: America/Cuiaba).';
  }
  if (!validarTimezoneIANA(payload.timezone)) {
    return `Timezone invalido: "${payload.timezone}". Use formato IANA (ex: America/Sao_Paulo).`;
  }
  if (payload.birth_date && !validarFormatoData(payload.birth_date)) {
    return `Formato de data invalido: "${payload.birth_date}". Use formato YYYY-MM-DD.`;
  }
  return null;
};

/**
 * Timeout para chamadas HTTP - previne processamento infinito
 */
const FETCH_TIMEOUT_MS = 15000;

const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
};

/**
 * Funcao auxiliar para fazer requisicoes a API Dr. ao Vivo
 */
const consultarAPI = async <T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
): Promise<T> => {
  const { endpoint, apiKey } = await getConfig();

  if (!apiKey) {
    throw new Error("TOKEN_NAO_CONFIGURADO");
  }

  const response = await fetchWithTimeout(`${endpoint}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new DrAoVivoAPIError(
      response.status,
      errorData.message || `Erro HTTP ${response.status}`,
      errorData
    );
  }

  return response.json();
};

/**
 * FASE 1: Buscar paciente na base do Dr. ao Vivo por CPF
 * Exportado para verificação de duplicidade
 */
export const buscarPacientePorCPF = async (cpf: string): Promise<PersonResponse | null> => {
  try {
    const cleanCPF = cpf.replace(/\D/g, '');
    const result = await consultarAPI<PersonResponse>(`/person/cpf/${cleanCPF}`, 'GET');
    return result;
  } catch (error: any) {
    // Se nao encontrar, retorna null (paciente novo)
    if (
      (error instanceof DrAoVivoAPIError && error.statusCode === 404) ||
      error.message?.includes('404') ||
      error.message?.includes('not found')
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * FASE 2: Cadastrar ou Atualizar paciente na base do Dr. ao Vivo
 *
 * Tratamento de Erros:
 * - 400: Pre-valida timezone (IANA) e formato de data antes de enviar
 * - 403: Valida status financeiro localmente antes de chamar a API
 * - 409: CPF ja cadastrado em outra TAG → auto-retry com PUT em vez de POST
 */
const cadastrarOuAtualizarPaciente = async (
  existingId: string | null,
  payload: PersonPayload
): Promise<PersonResponse> => {
  // Pre-validacao 400: timezone e data
  const erroValidacao = validarPayloadPessoa(payload);
  if (erroValidacao) {
    throw new DrAoVivoAPIError(400, erroValidacao);
  }

  // Pre-validacao 403: status financeiro local
  if (payload.plan_status === 'BLOCKED') {
    console.warn('[DrAoVivo] plan_status BLOCKED detectado localmente. API pode rejeitar com 403.');
  }

  if (existingId) {
    // PUT para atualizar paciente existente
    return consultarAPI<PersonResponse>(`/person/${existingId}`, 'PUT', payload);
  } else {
    try {
      // POST para criar novo paciente
      return await consultarAPI<PersonResponse>('/person', 'POST', payload);
    } catch (error: any) {
      // Recovery 409: CPF ja cadastrado em outra TAG → busca por CPF e faz PUT
      if (error instanceof DrAoVivoAPIError && error.statusCode === 409) {
        console.warn(`[DrAoVivo] 409 Conflict: CPF ${payload.cpf} ja cadastrado. Tentando PUT...`);

        const pacienteExistente = await buscarPacientePorCPF(payload.cpf);
        if (pacienteExistente?.id) {
          await trackApiAction({
            userId: 'system',
            userName: payload.name,
            actionType: 'RECOVERY_409_PUT_PERSON',
            provider: 'DrAoVivo',
            payload: { cpf: payload.cpf, personId: pacienteExistente.id },
            status: 'SUCCESS'
          });
          return consultarAPI<PersonResponse>(`/person/${pacienteExistente.id}`, 'PUT', payload);
        }

        throw new DrAoVivoAPIError(
          409,
          `CPF ${payload.cpf} ja cadastrado em outra TAG mas nao localizado para atualizacao.`
        );
      }

      // Recovery 403: distinguir entre x-api-key invalida e plan_status BLOCKED
      if (error instanceof DrAoVivoAPIError && error.statusCode === 403) {
        const isBlocked = payload.plan_status === 'BLOCKED';
        await trackApiAction({
          userId: 'system',
          userName: payload.name,
          actionType: 'ERROR_403_FORBIDDEN',
          provider: 'DrAoVivo',
          payload: {
            cpf: payload.cpf,
            causa: isBlocked ? 'PLAN_STATUS_BLOCKED' : 'POSSIVEL_API_KEY_INVALIDA',
            planStatus: payload.plan_status
          },
          status: 'ERROR'
        });

        if (isBlocked) {
          throw new DrAoVivoAPIError(403, 'Plano bloqueado. Regularize o status financeiro antes de prosseguir.');
        }
        throw new DrAoVivoAPIError(403, 'Acesso negado pela API. Verifique a configuracao da x-api-key.');
      }

      throw error;
    }
  }
};

/**
 * FASE 3: Gerar PSO (Programmatic Single Sign-On) para acesso direto
 *
 * Endpoint: POST /credential/pso/person/{personId}
 *
 * Tratamento de Erros:
 * - 404: person_id inexistente → dispara cadastro (POST /person) e retenta PSO
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @param dadosCadastro - Payload opcional para cadastro automatico em caso de 404
 */
const gerarPSO = async (personId: string, dadosCadastro?: PersonPayload): Promise<string> => {
  try {
    const pso = await consultarAPI<PSOResponse>(`/credential/pso/person/${personId}`, 'POST');
    return `${PORTAL_URL}/pso/${pso.id}/emergency`;
  } catch (error: any) {
    // Recovery 404: person_id nao encontrado → cadastra e retenta
    if (error instanceof DrAoVivoAPIError && error.statusCode === 404 && dadosCadastro) {
      console.warn(`[DrAoVivo] 404: person_id ${personId} nao encontrado. Disparando cadastro...`);

      const novaPessoa = await consultarAPI<PersonResponse>('/person', 'POST', dadosCadastro);

      await trackApiAction({
        userId: 'system',
        userName: dadosCadastro.name,
        actionType: 'RECOVERY_404_CREATE_PERSON_BEFORE_PSO',
        provider: 'DrAoVivo',
        payload: { personIdOriginal: personId, novoPersonId: novaPessoa.id },
        status: 'SUCCESS'
      });

      const pso = await consultarAPI<PSOResponse>(`/credential/pso/person/${novaPessoa.id}`, 'POST');
      return `${PORTAL_URL}/pso/${pso.id}/emergency`;
    }

    throw error;
  }
};

/**
 * Integracao completa de Telemedicina - Fluxo Principal
 * Implementa as 3 fases conforme documentacao da API
 */
export const integrarTelemedicina = async (usuario: {
  nome: string;
  cpf: string;
  email: string;
  celular: string;
  id_plano: string;
  pagamentoAtivo: boolean;
  dataNascimento?: string;
  senha?: string;
  timezone?: string;
  userId?: string;
}): Promise<IntegrationResult> => {
  const { apiKey } = await getConfig();

  // Modo simulado se API key nao estiver configurada
  if (!apiKey) {
    console.warn("DrAoVivo Bridge: API key nao configurada. Entrando em modo simulado.");
    return {
      success: true,
      simulated: true,
      url: `${PORTAL_URL}/emergency/person/`
    };
  }

  try {
    // FASE 1: Verificar se o paciente ja existe na base
    const busca = await buscarPacientePorCPF(usuario.cpf);

    // FASE 2: Cadastro ou Atualizacao do Status do Plano
    const payload: PersonPayload = {
      name: usuario.nome,
      cpf: usuario.cpf.replace(/\D/g, ''),
      email: usuario.email,
      cell_phone: usuario.celular.replace(/\D/g, ''),
      plan_id: usuario.id_plano,
      plan_status: usuario.pagamentoAtivo ? "ACTIVE" : "BLOCKED", // Controle financeiro
      timezone: usuario.timezone || "America/Cuiaba",
      tag_id: TAG_ID,
      birth_date: usuario.dataNascimento,
      password: usuario.senha
    };

    const person = await cadastrarOuAtualizarPaciente(busca?.id || null, payload);

    // Log da acao
    await trackApiAction({
      userId: usuario.userId || 'system',
      userName: usuario.nome,
      actionType: busca?.id ? 'UPDATE_PATIENT_DRAOVIVO' : 'CREATE_PATIENT_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { personId: person.id, planStatus: person.plan_status },
      status: 'SUCCESS'
    });

    // FASE 3: Gerar Acesso Programatico (PSO) se estiver ATIVO
    // Passa payload para recovery automatico em caso de 404
    if (person.plan_status === "ACTIVE") {
      const url = await gerarPSO(person.id, payload);
      return { success: true, url, personId: person.id };
    } else {
      return {
        success: false,
        error: "Plano inativo. Redirecionar para tela de pagamento.",
        personId: person.id
      };
    }
  } catch (error: any) {
    console.error("Erro na integracao DrAoVivo:", error);

    // Log do erro
    await trackApiAction({
      userId: usuario.userId || 'system',
      userName: usuario.nome,
      actionType: 'INTEGRATION_ERROR_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { error: error.message },
      status: 'ERROR'
    });

    // Timeout - retorna erro claro em vez de modo simulado
    if (error.name === 'AbortError') {
      return { success: false, error: 'Tempo de conexao esgotado. Verifique sua rede e tente novamente.' };
    }

    // Se for erro de rede/CORS, retorna modo simulado
    if (error.message === "Failed to fetch" || error instanceof TypeError) {
      return { success: true, simulated: true, networkError: true };
    }

    return { success: false, error: error.message };
  }
};

/**
 * Sincroniza um paciente com o provedor DrAoVivo (funcao legada mantida para compatibilidade)
 * @deprecated Use integrarTelemedicina para o fluxo completo
 */
export const syncPatientToProvider = async (userData: any): Promise<{
  success: boolean;
  simulated?: boolean;
  networkError?: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const result = await integrarTelemedicina({
      nome: userData.name || userData.full_name,
      cpf: userData.cpf,
      email: userData.email,
      celular: userData.cell_phone,
      id_plano: userData.plan_id,
      pagamentoAtivo: userData.plan_status !== 'BLOCKED',
      dataNascimento: userData.birth_date,
      senha: userData.password,
      timezone: userData.timezone,
      userId: userData.id
    });

    return {
      success: result.success,
      simulated: result.simulated,
      networkError: result.networkError,
      data: result
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Obter link de consulta para um paciente
 * Usa o fluxo completo de integracao para gerar PSO
 */
export const getConsultationLink = async (
  appointmentId: string,
  userCpf: string,
  userData?: {
    nome: string;
    email: string;
    celular: string;
    id_plano: string;
    pagamentoAtivo: boolean;
    timezone?: string;
  }
): Promise<string> => {
  const { apiKey } = await getConfig();
  const fallbackUrl = `${PORTAL_URL}/emergency/person/`;

  try {
    if (!apiKey) return fallbackUrl;

    // Se temos dados completos do usuario, usa o fluxo de integracao
    if (userData) {
      const result = await integrarTelemedicina({
        nome: userData.nome,
        cpf: userCpf,
        email: userData.email,
        celular: userData.celular,
        id_plano: userData.id_plano,
        pagamentoAtivo: userData.pagamentoAtivo,
        timezone: userData.timezone
      });

      if (result.success && result.url) {
        return result.url;
      }

      if (!result.success && result.error?.includes("Plano inativo")) {
        throw new Error("PLANO_BLOQUEADO");
      }
    }

    // Fallback: tenta buscar paciente existente e gerar PSO
    const paciente = await buscarPacientePorCPF(userCpf);
    if (paciente?.id && paciente.plan_status === 'ACTIVE') {
      return await gerarPSO(paciente.id);
    }

    return fallbackUrl;
  } catch (error: any) {
    console.error("Erro ao obter link de consulta:", error);
    if (error.message === "PLANO_BLOQUEADO") {
      throw error;
    }
    return fallbackUrl;
  }
};

/**
 * Verifica status do plano de um paciente na API
 */
export const verificarStatusPlano = async (cpf: string): Promise<{
  exists: boolean;
  status: 'ACTIVE' | 'BLOCKED' | 'NOT_FOUND';
  personId?: string;
}> => {
  try {
    const paciente = await buscarPacientePorCPF(cpf);
    if (paciente) {
      return {
        exists: true,
        status: paciente.plan_status,
        personId: paciente.id
      };
    }
    return { exists: false, status: 'NOT_FOUND' };
  } catch (error) {
    return { exists: false, status: 'NOT_FOUND' };
  }
};

/**
 * Atualiza status do plano de um paciente (ACTIVE/BLOCKED)
 * Util para controle financeiro
 */
export const atualizarStatusPlano = async (
  cpf: string,
  novoStatus: 'ACTIVE' | 'BLOCKED'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const paciente = await buscarPacientePorCPF(cpf);
    if (!paciente) {
      return { success: false, error: "Paciente nao encontrado na base do provedor" };
    }

    await consultarAPI(`/person/${paciente.id}`, 'PUT', {
      ...paciente,
      plan_status: novoStatus,
      tag_id: TAG_ID
    });

    await trackApiAction({
      userId: 'system',
      userName: paciente.name,
      actionType: 'UPDATE_PLAN_STATUS_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { personId: paciente.id, oldStatus: paciente.plan_status, newStatus: novoStatus },
      status: 'SUCCESS'
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// FASE DE HISTORICO E AUDITORIA
// APIs de Relatorios e Protocolos para consolidar dados de telemedicina
// ============================================================================

/**
 * Funcao auxiliar para consultar APIs de Relatorio/Protocolo
 * Usa URLs especificas diferentes da API principal
 */
const consultarAPIRelatorio = async <T>(
  fullUrl: string,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> => {
  const { apiKey } = await getConfig();

  if (!apiKey) {
    throw new Error("TOKEN_NAO_CONFIGURADO");
  }

  const response = await fetchWithTimeout(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new DrAoVivoAPIError(
      response.status,
      errorData.message || `Erro HTTP ${response.status}`,
      errorData
    );
  }

  return response.json();
};

/**
 * Buscar Volumetria de Consultas (API Report)
 * Retorna registros de agendamentos finalizados para gerar relatorios
 */
export const buscarRelatorioConsultas = async (
  dataInicio: string,
  dataFim: string
): Promise<ConsultaAgendamento[]> => {
  try {
    const result = await consultarAPIRelatorio<{ data: ConsultaAgendamento[] }>(
      `${REPORT_URL}/?start_date=${dataInicio}&end_date=${dataFim}`
    );
    return result.data || [];
  } catch (error: any) {
    console.error("Erro ao buscar relatorio de consultas:", error);
    return [];
  }
};

/**
 * Buscar Protocolos da Fila Virtual (API Protocol)
 * Retorna registros especificos dos atendimentos via Fila Virtual (Pronto Atendimento)
 */
export const buscarProtocolosFilaVirtual = async (
  cpf?: string
): Promise<ProtocoloFilaVirtual[]> => {
  try {
    const url = cpf
      ? `${PROTOCOL_URL}/?cpf=${cpf.replace(/\D/g, '')}`
      : `${PROTOCOL_URL}/`;

    const result = await consultarAPIRelatorio<{ data: ProtocoloFilaVirtual[] }>(url);
    return result.data || [];
  } catch (error: any) {
    console.error("Erro ao buscar protocolos da fila virtual:", error);
    return [];
  }
};

/**
 * Buscar Relatorio Financeiro (Conciliacao)
 * Retorna registros de agendamentos faturados para auditoria financeira
 */
export const buscarRelatorioFinanceiro = async (
  periodo: string
): Promise<RegistroFinanceiro[]> => {
  try {
    const result = await consultarAPIRelatorio<{ data: RegistroFinanceiro[] }>(
      `${REPORT_URL}/finance/?period=${periodo}`
    );
    return result.data || [];
  } catch (error: any) {
    console.error("Erro ao buscar relatorio financeiro:", error);
    return [];
  }
};

/**
 * Auditoria Completa de Atendimentos
 * Consolida dados de consultas, protocolos e financeiro em um unico relatorio
 */
export const auditoriaAtendimentos = async (
  filtros: FiltrosAuditoria
): Promise<ResultadoAuditoria> => {
  const { apiKey } = await getConfig();

  // Modo simulado se API key nao estiver configurada
  if (!apiKey) {
    console.warn("DrAoVivo Auditoria: API key nao configurada. Retornando dados vazios.");
    return {
      historicoAgendamentos: [],
      atendimentosFilaVirtual: [],
      conciliacaoFinanceira: []
    };
  }

  try {
    // Executa as 3 buscas em paralelo para melhor performance
    const [relatorioConsultas, protocolosFila, financeiro] = await Promise.all([
      // 1. Buscar Volumetria de Consultas (API Report)
      buscarRelatorioConsultas(filtros.inicio, filtros.fim),

      // 2. Buscar Protocolos da Fila Virtual (API Protocol)
      buscarProtocolosFilaVirtual(filtros.cpf),

      // 3. Relatorio Financeiro (Conciliacao)
      filtros.periodo
        ? buscarRelatorioFinanceiro(filtros.periodo)
        : Promise.resolve([])
    ]);

    // Log da auditoria
    await trackApiAction({
      userId: 'system',
      userName: 'Auditoria Sistema',
      actionType: 'AUDIT_REPORT_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: {
        filtros,
        totalConsultas: relatorioConsultas.length,
        totalProtocolos: protocolosFila.length,
        totalRegistrosFinanceiros: financeiro.length
      },
      status: 'SUCCESS'
    });

    return {
      historicoAgendamentos: relatorioConsultas,
      atendimentosFilaVirtual: protocolosFila,
      conciliacaoFinanceira: financeiro
    };
  } catch (error: any) {
    console.error("Erro na auditoria de dados:", error);

    await trackApiAction({
      userId: 'system',
      userName: 'Auditoria Sistema',
      actionType: 'AUDIT_ERROR_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { error: error.message, filtros },
      status: 'ERROR'
    });

    return {
      historicoAgendamentos: [],
      atendimentosFilaVirtual: [],
      conciliacaoFinanceira: []
    };
  }
};

/**
 * Buscar historico de atendimentos de um paciente especifico
 * Util para exibir no prontuario do paciente
 */
export const buscarHistoricoPaciente = async (
  cpf: string,
  mesesRetroativos: number = 12
): Promise<{
  consultas: ConsultaAgendamento[];
  protocolos: ProtocoloFilaVirtual[];
}> => {
  const dataFim = new Date().toISOString().split('T')[0];
  const dataInicio = new Date(Date.now() - mesesRetroativos * 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const cleanCPF = cpf.replace(/\D/g, '');

  try {
    const [consultas, protocolos] = await Promise.all([
      buscarRelatorioConsultas(dataInicio, dataFim),
      buscarProtocolosFilaVirtual(cleanCPF)
    ]);

    // Filtra consultas pelo CPF do paciente
    const consultasPaciente = consultas.filter(c =>
      c.patient_cpf?.replace(/\D/g, '') === cleanCPF
    );

    return {
      consultas: consultasPaciente,
      protocolos
    };
  } catch (error: any) {
    console.error("Erro ao buscar historico do paciente:", error);
    return { consultas: [], protocolos: [] };
  }
};

// ============================================================================
// FASE DE CONFIGURACAO DE PERMISSOES
// API Auth para gerenciar permissoes de acesso dos pacientes
// ============================================================================

/**
 * Define permissoes padrao baseadas no tipo de plano contratado
 */
const obterPermissoesPorPlano = (perfilPlano: PerfilPlano): PermissoesPaciente => {
  switch (perfilPlano) {
    case 'premium':
    case 'enterprise':
      return {
        allow_schedule: true,        // Permite agendamento eletivo
        allow_virtual_queue: true,   // Permite fila virtual
        allow_reports: true,         // Permite acesso a relatorios
        view_medical_record: true    // Permite visualizar prontuario
      };
    case 'standard':
      return {
        allow_schedule: true,        // Permite agendamento eletivo
        allow_virtual_queue: true,   // Permite fila virtual
        allow_reports: false,        // Bloqueia acesso a relatorios
        view_medical_record: true    // Permite visualizar prontuario
      };
    case 'basic':
    default:
      return {
        allow_schedule: false,       // Bloqueia agendamento eletivo
        allow_virtual_queue: true,   // Permite fila virtual (padrao)
        allow_reports: false,        // Bloqueia acesso a relatorios
        view_medical_record: true    // Permite visualizar prontuario
      };
  }
};

/**
 * Configura permissoes de um paciente na plataforma Doutor ao Vivo
 * Baseado no tipo de plano contratado no sistema Vivemus
 */
export const configurarPermissoesPaciente = async (
  personId: string,
  perfilPlano: PerfilPlano
): Promise<ResultadoPermissoes> => {
  const { apiKey } = await getConfig();

  if (!apiKey) {
    console.warn("DrAoVivo Auth: API key nao configurada.");
    return { success: false, error: "TOKEN_NAO_CONFIGURADO" };
  }

  try {
    // Define as permissoes baseadas no tipo de plano
    const permissoes = obterPermissoesPorPlano(perfilPlano);

    // Atualiza as permissoes na plataforma Doutor ao Vivo
    const response = await fetchWithTimeout(`${AUTH_URL}/person/${personId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(permissoes)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new DrAoVivoAPIError(
        response.status,
        errorData.message || `Erro HTTP ${response.status}`,
        errorData
      );
    }

    const resultado = await response.json();

    // Log da acao
    await trackApiAction({
      userId: 'system',
      userName: `Person ${personId}`,
      actionType: 'UPDATE_PERMISSIONS_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { personId, perfilPlano, permissoes },
      status: 'SUCCESS'
    });

    return {
      success: true,
      status: "Permissoes atualizadas com sucesso",
      configuracoes: resultado
    };
  } catch (error: any) {
    console.error("Erro ao configurar permissoes:", error);

    await trackApiAction({
      userId: 'system',
      userName: `Person ${personId}`,
      actionType: 'PERMISSIONS_ERROR_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { personId, perfilPlano, error: error.message },
      status: 'ERROR'
    });

    return { success: false, error: error.message };
  }
};

/**
 * Configura permissoes customizadas para um paciente
 * Permite controle granular de cada permissao
 */
export const configurarPermissoesCustomizadas = async (
  personId: string,
  permissoes: Partial<PermissoesPaciente>
): Promise<ResultadoPermissoes> => {
  const { apiKey } = await getConfig();

  if (!apiKey) {
    return { success: false, error: "TOKEN_NAO_CONFIGURADO" };
  }

  try {
    // Mescla com permissoes padrao (basic) para garantir todos os campos
    const permissoesCompletas: PermissoesPaciente = {
      ...obterPermissoesPorPlano('basic'),
      ...permissoes
    };

    const response = await fetchWithTimeout(`${AUTH_URL}/person/${personId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(permissoesCompletas)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new DrAoVivoAPIError(
        response.status,
        errorData.message || `Erro HTTP ${response.status}`,
        errorData
      );
    }

    const resultado = await response.json();

    await trackApiAction({
      userId: 'system',
      userName: `Person ${personId}`,
      actionType: 'UPDATE_CUSTOM_PERMISSIONS_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: { personId, permissoes: permissoesCompletas },
      status: 'SUCCESS'
    });

    return {
      success: true,
      status: "Permissoes customizadas atualizadas",
      configuracoes: resultado
    };
  } catch (error: any) {
    console.error("Erro ao configurar permissoes customizadas:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Busca permissoes atuais de um paciente
 */
export const buscarPermissoesPaciente = async (
  personId: string
): Promise<PermissoesPaciente | null> => {
  const { apiKey } = await getConfig();

  if (!apiKey) return null;

  try {
    const response = await fetchWithTimeout(`${AUTH_URL}/person/${personId}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) return null;

    return response.json();
  } catch (error) {
    console.error("Erro ao buscar permissoes:", error);
    return null;
  }
};

/**
 * Atualiza permissoes apos integracao inicial do paciente
 * Deve ser chamado apos integrarTelemedicina para configurar permissoes corretas
 */
export const sincronizarPermissoesAposIntegracao = async (
  personId: string,
  planId: string
): Promise<ResultadoPermissoes> => {
  // Determina o perfil do plano baseado no ID
  let perfilPlano: PerfilPlano = 'basic';

  const planIdLower = planId.toLowerCase();
  if (planIdLower.includes('premium') || planIdLower.includes('enterprise')) {
    perfilPlano = 'premium';
  } else if (planIdLower.includes('standard') || planIdLower.includes('corporativo')) {
    perfilPlano = 'standard';
  }

  return configurarPermissoesPaciente(personId, perfilPlano);
};

// ============================================================================
// FLUXO DE ESPECIALISTAS - VALIDAÇÃO DE GUIA DE ENCAMINHAMENTO
// Verifica se paciente tem permissão para agendar com especialistas
// ============================================================================

interface ResultadoGuiaEncaminhamento {
  mostrarGuia: boolean;
  regras?: string;
  acao?: string;
  mensagem?: string;
  especialidadesDisponiveis?: string[];
}

/**
 * Valida se o paciente possui guia de encaminhamento para especialistas
 * Verifica as permissões atuais do paciente na API Dr. ao Vivo
 *
 * Regra de Negócio:
 * - A guia aparece se o plano estiver ACTIVE e allow_schedule = true
 * - Caso contrário, paciente deve consultar clínico geral primeiro
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @returns Objeto com status da guia e próximos passos
 */
export const validarGuiaEncaminhamento = async (
  personId: string
): Promise<ResultadoGuiaEncaminhamento> => {
  const { apiKey } = await getConfig();

  // Modo simulado se API key não estiver configurada
  if (!apiKey) {
    console.warn("DrAoVivo Guia: API key não configurada. Retornando modo simulado.");
    return {
      mostrarGuia: true,
      regras: "Modo demonstração - Agendamento disponível após 7 dias",
      acao: "Abrir agenda de especialistas (simulado)"
    };
  }

  try {
    // 1. Verificar permissões atuais do paciente (API de Permissões)
    // Essencial para saber se o clínico liberou a função de agendamento eletivo
    const response = await fetchWithTimeout(`${AUTH_URL}/person/${personId}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new DrAoVivoAPIError(
        response.status,
        errorData.message || `Erro HTTP ${response.status}`,
        errorData
      );
    }

    const permissoes: PermissoesPaciente = await response.json();

    // 2. Lógica de Negócio: Exibir Guia no App
    // A guia aparece se o plano estiver ACTIVE e a permissão de agendamento estiver habilitada
    if (permissoes.allow_schedule) {
      // Log da validação bem-sucedida
      await trackApiAction({
        userId: personId,
        userName: `Person ${personId}`,
        actionType: 'VALIDATE_REFERRAL_GUIDE',
        provider: 'DrAoVivo',
        payload: { personId, allowSchedule: true },
        status: 'SUCCESS'
      });

      return {
        mostrarGuia: true,
        regras: "Agendamento disponível para após 7 dias",
        acao: "Abrir agenda de especialistas via PSO",
        especialidadesDisponiveis: [
          'Cardiologia',
          'Dermatologia',
          'Endocrinologia',
          'Ginecologia',
          'Neurologia',
          'Oftalmologia',
          'Ortopedia',
          'Otorrinolaringologia',
          'Pediatria',
          'Psiquiatria',
          'Urologia'
        ]
      };
    } else {
      return {
        mostrarGuia: false,
        mensagem: "Consulte um clínico geral para obter um encaminhamento."
      };
    }
  } catch (error: any) {
    console.error("Erro ao validar guia de encaminhamento:", error);

    await trackApiAction({
      userId: personId,
      userName: `Person ${personId}`,
      actionType: 'VALIDATE_REFERRAL_ERROR',
      provider: 'DrAoVivo',
      payload: { personId, error: error.message },
      status: 'ERROR'
    });

    // Em caso de erro, retorna negativo por segurança
    return {
      mostrarGuia: false,
      mensagem: "Não foi possível verificar suas permissões. Tente novamente."
    };
  }
};

/**
 * Abre agenda de especialistas via PSO após validação da guia
 * Deve ser chamado apenas após validarGuiaEncaminhamento retornar mostrarGuia: true
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @param especialidade - Especialidade médica desejada (opcional)
 * @returns URL do PSO para acesso à agenda de especialistas
 */
export const abrirAgendaEspecialistas = async (
  personId: string,
  especialidade?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const { apiKey } = await getConfig();

  if (!apiKey) {
    return {
      success: true,
      url: `${PORTAL_URL}/schedule/?especialidade=${especialidade || 'geral'}`
    };
  }

  try {
    // Primeiro valida se tem permissão
    const validacao = await validarGuiaEncaminhamento(personId);

    if (!validacao.mostrarGuia) {
      return {
        success: false,
        error: validacao.mensagem || "Sem permissão para agendar com especialistas"
      };
    }

    // Gera PSO para acesso à agenda
    const psoUrl = await gerarPSO(personId);

    // Adiciona parâmetro de especialidade se fornecido
    const separator = psoUrl.includes('?') ? '&' : '?';
    const urlFinal = especialidade
      ? `${psoUrl}${separator}redirect=agenda&especialidade=${encodeURIComponent(especialidade)}`
      : `${psoUrl}${separator}redirect=agenda`;

    await trackApiAction({
      userId: personId,
      userName: `Person ${personId}`,
      actionType: 'OPEN_SPECIALIST_AGENDA',
      provider: 'DrAoVivo',
      payload: { personId, especialidade },
      status: 'SUCCESS'
    });

    return { success: true, url: urlFinal };
  } catch (error: any) {
    console.error("Erro ao abrir agenda de especialistas:", error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// TRATAMENTO CENTRALIZADO DE ERROS DA API
// Padroniza log e resposta de erros em todos os módulos
// ============================================================================

/**
 * Tratamento centralizado de erros da API Dr. ao Vivo
 * Registra log de auditoria com diagnostico por codigo HTTP
 *
 * Codigos tratados:
 * - 400: Bad Request (timezone/data invalidos) → dados de validacao no log
 * - 403: Forbidden (plan_status BLOCKED / x-api-key) → causa provavel no log
 * - 404: Not Found (person_id inexistente) → sugere fluxo de cadastro
 * - 409: Conflict (CPF duplicado em outra TAG) → sugere PUT no log
 *
 * @param modulo - Nome do módulo que gerou o erro (ex: "Documentos", "Carencia")
 * @param error - Objeto de erro capturado
 * @param contexto - Dados adicionais para o log (personId, protocolId, etc)
 */
const tratarErroAPI = async (
  modulo: string,
  error: any,
  contexto: Record<string, any> = {}
): Promise<void> => {
  const mensagem = error?.message || 'Erro desconhecido';
  const statusCode = error instanceof DrAoVivoAPIError ? error.statusCode : null;

  // Diagnostico por codigo HTTP
  let diagnostico = '';
  switch (statusCode) {
    case 400:
      diagnostico = 'Bad Request: possivel timezone ausente/invalido ou formato de data incorreto.';
      break;
    case 403:
      diagnostico = 'Forbidden: plan_status BLOCKED ou x-api-key invalida. Verificar status financeiro.';
      break;
    case 404:
      diagnostico = 'Not Found: person_id inexistente. Executar POST /person antes de gerar PSO.';
      break;
    case 409:
      diagnostico = 'Conflict: CPF ja cadastrado em outra TAG. Usar PUT em vez de POST.';
      break;
    default:
      diagnostico = statusCode ? `HTTP ${statusCode}` : 'Erro nao-HTTP (rede/timeout/parse).';
  }

  console.error(`[DrAoVivo/${modulo}] ${mensagem} | Diagnostico: ${diagnostico}`, contexto);

  await trackApiAction({
    userId: contexto.personId || contexto.userId || 'system',
    userName: contexto.userName || `DrAoVivo ${modulo}`,
    actionType: `${modulo.toUpperCase().replace(/\s/g, '_')}_ERROR`,
    provider: 'DrAoVivo',
    payload: {
      ...contexto,
      error: mensagem,
      statusCode,
      diagnostico
    },
    status: 'ERROR'
  });
};

// ============================================================================
// WEBHOOKS - REATIVIDADE A EVENTOS DA PLATAFORMA
// Escuta eventos da plataforma para atualizar o App em tempo real
// ============================================================================

type WebhookEventType =
  | 'PERSON_CREATED'
  | 'CONSULTATION_FINISHED'
  | 'PATIENT_ENTERED_QUEUE'
  | 'PATIENT_LEFT_QUEUE'
  | 'PRESCRIPTION_CREATED'
  | 'CERTIFICATE_CREATED';

interface WebhookPayload {
  event_type: WebhookEventType;
  person_id: string;
  protocol_id?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface DocumentoMedico {
  id: string;           // ID do documento na plataforma
  tipo: string;         // Prescricao, Atestado, Encaminhamento, Exame
  url_download: string; // Link direto para o PDF
  data: string;         // Data de emissao (created_at)
  protocol_id?: string;
}

interface ResultadoCarencia {
  liberado: boolean;
  diasRestantes?: number;
  motivo?: string;
  protocoloReferencia?: string;
  guiaAtiva?: boolean; // Indica se o médico liberou allow_schedule na API Auth
}

/**
 * Gerenciador de Webhooks - Processa eventos recebidos da plataforma Dr. ao Vivo
 * Escuta eventos como Paciente Criado, Consulta Finalizada, Entrada na Fila Virtual, etc.
 *
 * Eventos tratados:
 * - PERSON_CREATED: Configura permissoes padrao baseadas no plano
 * - CONSULTATION_FINISHED: Busca historico + captura documentos (receitas, atestados)
 * - PATIENT_ENTERED_QUEUE / PATIENT_LEFT_QUEUE: Log de movimentacao na fila
 * - PRESCRIPTION_CREATED / CERTIFICATE_CREATED: Captura documento especifico
 *
 * @param payload - Dados do evento enviado pela plataforma
 * @returns Documentos gerados (em caso de consulta/documento) ou void
 */
export const processarWebhookDoutorAoVivo = async (
  payload: WebhookPayload
): Promise<DocumentoMedico[] | void> => {
  const { event_type, person_id, protocol_id } = payload;

  // Log do evento recebido
  await trackApiAction({
    userId: 'system',
    userName: 'Webhook DrAoVivo',
    actionType: `WEBHOOK_${event_type}`,
    provider: 'DrAoVivo',
    payload: { person_id, protocol_id, event_type, timestamp: payload.timestamp },
    status: 'SUCCESS'
  });

  try {
    switch (event_type) {
      case 'PERSON_CREATED':
        // Configura permissoes padrao baseadas no plano do paciente
        // metadata.plan_id pode conter o ID do plano para determinar o perfil
        await sincronizarPermissoesAposIntegracao(
          person_id,
          payload.metadata?.plan_id || 'standard'
        );
        break;

      case 'CONSULTATION_FINISHED': {
        // 1. Atualiza historico do paciente na base local (API Report + Protocol)
        await buscarHistoricoPaciente(person_id);
        // 2. Captura documentos gerados na consulta (receitas, atestados, exames)
        if (protocol_id) {
          const documentos = await baixarDocumentosConsulta(protocol_id);
          // 3. Persiste documentos no banco local e notifica o paciente
          if (documentos.length > 0) {
            await salvarDocumentosNoBancoLocal(person_id, documentos);
            await enviarNotificacaoPush(person_id, 'Novos documentos medicos disponiveis!');
          }
          return documentos;
        }
        break;
      }

      case 'PATIENT_ENTERED_QUEUE':
        console.log(`[Webhook] Paciente ${person_id} em Fila Virtual.`);
        break;

      case 'PATIENT_LEFT_QUEUE':
        console.log(`[Webhook] Paciente ${person_id} saiu da Fila Virtual.`);
        break;

      case 'PRESCRIPTION_CREATED':
      case 'CERTIFICATE_CREATED': {
        // Busca o documento recém-criado (Receita ou Atestado)
        if (protocol_id) {
          const docs = await baixarDocumentosConsulta(protocol_id);
          if (docs.length > 0) {
            await salvarDocumentosNoBancoLocal(person_id, docs);
            const tipo = event_type === 'PRESCRIPTION_CREATED' ? 'Receita' : 'Atestado';
            await enviarNotificacaoPush(person_id, `Novo documento disponivel: ${tipo}`);
          }
          return docs;
        }
        break;
      }

      default:
        console.warn(`[Webhook] Evento desconhecido: ${event_type}`);
    }
  } catch (error: any) {
    await tratarErroAPI('Webhook', error, { person_id, event_type, protocol_id });
  }
};

// ============================================================================
// CAPTURA DE DOCUMENTOS MÉDICOS (RECEITAS / ATESTADOS / EXAMES)
// Busca PDFs gerados pelo médico via API de Protocolos
// ============================================================================

/**
 * Busca documentos médicos gerados em um atendimento (receitas, atestados, exames)
 * Acessa a base de protocolos para recuperar registros clínicos (API Protocol)
 *
 * @param protocolId - ID do protocolo de atendimento
 * @returns Lista de documentos com tipo, URL de download e data
 */
export const baixarDocumentosConsulta = async (
  protocolId: string
): Promise<DocumentoMedico[]> => {
  try {
    // Acessa a API de Protocolos para recuperar os PDFs associados ao atendimento
    // Endpoint /api-help/ conforme documentacao tecnica da Dr. ao Vivo
    const response = await consultarAPI<{ documents: Array<{
      id: string;
      type: string;       // Ex: Prescricao, Atestado, Encaminhamento
      pdf_url: string;
      created_at: string;
      [key: string]: any;
    }> }>(`${PROTOCOL_URL}/${protocolId}/api-help/`, 'GET');

    const documentos = response.documents || [];

    const resultado: DocumentoMedico[] = documentos.map(doc => ({
      id: doc.id,
      tipo: doc.type,
      url_download: doc.pdf_url,
      data: doc.created_at,
      protocol_id: protocolId
    }));

    // Log da captura de documentos
    await trackApiAction({
      userId: 'system',
      userName: 'Captura Documentos',
      actionType: 'DOWNLOAD_CONSULTATION_DOCS',
      provider: 'DrAoVivo',
      payload: { protocolId, totalDocumentos: resultado.length, tipos: resultado.map(r => r.tipo) },
      status: 'SUCCESS'
    });

    return resultado;
  } catch (error: any) {
    await tratarErroAPI('Documentos', error, { protocolId });
    return [];
  }
};

/**
 * Mapeia tipo de documento da API DAV para o CHECK constraint do banco local
 */
const mapTipoDocumentoLocal = (tipo: string): string => {
  const map: Record<string, string> = {
    Prescricao: 'Receita',
    Receita: 'Receita',
    Atestado: 'Atestado',
    Encaminhamento: 'Encaminhamento',
    Exame: 'Exame',
  };
  return map[tipo] || 'Outro';
};

/**
 * Persiste documentos medicos no banco local (Supabase)
 * Salva referencia dos PDFs para acesso offline no App do paciente
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @param documentos - Lista de documentos capturados via API Protocol
 */
export const salvarDocumentosNoBancoLocal = async (
  personId: string,
  documentos: DocumentoMedico[]
): Promise<void> => {
  if (!documentos || documentos.length === 0) return;

  try {
    // Buscar paciente_id (UUID interno) a partir do person_id (ID da DAV)
    const { data: paciente } = await supabase
      .from('telemedicina_pacientes')
      .select('id')
      .eq('person_id', personId)
      .single();

    if (!paciente) {
      console.error(`[DrAoVivo/Documentos] Paciente person_id=${personId} nao encontrado localmente.`);
      return;
    }

    // Resolver atendimento_id via protocol_id quando possivel
    const registros = await Promise.all(documentos.map(async (doc) => {
      let atendimentoId: string | null = null;
      if (doc.protocol_id) {
        const { data: historico } = await supabase
          .from('telemedicina_historico')
          .select('id')
          .eq('protocol_id', doc.protocol_id)
          .single();
        atendimentoId = historico?.id || null;
      }

      return {
        document_id: doc.id,
        paciente_id: paciente.id,
        atendimento_id: atendimentoId,
        tipo_doc: mapTipoDocumentoLocal(doc.tipo),
        url_pdf: doc.url_download,
        data_emissao: doc.data,
        protocol_id: doc.protocol_id,
        created_at: new Date().toISOString()
      };
    }));

    const { error } = await supabase
      .from('telemedicina_documentos')
      .upsert(registros, { onConflict: 'document_id' });

    if (error) {
      console.error('[DrAoVivo/Documentos] Erro ao salvar no banco local:', error.message);
    }

    await trackApiAction({
      userId: personId,
      userName: `Person ${personId}`,
      actionType: 'SAVE_DOCUMENTS_LOCAL',
      provider: 'DrAoVivo',
      payload: { personId, totalDocumentos: documentos.length, tipos: documentos.map(d => d.tipo) },
      status: error ? 'ERROR' : 'SUCCESS'
    });
  } catch (error: any) {
    await tratarErroAPI('SalvarDocumentos', error, { personId });
  }
};

/**
 * Envia notificacao push ao paciente sobre novos documentos
 * Resolve o user_id do Supabase Auth a partir do person_id da DAV
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @param mensagem - Texto da notificacao
 */
export const enviarNotificacaoPush = async (
  personId: string,
  mensagem: string
): Promise<void> => {
  try {
    // Resolver user_id (Supabase Auth) a partir do person_id (DAV)
    const { data: paciente } = await supabase
      .from('telemedicina_pacientes')
      .select('user_id')
      .eq('person_id', personId)
      .single();

    const userId = paciente?.user_id || personId;

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Documentos Medicos',
      message: mensagem,
      type: 'MEDICAL_DOCUMENT',
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.warn(`[DrAoVivo/Push] Erro ao enviar notificacao: ${error.message}`);
  }
};

// ============================================================================
// VALIDAÇÃO DE CARÊNCIA PARA ESPECIALISTAS
// Regra: Agendamento somente 7 dias após Clínico + permissão allow_schedule
// ============================================================================

/**
 * Valida se o paciente cumpriu o período de carência para agendar com especialista
 *
 * Lógica de Dupla Verificação:
 * 1. Temporal: Mínimo de 7 dias após última consulta com Clínico Geral (API Protocol)
 * 2. Permissão: O médico deve ter liberado allow_schedule na API Auth
 *
 * Ambas as condições devem ser verdadeiras para liberar o agendamento.
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @returns Objeto com status da liberação, dias restantes e status da guia
 */
export const validarCarenciaEspecialista = async (
  personId: string
): Promise<ResultadoCarencia> => {
  try {
    // 1. Busca os últimos protocolos do paciente na Fila Virtual (Clínico)
    const protocolos = await buscarProtocolosFilaVirtual(personId);

    if (!protocolos || protocolos.length === 0) {
      return {
        liberado: false,
        guiaAtiva: false,
        motivo: "Necessario passar pelo Clinico Geral primeiro."
      };
    }

    // 2. Calcula diferença em dias desde a última consulta
    const dataUltimaConsulta = new Date(protocolos[0].created_at);
    const hoje = new Date();
    const diffMs = hoje.getTime() - dataUltimaConsulta.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const CARENCIA_DIAS = 7;

    // 3. Verifica se a permissão allow_schedule foi liberada pelo médico (API Auth)
    const permissoes = await buscarPermissoesPaciente(personId);
    const guiaAtiva = permissoes?.allow_schedule || false;

    // A liberação requer AMBAS as condições:
    // - Carência temporal de 7 dias cumprida
    // - Permissão allow_schedule ativa na API Auth
    const carenciaCumprida = diffDias >= CARENCIA_DIAS;
    const liberado = carenciaCumprida && guiaAtiva;

    if (liberado) {
      // Log de carência cumprida + permissão ativa
      await trackApiAction({
        userId: personId,
        userName: `Person ${personId}`,
        actionType: 'VALIDATE_SPECIALIST_WAITING_PERIOD',
        provider: 'DrAoVivo',
        payload: { personId, diffDias, guiaAtiva, liberado: true },
        status: 'SUCCESS'
      });

      return {
        liberado: true,
        diasRestantes: 0,
        guiaAtiva: true,
        protocoloReferencia: protocolos[0].id
      };
    }

    // Monta mensagem de motivo específica
    let motivo = '';
    if (!carenciaCumprida && !guiaAtiva) {
      motivo = `Carencia de ${CARENCIA_DIAS - diffDias} dia(s) restante(s) e guia de encaminhamento pendente.`;
    } else if (!carenciaCumprida) {
      const dataLiberacao = new Date(dataUltimaConsulta.getTime() + CARENCIA_DIAS * 86400000);
      motivo = `Carencia de ${CARENCIA_DIAS - diffDias} dia(s) restante(s). Disponivel a partir de ${dataLiberacao.toLocaleDateString('pt-BR')}.`;
    } else {
      motivo = "Guia de encaminhamento pendente. O medico precisa liberar o agendamento eletivo.";
    }

    return {
      liberado: false,
      diasRestantes: carenciaCumprida ? 0 : CARENCIA_DIAS - diffDias,
      guiaAtiva,
      motivo,
      protocoloReferencia: protocolos[0].id
    };
  } catch (error: any) {
    await tratarErroAPI('Carencia', error, { personId });

    return {
      liberado: false,
      guiaAtiva: false,
      motivo: "Nao foi possivel verificar a carencia. Tente novamente."
    };
  }
};

// ============================================================================
// GATILHO AUTOMATICO DE SINCRONIZACAO (EVENT-DRIVEN)
// Executado apos criacao/atualizacao de usuario no sistema local
// Orquestra: Cadastro → Permissoes → Log
// ============================================================================

interface DadosSincronizacao {
  name: string;
  cpf: string;
  email: string;
  cell_phone: string;
  birth_date?: string;
  plan_id?: string;
  plan_type?: PerfilPlano;
  isActive: boolean;
  timezone?: string;
  temporaryPassword?: string;
  userId?: string;
}

interface ResultadoSincronizacao {
  success: boolean;
  personId?: string;
  permissoesConfiguradas?: boolean;
  error?: string;
  recovery?: string; // Descreve recovery automatico aplicado (409→PUT, 404→POST, etc)
}

/**
 * Gatilho automatico de sincronizacao com Dr. ao Vivo
 * Deve ser chamado apos criacao ou atualizacao de usuario no sistema local
 *
 * Fluxo:
 * 1. Monta payload conforme documentacao da API Person
 * 2. Executa integracao completa (Busca → Cadastro/Atualiza → PSO)
 * 3. Configura permissoes baseadas no tipo de plano
 *
 * Tratamento de Erros (via cadastrarOuAtualizarPaciente e gerarPSO):
 * - 400: Pre-validacao de timezone IANA e formato de data
 * - 403: Validacao local de plan_status antes da chamada
 * - 409: Auto-recovery com PUT quando CPF ja cadastrado em outra TAG
 * - 404: Auto-recovery cadastrando pessoa antes de gerar PSO
 *
 * @param userData - Dados do usuario do sistema local
 * @returns Resultado da sincronizacao com status e eventuais recoveries
 */
export const onUserCreatedOrUpdated = async (
  userData: DadosSincronizacao
): Promise<ResultadoSincronizacao> => {
  try {
    // 1. Executa integracao completa via fluxo de 3 fases
    // (internamente aplica recovery 409/404 e pre-validacao 400/403)
    const resultado = await integrarTelemedicina({
      nome: userData.name,
      cpf: userData.cpf,
      email: userData.email,
      celular: userData.cell_phone,
      id_plano: userData.plan_id || 'plano_premium',
      pagamentoAtivo: userData.isActive,
      dataNascimento: userData.birth_date,
      senha: userData.temporaryPassword,
      timezone: userData.timezone || 'America/Cuiaba',
      userId: userData.userId
    });

    if (!resultado.success && !resultado.simulated) {
      return {
        success: false,
        personId: resultado.personId,
        error: resultado.error
      };
    }

    // 2. Configura permissoes baseadas no tipo de plano
    let permissoesConfiguradas = false;
    if (resultado.personId) {
      try {
        const perfilPlano = userData.plan_type || 'basic';
        const permResult = await configurarPermissoesPaciente(resultado.personId, perfilPlano);
        permissoesConfiguradas = permResult.success;
      } catch (permError: any) {
        // Nao bloqueia a sincronizacao se permissoes falharem
        console.warn(`[DrAoVivo/Sync] Permissoes nao configuradas: ${permError.message}`);
      }
    }

    // 3. Log da sincronizacao completa
    await trackApiAction({
      userId: userData.userId || 'system',
      userName: userData.name,
      actionType: 'SYNC_USER_DRAOVIVO',
      provider: 'DrAoVivo',
      payload: {
        cpf: userData.cpf,
        personId: resultado.personId,
        planStatus: userData.isActive ? 'ACTIVE' : 'BLOCKED',
        permissoesConfiguradas,
        simulated: resultado.simulated || false
      },
      status: 'SUCCESS'
    });

    return {
      success: true,
      personId: resultado.personId,
      permissoesConfiguradas
    };
  } catch (error: any) {
    // Diagnostico detalhado via tratarErroAPI
    await tratarErroAPI('Sync', error, {
      cpf: userData.cpf,
      userName: userData.name,
      userId: userData.userId
    });

    // Monta mensagem de recovery se aplicavel
    let recovery: string | undefined;
    if (error instanceof DrAoVivoAPIError) {
      switch (error.statusCode) {
        case 409:
          recovery = 'Tentativa de PUT apos 409 falhou. Verificar CPF manualmente.';
          break;
        case 403:
          recovery = 'Verificar status financeiro e validade da x-api-key.';
          break;
        case 400:
          recovery = 'Corrigir timezone (IANA) ou formato de data (YYYY-MM-DD).';
          break;
        case 404:
          recovery = 'Cadastro automatico falhou. Verificar dados do paciente.';
          break;
      }
    }

    return {
      success: false,
      error: error.message,
      recovery
    };
  }
};

// ============================================================================
// AUDITORIA POS-NAVEGACAO (EMBEDDED BROWSER)
// Funcoes para capturar e processar dados apos sessao de telemedicina
// ============================================================================

export interface SessionAuditData {
  personId: string;
  userId?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  url: string;
  documentsGenerated: number;
  navigationEvents: number;
}

export interface AuditResult {
  success: boolean;
  documentos: DocumentoMedico[];
  historicoAtualizado: boolean;
  error?: string;
}

/**
 * Executa auditoria completa apos o fechamento do navegador integrado
 *
 * Fluxo:
 * 1. Registra metricas da sessao (duracao, eventos)
 * 2. Busca documentos gerados durante o atendimento (API Protocol)
 * 3. Persiste documentos no banco local
 * 4. Atualiza historico do paciente
 * 5. Dispara notificacao se houver documentos novos
 *
 * @param sessionData - Dados coletados durante a sessao do navegador
 * @returns Resultado da auditoria com documentos capturados
 */
export const executarAuditoriaPosNavegacao = async (
  sessionData: SessionAuditData
): Promise<AuditResult> => {
  const { personId, userId, startTime, endTime, durationSeconds, url, documentsGenerated, navigationEvents } = sessionData;

  try {
    // 1. Registra metricas da sessao
    await trackApiAction({
      userId: userId || personId,
      userName: `Person ${personId}`,
      actionType: 'AUDIT_SESSION_COMPLETE',
      provider: 'DrAoVivo',
      payload: {
        personId,
        startTime,
        endTime,
        durationSeconds,
        url,
        documentsGenerated,
        navigationEvents
      },
      status: 'SUCCESS'
    });

    // 2. Busca documentos gerados (receitas, atestados, exames)
    // Usa a API de Protocolos para recuperar PDFs
    const documentos = await buscarDocumentosRecentes(personId);

    // 3. Persiste documentos no banco local
    if (documentos.length > 0) {
      await salvarDocumentosNoBancoLocal(personId, documentos);

      // 4. Dispara notificacao push
      await enviarNotificacaoPush(
        personId,
        `${documentos.length} documento(s) disponivel(is) para download!`
      );
    }

    // 5. Atualiza historico do paciente
    let historicoAtualizado = false;
    try {
      await buscarHistoricoPaciente(personId, 1);
      historicoAtualizado = true;
    } catch (err) {
      console.warn('[Auditoria] Erro ao atualizar historico:', err);
    }

    return {
      success: true,
      documentos,
      historicoAtualizado
    };
  } catch (error: any) {
    await tratarErroAPI('AuditoriaPosNavegacao', error, { personId, sessionData });

    return {
      success: false,
      documentos: [],
      historicoAtualizado: false,
      error: error.message
    };
  }
};

/**
 * Busca documentos medicos gerados recentemente para um paciente
 * Filtra por documentos criados nas ultimas 24 horas
 *
 * @param personId - ID do paciente na base Dr. ao Vivo
 * @returns Lista de documentos recentes
 */
export const buscarDocumentosRecentes = async (
  personId: string
): Promise<DocumentoMedico[]> => {
  try {
    // Busca protocolos recentes do paciente
    const protocolos = await buscarProtocolosFilaVirtual(personId);

    if (!protocolos || protocolos.length === 0) {
      return [];
    }

    // Filtra protocolos das ultimas 24 horas
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const protocolosRecentes = protocolos.filter(p => {
      const dataProtocolo = new Date(p.created_at);
      return dataProtocolo >= ontem;
    });

    // Busca documentos de cada protocolo recente
    const todosDocumentos: DocumentoMedico[] = [];
    for (const protocolo of protocolosRecentes) {
      const docs = await baixarDocumentosConsulta(protocolo.id);
      todosDocumentos.push(...docs);
    }

    // Remove duplicados por ID
    const documentosUnicos = todosDocumentos.reduce((acc, doc) => {
      if (!acc.find(d => d.id === doc.id)) {
        acc.push(doc);
      }
      return acc;
    }, [] as DocumentoMedico[]);

    return documentosUnicos;
  } catch (error: any) {
    console.error('[DrAoVivo] Erro ao buscar documentos recentes:', error);
    return [];
  }
};

// ============================================================================
// ACESSO DIRETO VIA PSO (Edge Function pso-proxy)
// Fluxo seguro: Frontend → Edge Function → API DAV
// API Key fica apenas no servidor (Supabase Secrets)
// ============================================================================

/**
 * Obtém link PSO via Edge Function pso-proxy (acesso direto sem login manual)
 *
 * Fluxo:
 * 1. Envia JWT do usuario autenticado para Edge Function pso-proxy
 * 2. Edge Function valida auth, verifica plan_status, cadastra na DAV se necessario
 * 3. Gera PSO via POST /credential/pso/person/{person_id}
 * 4. Retorna URL https://vivemus.dav.med.br/pso/{id_pso}/emergency
 *
 * @returns IntegrationResult com url do PSO ou erro
 */
// Lock de deduplicacao: evita chamadas paralelas ao pso-proxy (race condition na DAV)
let _psoInflight: Promise<IntegrationResult> | null = null;

export const obterLinkPSO = async (): Promise<IntegrationResult> => {
  // Se ja existe uma chamada em andamento, reutilizar a mesma promise
  if (_psoInflight) return _psoInflight;

  _psoInflight = _obterLinkPSOImpl();
  try {
    return await _psoInflight;
  } finally {
    _psoInflight = null;
  }
};

const _obterLinkPSOImpl = async (): Promise<IntegrationResult> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      await trackApiAction({
        userId: 'ANON', userName: 'ANON',
        actionType: 'PSO_FRONTEND_ERROR', provider: 'DrAoVivo',
        payload: { step: 'GET_SESSION', error: 'Sem access_token na sessao' },
        status: 'ERROR'
      });
      return { success: false, error: "Usuario nao autenticado. Faca login novamente." };
    }

    const userId = session.user.id;
    const userEmail = session.user.email || 'Paciente';

    await trackApiAction({
      userId, userName: userEmail,
      actionType: 'PSO_INVOKE_START', provider: 'DrAoVivo',
      payload: { step: 'INVOKE_START', token_length: session.access_token.length },
      status: 'SUCCESS'
    });

    const { data, error } = await supabase.functions.invoke('pso-proxy', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    // Log completo da resposta para diagnostico
    await trackApiAction({
      userId, userName: userEmail,
      actionType: 'PSO_INVOKE_RESPONSE', provider: 'DrAoVivo',
      payload: {
        step: 'INVOKE_RESPONSE',
        has_data: !!data,
        data_keys: data ? Object.keys(data) : null,
        data_success: data?.success,
        data_code: data?.code,
        data_step: data?.step,
        data_error: data?.error,
        has_sdk_error: !!error,
        sdk_error_name: error?.name,
        sdk_error_message: error?.message,
        sdk_error_context: error?.context,
      },
      status: error ? 'ERROR' : (data?.success ? 'SUCCESS' : 'ERROR')
    });

    // Sucesso: URL PSO gerada
    if (!error && data?.success && data?.url) {
      return { success: true, url: data.url, personId: data.personId };
    }

    // Erro do SDK (non-2xx) - a Edge Function nao foi alcancada ou crashou
    if (error) {
      const errorMsg = error.message || 'Erro ao gerar acesso';
      await trackApiAction({
        userId, userName: userEmail,
        actionType: 'PSO_SDK_ERROR', provider: 'DrAoVivo',
        payload: {
          step: 'SDK_ERROR',
          sdk_error_message: errorMsg,
          sdk_error_name: error.name,
          sdk_error_full: JSON.stringify(error, Object.getOwnPropertyNames(error)).substring(0, 500),
        },
        status: 'ERROR'
      });

      if (errorMsg.includes('bloqueado') || errorMsg.includes('Plano')) {
        return { success: false, error: "Plano inativo. Redirecionar para tela de pagamento." };
      }
      return { success: false, error: errorMsg };
    }

    // Resposta HTTP 200 mas com erro no body (Edge Function respondeu com success:false)
    if (data?.error) {
      if (data.error.includes('bloqueado') || data.error.includes('Plano')) {
        return { success: false, error: "Plano inativo. Redirecionar para tela de pagamento." };
      }
      return { success: false, error: data.error };
    }

    return { success: false, error: "Resposta inesperada do servidor." };
  } catch (error: any) {
    console.error("[PSO] Erro ao obter link via Edge Function:", error);

    // Tentar logar o catch tambem
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await trackApiAction({
        userId: session?.user?.id || 'UNKNOWN',
        userName: session?.user?.email || 'UNKNOWN',
        actionType: 'PSO_CATCH_ERROR', provider: 'DrAoVivo',
        payload: {
          step: 'CATCH',
          error_name: error.name,
          error_message: error.message,
          error_stack: error.stack?.substring(0, 300),
        },
        status: 'ERROR'
      });
    } catch {}

    if (error.name === 'AbortError') {
      return { success: false, error: 'Tempo de conexao esgotado. Verifique sua rede e tente novamente.' };
    }

    return { success: false, error: error.message || 'Erro de conexao com o servidor.' };
  }
};  // fim _obterLinkPSOImpl

/**
 * Gera relatorio de sessao para auditoria interna
 * Consolida dados da sessao em formato estruturado
 *
 * @param sessionData - Dados da sessao
 * @param documentos - Documentos capturados
 * @returns Objeto de relatorio formatado
 */
export const gerarRelatorioSessao = (
  sessionData: SessionAuditData,
  documentos: DocumentoMedico[]
): Record<string, any> => {
  const duracaoMinutos = Math.floor(sessionData.durationSeconds / 60);
  const duracaoSegundos = sessionData.durationSeconds % 60;

  return {
    id: `session_${sessionData.personId}_${Date.now()}`,
    paciente: {
      personId: sessionData.personId,
      userId: sessionData.userId
    },
    sessao: {
      inicio: sessionData.startTime,
      fim: sessionData.endTime,
      duracao: `${duracaoMinutos}m ${duracaoSegundos}s`,
      duracaoSegundos: sessionData.durationSeconds,
      eventosNavegacao: sessionData.navigationEvents,
      urlAcessada: sessionData.url
    },
    documentos: {
      total: documentos.length,
      tipos: documentos.map(d => d.tipo),
      lista: documentos.map(d => ({
        id: d.id,
        tipo: d.tipo,
        data: d.data,
        protocolId: d.protocol_id
      }))
    },
    geradoEm: new Date().toISOString()
  };
};

