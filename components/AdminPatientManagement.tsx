
import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Key,
  Lock,
  Unlock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  X,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Building2
} from 'lucide-react';
import {
  buscarPacientes,
  resetarSenhaPaciente,
  resetarSenhaEmMassa,
  alterarStatusPaciente,
  excluirPaciente,
  obterSenhaPadrao,
  Paciente
} from '../services/importService';

interface AdminPatientManagementProps {
  onRefresh?: () => void;
}

const AdminPatientManagement: React.FC<AdminPatientManagementProps> = ({ onRefresh }) => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'PF' | 'PJ'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ACTIVE' | 'BLOCKED'>('todos');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    type: 'reset' | 'resetMassa' | 'bloquear' | 'desbloquear' | 'excluir';
    paciente?: Paciente;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const senhaPadrao = obterSenhaPadrao();

  const carregarPacientes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dados = await buscarPacientes({
        tipo: filtroTipo === 'todos' ? undefined : filtroTipo,
        status: filtroStatus === 'todos' ? undefined : filtroStatus,
        busca: busca || undefined
      });
      setPacientes(dados);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pacientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, [filtroTipo, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.length >= 3 || busca.length === 0) {
        carregarPacientes();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const handleResetSenha = async (paciente: Paciente) => {
    setActionLoading(paciente.id);
    try {
      const result = await resetarSenhaPaciente(paciente.id);
      if (result.success) {
        setFeedback({ type: 'success', message: `Senha de ${paciente.full_name} resetada para: ${senhaPadrao}` });
        carregarPacientes();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro ao resetar senha' });
      }
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleResetSenhaEmMassa = async () => {
    setActionLoading('massa');
    try {
      const result = await resetarSenhaEmMassa(selecionados);
      setFeedback({
        type: result.erros === 0 ? 'success' : 'error',
        message: `${result.sucesso} senhas resetadas${result.erros > 0 ? `, ${result.erros} erros` : ''}`
      });
      setSelecionados([]);
      carregarPacientes();
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleAlterarStatus = async (paciente: Paciente, novoStatus: 'ACTIVE' | 'BLOCKED') => {
    setActionLoading(paciente.id);
    try {
      const result = await alterarStatusPaciente(paciente.id, novoStatus);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `${paciente.full_name} ${novoStatus === 'ACTIVE' ? 'desbloqueado' : 'bloqueado'} com sucesso`
        });
        carregarPacientes();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro ao alterar status' });
      }
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const handleExcluir = async (paciente: Paciente) => {
    setActionLoading(paciente.id);
    try {
      const result = await excluirPaciente(paciente.id);
      if (result.success) {
        setFeedback({ type: 'success', message: `${paciente.full_name} excluido do sistema` });
        carregarPacientes();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro ao excluir' });
      }
    } finally {
      setActionLoading(null);
      setShowConfirmModal(null);
    }
  };

  const toggleSelecao = (id: string) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selecionados.length === pacientes.length) {
      setSelecionados([]);
    } else {
      setSelecionados(pacientes.map(p => p.id));
    }
  };

  const formatarCPF = (cpf: string) => {
    const clean = String(cpf || '').replace(/\D/g, '').padStart(11, '0');
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  };

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Gestao de Pacientes</h2>
              <p className="text-slate-500 text-sm">{pacientes.length} pacientes cadastrados</p>
            </div>
          </div>
          <button
            onClick={carregarPacientes}
            disabled={isLoading}
            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Barra de busca e filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, email ou CPF..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="todos">Todos os tipos</option>
            <option value="PF">Individual (PF)</option>
            <option value="PJ">Corporativo (PJ)</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="todos">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
        </div>

        {/* Acoes em massa */}
        {selecionados.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-center justify-between">
            <span className="text-sm font-bold text-blue-700">
              {selecionados.length} paciente(s) selecionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmModal({ type: 'resetMassa' })}
                className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 flex items-center gap-2"
              >
                <Key size={16} />
                Resetar Senhas
              </button>
              <button
                onClick={() => setSelecionados([])}
                className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-300"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mx-6 mt-4 p-4 rounded-xl flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Info senha padrao */}
      <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
        <Key size={20} className="text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-800">Senha Padrao do Sistema</p>
          <p className="text-xs text-amber-600">
            Ao resetar, a senha sera: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">{senhaPadrao}</code>
            {' '}(usuario deve trocar no primeiro acesso)
          </p>
        </div>
      </div>

      {/* Tabela de pacientes */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
          </div>
        ) : pacientes.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhum paciente encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-3">
                    <input
                      type="checkbox"
                      checked={selecionados.length === pacientes.length && pacientes.length > 0}
                      onChange={toggleSelecionarTodos}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Paciente</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">CPF</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Cadastro</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-500 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((paciente) => (
                  <tr key={paciente.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(paciente.id)}
                        onChange={() => toggleSelecao(paciente.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-bold text-slate-800">{paciente.full_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} />
                          {paciente.email}
                        </p>
                        {paciente.cell_phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={12} />
                            {paciente.cell_phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {formatarCPF(paciente.cpf)}
                      </code>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        paciente.user_type === 'PJ'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {paciente.user_type === 'PJ' ? (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            Corporativo
                          </span>
                        ) : 'Individual'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 w-fit ${
                        paciente.plan_status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {paciente.plan_status === 'ACTIVE' ? <Unlock size={12} /> : <Lock size={12} />}
                        {paciente.plan_status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatarData(paciente.created_at)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset Senha */}
                        <button
                          onClick={() => setShowConfirmModal({ type: 'reset', paciente })}
                          disabled={actionLoading === paciente.id}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                          title="Resetar Senha"
                        >
                          {actionLoading === paciente.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Key size={16} />
                          )}
                        </button>

                        {/* Bloquear/Desbloquear */}
                        {paciente.plan_status === 'ACTIVE' ? (
                          <button
                            onClick={() => setShowConfirmModal({ type: 'bloquear', paciente })}
                            disabled={actionLoading === paciente.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Bloquear"
                          >
                            <Lock size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowConfirmModal({ type: 'desbloquear', paciente })}
                            disabled={actionLoading === paciente.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                            title="Desbloquear"
                          >
                            <Unlock size={16} />
                          </button>
                        )}

                        {/* Excluir */}
                        <button
                          onClick={() => setShowConfirmModal({ type: 'excluir', paciente })}
                          disabled={actionLoading === paciente.id}
                          className="p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 rounded-lg transition-all disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmacao */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                showConfirmModal.type === 'excluir' ? 'bg-red-50 text-red-600' :
                showConfirmModal.type === 'bloquear' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {showConfirmModal.type === 'reset' || showConfirmModal.type === 'resetMassa' ? <Key size={32} /> :
                 showConfirmModal.type === 'bloquear' ? <Lock size={32} /> :
                 showConfirmModal.type === 'desbloquear' ? <Unlock size={32} /> :
                 <Trash2 size={32} />}
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-2">
                {showConfirmModal.type === 'reset' && 'Resetar Senha'}
                {showConfirmModal.type === 'resetMassa' && `Resetar ${selecionados.length} Senhas`}
                {showConfirmModal.type === 'bloquear' && 'Bloquear Paciente'}
                {showConfirmModal.type === 'desbloquear' && 'Desbloquear Paciente'}
                {showConfirmModal.type === 'excluir' && 'Excluir Paciente'}
              </h3>

              <p className="text-slate-500 text-sm">
                {showConfirmModal.type === 'reset' && (
                  <>
                    A senha de <strong>{showConfirmModal.paciente?.full_name}</strong> sera resetada para{' '}
                    <code className="bg-slate-100 px-1 rounded">{senhaPadrao}</code>
                  </>
                )}
                {showConfirmModal.type === 'resetMassa' && (
                  <>
                    As senhas de {selecionados.length} pacientes serao resetadas para{' '}
                    <code className="bg-slate-100 px-1 rounded">{senhaPadrao}</code>
                  </>
                )}
                {showConfirmModal.type === 'bloquear' && (
                  <>
                    <strong>{showConfirmModal.paciente?.full_name}</strong> nao podera acessar o sistema ate ser desbloqueado.
                  </>
                )}
                {showConfirmModal.type === 'desbloquear' && (
                  <>
                    <strong>{showConfirmModal.paciente?.full_name}</strong> podera acessar o sistema novamente.
                  </>
                )}
                {showConfirmModal.type === 'excluir' && (
                  <>
                    <strong>{showConfirmModal.paciente?.full_name}</strong> sera removido permanentemente do sistema.
                  </>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (showConfirmModal.type === 'reset' && showConfirmModal.paciente) {
                    handleResetSenha(showConfirmModal.paciente);
                  } else if (showConfirmModal.type === 'resetMassa') {
                    handleResetSenhaEmMassa();
                  } else if (showConfirmModal.type === 'bloquear' && showConfirmModal.paciente) {
                    handleAlterarStatus(showConfirmModal.paciente, 'BLOCKED');
                  } else if (showConfirmModal.type === 'desbloquear' && showConfirmModal.paciente) {
                    handleAlterarStatus(showConfirmModal.paciente, 'ACTIVE');
                  } else if (showConfirmModal.type === 'excluir' && showConfirmModal.paciente) {
                    handleExcluir(showConfirmModal.paciente);
                  }
                }}
                disabled={actionLoading !== null}
                className={`flex-1 py-3 text-white font-black rounded-xl flex items-center justify-center gap-2 ${
                  showConfirmModal.type === 'excluir' ? 'bg-red-600 hover:bg-red-700' :
                  showConfirmModal.type === 'bloquear' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {actionLoading && <Loader2 size={18} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatientManagement;
