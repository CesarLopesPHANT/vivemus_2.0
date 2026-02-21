
import React from 'react';
import { ChevronRight, Activity, Zap, Cpu, Server, Database, Globe, ArrowUpRight } from 'lucide-react';
import { Partner } from '../types';

// Prop onNavigateToPartners renamed to onNavigate to match AdminPanel usage
interface AdminOverviewProps {
  partners: Partner[];
  onNavigate: (tab: any) => void;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ partners, onNavigate }) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Infrastructure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Latência Global', val: '18ms', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Uso de Storage', val: '1.2 GB', icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Req/Seg (Pico)', val: '450', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Região Backend', val: 'AWS-SA-1', icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h2 className="text-xl font-black text-slate-900 mt-1">{stat.val}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Monitor */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  Sistema Operacional
                </h3>
                <p className="text-slate-400 text-xs">Monitoramento de eventos de backend Vivemus</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400">OK</p>
                <p className="text-[10px] text-slate-500 uppercase font-black">Cluster Health</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-end gap-1 h-24">
                {[40, 70, 45, 90, 65, 85, 40, 55, 75, 60, 80, 45, 30, 95, 70, 85, 40, 60, 100, 75, 45, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/10 rounded-t-sm hover:bg-blue-500 transition-all cursor-crosshair" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest border-t border-white/5 pt-4">
                <span>00:00 UTC</span>
                <span>Tráfego de API (Requisições/Minuto)</span>
                <span>AGORA</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Database Quick Summary */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-6">Database Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total Parceiros</span>
                <span className="font-black text-slate-900">{partners.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Consultas Mes</span>
                <span className="font-black text-slate-900">1,248</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Novos Leads RH</span>
                <span className="font-black text-emerald-600">+12</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate('partners')}
            className="mt-8 w-full py-4 bg-slate-50 text-slate-900 font-bold rounded-2xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 group"
          >
            Gerenciar Dados
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
