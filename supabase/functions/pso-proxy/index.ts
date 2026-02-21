// Edge Function: pso-proxy
// Gera PSO (Login Programatico) de forma segura - API Key nunca exposta ao frontend
// Deploy: supabase functions deploy pso-proxy
//
// IMPORTANTE: Todas as respostas retornam HTTP 200 com { success, error? }
// porque supabase.functions.invoke() nao expoe o body em respostas non-2xx

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DAV_API_KEY = Deno.env.get("DAV_API_KEY")!; // Obrigatorio: configurar via supabase secrets set DAV_API_KEY=...
const DAV_BASE_URL = Deno.env.get("DAV_BASE_URL") || "https://api.v2.doutoraovivo.com.br";
const DAV_TAG_ID = Deno.env.get("DAV_TAG_ID") || "3b928922-efa6-42c0-92dc-c8d57ab4b261";
const PORTAL_URL = "https://vivemus.dav.med.br";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const davHeaders = {
  "Content-Type": "application/json",
  "x-api-key": DAV_API_KEY,
};

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
      provider: "DrAoVivo",
      description,
      payload,
      response_status: status,
      created_at: new Date().toISOString(),
    });
  } catch (_) { /* log silencioso */ }
};

const SYSTEM_USER = "00000000-0000-0000-0000-000000000000";

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
      await writeLog(SYSTEM_USER, "ANON", "PSO_AUTH", "Token ausente no header Authorization", "ERROR", {
        step: "1_AUTH",
        headers_present: Object.fromEntries([...req.headers.entries()].filter(([k]) => k !== "authorization")),
      });
      return jsonResponse({ success: false, error: "Token obrigatorio", code: "NO_TOKEN", step: "1_AUTH" }, req);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      await writeLog(SYSTEM_USER, "ANON", "PSO_AUTH", "JWT invalido ou expirado", "ERROR", {
        step: "1_AUTH",
        auth_error: authError?.message,
        token_prefix: token.substring(0, 20) + "...",
      });
      return jsonResponse({
        success: false,
        error: "Token invalido. Faca login novamente.",
        code: "INVALID_TOKEN",
        step: "1_AUTH",
        detail: authError?.message,
      }, req);
    }

    const userId = user.id;
    const userEmail = user.email || "sem-email";

    await writeLog(userId, userEmail, "PSO_START", `Inicio do fluxo PSO para ${userEmail}`, "ALERT", {
      step: "1_AUTH_OK",
      user_id: userId,
      email: userEmail,
      has_user_metadata: !!user.user_metadata,
      metadata_keys: user.user_metadata ? Object.keys(user.user_metadata) : [],
      metadata_cpf: user.user_metadata?.cpf ? "PRESENTE" : "AUSENTE",
    });

    // ========== ETAPA 2: Buscar dados do paciente ==========
    let paciente: any = null;
    let source = "telemedicina_pacientes";

    // 2a. Tentar telemedicina_pacientes
    const { data: telePaciente, error: teleError } = await supabase
      .from("telemedicina_pacientes")
      .select("person_id, plan_status, cpf, nome, email, celular, plan_id, timezone")
      .eq("user_id", userId)
      .single();

    if (telePaciente?.cpf) {
      paciente = telePaciente;
      await writeLog(userId, userEmail, "PSO_LOOKUP", "Paciente encontrado em telemedicina_pacientes", "SUCCESS", {
        step: "2a_TELE_PACIENTES",
        cpf_masked: telePaciente.cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"),
        has_person_id: !!telePaciente.person_id,
      });
    } else {
      await writeLog(userId, userEmail, "PSO_LOOKUP", "NAO encontrado em telemedicina_pacientes", "ALERT", {
        step: "2a_TELE_PACIENTES",
        error: teleError?.message || "Sem registro ou CPF null",
        data_returned: telePaciente ? "registro_sem_cpf" : "null",
      });

      // 2b. Tentar profiles
      source = "profiles";
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, cpf, email, cell_phone, plan_id, plan_status, timezone, birth_date")
        .eq("id", userId)
        .single();

      if (profile?.cpf) {
        paciente = {
          person_id: null,
          plan_status: profile.plan_status || "ACTIVE",
          cpf: profile.cpf,
          nome: profile.full_name || "Paciente Vivemus",
          email: profile.email || user.email || "",
          celular: profile.cell_phone || "",
          birth_date: (profile as any).birth_date || user.user_metadata?.birth_date || "",
          plan_id: profile.plan_id || "plano_premium",
          timezone: profile.timezone || "America/Cuiaba",
        };
        await writeLog(userId, userEmail, "PSO_LOOKUP", "Paciente encontrado em profiles", "SUCCESS", {
          step: "2b_PROFILES",
          cpf_masked: profile.cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"),
        });
      } else {
        await writeLog(userId, userEmail, "PSO_LOOKUP", "NAO encontrado em profiles (CPF null)", "ALERT", {
          step: "2b_PROFILES",
          error: profileError?.message || "CPF null",
          profile_exists: !!profile,
          profile_fields: profile ? {
            has_full_name: !!profile.full_name,
            has_cpf: !!profile.cpf,
            has_email: !!profile.email,
            plan_status: profile.plan_status,
          } : null,
        });
      }
    }

    // 2c. Fallback: user_metadata
    if (!paciente || !paciente.cpf) {
      const meta = user.user_metadata;
      if (meta?.cpf) {
        source = "user_metadata";
        paciente = {
          person_id: null,
          plan_status: meta.plan_status || "ACTIVE",
          cpf: meta.cpf,
          nome: meta.full_name || meta.name || "Paciente Vivemus",
          email: meta.email || user.email || "",
          celular: meta.cell_phone || "",
          birth_date: meta.birth_date || "",
          plan_id: meta.plan_id || "plano_premium",
          timezone: meta.timezone || "America/Cuiaba",
        };
        await writeLog(userId, userEmail, "PSO_LOOKUP", "Paciente encontrado via user_metadata (fallback 3)", "SUCCESS", {
          step: "2c_USER_METADATA",
          cpf_masked: meta.cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"),
          nome: paciente.nome,
        });
      } else {
        await writeLog(userId, userEmail, "PSO_LOOKUP", "CPF NAO ENCONTRADO em nenhuma fonte", "ERROR", {
          step: "2c_USER_METADATA",
          fontes_verificadas: ["telemedicina_pacientes", "profiles", "user_metadata"],
          metadata_raw_keys: meta ? Object.keys(meta) : [],
          metadata_cpf_value: meta?.cpf ?? "UNDEFINED",
        });
      }
    }

    if (!paciente || !paciente.cpf) {
      await writeLog(userId, userEmail, "PSO_FAIL", "FALHA FINAL: CPF nao localizado em nenhuma fonte de dados", "ERROR", {
        step: "2_FINAL_FAIL",
        fontes_verificadas: ["telemedicina_pacientes", "profiles", "user_metadata"],
        user_id: userId,
      });
      return jsonResponse({
        success: false,
        error: "CPF nao localizado. Complete seu cadastro para acessar a teleconsulta.",
        code: "PATIENT_NOT_FOUND",
        step: "2_PATIENT_LOOKUP",
      }, req);
    }

    // ========== ETAPA 3: Verificar plano ==========
    if (paciente.plan_status === "BLOCKED") {
      await writeLog(userId, userEmail, "PSO_BLOCKED", "Plano bloqueado - acesso negado", "ERROR", {
        step: "3_PLAN_CHECK",
        plan_status: paciente.plan_status,
        source,
      });
      return jsonResponse({
        success: false,
        error: "Plano bloqueado. Regularize seu pagamento.",
        code: "PLAN_BLOCKED",
        step: "3_PLAN_CHECK",
      }, req);
    }

    // ========== ETAPA 4: Buscar/cadastrar na DAV ==========
    // Fluxo: person_id local → busca por CPF na DAV → cadastro na DAV → PSO
    let personId = paciente.person_id;
    const cleanCPF = paciente.cpf.replace(/\D/g, "");

    if (!personId) {
      // 4a. Buscar por CPF na DAV
      try {
        const buscaRes = await fetch(
          `${DAV_BASE_URL}/person/cpf/${cleanCPF}`,
          { headers: davHeaders }
        );
        const buscaStatus = buscaRes.status;
        const buscaBody = await buscaRes.text();

        if (buscaRes.ok) {
          try {
            const buscaData = JSON.parse(buscaBody);
            if (buscaData?.id) {
              personId = buscaData.id;
              await writeLog(userId, userEmail, "PSO_DAV", `Paciente encontrado na DAV (person_id: ${personId})`, "SUCCESS", {
                step: "4a_DAV_SEARCH",
                person_id: personId,
                dav_status: buscaStatus,
              });
            }
          } catch {
            await writeLog(userId, userEmail, "PSO_DAV", "DAV retornou OK mas body nao e JSON valido", "ERROR", {
              step: "4a_DAV_SEARCH",
              dav_status: buscaStatus,
              body_preview: buscaBody.substring(0, 500),
            });
          }
        } else {
          await writeLog(userId, userEmail, "PSO_DAV", `DAV busca por CPF retornou HTTP ${buscaStatus}`, "ALERT", {
            step: "4a_DAV_SEARCH",
            dav_status: buscaStatus,
            body_preview: buscaBody.substring(0, 500),
            cpf_masked: cleanCPF.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"),
          });
        }
      } catch (e: any) {
        await writeLog(userId, userEmail, "PSO_DAV", `Erro de rede ao buscar na DAV: ${e.message}`, "ERROR", {
          step: "4a_DAV_SEARCH",
          error_name: e.name,
          error_message: e.message,
        });
      }

      // 4b. Se nao encontrou, cadastrar na DAV
      if (!personId) {
        try {
          const createBody = {
            name: paciente.nome,
            cpf: cleanCPF,
            email: paciente.email,
            cell_phone: paciente.celular?.replace(/\D/g, ""),
            birth_date: paciente.birth_date || "",
            plan_id: paciente.plan_id || "plano_premium",
            plan_status: "ACTIVE",
            timezone: paciente.timezone || "America/Cuiaba",
            tag_id: DAV_TAG_ID,
          };

          const createRes = await fetch(`${DAV_BASE_URL}/person`, {
            method: "POST",
            headers: davHeaders,
            body: JSON.stringify(createBody),
          });

          const createStatus = createRes.status;
          const createResponseBody = await createRes.text();

          if (!createRes.ok) {
            let errData: any = {};
            try { errData = JSON.parse(createResponseBody); } catch {}

            await writeLog(userId, userEmail, "PSO_DAV", `DAV cadastro falhou HTTP ${createStatus}`, "ERROR", {
              step: "4b_DAV_REGISTER",
              dav_status: createStatus,
              dav_response: createResponseBody.substring(0, 500),
              request_body: { ...createBody, cpf: cleanCPF.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2") },
            });

            // Recovery 409/422: CPF ou email ja cadastrado - buscar paciente existente
            if (createStatus === 409 || createStatus === 422) {
              try {
                const retryBusca = await fetch(
                  `${DAV_BASE_URL}/person/cpf/${cleanCPF}`,
                  { headers: davHeaders }
                );
                if (retryBusca.ok) {
                  const retryData = await retryBusca.json();
                  if (retryData?.id) {
                    personId = retryData.id;
                    await writeLog(userId, userEmail, "PSO_DAV", `Recovery ${createStatus} OK - person_id: ${personId}`, "SUCCESS", {
                      step: "4b_RECOVERY",
                      person_id: personId,
                      original_status: createStatus,
                    });
                  }
                }
              } catch (e: any) {
                await writeLog(userId, userEmail, "PSO_DAV", `Recovery ${createStatus} falhou: ${e.message}`, "ERROR", {
                  step: "4b_RECOVERY",
                  error: e.message,
                });
              }
            }

            if (!personId) {
              return jsonResponse({
                success: false,
                error: "Erro ao cadastrar na plataforma de telemedicina.",
                details: errData,
                code: "DAV_REGISTER_ERROR",
                step: "4b_DAV_REGISTER",
              }, req);
            }
          } else {
            try {
              const createData = JSON.parse(createResponseBody);
              personId = createData.id;
              await writeLog(userId, userEmail, "PSO_DAV", `Paciente cadastrado na DAV com sucesso (person_id: ${personId})`, "SUCCESS", {
                step: "4b_DAV_REGISTER",
                person_id: personId,
                dav_status: createStatus,
              });
            } catch {
              await writeLog(userId, userEmail, "PSO_DAV", "DAV cadastro retornou OK mas body invalido", "ERROR", {
                step: "4b_DAV_REGISTER",
                dav_status: createStatus,
                body_preview: createResponseBody.substring(0, 500),
              });
            }
          }
        } catch (e: any) {
          await writeLog(userId, userEmail, "PSO_DAV", `Erro de rede ao cadastrar na DAV: ${e.message}`, "ERROR", {
            step: "4b_DAV_REGISTER",
            error_name: e.name,
            error_message: e.message,
          });
          return jsonResponse({
            success: false,
            error: `Erro de conexao com DrAoVivo: ${e.message}`,
            code: "DAV_NETWORK_ERROR",
            step: "4b_DAV_REGISTER",
          }, req);
        }
      }

      // 4c. Persistir person_id no banco local
      if (personId) {
        if (source === "telemedicina_pacientes" && telePaciente) {
          await supabase
            .from("telemedicina_pacientes")
            .update({ person_id: personId })
            .eq("user_id", userId);
        } else {
          try {
            await supabase
              .from("telemedicina_pacientes")
              .upsert({
                user_id: userId,
                person_id: personId,
                cpf: cleanCPF,
                nome: paciente.nome,
                email: paciente.email,
                celular: paciente.celular?.replace(/\D/g, ""),
                plan_id: paciente.plan_id || "plano_premium",
                plan_status: paciente.plan_status || "ACTIVE",
                timezone: paciente.timezone || "America/Cuiaba",
              }, { onConflict: "user_id" });
          } catch (e: any) {
            await writeLog(userId, userEmail, "PSO_DB", `Erro ao salvar telemedicina_pacientes: ${e.message}`, "ERROR", {
              step: "4c_PERSIST",
              error: e.message,
            });
          }
        }
      }
    }

    // ========== ETAPA 5: Gerar PSO via /credential/pso/person/{personId} ==========
    // Guard: personId deve existir antes de gerar PSO
    if (!personId) {
      await writeLog(userId, userEmail, "PSO_GENERATE", "person_id nulo/undefined antes de gerar PSO", "ERROR", {
        step: "5_PSO_GUARD",
        source,
        cpf_masked: cleanCPF.replace(/(\d{3})\d{6}(\d{2})/, "$1******$2"),
      });
      return jsonResponse({
        success: false,
        error: "Erro interno: paciente nao registrado na plataforma. Tente novamente.",
        code: "PERSON_ID_NULL",
        step: "5_PSO_GUARD",
      }, req);
    }

    let psoResponseBody = "";
    let psoStatus = 0;
    try {
      const psoRes = await fetch(
        `${DAV_BASE_URL}/credential/pso/person/${personId}`,
        { method: "POST", headers: davHeaders }
      );

      psoStatus = psoRes.status;
      psoResponseBody = await psoRes.text();

      await writeLog(userId, userEmail, "PSO_GENERATE", `POST /credential/pso/person/${personId} retornou HTTP ${psoStatus}`, psoRes.ok ? "SUCCESS" : "ERROR", {
        step: "5_PSO_RAW_RESPONSE",
        dav_status: psoStatus,
        full_body: psoResponseBody.substring(0, 2000),
        person_id: personId,
        endpoint: `${DAV_BASE_URL}/credential/pso/person/${personId}`,
      });

      // Recovery 404: person_id pode estar obsoleto na DAV - re-buscar/cadastrar e tentar novamente
      if (psoStatus === 404) {
        await writeLog(userId, userEmail, "PSO_GENERATE", `PSO 404 para person_id ${personId} - tentando recovery`, "ALERT", {
          step: "5_PSO_RECOVERY_START",
          person_id: personId,
        });

        let recoveredPersonId: string | null = null;
        try {
          const retryBusca = await fetch(`${DAV_BASE_URL}/person/cpf/${cleanCPF}`, { headers: davHeaders });
          if (retryBusca.ok) {
            const retryData = await retryBusca.json();
            if (retryData?.id && retryData.id !== personId) {
              recoveredPersonId = retryData.id;
            }
          }
        } catch {}

        if (!recoveredPersonId) {
          try {
            const reCreateRes = await fetch(`${DAV_BASE_URL}/person`, {
              method: "POST",
              headers: davHeaders,
              body: JSON.stringify({
                name: paciente.nome,
                cpf: cleanCPF,
                email: paciente.email,
                cell_phone: paciente.celular?.replace(/\D/g, ""),
                birth_date: paciente.birth_date || "",
                plan_id: paciente.plan_id || "plano_premium",
                plan_status: "ACTIVE",
                timezone: paciente.timezone || "America/Cuiaba",
                tag_id: DAV_TAG_ID,
              }),
            });
            if (reCreateRes.ok) {
              const reCreateData = await reCreateRes.json();
              if (reCreateData?.id) recoveredPersonId = reCreateData.id;
            } else if (reCreateRes.status === 409 || reCreateRes.status === 422) {
              const retryBusca2 = await fetch(`${DAV_BASE_URL}/person/cpf/${cleanCPF}`, { headers: davHeaders });
              if (retryBusca2.ok) {
                const retryData2 = await retryBusca2.json();
                if (retryData2?.id) recoveredPersonId = retryData2.id;
              }
            }
          } catch {}
        }

        if (recoveredPersonId) {
          await supabase
            .from("telemedicina_pacientes")
            .upsert({ user_id: userId, person_id: recoveredPersonId, cpf: cleanCPF }, { onConflict: "user_id" });

          const retryPso = await fetch(
            `${DAV_BASE_URL}/credential/pso/person/${recoveredPersonId}`,
            { method: "POST", headers: davHeaders }
          );

          if (retryPso.ok) {
            psoStatus = retryPso.status;
            psoResponseBody = await retryPso.text();
            personId = recoveredPersonId;

            await writeLog(userId, userEmail, "PSO_GENERATE", `Recovery 404 OK - novo person_id: ${recoveredPersonId}`, "SUCCESS", {
              step: "5_PSO_RECOVERY_OK",
              new_person_id: recoveredPersonId,
            });
          } else {
            psoStatus = retryPso.status;
            psoResponseBody = await retryPso.text();
          }
        }
      }

      if (!psoRes.ok && psoStatus !== 200) {
        let psoError: any = {};
        try { psoError = JSON.parse(psoResponseBody); } catch {}

        await writeLog(userId, userEmail, "PSO_GENERATE", `Geracao PSO falhou HTTP ${psoStatus}`, "ERROR", {
          step: "5_PSO_GENERATE",
          dav_status: psoStatus,
          dav_response: psoResponseBody.substring(0, 500),
          person_id: personId,
          endpoint: `${DAV_BASE_URL}/credential/pso/person/${personId}`,
        });
        return jsonResponse({
          success: false,
          error: `Erro ao gerar acesso direto (HTTP ${psoStatus}). Tente novamente.`,
          details: psoError,
          code: "PSO_GENERATION_ERROR",
          step: "5_PSO_GENERATE",
        }, req);
      }
    } catch (e: any) {
      await writeLog(userId, userEmail, "PSO_GENERATE", `Erro de rede ao gerar PSO: ${e.message}`, "ERROR", {
        step: "5_PSO_GENERATE",
        error_name: e.name,
        error_message: e.message,
        person_id: personId,
      });
      return jsonResponse({
        success: false,
        error: `Erro de conexao ao gerar PSO: ${e.message}`,
        code: "PSO_NETWORK_ERROR",
        step: "5_PSO_GENERATE",
      }, req);
    }

    let psoData: any;
    try {
      psoData = JSON.parse(psoResponseBody);
    } catch {
      await writeLog(userId, userEmail, "PSO_GENERATE", "PSO retornou OK mas body invalido", "ERROR", {
        step: "5_PSO_PARSE",
        dav_status: psoStatus,
        body_preview: psoResponseBody.substring(0, 500),
      });
      return jsonResponse({
        success: false,
        error: "Resposta invalida do servidor de telemedicina.",
        code: "PSO_PARSE_ERROR",
        step: "5_PSO_PARSE",
      }, req);
    }

    const psoUrl = `${PORTAL_URL}/pso/${psoData.id}/emergency`;

    // ========== ETAPA 6: Sucesso ==========
    await writeLog(userId, userEmail, "PSO_GENERATED", `PSO gerado com sucesso - URL pronta`, "SUCCESS", {
      step: "6_SUCCESS",
      person_id: personId,
      pso_id: psoData.id,
      source,
      url: psoUrl,
      endpoint_used: `POST /credential/pso/person/${personId}`,
    });

    return jsonResponse({ success: true, url: psoUrl, personId }, req);
  } catch (error: any) {
    console.error("[PSO Proxy] Erro fatal:", error);
    try {
      await writeLog(SYSTEM_USER, "SYSTEM", "PSO_CRASH", `Erro fatal nao tratado: ${error.message}`, "ERROR", {
        step: "UNHANDLED_ERROR",
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack?.substring(0, 500),
      });
    } catch (_) { /* ignora erro de log */ }
    return jsonResponse({
      success: false,
      error: `Erro interno: ${error.message}`,
      code: "INTERNAL_ERROR",
      step: "UNHANDLED",
    }, req);
  }
});
