
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  AlertTriangle,
  Key,
  Home,
  Calendar,
  Bot,
  Heart,
  User,
  Video,
  LogOut
} from 'lucide-react';
import { supabase } from '../../packages/shared/lib/supabase';
import { HealthProfile, Partner } from '../../packages/shared/types';
import StartScreen from '../../packages/patient-ui/components/StartScreen';
import Schedule from '../../packages/patient-ui/components/Schedule';
import AIChat from '../../packages/patient-ui/components/AIChat';
import MyHealth from '../../packages/patient-ui/components/MyHealth';
import UserProfile from '../../packages/patient-ui/components/UserProfile';
import MedicalRecords from '../../packages/patient-ui/components/MedicalRecords';
import Teleconsultation from '../../packages/patient-ui/components/Teleconsultation';
import PharmacyHub from '../../packages/patient-ui/components/PharmacyHub';
import PartnerDetails from '../../packages/patient-ui/components/PartnerDetails';
import PartnersList from '../../packages/patient-ui/components/PartnersList';
import PasswordChangeModal from '../../packages/patient-ui/components/PasswordChangeModal';

// ============================================================================
// TIPOS
// ============================================================================

export type PlanStatus = 'ACTIVE' | 'BLOCKED';

export interface UserData {
  id: string;
  name: string;
  email: string;
  type: 'PF' | 'PJ';
  avatar: string;
  planStatus: PlanStatus;
  planId: string;
  cpf: string;
  cellPhone: string;
  birthDate: string;
  timezone: string;
  tagId: string;
  mustChangePassword?: boolean;
  healthProfile?: HealthProfile;
  isValidated?: boolean;
}

export type View = 'home' | 'schedule' | 'aichat' | 'health' | 'profile' | 'records' | 'consultation' | 'pharmacy' | 'partners' | 'partner';

// ============================================================================
// APP MOBILE PACIENTE
// ============================================================================

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<View>('home');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Busca parceiros
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const { data } = await supabase
          .from('partners')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (data) setPartners(data);
      } catch (err) {
        console.warn('Erro ao buscar parceiros:', err);
      }
    };
    fetchPartners();
  }, []);

  // Carrega perfil do usuário
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const userType = profile?.user_type || user?.user_metadata?.user_type || 'PF';
      const upperType = String(userType).toUpperCase();

      // Este app é exclusivo para PF e PJ
      if (!['PF', 'PJ'].includes(upperType)) {
        setLoginError('Este aplicativo é exclusivo para pacientes. Use o painel web para acesso administrativo.');
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const userData: UserData = {
        id: userId,
        name: profile?.full_name || user?.user_metadata?.full_name || 'Paciente Vivemus',
        email: user?.email || '',
        type: upperType as 'PF' | 'PJ',
        planStatus: profile?.plan_status || user.user_metadata?.plan_status || 'ACTIVE',
        planId: profile?.plan_id || user.user_metadata?.plan_id || 'plano_padrao',
        cpf: profile?.cpf || user.user_metadata?.cpf || '',
        cellPhone: profile?.cell_phone || user.user_metadata?.cell_phone || '',
        birthDate: profile?.birth_date || user.user_metadata?.birth_date || '',
        timezone: profile?.timezone || user.user_metadata?.timezone || 'America/Cuiaba',
        tagId: profile?.tag_id || user.user_metadata?.tag_id || '',
        mustChangePassword: profile?.must_change_password || false,
        isValidated: profile?.is_validated || false,
        avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'P')}&background=00A3FF&color=fff`,
      };

      setCurrentUser(userData);
      setIsAuthenticated(true);

      // Verifica se plano está bloqueado
      if (userData.planStatus === 'BLOCKED') {
        setLoginError('Seu plano está suspenso. Entre em contato com o suporte.');
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Solicita troca de senha no primeiro acesso
      if (userData.mustChangePassword) {
        setShowPasswordChangeModal(true);
      }

    } catch (err: any) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await fetchUserProfile(session.user.id);
      else setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const email = emailRef.current?.value.trim().toLowerCase();
    const password = passwordRef.current?.value;

    if (!email || !password) {
      setLoginError("Preencha todos os campos.");
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoginError(error.message === "Failed to fetch"
          ? "Erro de conexão. Verifique sua rede."
          : error.message);
      }
    } catch {
      setLoginError("Erro de conexão.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('home');
  };

  // Navegação
  const handleNavigate = (view: string) => {
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

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
            <span className="text-3xl font-black text-white">V</span>
          </div>
          <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TELA DE LOGIN (Mobile-First)
  // ============================================================================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
            <span className="text-4xl font-black text-white">V</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Vivemus</h1>
          <p className="text-blue-200 text-sm font-medium">Sua saúde digital na palma da mão</p>
        </div>

        {/* Card de Login */}
        <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl">
          <h2 className="text-lg font-black text-slate-800 mb-6">Acessar sua conta</h2>

          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700 font-medium">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={emailRef}
                type="email"
                placeholder="Seu e-mail"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-slate-700 font-medium border-2 border-transparent focus:border-blue-200 transition-all"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={passwordRef}
                type="password"
                placeholder="Sua senha"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-slate-700 font-medium border-2 border-transparent focus:border-blue-200 transition-all"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Primeira vez? Sua senha inicial é <strong className="text-slate-600">Saude@123</strong>
            </p>
          </div>
        </div>

        <p className="text-blue-300/50 text-xs mt-8 font-medium">
          Vivemus Health Tech &copy; {new Date().getFullYear()}
        </p>
      </div>
    );
  }

  // ============================================================================
  // APP PRINCIPAL (Paciente Mobile)
  // ============================================================================

  const tabs = [
    { id: 'home' as View, label: 'Home', icon: Home },
    { id: 'schedule' as View, label: 'Agenda', icon: Calendar },
    { id: 'aichat' as View, label: 'IA', icon: Bot },
    { id: 'health' as View, label: 'Saúde', icon: Heart },
    { id: 'profile' as View, label: 'Perfil', icon: User },
  ];

  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'home':
        return (
          <StartScreen
            user={currentUser as any}
            onSelect={handleNavigate as any}
            onPartnerSelect={handlePartnerSelect}
            partners={partners}
          />
        );
      case 'schedule':
        return <Schedule />;
      case 'aichat':
        return <AIChat />;
      case 'health':
        return <MyHealth user={currentUser as any} onUpdateHealth={() => {}} onAddNotif={() => {}} />;
      case 'profile':
        return (
          <div>
            <UserProfile user={currentUser as any} onUpdate={() => fetchUserProfile(currentUser.id)} />
            <div className="mt-4 px-4">
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <LogOut size={18} />
                Sair da conta
              </button>
            </div>
          </div>
        );
      case 'records':
        return <MedicalRecords />;
      case 'consultation':
        return <Teleconsultation onExit={handleBack} />;
      case 'pharmacy':
        return <PharmacyHub onBack={handleBack} />;
      case 'partners':
        return <PartnersList onPartnerSelect={handlePartnerSelect} partners={partners} />;
      case 'partner':
        return <PartnerDetails partner={selectedPartner} onBack={() => setActiveTab('partners')} />;
      default:
        return null;
    }
  };

  const isSecondaryScreen = ['consultation', 'pharmacy', 'partner'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header compacto com nome do usuário */}
      {!isSecondaryScreen && (
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatar}
              alt=""
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <p className="text-sm font-bold text-slate-800 line-clamp-1">
                {currentUser?.name?.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                {currentUser?.type === 'PJ' ? 'Beneficiário' : 'Individual'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
              currentUser?.planStatus === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-600'
            }`}>
              {currentUser?.planStatus === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
            </span>
          </div>
        </header>
      )}

      {/* Conteúdo Principal */}
      <main className={`flex-1 overflow-y-auto ${isSecondaryScreen ? '' : 'pb-24'}`}>
        <div className="px-4 py-4">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      {!isSecondaryScreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-area-bottom z-50">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id ||
                (tab.id === 'home' && ['records', 'partners'].includes(activeTab));

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-95 ${
                    isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
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

      {/* Modal de troca de senha */}
      {showPasswordChangeModal && currentUser && (
        <PasswordChangeModal
          userId={currentUser.id}
          onClose={() => setShowPasswordChangeModal(false)}
          onSuccess={() => {
            setShowPasswordChangeModal(false);
            if (currentUser) {
              setCurrentUser({ ...currentUser, mustChangePassword: false });
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
