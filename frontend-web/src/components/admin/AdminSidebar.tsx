
import React from 'react';
import { Activity, Users, Palette, Terminal, Database, Cpu, Link2, LucideIcon, LayoutDashboard, WalletCards, FileUp, Crown, Building, MessageSquare, UserCog, LayoutGrid } from 'lucide-react';
import { UserData } from '../App';

interface Tab {
  id: 'overview' | 'partners' | 'branding' | 'logs' | 'users' | 'database' | 'api' | 'ai_training' | 'asaas' | 'import' | 'contracts' | 'whatsapp' | 'patients' | 'patient_sections';
  label: string;
  icon: LucideIcon;
  count?: number;
  restrictedTo?: 'MASTER';
}

interface AdminSidebarProps {
  user: UserData;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  partnersCount: number;
  isImporting?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user, activeTab, setActiveTab, partnersCount, isImporting }) => {
  const isMaster = user.type === 'MASTER';

  const tabs: Tab[] = [
    { id: 'overview', label: 'Dashboard', icon: Activity },
    { id: 'contracts', label: 'Gestão Empresas', icon: Building, restrictedTo: 'MASTER' },
    { id: 'whatsapp', label: 'Config. WhatsApp', icon: MessageSquare, restrictedTo: 'MASTER' },
    { id: 'api', label: 'Telemedicina API', icon: Link2, restrictedTo: 'MASTER' },
    { id: 'asaas', label: 'Pagamentos Asaas', icon: WalletCards, restrictedTo: 'MASTER' },
    { id: 'ai_training', label: 'IA & Prompting', icon: Cpu, restrictedTo: 'MASTER' },
    { id: 'import', label: 'Carga em Massa', icon: FileUp },
    { id: 'patients', label: 'Gestao Pacientes', icon: UserCog },
    { id: 'patient_sections', label: 'Modulos Paciente', icon: LayoutGrid },
    { id: 'partners', label: 'Rede Credenciada', icon: Database, count: partnersCount },
    { id: 'users', label: 'Gestão de Perfis', icon: Users },
    { id: 'branding', label: 'White Label UI', icon: Palette, restrictedTo: 'MASTER' },
    { id: 'logs', label: 'Eventos (Audit)', icon: Terminal }
  ];

  const visibleTabs = tabs.filter(tab => !tab.restrictedTo || (tab.restrictedTo === 'MASTER' && isMaster));

  return (
    <aside className="lg:col-span-1 space-y-3">
      <div className={`px-8 py-6 mb-6 rounded-[2rem] border shadow-2xl relative overflow-hidden group transition-all ${
        isMaster ? 'bg-amber-500 border-amber-600' : 'bg-slate-900 border-slate-800'
      }`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 relative z-10 ${isMaster ? 'text-amber-900' : 'text-blue-400'}`}>
          {isMaster ? 'System Owner' : 'Platform Admin'}
        </p>
        <p className="text-lg font-black text-white relative z-10 flex items-center gap-2">
           {isMaster && <Crown size={18} />}
           Vivemus Core
        </p>
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
           <LayoutDashboard size={80} className="text-white" />
        </div>
      </div>

      <div className="space-y-1">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all border outline-none ${
              activeTab === tab.id 
              ? isMaster 
                ? 'bg-amber-500 text-white border-amber-500 translate-x-1' 
                : 'bg-slate-900 text-white shadow-xl border-slate-900 translate-x-1' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-slate-300'} />
              {tab.label}
              {tab.id === 'import' && isImporting && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${activeTab === tab.id ? 'bg-white/10' : 'bg-slate-100 text-slate-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default AdminSidebar;
