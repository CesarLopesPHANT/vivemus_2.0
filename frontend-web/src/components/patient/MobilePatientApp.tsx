import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  Calendar,
  Bot,
  Heart,
  User,
  Phone,
  Loader2
} from 'lucide-react';
import { UserData, View } from '../App';
import { Partner, UserExam } from '../types';
import { buscarHistoricoPaciente, obterLinkPSO, ConsultaAgendamento, ProtocoloFilaVirtual } from '../services/draovivoService';
import { supabase } from '../lib/supabase';
import StartScreen from './StartScreen';
import Schedule from './Schedule';
import AIChat from './AIChat';
import MyHealth from './MyHealth';
import UserProfile from './UserProfile';
import MedicalRecords from './MedicalRecords';
import Teleconsultation from './Teleconsultation';
import PharmacyHub from './PharmacyHub';
import PartnerDetails from './PartnerDetails';
import PartnersList from './PartnersList';
import { PatientSectionsConfig, DEFAULT_PATIENT_SECTIONS } from './AdminPatientSections';

interface MobilePatientAppProps {
  user: UserData;
  partners: Partner[];
  onUpdateProfile: () => void;
}

type MobileView = 'home' | 'schedule' | 'aichat' | 'health' | 'profile' | 'records' | 'consultation' | 'pharmacy' | 'partners' | 'partner';

interface TabItem {
  id: MobileView;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
}

const MobilePatientApp: React.FC<MobilePatientAppProps> = ({ user, partners, onUpdateProfile }) => {
  const [activeTab, setActiveTab] = useState<MobileView>('home');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Estado da consulta ativa (persiste entre trocas de aba)
  const [consultationActive, setConsultationActive] = useState(false);
  const [consultationUrl, setConsultationUrl] = useState<string | null>(null);

  // PSO pre-fetch: cache do link gerado em background para acesso instantaneo
  const [prefetchedPSO, setPrefetchedPSO] = useState<{ url: string; personId?: string; fetchedAt: number } | null>(null);
  const psoRefreshRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Dados reais do paciente
  const [consultas, setConsultas] = useState<ConsultaAgendamento[]>([]);
  const [protocolos, setProtocolos] = useState<ProtocoloFilaVirtual[]>([]);
  const [exams, setExams] = useState<UserExam[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Config de modulos visiveis para o paciente
  const [sectionConfig, setSectionConfig] = useState<PatientSectionsConfig>(DEFAULT_PATIENT_SECTIONS);
  const [sectionConfigLoaded, setSectionConfigLoaded] = useState(false);

  // Fetch dados reais ao montar
  useEffect(() => {
    const fetchPatientData = async () => {
      setLoadingData(true);
      try {
        // Buscar historico de consultas via Dr. ao Vivo API
        const historico = await buscarHistoricoPaciente(user.cpf);
        setConsultas(historico.consultas);
        setProtocolos(historico.protocolos);

        // Buscar documentos medicos do Supabase
        const { data: docs } = await supabase
          .from('medical_documents')
          .select('*')
          .eq('person_id', user.id)
          .order('data_emissao', { ascending: false });

        if (docs && docs.length > 0) {
          const mappedExams: UserExam[] = docs.map((doc: any) => ({
            id: doc.document_id || doc.id,
            name: doc.tipo || 'Documento',
            date: doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '',
            laboratory: 'Dr. ao Vivo',
            category: doc.tipo || 'Geral',
            url: doc.url_pdf || '#'
          }));
          setExams(mappedExams);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do paciente:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (user.cpf) {
      fetchPatientData();
    } else {
      setLoadingData(false);
    }
  }, [user.cpf, user.id]);

  // Fetch config de modulos visiveis
  useEffect(() => {
    const fetchSectionConfig = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'patient_sections')
          .maybeSingle();
        if (data?.value) {
          setSectionConfig({ ...DEFAULT_PATIENT_SECTIONS, ...data.value });
        }
      } catch (err) {
        console.error('Erro ao buscar config de secoes:', err);
      } finally {
        setSectionConfigLoaded(true);
      }
    };
    fetchSectionConfig();
  }, []);

  // Pre-fetch PSO em background (gera link de teleconsulta ao fazer login)
  const PSO_REFRESH_MS = 8 * 60 * 1000; // Refresh a cada 8 minutos
  const PSO_TTL_MS = 10 * 60 * 1000;    // Cache valido por 10 minutos

  const fetchPSOInBackground = useCallback(async () => {
    try {
      const result = await obterLinkPSO();
      if (result.success && result.url) {
        setPrefetchedPSO({ url: result.url, personId: result.personId, fetchedAt: Date.now() });
      }
    } catch {
      // Falha silenciosa - nunca bloqueia a UI
    }
  }, []);

  useEffect(() => {
    fetchPSOInBackground();
    psoRefreshRef.current = setInterval(fetchPSOInBackground, PSO_REFRESH_MS);
    return () => { if (psoRefreshRef.current) clearInterval(psoRefreshRef.current); };
  }, [fetchPSOInBackground]);

  // Extrair ultima prescricao das consultas
  const lastPrescription: string[] = (() => {
    const consultaComPrescricao = consultas.find(c => c.prescription && c.prescription.length > 0);
    return consultaComPrescricao?.prescription || [];
  })();

  const ALWAYS_VISIBLE: MobileView[] = ['home', 'profile'];

  const allTabs: TabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'schedule', label: 'Agenda', icon: Calendar },
    { id: 'aichat', label: 'IA', icon: Bot },
    { id: 'health', label: 'Saude', icon: Heart },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const tabs = allTabs.filter(tab =>
    ALWAYS_VISIBLE.includes(tab.id) || sectionConfig[tab.id as keyof PatientSectionsConfig] !== false
  );

  const handleNavigate = (view: View) => {
    if (view === 'consultation') setActiveTab('consultation');
    else if (view === 'records') setActiveTab('records');
    else if (view === 'pharmacy') setActiveTab('pharmacy');
    else if (view === 'partners_list') setActiveTab('partners');
    else if (view === 'schedule') setActiveTab('schedule');
    else if (view === 'aichat') setActiveTab('aichat');
    else if (view === 'health') setActiveTab('health');
    else if (view === 'profile') setActiveTab('profile');
    else setActiveTab('home');
  };

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner);
    setActiveTab('partner');
  };

  const handleBack = () => {
    setActiveTab('home');
    setSelectedPartner(null);
  };

  // Callbacks da teleconsulta
  const handleCallStart = useCallback((url: string) => {
    setConsultationActive(true);
    setConsultationUrl(url);
  }, []);

  const handleCallEnd = useCallback(() => {
    setConsultationActive(false);
    setConsultationUrl(null);
    // Invalida cache e pre-carrega novo PSO para proxima consulta
    setPrefetchedPSO(null);
    setTimeout(() => fetchPSOInBackground(), 2000);
  }, [fetchPSOInBackground]);

  const handleConsultationExit = useCallback(() => {
    setConsultationActive(false);
    setConsultationUrl(null);
    setActiveTab('home');
  }, []);

  const isSectionEnabled = (key: string): boolean => {
    if (ALWAYS_VISIBLE.includes(key as MobileView)) return true;
    return sectionConfig[key as keyof PatientSectionsConfig] !== false;
  };

  // PSO pre-fetched valido (dentro do TTL)
  const validPrefetchedPSO = prefetchedPSO && (Date.now() - prefetchedPSO.fetchedAt < PSO_TTL_MS)
    ? { url: prefetchedPSO.url, personId: prefetchedPSO.personId }
    : null;

  const renderContent = () => {
    // Guard: redireciona para home se secao desabilitada
    if (!ALWAYS_VISIBLE.includes(activeTab) && !isSectionEnabled(activeTab)) {
      setActiveTab('home');
      return null;
    }

    switch (activeTab) {
      case 'home':
        return (
          <StartScreen
            user={user}
            onSelect={handleNavigate}
            onPartnerSelect={handlePartnerSelect}
            partners={partners}
            sectionConfig={sectionConfig}
          />
        );
      case 'schedule':
        return <Schedule consultas={consultas} loading={loadingData} onStartConsultation={() => setActiveTab('consultation')} />;
      case 'aichat':
        return <AIChat />;
      case 'health':
        return <MyHealth user={user} onUpdateHealth={() => {}} onAddNotif={() => {}} exams={exams} />;
      case 'profile':
        return <UserProfile user={user} onUpdate={onUpdateProfile} />;
      case 'records':
        return <MedicalRecords consultas={consultas} protocolos={protocolos} loading={loadingData} />;
      case 'consultation':
        return (
          <Teleconsultation
            onExit={handleConsultationExit}
            activeUrl={consultationUrl}
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            prefetchedPSO={!consultationUrl ? validPrefetchedPSO : null}
          />
        );
      case 'pharmacy':
        return <PharmacyHub onBack={handleBack} lastPrescription={lastPrescription} />;
      case 'partners':
        return <PartnersList onPartnerSelect={handlePartnerSelect} partners={partners} />;
      case 'partner':
        return <PartnerDetails partner={selectedPartner} onBack={() => setActiveTab('partners')} />;
      default:
        return null;
    }
  };

  // Verifica se esta em uma tela secundaria (sem bottom nav)
  const isSecondaryScreen = ['pharmacy', 'partner'].includes(activeTab);

  // Mostra banner flutuante quando consulta ativa e usuario esta em outra aba
  const showConsultationBanner = consultationActive && activeTab !== 'consultation';

  if (!sectionConfigLoaded) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner flutuante: Consulta em Andamento */}
      {showConsultationBanner && (
        <button
          onClick={() => setActiveTab('consultation')}
          className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white py-2.5 px-4 flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300"
        >
          <div className="relative">
            <Phone size={14} />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-bold">Consulta em andamento</span>
          <span className="text-emerald-200 text-[10px] font-medium ml-1">Toque para voltar</span>
        </button>
      )}

      {/* Conteudo Principal */}
      <main className={`flex-1 overflow-y-auto ${isSecondaryScreen ? '' : 'pb-20'} ${showConsultationBanner ? 'pt-10' : ''}`}>
        <div className={activeTab === 'consultation' ? '' : 'px-4 py-4 sm:px-6 lg:px-8'}>
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation - sempre visivel exceto telas de overlay */}
      {!isSecondaryScreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-area-bottom z-50">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id ||
                (tab.id === 'home' && ['records', 'partners', 'consultation'].includes(activeTab));

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-95 ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon
                    size={22}
                    className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}
                  />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

    </div>
  );
};

export default MobilePatientApp;
