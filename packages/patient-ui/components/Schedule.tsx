
import React, { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Star, ChevronRight, Video, Stethoscope, Clock, Loader2 } from 'lucide-react';
import { ConsultaAgendamento } from '../services/draovivoService';

interface ScheduleProps {
  consultas: ConsultaAgendamento[];
  loading: boolean;
  onStartConsultation: () => void;
}

const Schedule: React.FC<ScheduleProps> = ({ consultas, loading, onStartConsultation }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const statusOptions = ['All', 'PENDING', 'COMPLETED', 'CANCELLED'];

  const filteredConsultas = filterStatus === 'All'
    ? consultas
    : consultas.filter(c => c.status?.toUpperCase() === filterStatus);

  const statusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return { text: 'Pendente', color: 'bg-amber-50 text-amber-600' };
      case 'COMPLETED': return { text: 'Concluida', color: 'bg-emerald-50 text-emerald-600' };
      case 'CANCELLED': return { text: 'Cancelada', color: 'bg-red-50 text-red-600' };
      default: return { text: status, color: 'bg-slate-50 text-slate-600' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Minha Agenda</h1>
          <p className="text-slate-500">Suas consultas e agendamentos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-slate-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Minha Agenda</h1>
          <p className="text-slate-500">Suas consultas e agendamentos.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {statusOptions.map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {status === 'All' ? 'Todas' : statusLabel(status).text}
            </button>
          ))}
        </div>
      </div>

      {filteredConsultas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Stethoscope size={40} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-2">
            {consultas.length === 0 ? 'Nenhuma consulta registrada' : 'Nenhuma consulta com este filtro'}
          </h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">
            Inicie uma teleconsulta agora ou agende um atendimento com nossos especialistas.
          </p>
          <button
            onClick={onStartConsultation}
            className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <Video size={20} />
            Iniciar Teleconsulta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConsultas.map(consulta => {
            const status = statusLabel(consulta.status);
            const consultaDate = new Date(consulta.date);
            const isToday = new Date().toDateString() === consultaDate.toDateString();

            return (
              <div key={consulta.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-slate-50 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                        <Stethoscope size={28} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{consulta.doctor_name}</h3>
                        <p className="text-sm text-blue-600 font-semibold">{consulta.specialty}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${status.color}`}>
                      {status.text}
                    </div>
                  </div>

                  <div className="space-y-3 py-4 border-y border-slate-50">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin size={16} />
                      <span>Atendimento Digital Vivemus</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <CalendarIcon size={16} />
                      <span>
                        {isToday ? 'Hoje' : consultaDate.toLocaleDateString('pt-BR')} as {consultaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {consulta.duration_minutes && (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Clock size={16} />
                        <span>{consulta.duration_minutes} min</span>
                      </div>
                    )}
                  </div>

                  {consulta.status?.toUpperCase() === 'PENDING' && (
                    <button
                      onClick={onStartConsultation}
                      className="w-full mt-6 py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                    >
                      Entrar na Consulta
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Schedule;
