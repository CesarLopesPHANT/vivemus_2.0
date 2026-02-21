
import React, { useState } from 'react';
import {
  FileText,
  Calendar as CalendarIcon,
  ChevronDown,
  Search,
  ChevronUp,
  Loader2,
  ClipboardList
} from 'lucide-react';
import { ConsultaAgendamento, ProtocoloFilaVirtual } from '../services/draovivoService';

interface MedicalRecordsProps {
  consultas: ConsultaAgendamento[];
  protocolos: ProtocoloFilaVirtual[];
  loading: boolean;
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ consultas, protocolos, loading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(consultas[0]?.id || null);

  // Mapeia protocolo por CPF para enriquecer consultas
  const getProtocolo = (cpf: string) => {
    return protocolos.find(p => p.patient_cpf?.replace(/\D/g, '') === cpf?.replace(/\D/g, ''));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-slate-800">Prontuario Eletronico</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 animate-pulse">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-slate-800">Prontuario Eletronico</h1>
      </div>

      {/* Filtros Superiores */}
      <div className="flex flex-wrap gap-3 mb-8">
        {['Periodo', 'Status', 'Profissional', 'Especialidade'].map((filter) => (
          <button
            key={filter}
            className="flex items-center gap-4 px-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-400 transition-all shadow-sm"
          >
            {filter}
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        ))}
      </div>

      {/* Lista de Prontuarios */}
      {consultas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-2">Nenhum registro encontrado</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Seus prontuarios aparecerao aqui apos suas consultas na plataforma Vivemus.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultas.map((consulta) => {
            const protocolo = getProtocolo(consulta.patient_cpf);
            return (
              <div key={consulta.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Header do Card */}
                <div
                  onClick={() => setExpandedId(expandedId === consulta.id ? null : consulta.id)}
                  className="p-5 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <CalendarIcon size={20} />
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-1">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Atendimento</h3>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-bold">Data:</span> {new Date(consulta.date).toLocaleDateString('pt-BR')} {new Date(consulta.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs text-slate-600 mt-5">
                          <span className="font-bold">Profissional:</span> {consulta.doctor_name} | {consulta.specialty}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="text-slate-400">
                    {expandedId === consulta.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {/* Conteudo Detalhado */}
                {expandedId === consulta.id && (
                  <div className="p-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 gap-1.5 text-[13px] leading-relaxed">
                      <p><span className="font-bold">Especialidade:</span> {consulta.specialty}</p>
                      <p><span className="font-bold">Status:</span> {consulta.status}</p>
                      {protocolo && (
                        <p><span className="font-bold">Protocolo:</span> {protocolo.protocol_number}</p>
                      )}
                      <p><span className="font-bold">Profissional:</span> {consulta.doctor_name}</p>
                      {consulta.duration_minutes && (
                        <p><span className="font-bold">Duracao:</span> {consulta.duration_minutes} minutos</p>
                      )}
                      {protocolo && (
                        <>
                          <p><span className="font-bold">Tipo Fila:</span> {protocolo.queue_type}</p>
                          {protocolo.wait_time_minutes != null && (
                            <p><span className="font-bold">Tempo de Espera:</span> {protocolo.wait_time_minutes} min</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Informativo Vivemus */}
      <div className="mt-12 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
        <FileText className="text-blue-600 shrink-0 mt-1" size={24} />
        <div>
          <h4 className="font-bold text-blue-900 mb-1">Validade Juridica</h4>
          <p className="text-sm text-blue-700 leading-relaxed">
            Todos os documentos disponiveis nesta plataforma possuem assinatura digital padrao ICP-Brasil, garantindo validade em todo o territorio nacional para receitas, atestados e exames.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecords;
