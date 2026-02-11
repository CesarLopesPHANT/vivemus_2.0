
import React, { useState, useEffect } from 'react';
import {
  Save, Loader2, Video, Calendar, FileText, ShoppingBag,
  Bot, MapPin, Heart, Home, User, LayoutGrid, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackAction } from '../services/logService';

export interface PatientSectionsConfig {
  consultation: boolean;
  schedule: boolean;
  records: boolean;
  aichat: boolean;
  pharmacy: boolean;
  partners: boolean;
  health: boolean;
}

export const DEFAULT_PATIENT_SECTIONS: PatientSectionsConfig = {
  consultation: true,
  schedule: true,
  records: true,
  aichat: true,
  pharmacy: true,
  partners: true,
  health: true,
};

interface SectionDefinition {
  key: keyof PatientSectionsConfig | 'home' | 'profile';
  label: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  alwaysVisible?: boolean;
}

const SECTIONS: SectionDefinition[] = [
  { key: 'home', label: 'Home', description: 'Tela inicial do paciente', icon: Home, alwaysVisible: true },
  { key: 'consultation', label: 'Teleconsulta', description: 'Pronto atendimento por video', icon: Video },
  { key: 'schedule', label: 'Agendamentos', description: 'Consultas eletivas e exames', icon: Calendar },
  { key: 'records', label: 'Prontuario', description: 'Historico medico e documentos', icon: FileText },
  { key: 'aichat', label: 'IA Triagem', description: 'Assistente de saude com inteligencia artificial', icon: Bot },
  { key: 'pharmacy', label: 'Farmacia', description: 'Receitas e busca de medicamentos', icon: ShoppingBag },
  { key: 'partners', label: 'Rede Credenciada', description: 'Laboratorios, farmacias e especialistas parceiros', icon: MapPin },
  { key: 'health', label: 'Minha Saude', description: 'Perfil de saude, metas e acompanhamento', icon: Heart },
  { key: 'profile', label: 'Perfil', description: 'Dados pessoais e configuracoes', icon: User, alwaysVisible: true },
];

const AdminPatientSections: React.FC = () => {
  const [config, setConfig] = useState<PatientSectionsConfig>(DEFAULT_PATIENT_SECTIONS);
  const [originalConfig, setOriginalConfig] = useState<PatientSectionsConfig>(DEFAULT_PATIENT_SECTIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'patient_sections')
          .maybeSingle();
        if (data?.value) {
          const merged = { ...DEFAULT_PATIENT_SECTIONS, ...data.value };
          setConfig(merged);
          setOriginalConfig(merged);
        }
      } catch (err) {
        console.error('Erro ao buscar config de secoes:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleToggle = (key: keyof PatientSectionsConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    setFeedback(null);
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'patient_sections',
        value: config,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;

      await trackAction({
        action_type: 'UPDATE',
        resource: 'PATIENT_SECTIONS',
        description: 'Configuracao de modulos do paciente atualizada',
        payload: { old: originalConfig, new: config },
        status: 'SUCCESS'
      });

      setOriginalConfig({ ...config });
      setFeedback({ type: 'success', message: 'Configuracao salva com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao salvar: ' + (err.message || 'Falha na conexao') });
    } finally {
      setIsSaving(false);
    }
  };

  const enabledCount = Object.values(config).filter(Boolean).length;
  const totalToggleable = Object.keys(config).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
              <LayoutGrid size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Modulos do Paciente</h3>
              <p className="text-slate-500 text-sm font-medium">
                Controle quais areas do sistema ficam disponiveis para os pacientes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">
              {enabledCount}/{totalToggleable} ativos
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`px-8 py-4 font-black rounded-2xl flex items-center gap-2 transition-all active:scale-95 ${
                hasChanges
                  ? 'bg-slate-900 text-white hover:bg-violet-600'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl mb-8 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold">{feedback.message}</span>
          </div>
        )}

        {/* Sections Grid */}
        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const isAlwaysVisible = section.alwaysVisible;
            const isEnabled = isAlwaysVisible || config[section.key as keyof PatientSectionsConfig] !== false;

            return (
              <div
                key={section.key}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                  isEnabled
                    ? 'bg-white border-slate-100 hover:border-slate-200'
                    : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isAlwaysVisible
                      ? 'bg-slate-100 text-slate-400'
                      : isEnabled
                        ? 'bg-violet-50 text-violet-600'
                        : 'bg-slate-100 text-slate-300'
                  }`}>
                    <section.icon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-800">{section.label}</h4>
                      {isAlwaysVisible && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-wider rounded-lg">
                          Sempre visivel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{section.description}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  disabled={isAlwaysVisible}
                  onClick={() => !isAlwaysVisible && handleToggle(section.key as keyof PatientSectionsConfig)}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                    isAlwaysVisible
                      ? 'bg-slate-200 cursor-not-allowed'
                      : isEnabled
                        ? 'bg-violet-600 cursor-pointer hover:bg-violet-700'
                        : 'bg-slate-200 cursor-pointer hover:bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                      isEnabled ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            <span className="font-black text-slate-600">Nota:</span> Alteracoes nesta tela afetam todos os pacientes do sistema.
            Modulos desativados nao aparecerao na navegacao nem na tela inicial do paciente.
            As secoes "Home" e "Perfil" permanecem sempre visiveis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPatientSections;
