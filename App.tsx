
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LogOut, 
  Crown,
  LayoutDashboard,
  UserCircle,
  Briefcase,
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  ShieldCheck,
  X,
  AlertTriangle,
  Building2,
  User,
  ShieldAlert,
  BarChart3,
  Users,
  MessageCircle,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Key
} from 'lucide-react';
import { supabase } from './lib/supabase';
import Schedule from './components/Schedule';
import MedicalRecords from './components/MedicalRecords';
import Teleconsultation from './components/Teleconsultation';
import AIChat from './components/AIChat';
import StartScreen from './components/StartScreen';
import Register from './components/Register';
import PharmacyHub from './components/PharmacyHub';
import PartnerDetails from './components/PartnerDetails';
import PartnersList from './components/PartnersList';
import UserProfile from './components/UserProfile';
import MyHealth from './components/MyHealth';
import AdminPanel from './components/AdminPanel';
import PasswordChangeModal from './components/PasswordChangeModal';
import CompanyDashboard from './components/CompanyDashboard';
import MobilePatientApp from './components/MobilePatientApp';
import { HealthProfile, Partner } from './types';
import { isInBulkImportMode } from './services/importService';

export type UserRole = 'PF' | 'PJ' | 'ADM' | 'MASTER';
export type PlanStatus = 'ACTIVE' | 'BLOCKED';

export interface UserData {
  id: string;
  name: string;
  email: string;
  type: UserRole;
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
  // Added isValidated property to UserData to fix component errors
  isValidated?: boolean;
}

export interface BrandSettings {
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string;
  accentColor: string;
}

export type View = 'start' | 'dashboard' | 'schedule' | 'records' | 'consultation' | 'aichat' | 'pharmacy' | 'partner' | 'partners_list' | 'profile' | 'health' | 'admin' | 'company';
export type LoginView = 'selection' | 'login' | 'register' | 'forgot-password';
export type RoleSelection = 'PF' | 'ADM' | 'MASTER';

const BrandLogo = ({ settings, size = 'small', white = false }: { settings: BrandSettings, size?: 'small' | 'large', white?: boolean }) => (
  <div className={`flex items-center gap-2 ${size === 'large' ? 'mb-6' : ''}`}>
    {settings.logoUrl ? (
      <img 
        src={settings.logoUrl} 
        alt="Logo Vivemus" 
        className={size === 'large' ? 'h-20 w-auto' : 'h-10 w-auto'} 
        style={{ filter: white ? 'brightness(0) invert(1)' : 'none', objectFit: 'contain' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    ) : (
      <div className="flex flex-col -space-y-1.5">
        <span className={`${size === 'large' ? 'text-6xl' : 'text-2xl'} font-black tracking-tighter leading-none`} style={{ color: white ? '#FFFFFF' : settings.primaryColor }}>vivemus</span>
        <span className={`${size === 'large' ? 'text-[12px]' : 'text-[8px]'} font-bold uppercase tracking-[0.3em] pl-1`} style={{ color: white ? 'rgba(255,255,255,0.7)' : settings.accentColor }}>clínica digital</span>
      </div>
    )}
  </div>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('start');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStage, setAuthStage] = useState<LoginView>('login');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // Sempre iniciar na tela de login - limpa hash da URL
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleSelection>('PF');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => {
    const stored = localStorage.getItem('vivemus_brand');
    return stored ? JSON.parse(stored) : {
      logoUrl: null,
      iconUrl: null,
      primaryColor: '#00A3FF',
      accentColor: '#00D1B2'
    };
  });

  const masterEmails = ['master@vivemus.com.br', 'cesarlopes@agenciaphant.com.br', 'thiago.hoppen@gmail.com'];

  // Verifica permissões de rede e chave de API
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - aistudio injeção externa
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelection = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setNeedsKey(false); // Procede assumindo sucesso para evitar race condition
    }
  };

  useEffect(() => {
    const fetchGlobalBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'branding')
          .maybeSingle();
        
        if (!error && data?.value) {
          setBrandSettings(data.value);
          localStorage.setItem('vivemus_brand', JSON.stringify(data.value));
        }
      } catch (err) {}
    };
    fetchGlobalBranding();
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const isSystemMaster = masterEmails.includes(user.email?.toLowerCase() || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let finalUserType: UserRole = 'PF';
      const rawType = profile?.user_type || user.user_metadata?.user_type || 'PF';
      const upperType = rawType.toUpperCase();

      if (isSystemMaster || upperType === 'MASTER') finalUserType = 'MASTER';
      else if (['ADM', 'ADMIN', 'RH', 'GESTOR'].includes(upperType)) finalUserType = 'ADM';
      else if (upperType === 'PJ') finalUserType = 'PJ';

      const userData: UserData = {
        id: userId,
        name: profile?.full_name || user?.user_metadata?.full_name || 'Usuário Vivemus',
        email: user?.email || '',
        type: finalUserType,
        planStatus: profile?.plan_status || user.user_metadata?.plan_status || 'ACTIVE',
        planId: profile?.plan_id || user.user_metadata?.plan_id || 'plano_padrao',
        cpf: profile?.cpf || user.user_metadata?.cpf || '',
        cellPhone: profile?.cell_phone || user.user_metadata?.cell_phone || '',
        birthDate: profile?.birth_date || user.user_metadata?.birth_date || '',
        timezone: profile?.timezone || user.user_metadata?.timezone || 'America/Cuiaba',
        tagId: profile?.tag_id || user.user_metadata?.tag_id || '',
        mustChangePassword: profile?.must_change_password || false,
        // Correctly set isValidated from profile data
        isValidated: profile?.is_validated || false,
        avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=00A3FF&color=fff`,
      };
      
      setCurrentUser(userData);
      setIsAuthenticated(true);
      
      if (!profile && user.email) {
        await supabase.from('profiles').insert([{
          id: userId,
          full_name: userData.name,
          email: userData.email,
          user_type: userData.type,
          plan_status: userData.planStatus,
          cpf: userData.cpf,
          cell_phone: userData.cellPhone,
          birth_date: userData.birthDate,
          timezone: userData.timezone,
          tag_id: userData.tagId,
          plan_id: userData.planId
        }]);
      }

      // Só mostra o modal de troca de senha se:
      // 1. O usuário precisa trocar a senha (must_change_password = true)
      // 2. NÃO estamos em modo de importação em massa
      // Isso evita que o modal apareça para o admin durante a criação de usuários
      if (userData.mustChangePassword && !isInBulkImportMode()) {
        setShowPasswordChangeModal(true);
      }

      if (finalUserType === 'MASTER') setCurrentView('admin');
      else if (finalUserType === 'ADM') setCurrentView('company');
      else setCurrentView('start');

    } catch (err: any) {
      setIsAuthenticated(false);
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await fetchUserProfile(session.user.id);
      else setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignora TODAS as mudancas de sessao durante importacao em massa
      // O signUp() dispara SIGNED_IN para cada paciente criado, o que faria
      // o sistema logar na conta do paciente em vez de manter o admin
      if (isInBulkImportMode()) {
        console.log(`[Auth] Evento ${event} ignorado - importacao em massa ativa`);
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthStage('login');
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoginError(error.message === "Failed to fetch" ? "Erro de conexão com o banco. Verifique sua rede." : error.message);
      }
    } catch (err: any) {
      setLoginError("Erro de conexão.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Vivemus Gate: Autenticando...</p>
    </div>
  );

  // Modal de Seleção de Chave (Exigência Gemini 3)
  if (needsKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-2xl">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Key size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">Configuração Necessária</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Para utilizar os recursos de Inteligência Artificial e Telemedicina Avançada do Vivemus, você precisa selecionar uma chave de API válida (projeto faturado).
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleOpenKeySelection}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              Selecionar API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="block text-xs text-blue-500 font-bold hover:underline"
            >
              Como configurar o faturamento?
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authStage === 'register') return <Register onBack={() => setAuthStage('login')} onSuccess={() => setAuthStage('login')} />;
    
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${brandSettings.primaryColor}, transparent)` }}></div>
        
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative z-10 border border-slate-100">
          <div className="p-10 md:p-12 space-y-8">
            <div className="flex flex-col items-center text-center">
              <BrandLogo settings={brandSettings} size="large" />
            </div>

            <div className="flex p-1 bg-slate-100 rounded-2xl">
              {['PF', 'ADM', 'MASTER'].map((role) => (
                <button key={role} onClick={() => setSelectedRole(role as RoleSelection)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${selectedRole === role ? 'bg-white shadow-sm' : 'text-slate-400'}`} style={{ color: selectedRole === role ? brandSettings.primaryColor : undefined }}>
                   {role === 'PF' ? <User size={14} /> : role === 'ADM' ? <Building2 size={14}/> : <ShieldAlert size={14}/>}
                   {role === 'PF' ? 'Paciente' : role === 'ADM' ? 'Empresa' : 'Admin'}
                </button>
              ))}
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in shake">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-[11px] text-red-700 font-bold leading-tight">{loginError}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input ref={emailRef} type="email" placeholder="seu@email.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all border" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input ref={passwordRef} type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white transition-all border" required />
                </div>
              </div>
              <button type="submit" disabled={authLoading} className="w-full py-5 text-white font-black rounded-3xl active:scale-95 transition-all shadow-xl" style={{ backgroundColor: brandSettings.primaryColor }}>
                {authLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Acessar Vivemus'}
              </button>
            </form>
            
            <div className="text-center pt-4 border-t border-slate-50">
              <button onClick={() => setAuthStage('register')} className="text-slate-400 font-bold text-xs hover:text-blue-600 transition-all">Não tem acesso? <span style={{ color: brandSettings.primaryColor }}>Ativar Acesso</span></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.planStatus === 'BLOCKED' && currentUser?.type !== 'MASTER') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-red-100">
           <ShieldAlert size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Acesso Bloqueado</h1>
        <p className="text-slate-500 max-w-sm mb-10 font-medium">
          Identificamos uma pendência em seu plano <b>{currentUser.planId}</b>. Para restabelecer seu acesso à telemedicina, entre em contato com nosso suporte financeiro.
        </p>
        <div className="space-y-4 w-full max-w-xs">
           <button onClick={() => window.open('https://wa.me/5511999999999', '_blank')} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              <MessageCircle size={20} /> Resolver Agora
           </button>
           <button onClick={async () => await supabase.auth.signOut()} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600">Sair da Conta</button>
        </div>
      </div>
    );
  }

  // Mobile Patient App para usuários PF/PJ
  if (currentUser?.type === 'PF' || currentUser?.type === 'PJ') {
    return (
      <>
        {/* Header Mobile Simplificado */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between px-4 z-50">
          <BrandLogo settings={brandSettings} />
          <button onClick={() => setShowLogoutModal(true)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl">
            <LogOut size={20}/>
          </button>
        </header>

        {/* Spacer para o header fixo */}
        <div className="h-14" />

        {/* Mobile Patient App */}
        <MobilePatientApp
          user={currentUser}
          partners={partners}
          onUpdateProfile={() => fetchUserProfile(currentUser.id)}
        />

        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-8 text-center shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95">
              <h3 className="text-xl font-black mb-3">Sair do Vivemus?</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">Seu progresso de saúde está seguro.</p>
              <div className="space-y-3">
                <button onClick={async () => { await supabase.auth.signOut(); setShowLogoutModal(false); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95">Sair</button>
                <button onClick={() => setShowLogoutModal(false)} className="w-full py-3 text-slate-400 font-bold">Cancelar</button>
              </div>
            </div>
          </div>
        )}
        {showPasswordChangeModal && <PasswordChangeModal userId={currentUser.id} onSuccess={() => setShowPasswordChangeModal(false)} />}
      </>
    );
  }

  // Layout Desktop para MASTER e ADM
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <BrandLogo settings={brandSettings} />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentView('profile')} className={`p-3 rounded-2xl ${currentView === 'profile' ? 'bg-slate-50' : 'text-slate-300 hover:bg-slate-50'}`} style={{ color: currentView === 'profile' ? brandSettings.primaryColor : undefined }}>
            <UserCircle size={22}/>
          </button>
          <button onClick={() => setShowLogoutModal(true)} className="p-3 text-slate-300 hover:text-red-500 rounded-2xl">
            <LogOut size={22}/>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
           {currentUser?.type === 'MASTER' && currentView === 'admin' && <AdminPanel user={currentUser!} onUpdateBranding={setBrandSettings} currentBranding={brandSettings} partners={partners} onRefresh={() => {}} />}
           {currentUser?.type === 'ADM' && currentView === 'company' && <CompanyDashboard user={currentUser!} />}
           {currentView === 'profile' && <UserProfile user={currentUser!} onUpdate={() => fetchUserProfile(currentUser!.id)} />}
        </div>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-sm rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-4">Sair do Vivemus?</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Seu progresso de saúde está seguro.</p>
            <div className="space-y-3">
              <button onClick={async () => { await supabase.auth.signOut(); setShowLogoutModal(false); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95">Sair com Segurança</button>
              <button onClick={() => setShowLogoutModal(false)} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all">Manter Conectado</button>
            </div>
          </div>
        </div>
      )}
      {showPasswordChangeModal && currentUser && <PasswordChangeModal userId={currentUser.id} onSuccess={() => setShowPasswordChangeModal(false)} />}
    </div>
  );
};

export default App;
