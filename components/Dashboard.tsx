
import React from 'react';
import { Video, Calendar, Clock, ArrowRight, UserCheck, Heart } from 'lucide-react';
import { MOCK_APPOINTMENTS } from '../constants';
import { UserData } from '../App';

interface DashboardProps {
  user: UserData;
  onNavigate: (view: 'dashboard' | 'schedule' | 'records' | 'consultation' | 'aichat') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h1 className="text-4xl font-black">Olá, {user.name.split(' ')[0]}! 👋</h1>
          <p className="text-blue-100 text-lg leading-relaxed">Bem-vindo à sua central de saúde inteligente. Estamos monitorando seus indicadores para garantir sua melhor performance.</p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => onNavigate('consultation')}
              className="px-8 py-4 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 active:scale-95 hover:scale-[1.05] transition-all shadow-xl shadow-black/10 flex items-center gap-3"
            >
              Sala de Consulta Virtual
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => onNavigate('schedule')}
              className="px-8 py-4 bg-white/20 text-white font-bold rounded-2xl backdrop-blur-md hover:bg-white/30 active:scale-95 transition-all"
            >
              Ver Minha Agenda
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/2 bg-white/5 skew-x-[30deg] transform translate-x-1/2 pointer-events-none group-hover:translate-x-[40%] transition-transform duration-1000"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <Calendar size={28} />
          </div>
          <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Próxima Consulta</h3>
          <p className="text-2xl font-black text-slate-800 mt-2">Hoje, 14:30</p>
          <p className="text-xs text-blue-600 mt-1 font-bold">Telemedicina Ativa</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <Heart size={28} />
          </div>
          <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Sinais Vitais</h3>
          <p className="text-2xl font-black text-slate-800 mt-2">Excelente</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full w-[95%]"></div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner">
            <UserCheck size={28} />
          </div>
          <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Favoritos</h3>
          <p className="text-2xl font-black text-slate-800 mt-2">4 Médicos</p>
          <p className="text-xs text-purple-600 mt-1 font-bold">Acesso rápido disponível</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        {/* Quick Actions */}
        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-8">Ações Inteligentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button 
              onClick={() => onNavigate('schedule')}
              className="p-8 bg-slate-50 hover:bg-blue-50 rounded-[2rem] border-2 border-transparent hover:border-blue-100 active:scale-95 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Clock size={24} />
              </div>
              <span className="font-black text-slate-800 text-sm">Novo Agendamento</span>
              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Presencial ou Vídeo</p>
            </button>
            <button 
              onClick={() => onNavigate('aichat')}
              className="p-8 bg-slate-50 hover:bg-indigo-50 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 active:scale-95 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Video size={24} />
              </div>
              <span className="font-black text-slate-800 text-sm">Triagem com IA</span>
              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Dúvidas rápidas</p>
            </button>
          </div>
        </section>

        {/* Appointments Preview */}
        <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Próximos Passos</h2>
            <button onClick={() => onNavigate('schedule')} className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline active:opacity-70">Ver Tudo</button>
          </div>
          <div className="space-y-4">
            {MOCK_APPOINTMENTS.map(app => (
              <div key={app.id} className="flex items-center gap-5 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                <div className="w-14 h-14 bg-white rounded-2xl overflow-hidden border-2 border-slate-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src={`https://picsum.photos/seed/${app.doctorId}/100`} alt={app.doctorName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800 text-sm">{app.doctorName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{app.specialty} • {app.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{app.time}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.date}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
