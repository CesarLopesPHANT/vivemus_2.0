// Edge Function: sync-on-login
// Sincronizacao preventiva ao detectar login do usuario
// Busca novos registros na API de Relatorios dos ultimos 30 dias
// Deploy: supabase functions deploy sync-on-login

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DAV_API_KEY = Deno.env.get("DAV_API_KEY")!;
const DAV_BASE_URL = Deno.env.get("DAV_BASE_URL") || "https://api.v2.doutoraovivo.com.br";
const REPORT_URL = "https://api.doutoraovivo.com.br/report";
const PROTOCOL_URL = "https://api.v2.doutoraovivo.com.br/protocol";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const davHeaders = {
  "Content-Type": "application/json",
  "x-api-key": DAV_API_KEY,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Verificar autenticacao
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token obrigatorio" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar paciente local
    const { data: paciente } = await supabase
      .from("telemedicina_pacientes")
      .select("id, person_id, cpf, ultimo_sync")
      .eq("user_id", user.id)
      .single();

    if (!paciente || !paciente.person_id) {
      return new Response(
        JSON.stringify({ success: true, synced: false, reason: "Paciente sem person_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificar se precisa sincronizar (intervalo minimo de 1 hora)
    if (paciente.ultimo_sync) {
      const lastSync = new Date(paciente.ultimo_sync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

      if (diffMinutes < 60) {
        return new Response(
          JSON.stringify({ success: true, synced: false, reason: "Sync recente" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const cleanCPF = paciente.cpf.replace(/\D/g, "");

    // 4. Buscar consultas dos ultimos 30 dias na API de Relatorios
    const dataFim = new Date().toISOString().split("T")[0];
    const dataInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let novosRegistros = 0;
    let novosDocumentos = 0;

    // 4a. Buscar relatorio de consultas
    try {
      const reportRes = await fetch(
        `${REPORT_URL}/?start_date=${dataInicio}&end_date=${dataFim}`,
        { headers: davHeaders }
      );

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        const consultas = (reportData.data || []).filter(
          (c: { patient_cpf?: string }) =>
            c.patient_cpf?.replace(/\D/g, "") === cleanCPF
        );

        for (const consulta of consultas) {
          const { error } = await supabase.from("telemedicina_historico").upsert(
            {
              protocol_id: consulta.id || `report_${consulta.date}_${cleanCPF}`,
              paciente_id: paciente.id,
              data_atendimento: consulta.date,
              tipo: consulta.queue_type === "VIRTUAL" ? "FILA_VIRTUAL" : "ELETIVO",
              medico_nome: consulta.doctor_name,
              especialidade: consulta.specialty,
              status: consulta.status || "FINALIZADO",
              duracao_minutos: consulta.duration_minutes,
            },
            { onConflict: "protocol_id" }
          );

          if (!error) novosRegistros++;
        }
      }
    } catch (err) {
      console.warn("[Sync] Erro ao buscar relatorio:", err);
    }

    // 4b. Buscar protocolos da fila virtual
    try {
      const protocolRes = await fetch(
        `${PROTOCOL_URL}/?cpf=${cleanCPF}`,
        { headers: davHeaders }
      );

      if (protocolRes.ok) {
        const protocolData = await protocolRes.json();
        const protocolos = protocolData.data || [];

        for (const protocolo of protocolos) {
          await supabase.from("telemedicina_historico").upsert(
            {
              protocol_id: protocolo.id,
              paciente_id: paciente.id,
              data_atendimento: protocolo.created_at,
              tipo: "FILA_VIRTUAL",
              medico_nome: protocolo.doctor_name,
              especialidade: protocolo.specialty,
              status: protocolo.status || "FINALIZADO",
              duracao_minutos: protocolo.attendance_time_minutes,
            },
            { onConflict: "protocol_id" }
          );

          // Buscar documentos de protocolos recentes (ultimas 48h)
          const protocolDate = new Date(protocolo.created_at);
          const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

          if (protocolDate >= twoDaysAgo) {
            try {
              const docsRes = await fetch(
                `${DAV_BASE_URL}/protocol/${protocolo.id}/api-help/`,
                { headers: davHeaders }
              );

              if (docsRes.ok) {
                const docsData = await docsRes.json();
                const documentos = docsData.documents || [];

                for (const doc of documentos) {
                  const tipoMap: Record<string, string> = {
                    Prescricao: "Receita",
                    Receita: "Receita",
                    Atestado: "Atestado",
                    Encaminhamento: "Encaminhamento",
                    Exame: "Exame",
                  };

                  await supabase.from("telemedicina_documentos").upsert(
                    {
                      document_id: doc.id,
                      paciente_id: paciente.id,
                      tipo_doc: tipoMap[doc.type] || "Outro",
                      url_pdf: doc.pdf_url,
                      data_emissao: doc.created_at,
                      protocol_id: protocolo.id,
                    },
                    { onConflict: "document_id" }
                  );
                  novosDocumentos++;
                }
              }
            } catch (docErr) {
              console.warn(`[Sync] Erro docs protocolo ${protocolo.id}:`, docErr);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Sync] Erro ao buscar protocolos:", err);
    }

    // 5. Atualizar timestamp de ultimo sync
    await supabase
      .from("telemedicina_pacientes")
      .update({ ultimo_sync: new Date().toISOString() })
      .eq("id", paciente.id);

    // 6. Log
    await supabase.from("api_logs").insert({
      user_id: user.id,
      user_name: `Sync Login`,
      action_type: "SYNC_ON_LOGIN",
      provider: "DrAoVivo",
      payload: { novosRegistros, novosDocumentos, periodo: `${dataInicio} a ${dataFim}` },
      status: "SUCCESS",
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        synced: true,
        novosRegistros,
        novosDocumentos,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Sync On Login] Erro:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
