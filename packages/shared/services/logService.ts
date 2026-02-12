
import { supabase } from "../lib/supabase";

// ============================================================================
// Schema real da tabela api_logs (Supabase):
//   id            UUID        PK, default gen_random_uuid()
//   user_id       UUID        nullable
//   user_name     TEXT        nullable
//   action_type   TEXT        NOT NULL
//   provider      TEXT        NOT NULL (recurso/provedor)
//   description   TEXT        nullable
//   resource      TEXT        nullable
//   payload       JSONB       nullable
//   response_status TEXT      nullable (SUCCESS | ERROR | ALERT)
//   created_at    TIMESTAMPTZ default now()
// ============================================================================

export interface AuditLog {
  id?: string;
  user_id: string;
  user_name: string;
  action_type: string;
  resource: string;
  description: string;
  payload?: any;
  status: 'SUCCESS' | 'ERROR' | 'ALERT';
  created_at?: string;
}

export interface LogFilters {
  search?: string;
  action_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

/**
 * Grava um log de auditoria na tabela api_logs.
 * provider (NOT NULL) recebe o valor de resource.
 */
export const trackAction = async (log: AuditLog) => {
  try {
    const { error } = await supabase.from('api_logs').insert({
      user_id: log.user_id,
      user_name: log.user_name,
      action_type: log.action_type,
      provider: log.resource || 'System',
      resource: log.resource || 'System',
      description: log.description,
      payload: log.payload ?? null,
      response_status: log.status,
    });

    if (error) console.error("[LogService] Erro ao gravar log:", error.message);
  } catch (err: any) {
    console.error("[LogService] Falha critica:", err.message);
  }
};

/**
 * Alias para compatibilidade com trackApiAction({ userId, userName, actionType, provider, payload, status })
 */
export const trackApiAction = async (data: any) => {
  return trackAction({
    user_id: data.userId || data.user_id || '00000000-0000-0000-0000-000000000000',
    user_name: data.userName || data.user_name || 'System',
    action_type: data.actionType || data.action_type || 'API_CALL',
    resource: data.provider || data.resource || 'System',
    description: data.description || `${data.actionType || data.action_type || 'API_CALL'}`,
    payload: data.payload,
    status: data.status || 'ALERT',
  });
};

/**
 * Busca logs paginados com filtros.
 * Busca textual em: description, user_name, action_type, provider.
 */
export const fetchLogs = async (filters: LogFilters = {}) => {
  const { search, action_type, status, date_from, date_to, page = 1, per_page = 50 } = filters;

  let query = supabase
    .from('api_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action_type) query = query.eq('action_type', action_type);
  if (status) query = query.eq('response_status', status);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to + 'T23:59:59.999Z');
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,user_name.ilike.%${search}%,action_type.ilike.%${search}%,provider.ilike.%${search}%`
    );
  }

  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[LogService] fetchLogs error:", error.message);
    return { data: [], total: 0 };
  }

  return { data: data || [], total: count || 0 };
};

/**
 * Busca estatisticas agregadas (total, erros, hoje).
 */
export const fetchLogStats = async () => {
  const today = new Date().toISOString().split('T')[0];

  const [totalResult, errorsResult, todayResult] = await Promise.all([
    supabase.from('api_logs').select('*', { count: 'exact', head: true }),
    supabase.from('api_logs').select('*', { count: 'exact', head: true }).eq('response_status', 'ERROR'),
    supabase.from('api_logs').select('*', { count: 'exact', head: true }).gte('created_at', today),
  ]);

  return {
    total: totalResult.count ?? 0,
    errors: errorsResult.count ?? 0,
    today: todayResult.count ?? 0,
  };
};
