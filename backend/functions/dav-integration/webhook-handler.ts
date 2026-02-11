// Edge Function: webhook-handler
// Recebe webhooks da plataforma Doutor ao Vivo e sincroniza dados locais
// Deploy: supabase functions deploy webhook-handler

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DAV_API_KEY = Deno.env.get("DAV_API_KEY")!;
const DAV_BASE_URL = Deno.env.get("DAV_BASE_URL") || "https://api.v2.doutoraovivo.com.br";
const DAV_TAG_ID = Deno.env.get("DAV_TAG_ID") || "3b928922-efa6-42c0-92dc-c8d57ab4b261";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Headers padrao para a API DAV
const davHeaders = {
  "Content-Type": "application/json",
  "x-api-key": DAV_API_KEY,
};

// ============================================================================
// HANDLERS POR TIPO DE EVENTO
// ============================================================================

async function handleConsultationFinished(payload: {
  person_id: string;
  protocol_id?: string;
}) {
  const { person_id, protocol_id } = payload;

  // 1. Buscar paciente local pelo person_id
  const { data: paciente } = await supabase
    .from("telemedicina_pacientes")
    .select("id")
    .eq("person_id", person_id)
    .single();

  if (!paciente) {
    console.warn(`Paciente person_id=${person_id} nao encontrado localmente.`);
    return;
  }

  // 2. Buscar detalhes do protocolo na API DAV
  if (protocol_id) {
    const protocolRes = await fetch(
      `${DAV_BASE_URL}/protocol/${protocol_id}`,
      { headers: davHeaders }
    );

    if (protocolRes.ok) {
      const protocolData = await protocolRes.json();

      // 3. Upsert no historico local
      await supabase.from("telemedicina_historico").upsert(
        {
          protocol_id,
          paciente_id: paciente.id,
          data_atendimento: protocolData.created_at || new Date().toISOString(),
          tipo: protocolData.queue_type === "VIRTUAL" ? "FILA_VIRTUAL" : "ELETIVO",
          medico_nome: protocolData.doctor_name,
          especialidade: protocolData.specialty,
          status: "FINALIZADO",
          duracao_minutos: protocolData.attendance_time_minutes,
        },
        { onConflict: "protocol_id" }
      );

      // 4. Buscar documentos gerados na consulta
      const docsRes = await fetch(
        `${DAV_BASE_URL}/protocol/${protocol_id}/api-help/`,
        { headers: davHeaders }
      );

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        const documentos = docsData.documents || [];

        for (const doc of documentos) {
          await supabase.from("telemedicina_documentos").upsert(
            {
              document_id: doc.id,
              paciente_id: paciente.id,
              tipo_doc: mapTipoDocumento(doc.type),
              url_pdf: doc.pdf_url,
              data_emissao: doc.created_at,
              protocol_id,
            },
            { onConflict: "document_id" }
          );
        }

        // 5. Notificar paciente se houver documentos
        if (documentos.length > 0) {
          await supabase.from("notifications").insert({
            user_id: person_id,
            title: "Documentos Medicos",
            message: `${documentos.length} documento(s) disponivel(is) para download.`,
            type: "MEDICAL_DOCUMENT",
            read: false,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 6. Atualizar timestamp de ultimo sync
  await supabase
    .from("telemedicina_pacientes")
    .update({ ultimo_sync: new Date().toISOString() })
    .eq("person_id", person_id);
}

async function handlePersonCreated(payload: {
  person_id: string;
  metadata?: Record<string, unknown>;
}) {
  // Configurar permissoes padrao baseadas no plano
  const planId = (payload.metadata?.plan_id as string) || "standard";
  let permissions;

  if (planId.includes("premium") || planId.includes("enterprise")) {
    permissions = {
      allow_schedule: true,
      allow_virtual_queue: true,
      allow_reports: true,
      view_medical_record: true,
    };
  } else if (planId.includes("standard")) {
    permissions = {
      allow_schedule: true,
      allow_virtual_queue: true,
      allow_reports: false,
      view_medical_record: true,
    };
  } else {
    permissions = {
      allow_schedule: false,
      allow_virtual_queue: true,
      allow_reports: false,
      view_medical_record: true,
    };
  }

  await fetch(
    `https://api.doutoraovivo.com.br/auth/person/${payload.person_id}/permissions`,
    {
      method: "PUT",
      headers: davHeaders,
      body: JSON.stringify(permissions),
    }
  );
}

async function handleDocumentCreated(payload: {
  person_id: string;
  protocol_id?: string;
  event_type: string;
}) {
  if (!payload.protocol_id) return;

  const { data: paciente } = await supabase
    .from("telemedicina_pacientes")
    .select("id")
    .eq("person_id", payload.person_id)
    .single();

  if (!paciente) return;

  const docsRes = await fetch(
    `${DAV_BASE_URL}/protocol/${payload.protocol_id}/api-help/`,
    { headers: davHeaders }
  );

  if (docsRes.ok) {
    const docsData = await docsRes.json();
    const documentos = docsData.documents || [];

    for (const doc of documentos) {
      await supabase.from("telemedicina_documentos").upsert(
        {
          document_id: doc.id,
          paciente_id: paciente.id,
          tipo_doc: mapTipoDocumento(doc.type),
          url_pdf: doc.pdf_url,
          data_emissao: doc.created_at,
          protocol_id: payload.protocol_id,
        },
        { onConflict: "document_id" }
      );
    }

    if (documentos.length > 0) {
      const tipo = payload.event_type === "PRESCRIPTION_CREATED" ? "Receita" : "Atestado";
      await supabase.from("notifications").insert({
        user_id: payload.person_id,
        title: "Novo Documento",
        message: `Novo documento disponivel: ${tipo}`,
        type: "MEDICAL_DOCUMENT",
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// ============================================================================
// UTILS
// ============================================================================

function mapTipoDocumento(type: string): string {
  const map: Record<string, string> = {
    Prescricao: "Receita",
    Receita: "Receita",
    Atestado: "Atestado",
    Encaminhamento: "Encaminhamento",
    Exame: "Exame",
  };
  return map[type] || "Outro";
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

Deno.serve(async (req: Request) => {
  // Apenas POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const { event_type, person_id, protocol_id, metadata } = payload;

    if (!event_type || !person_id) {
      return new Response(
        JSON.stringify({ error: "event_type e person_id obrigatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log do evento recebido
    await supabase.from("api_logs").insert({
      user_id: "system",
      user_name: "Webhook DAV",
      action_type: `WEBHOOK_${event_type}`,
      provider: "DrAoVivo",
      payload: { person_id, protocol_id, event_type },
      status: "SUCCESS",
      created_at: new Date().toISOString(),
    });

    // Roteamento por tipo de evento
    switch (event_type) {
      case "CONSULTATION_FINISHED":
        await handleConsultationFinished({ person_id, protocol_id });
        break;

      case "PERSON_CREATED":
        await handlePersonCreated({ person_id, metadata });
        break;

      case "PRESCRIPTION_CREATED":
      case "CERTIFICATE_CREATED":
        await handleDocumentCreated({ person_id, protocol_id, event_type });
        break;

      case "PATIENT_ENTERED_QUEUE":
      case "PATIENT_LEFT_QUEUE":
        console.log(`[Webhook] ${event_type}: person_id=${person_id}`);
        break;

      default:
        console.warn(`[Webhook] Evento desconhecido: ${event_type}`);
    }

    return new Response(
      JSON.stringify({ success: true, event_type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Webhook] Erro:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
