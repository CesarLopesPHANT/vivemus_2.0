
import { supabase } from "../lib/supabase";
import { trackApiAction } from "./logService";

export interface TelemedicineRoom {
  roomUrl: string;
  token: string;
  expiresAt: string;
  provider: 'TelDoc' | 'DrAoVivo' | 'VivemusNative';
  features: string[];
}

const getActiveGateway = async () => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'api_gateways')
    .single();

  if (error || !data) return { provider: 'VivemusNative', endpoint: '', token: '' };

  return {
    provider: data.value.active_provider || 'DrAoVivo',
    endpoint: data.value.draovivo_endpoint || '',
    token: data.value.draovivo_token || ''
  };
};

export const createConsultationRoom = async (appointmentId: string, userId: string, userName: string): Promise<TelemedicineRoom | null> => {
  const gateway = await getActiveGateway();
  
  // Registro no espelho admin
  await trackApiAction({
    userId,
    userName,
    actionType: 'SESSAO_VIDEO_INICIADA',
    provider: gateway.provider,
    payload: { appointmentId },
    status: 'SUCCESS'
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        roomUrl: `https://draovivo.api/v1/meeting/${appointmentId}`,
        token: "jwt-token-dr-ao-vivo-" + Math.random().toString(36).substring(7),
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
        provider: gateway.provider as any,
        features: ['Gravação', 'Chat HD', 'Prescrição Memed', 'Multi-speaker']
      });
    }, 1500);
  });
};
