
import { supabase } from '../lib/supabase';
import { trackApiAction } from './logService';

// Configuração do WhatsApp salva no system_settings
interface WhatsAppConfig {
  phone: string;
  recovery_template: string;
  welcome_template: string;
  bulk_welcome_template?: string;
}

// Template padrão de boas-vindas para importação em massa
const DEFAULT_BULK_WELCOME_TEMPLATE = `🏥 *Bem-vindo(a) à Vivemus!*

Olá {nome}!

Sua conta foi criada com sucesso na plataforma de saúde digital Vivemus.

📱 *Acesse agora:*
{link}

🔐 *Seus dados de acesso:*
• E-mail: {email}
• Senha inicial: {senha}

⚠️ *Importante:* No primeiro acesso, você deverá criar uma nova senha.

🩺 *Serviços disponíveis:*
• Teleconsulta 24h com médicos
• Assistente de saúde com IA
• Prontuário digital
• Rede credenciada de descontos

Em caso de dúvidas, responda esta mensagem!

_Equipe Vivemus_`;

// URL padrão do sistema
const DEFAULT_SYSTEM_URL = 'https://app.vivemus.com.br';
const SENHA_PADRAO = 'Saude@123';

/**
 * Busca configuração do WhatsApp do banco de dados
 */
export const getWhatsAppConfig = async (): Promise<WhatsAppConfig | null> => {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_config')
      .single();

    return data?.value || null;
  } catch {
    return null;
  }
};

/**
 * Formata número de telefone para o padrão WhatsApp (apenas números com DDI)
 */
const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');

  // Se não começar com DDI brasileiro, adiciona
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
};

/**
 * Processa template substituindo variáveis
 */
const processTemplate = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return result;
};

/**
 * Gera link do WhatsApp com mensagem
 */
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Envia mensagem de boas-vindas para um paciente via WhatsApp
 * Usa a API do sistema configurada ou abre link diretamente
 */
export const enviarBoasVindasWhatsApp = async (
  paciente: {
    nome: string;
    email: string;
    celular: string;
  }
): Promise<{ success: boolean; error?: string; link?: string }> => {
  try {
    if (!paciente.celular) {
      return { success: false, error: 'Paciente sem número de celular' };
    }

    const config = await getWhatsAppConfig();
    const template = config?.bulk_welcome_template || DEFAULT_BULK_WELCOME_TEMPLATE;

    const mensagem = processTemplate(template, {
      nome: paciente.nome.split(' ')[0], // Primeiro nome
      email: paciente.email,
      senha: SENHA_PADRAO,
      link: DEFAULT_SYSTEM_URL
    });

    const phoneFormatted = formatPhoneForWhatsApp(paciente.celular);
    const whatsappLink = generateWhatsAppLink(phoneFormatted, mensagem);

    // Log da ação
    await trackApiAction({
      userId: 'system',
      userName: 'Push WhatsApp',
      actionType: 'WHATSAPP_WELCOME_SENT',
      provider: 'WhatsApp',
      payload: {
        paciente: paciente.email,
        phone: phoneFormatted
      },
      status: 'SUCCESS'
    });

    return { success: true, link: whatsappLink };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Envia boas-vindas em massa para lista de pacientes
 * Retorna lista de links para envio ou erro por paciente
 */
export const enviarBoasVindasEmMassa = async (
  pacientes: Array<{
    nome: string;
    email: string;
    celular: string;
    statusPlano: 'ACTIVE' | 'BLOCKED';
  }>
): Promise<{
  total: number;
  enviados: number;
  erros: number;
  detalhes: Array<{
    email: string;
    success: boolean;
    error?: string;
    link?: string;
  }>;
}> => {
  // Filtra apenas pacientes ACTIVE
  const pacientesAtivos = pacientes.filter(p => p.statusPlano === 'ACTIVE');

  const resultado = {
    total: pacientesAtivos.length,
    enviados: 0,
    erros: 0,
    detalhes: [] as Array<{
      email: string;
      success: boolean;
      error?: string;
      link?: string;
    }>
  };

  for (const paciente of pacientesAtivos) {
    const response = await enviarBoasVindasWhatsApp(paciente);

    if (response.success) {
      resultado.enviados++;
    } else {
      resultado.erros++;
    }

    resultado.detalhes.push({
      email: paciente.email,
      ...response
    });
  }

  // Log consolidado
  await trackApiAction({
    userId: 'system',
    userName: 'Push WhatsApp em Massa',
    actionType: 'WHATSAPP_BULK_WELCOME',
    provider: 'WhatsApp',
    payload: {
      total: resultado.total,
      enviados: resultado.enviados,
      erros: resultado.erros
    },
    status: resultado.erros === 0 ? 'SUCCESS' : 'PARTIAL'
  });

  return resultado;
};

/**
 * Abre WhatsApp Web com mensagens para envio em massa
 * Gera um arquivo HTML com links para cada paciente
 */
export const gerarLinksWhatsAppMassa = async (
  pacientes: Array<{
    nome: string;
    email: string;
    celular: string;
    statusPlano: 'ACTIVE' | 'BLOCKED';
  }>
): Promise<string[]> => {
  const pacientesAtivos = pacientes.filter(p => p.statusPlano === 'ACTIVE' && p.celular);
  const config = await getWhatsAppConfig();
  const template = config?.bulk_welcome_template || DEFAULT_BULK_WELCOME_TEMPLATE;

  const links: string[] = [];

  for (const paciente of pacientesAtivos) {
    const mensagem = processTemplate(template, {
      nome: paciente.nome.split(' ')[0],
      email: paciente.email,
      senha: SENHA_PADRAO,
      link: DEFAULT_SYSTEM_URL
    });

    const phoneFormatted = formatPhoneForWhatsApp(paciente.celular);
    links.push(generateWhatsAppLink(phoneFormatted, mensagem));
  }

  return links;
};

/**
 * Salva template de boas-vindas em massa no banco
 */
export const salvarTemplateBulkWelcome = async (template: string): Promise<boolean> => {
  try {
    const config = await getWhatsAppConfig() || {
      phone: '',
      recovery_template: '',
      welcome_template: ''
    };

    await supabase.from('system_settings').upsert({
      key: 'whatsapp_config',
      value: { ...config, bulk_welcome_template: template },
      updated_at: new Date().toISOString()
    });

    return true;
  } catch {
    return false;
  }
};

/**
 * Obtém o template padrão de boas-vindas
 */
export const getDefaultBulkWelcomeTemplate = (): string => {
  return DEFAULT_BULK_WELCOME_TEMPLATE;
};
