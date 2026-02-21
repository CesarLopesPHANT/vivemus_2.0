
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../lib/supabase";

/**
 * Busca a configuração de IA atual no banco de dados
 */
const getAIConfig = async () => {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_config')
      .single();
    
    return data?.value || {
      system_prompt: "Você é o assistente virtual da Vivemus. Responda de forma profissional e curta. Não dê diagnósticos médicos definitivos.",
      model: "gemini-3-flash-preview"
    };
  } catch (err) {
    return {
      system_prompt: "Você é o assistente virtual da Vivemus. Responda de forma curta e profissional.",
      model: "gemini-3-flash-preview"
    };
  }
};

export const chatWithAI = async (
  userId: string, 
  message: string, 
  conversationId?: string
) => {
  try {
    const config = await getAIConfig();
    let currentId = conversationId;

    if (!currentId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert([{ user_id: userId, title: message.substring(0, 30) + '...' }])
        .select()
        .single();
      
      if (convError) throw convError;
      currentId = newConv.id;
    }

    await supabase.from('messages').insert([
      { conversation_id: currentId, role: 'user', content: message }
    ]);

    // Regra: Sempre instanciar GoogleGenAI com a chave do process.env
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Regra: Não definir o modelo primeiro, usar ai.models.generateContent diretamente
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: config.system_prompt,
      },
    });

    const aiText = response.text || "Desculpe, tive um problema técnico ao processar a resposta.";
    
    await supabase.from('messages').insert([
      { conversation_id: currentId, role: 'assistant', content: aiText }
    ]);

    return { text: aiText, conversationId: currentId };
  } catch (error: any) {
    console.error("Erro no chat:", error);
    return { text: "O serviço de IA está indisponível. Verifique sua chave de faturamento.", conversationId: null };
  }
};

export const getHealthAdvice = async (message: string) => {
  try {
    const config = await getAIConfig();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: config.system_prompt,
      },
    });

    return response.text || "Sem orientações no momento.";
  } catch (error: any) {
    console.error("AI Advice Error:", error);
    return "Falha na conexão com o cérebro digital da Vivemus.";
  }
};

export const searchMedicinePrice = async (medicine: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Pesquise preços reais no Brasil para o medicamento: ${medicine}. Liste nomes de farmácias e preços médios.`,
      config: { tools: [{ googleSearch: {} }] },
    });

    return {
      text: response.text || "Nenhuma informação detalhada encontrada.",
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    return { text: "Erro ao realizar busca de medicamentos.", links: [] };
  }
};

export const analyzePrescription = async (prescription: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise esta prescrição e retorne apenas o nome do remédio: ${prescription}`,
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};
