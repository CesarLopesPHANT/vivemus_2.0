import { supabase } from '../lib/supabase';

export interface ConsentTerm {
  id: string;
  term_type: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  is_required: boolean;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  term_version: string;
  accepted: boolean;
  accepted_at: string;
  revoked_at: string | null;
}

// Tipo do TCLE obrigatorio (gatekeeper)
const TCLE_TERM_TYPE = 'tcle_vivemus';

/**
 * Busca termos ativos por tipo
 */
export const getActiveTerms = async (termTypes?: string[]): Promise<ConsentTerm[]> => {
  let query = supabase
    .from('lgpd_consent_terms')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (termTypes && termTypes.length > 0) {
    query = query.in('term_type', termTypes);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar termos LGPD:', error);
    return [];
  }
  return data || [];
};

/**
 * Busca consentimentos aceitos pelo usuario
 */
export const getUserConsents = async (userId: string): Promise<ConsentRecord[]> => {
  const { data, error } = await supabase
    .from('lgpd_consent_records')
    .select('*')
    .eq('user_id', userId)
    .eq('accepted', true)
    .is('revoked_at', null);

  if (error) {
    console.error('Erro ao buscar consentimentos:', error);
    return [];
  }
  return data || [];
};

/**
 * Verifica se o usuario aceitou todos os termos obrigatorios
 */
export const checkRequiredConsents = async (
  userId: string,
  requiredTypes: string[] = [TCLE_TERM_TYPE]
): Promise<{ allAccepted: boolean; pendingTypes: string[] }> => {
  const [terms, consents] = await Promise.all([
    getActiveTerms(requiredTypes),
    getUserConsents(userId),
  ]);

  const acceptedTermIds = new Set(consents.map(c => c.term_id));
  const pendingTypes: string[] = [];

  for (const term of terms) {
    if (!acceptedTermIds.has(term.id)) {
      pendingTypes.push(term.term_type);
    }
  }

  return {
    allAccepted: pendingTypes.length === 0,
    pendingTypes: [...new Set(pendingTypes)],
  };
};

/**
 * Registra aceite de um termo com dados de auditoria
 */
export const acceptTerm = async (
  userId: string,
  termId: string,
  termType: string,
  termVersion: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('lgpd_consent_records')
    .upsert({
      user_id: userId,
      term_id: termId,
      term_type: termType,
      term_version: termVersion,
      accepted: true,
      ip_address: null, // Preenchido server-side se necessario
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      accepted_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: 'user_id,term_id' });

  if (error) {
    console.error('Erro ao registrar consentimento:', error);
    return false;
  }
  return true;
};

/**
 * Revoga um consentimento
 */
export const revokeConsent = async (userId: string, termId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('lgpd_consent_records')
    .update({ revoked_at: new Date().toISOString(), accepted: false })
    .eq('user_id', userId)
    .eq('term_id', termId);

  if (error) {
    console.error('Erro ao revogar consentimento:', error);
    return false;
  }
  return true;
};

/**
 * GATEKEEPER: Verifica se o usuario ja aceitou o TCLE Vivemus
 * Retorna true se aceitou, false se precisa aceitar
 */
export const checkTCLEAccepted = async (userId: string): Promise<boolean> => {
  const result = await checkRequiredConsents(userId, [TCLE_TERM_TYPE]);
  return result.allAccepted;
};

/**
 * Alias mantido por compatibilidade
 * @deprecated Use checkTCLEAccepted
 */
export const checkTeleconsultaConsent = checkTCLEAccepted;
