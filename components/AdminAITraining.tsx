
import React, { useState } from 'react';
import { Cpu, Sparkles, Save, MessageSquare, AlertCircle, History, PlayCircle, ChevronRight } from 'lucide-react';

const AdminAITraining: React.FC = () => {
  const [instruction, setInstruction] = useState(`Você é o assistente virtual de triagem da Vivemus Telemedicina.
REGRAS: Respostas curtas, tópicos, sem diagnóstico, foque em orientação e agendamento.
Não prescreva medicamentos. Se identificar urgência (dor no peito, falta de ar), indique o botão de consulta imediata.`);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Cpu className="text-blue-600" />
                Prompt de Sistema (Core)
              </h3>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                Gemini-3-Flash-Active
              </div>
            </div>

            <textarea 
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full h-80 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-mono text-sm text-slate-600 outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
            />

            <div className="mt-8 flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                <AlertCircle size={14} />
                Alterações afetam todos os usuários instantaneamente.
              </p>
              <button className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95">
                <Save size={20} />
                Aplicar Treinamento
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <h4 className="text-lg font-black mb-6 flex items-center gap-2">
              <PlayCircle className="text-emerald-400" />
              Sandbox de Teste
            </h4>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Entrada de Teste</p>
                <p className="text-xs text-slate-300">"Estou com uma dor de cabeça muito forte e tontura..."</p>
              </div>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                Simular Resposta IA
                <Sparkles size={14} />
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              Versões Anteriores
            </h4>
            <div className="space-y-4">
              {[
                { date: '12/05 14:00', label: 'v2.1 - Generalista' },
                { date: '10/05 09:30', label: 'v2.0 - Strict triage' }
              ].map((v, i) => (
                <button key={i} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">{v.label}</p>
                    <p className="text-[10px] text-slate-400">{v.date}</p>
                  </div>
                  {/* Fixed missing or misnamed ChevronRight component usage */}
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAITraining;
