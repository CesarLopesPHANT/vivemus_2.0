// Edge Function: delete-account
// Exclui conta do usuario com anonimizacao de dados pessoais (LGPD Art. 18)
// Prontuarios medicos retidos por 20 anos conforme Resolucao CFM 1.821/2007
// Deploy: supabase functions deploy delete-account
//
// IMPORTANTE: Todas as respostas retornam HTTP 200 com { success, error? }
// porque supabase.functions.invoke() nao expoe o body em respostas non-2xx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS restrito aos dominios do app Vivemus
const ALLOWED_ORIGINS = [
  "https://vivemus.com.br",
  "https://app.vivemus.com.br",
  "https://ioysnjfyikrxgxvkigcp.supabase.co",
  "http://localhost:5173",
  "http://localhost:5174",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

const jsonResponse = (body: Record<string, any>, req: Request) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

// Helper: gravar log detalhado na tabela api_logs
const writeLog = async (
  userId: string,
  userName: string,
  actionType: string,
  description: string,
  status: "SUCCESS" | "ERROR" | "ALERT",
  payload?: any
) => {
  try {
    await supabase.from("api_logs").insert({
      user_id: userId,
      user_name: userName,
      action_type: actionType,
      provider: "Vivemus",
      description,
      payload,
      response_status: status,
      created_at: new Date().toISOString(),
    });
  } catch (_) { /* log silencioso */ }
};

// Mascara CPF para logs: 123.456.789-00 → XXX.XXX.789-XX
const maskCpf = (cpf: string): string => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length < 11) return "***";
  return `XXX.XXX.${digits.slice(6, 9)}-XX`;
};

// Gera hash parcial do email para anonimizacao: usuario@email.com → a1b2c3@removed.local
const anonymizeEmail = (email: string): string => {
  const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return `anon_${Math.abs(hash).toString(36)}@removed.local`;
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, req);
  }

  try {
    // ========== ETAPA 1: Autenticacao ==========
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Token obrigatorio", step: "1_AUTH" }, req);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ success: false, error: "Sessao invalida ou expirada", step: "1_AUTH" }, req);
    }

    const userId = user.id;
    const userEmail = user.email || "desconhecido";
    const userName = user.user_metadata?.name || user.user_metadata?.full_name || userEmail;

    await writeLog(userId, userName, "ACCOUNT_DELETION_START", "Inicio do processo de exclusao de conta", "ALERT", {
      step: "1_AUTH",
      email_masked: userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
    });

    // ========== ETAPA 2: Anonimizar dados em profiles ==========
    const anonEmail = anonymizeEmail(userEmail);
    const deletionDate = new Date().toISOString();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: "Usuario Removido",
        full_name: "Usuario Removido",
        email: anonEmail,
        cpf: null,
        cell_phone: null,
        avatar_url: null,
        updated_at: deletionDate,
      })
      .eq("id", userId);

    if (profileError) {
      await writeLog(userId, userName, "ACCOUNT_DELETION", `Erro ao anonimizar profiles: ${profileError.message}`, "ERROR", {
        step: "2_ANONYMIZE_PROFILE",
      });
      // Continua mesmo se falhar (tabela pode nao existir para o user)
    }

    // ========== ETAPA 3: Anonimizar dados em telemedicina_pacientes ==========
    // Mantem person_id do DAV para referencia cruzada de prontuarios
    const { error: pacienteError } = await supabase
      .from("telemedicina_pacientes")
      .update({
        nome: "Paciente Anonimizado",
        email: anonEmail,
        cpf: null,
        telefone: null,
        updated_at: deletionDate,
      })
      .eq("user_id", userId);

    if (pacienteError) {
      await writeLog(userId, userName, "ACCOUNT_DELETION", `Erro ao anonimizar telemedicina_pacientes: ${pacienteError.message}`, "ERROR", {
        step: "3_ANONYMIZE_PATIENT",
      });
    }

    // ========== ETAPA 4: NÃO deletar prontuários (retenção CFM 20 anos) ==========
    // telemedicina_historico e telemedicina_documentos permanecem intactos
    // O user_id se torna orfao apos deletar auth.users, mas os dados medicos persistem
    await writeLog(userId, userName, "ACCOUNT_DELETION", "Prontuarios retidos conforme CFM 1.821/2007 (20 anos)", "ALERT", {
      step: "4_RETAIN_RECORDS",
      retention_years: 20,
      regulation: "CFM_1821_2007",
    });

    // ========== ETAPA 5: Revogar todos os consentimentos ==========
    const { error: consentError } = await supabase
      .from("lgpd_consent_records")
      .update({
        accepted: false,
        revoked_at: deletionDate,
      })
      .eq("user_id", userId);

    if (consentError) {
      await writeLog(userId, userName, "ACCOUNT_DELETION", `Erro ao revogar consentimentos: ${consentError.message}`, "ERROR", {
        step: "5_REVOKE_CONSENTS",
      });
    }

    // ========== ETAPA 6: Registrar exclusao completa no log ==========
    await writeLog(userId, userName, "ACCOUNT_DELETION_COMPLETE", "Dados pessoais anonimizados, conta sera deletada", "SUCCESS", {
      step: "6_FINAL_LOG",
      profile_anonymized: !profileError,
      patient_anonymized: !pacienteError,
      consents_revoked: !consentError,
      records_retained: true,
      deletion_date: deletionDate,
    });

    // ========== ETAPA 7: Deletar usuario do auth.users ==========
    // Isso invalida todas as sessoes e tokens do usuario
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      await writeLog(userId, userName, "ACCOUNT_DELETION", `Erro ao deletar auth.users: ${deleteAuthError.message}`, "ERROR", {
        step: "7_DELETE_AUTH",
      });
      return jsonResponse({
        success: false,
        error: "Dados anonimizados, mas houve erro ao finalizar a exclusao. Contate o suporte.",
        step: "7_DELETE_AUTH",
      }, req);
    }

    return jsonResponse({
      success: true,
      message: "Conta excluida com sucesso. Prontuarios medicos retidos conforme legislacao vigente (CFM 1.821/2007).",
    }, req);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await writeLog("00000000-0000-0000-0000-000000000000", "SYSTEM", "ACCOUNT_DELETION", `Erro inesperado: ${errorMsg}`, "ERROR", {
      step: "UNEXPECTED",
    });
    return jsonResponse({ success: false, error: "Erro interno. Tente novamente ou contate o suporte." }, req);
  }
});
