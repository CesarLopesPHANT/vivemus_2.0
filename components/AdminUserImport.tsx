
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  RefreshCw,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  Send
} from 'lucide-react';
import {
  lerArquivoExcel,
  exportarRelatorioImportacao,
  gerarTemplateExcel,
  gerarTemplateDrAoVivo,
  exportarParaFormatoDrAoVivo
} from '../services/importService';

interface AdminUserImportProps {
  onImportComplete?: () => void;
  // Background import props (from AdminPanel)
  isImporting?: boolean;
  importProgress?: { current: number; total: number; email: string };
  importResult?: any;
  importError?: string | null;
  importWhatsappLinks?: string[];
  importUsuarios?: any[];
  onStartImport?: (usuarios: any[], opcoes: { sincronizarProvedor: boolean; atualizarExistentes: boolean; enviarWhatsApp: boolean }) => void;
  onResetImport?: () => void;
}

interface UsuarioPreview {
  nome: string;
  email: string;
  cpf: string;
  celular: string;
  dataNascimento: string;
  plano: string;
  empresa: string;
  statusPlano: 'ACTIVE' | 'BLOCKED';
  tipoUsuario: 'PF' | 'PJ' | 'ADM';
  // Campos Dr. ao Vivo
  ddi?: string;
  sexo?: string;
  idDrAoVivo?: string;
}

const AdminUserImport: React.FC<AdminUserImportProps> = ({
  onImportComplete,
  isImporting: parentIsImporting,
  importProgress: parentImportProgress,
  importResult: parentImportResult,
  importError: parentImportError,
  importWhatsappLinks: parentWhatsappLinks,
  importUsuarios: parentUsuarios,
  onStartImport,
  onResetImport
}) => {
  const [stage, setStage] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [usuarios, setUsuarios] = useState<UsuarioPreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [formatoDetectado, setFormatoDetectado] = useState<'padrao' | 'draovivo' | null>(null);
  const [exportando, setExportando] = useState(false);
  const [opcoes, setOpcoes] = useState({
    sincronizarProvedor: true,
    atualizarExistentes: false,
    enviarWhatsApp: false
  });
  const [showWhatsAppLinks, setShowWhatsAppLinks] = useState(false);

  // Deriva o estagio efetivo do estado do pai (persiste entre troca de abas)
  const effectiveStage = (() => {
    if (parentIsImporting) return 'importing' as const;
    if (parentImportResult) return 'result' as const;
    if (parentImportError && stage !== 'preview') return 'upload' as const;
    return stage;
  })();

  // Valores ativos (preferem estado do pai quando disponivel)
  const activeProgress = parentImportProgress || { current: 0, total: 0, email: '' };
  const activeResult = parentImportResult;
  const activeWhatsappLinks = parentWhatsappLinks || [];
  const activeUsuarios = parentUsuarios || usuarios;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);

    try {
      const dados = await lerArquivoExcel(file);

      if (dados.length === 0) {
        throw new Error('Nenhum usuario valido encontrado na planilha');
      }

      // Detecta formato baseado nos campos extras
      const hasDrAoVivoFields = dados.some(u => u.idDrAoVivo || u.ddi || u.sexo);
      setFormatoDetectado(hasDrAoVivoFields ? 'draovivo' : 'padrao');

      setUsuarios(dados);
      setStage('preview');
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportarPacientes = async () => {
    setExportando(true);
    try {
      await exportarParaFormatoDrAoVivo();
    } catch (err: any) {
      setError(err.message || 'Erro ao exportar pacientes');
    } finally {
      setExportando(false);
    }
  };

  const handleImport = async () => {
    if (onStartImport) {
      // Delega execucao ao AdminPanel (roda em segundo plano)
      onStartImport(usuarios, {
        sincronizarProvedor: opcoes.sincronizarProvedor,
        atualizarExistentes: opcoes.atualizarExistentes,
        enviarWhatsApp: opcoes.enviarWhatsApp
      });
      // effectiveStage sera derivado automaticamente de parentIsImporting
    }
  };

  const handleReset = () => {
    setStage('upload');
    setUsuarios([]);
    setError(null);
    setShowDetails(false);
    setShowWhatsAppLinks(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onResetImport) {
      onResetImport();
    }
  };

  const handleDownloadTemplate = () => {
    gerarTemplateExcel();
  };

  const handleExportReport = () => {
    if (activeResult) {
      exportarRelatorioImportacao(activeResult);
    }
  };

  // Tela de Upload
  if (effectiveStage === 'upload') {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Importar Usuarios</h2>
            <p className="text-slate-500 text-sm">Carregue uma planilha Excel com os dados dos beneficiarios</p>
          </div>
        </div>

        {(error || parentImportError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-800 font-medium">{parentImportError || error}</p>
          </div>
        )}

        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-upload"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium">Processando planilha...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FileSpreadsheet size={40} className="text-slate-400" />
              </div>
              <label
                htmlFor="excel-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
              >
                <Upload size={20} />
                Selecionar Arquivo Excel
              </label>
              <p className="text-slate-400 text-sm mt-4">Formatos aceitos: .xlsx, .xls</p>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Template Padrão */}
          <div className="p-6 bg-slate-50 rounded-2xl">
            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <FileSpreadsheet size={18} />
              Template Padrão
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Nome, Email, CPF, Celular, Data Nascimento, Plano, Empresa, Status, Tipo
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
            >
              Baixar Template
            </button>
          </div>

          {/* Template Dr. ao Vivo */}
          <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
            <h4 className="font-bold text-purple-700 mb-2 flex items-center gap-2">
              <FileSpreadsheet size={18} />
              Formato Dr. ao Vivo
            </h4>
            <p className="text-xs text-purple-600 mb-4">
              ID, Nome, Data Nasc., CPF, DDI, Celular, Sexo, E-mail, Status, Plano, Grupo
            </p>
            <button
              onClick={() => gerarTemplateDrAoVivo()}
              className="w-full px-4 py-3 bg-white border border-purple-200 text-purple-700 font-bold rounded-xl hover:bg-purple-100 transition-all text-sm"
            >
              Baixar Template Dr. ao Vivo
            </button>
          </div>
        </div>

        {/* Exportar pacientes existentes */}
        <div className="mt-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-emerald-700 flex items-center gap-2">
                <Download size={18} />
                Exportar Pacientes Atuais
              </h4>
              <p className="text-xs text-emerald-600 mt-1">
                Baixe a lista de todos os pacientes no formato Dr. ao Vivo para sincronização em massa
              </p>
            </div>
            <button
              onClick={handleExportarPacientes}
              disabled={exportando}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {exportando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exportando ? 'Exportando...' : 'Exportar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Preview
  if (effectiveStage === 'preview') {
    const countByType = {
      PF: usuarios.filter(u => u.tipoUsuario === 'PF').length,
      PJ: usuarios.filter(u => u.tipoUsuario === 'PJ').length,
      ADM: usuarios.filter(u => u.tipoUsuario === 'ADM').length
    };

    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Eye size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Pre-visualizacao</h2>
              <div className="flex items-center gap-2">
                <p className="text-slate-500 text-sm">{usuarios.length} usuarios prontos para importar</p>
                {formatoDetectado === 'draovivo' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">
                    Formato Dr. ao Vivo
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-3 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-blue-600">{countByType.PF}</p>
            <p className="text-xs font-bold text-blue-600 uppercase">Individuais</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-purple-600">{countByType.PJ}</p>
            <p className="text-xs font-bold text-purple-600 uppercase">Beneficiarios</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-orange-600">{countByType.ADM}</p>
            <p className="text-xs font-bold text-orange-600 uppercase">Gestores</p>
          </div>
        </div>

        {/* Opcoes */}
        <div className="bg-slate-50 p-6 rounded-2xl mb-6 space-y-4">
          <h4 className="font-bold text-slate-700">Opcoes de Importacao</h4>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={opcoes.sincronizarProvedor}
              onChange={(e) => setOpcoes({ ...opcoes, sincronizarProvedor: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">
              Sincronizar com provedor de telemedicina (Dr. ao Vivo)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={opcoes.atualizarExistentes}
              onChange={(e) => setOpcoes({ ...opcoes, atualizarExistentes: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">
              Atualizar usuarios que ja existem no sistema
            </span>
          </label>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={opcoes.enviarWhatsApp}
                onChange={(e) => setOpcoes({ ...opcoes, enviarWhatsApp: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageCircle size={16} className="text-emerald-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Enviar mensagem de boas-vindas via WhatsApp
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gera links de WhatsApp para enviar mensagem com dados de acesso aos pacientes ACTIVE.
                  <br />
                  <span className="text-emerald-600 font-bold">
                    {usuarios.filter(u => u.statusPlano === 'ACTIVE').length} pacientes receberão a mensagem.
                  </span>
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600"
          >
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {showDetails ? 'Ocultar detalhes' : 'Ver todos os usuarios'}
          </button>

          {showDetails && (
            <div className="mt-4 max-h-80 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-bold text-slate-600">Nome</th>
                    <th className="text-left p-3 font-bold text-slate-600">Email</th>
                    <th className="text-left p-3 font-bold text-slate-600">Tipo</th>
                    <th className="text-left p-3 font-bold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="p-3 text-slate-800">{u.nome}</td>
                      <td className="p-3 text-slate-500">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          u.tipoUsuario === 'PJ' ? 'bg-purple-100 text-purple-700' :
                          u.tipoUsuario === 'ADM' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.tipoUsuario}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          u.statusPlano === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.statusPlano}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            Importar {usuarios.length} Usuarios
          </button>
        </div>
      </div>
    );
  }

  // Tela de Importando
  if (effectiveStage === 'importing') {
    const progressPercent = activeProgress.total > 0
      ? Math.round((activeProgress.current / activeProgress.total) * 100)
      : 0;

    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center">
        <Loader2 size={64} className="text-blue-600 animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Criando Contas de Usuario</h2>
        <p className="text-slate-500">
          Processando {activeProgress.current} de {activeProgress.total} registros...
        </p>

        {/* Barra de progresso */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>{activeProgress.current}/{activeProgress.total}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {activeProgress.email && activeProgress.email !== 'Concluido' && (
            <p className="text-xs text-slate-400 mt-2 truncate">
              Processando: {activeProgress.email}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-2 text-left max-w-sm mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Criando contas no Auth (com rate limit controlado)
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Sincronizando com Dr. ao Vivo
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          O processamento roda em segundo plano. Voce pode navegar para outras abas.
          <br />
          O progresso sera exibido no canto inferior direito da tela.
        </p>
      </div>
    );
  }

  // Tela de Resultado
  if (effectiveStage === 'result' && activeResult) {
    const percentSucesso = Math.round((activeResult.sucesso / activeResult.total) * 100);
    const erros = activeResult.detalhes.filter((d: any) => d.status === 'error');
    const ignorados = activeResult.detalhes.filter((d: any) => d.status === 'skipped');
    const sucessos = activeResult.detalhes.filter((d: any) => d.status === 'success');

    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${
            activeResult.erros === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {activeResult.erros === 0 ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">
            Importacao {activeResult.erros === 0 ? 'Concluida' : 'Parcial'}
          </h2>
          <p className="text-slate-500">
            {percentSucesso}% dos registros foram processados com sucesso
          </p>
        </div>

        {/* Estatisticas */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-slate-800">{activeResult.total}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-emerald-600">{activeResult.sucesso}</p>
            <p className="text-xs font-bold text-emerald-600 uppercase">Sucesso</p>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-red-600">{erros.length}</p>
            <p className="text-xs font-bold text-red-600 uppercase">Erros</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-amber-600">{ignorados.length}</p>
            <p className="text-xs font-bold text-amber-600 uppercase">Ignorados</p>
          </div>
        </div>

        {/* Log de Erros - sempre visivel quando ha erros */}
        {erros.length > 0 && (
          <div className="mb-6 border-2 border-red-200 rounded-2xl overflow-hidden">
            <div className="bg-red-50 px-5 py-3 flex items-center gap-3">
              <XCircle size={20} className="text-red-600" />
              <h4 className="font-black text-red-800 text-sm">{erros.length} {erros.length === 1 ? 'Registro com Erro' : 'Registros com Erro'}</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-50/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-bold text-red-800 w-16">Linha</th>
                    <th className="text-left p-3 font-bold text-red-800">Email</th>
                    <th className="text-left p-3 font-bold text-red-800">Motivo do Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {erros.map((d: any, i: number) => (
                    <tr key={i} className="border-t border-red-100">
                      <td className="p-3 text-red-700 font-bold">{d.linha}</td>
                      <td className="p-3 text-red-800 font-medium">{d.email}</td>
                      <td className="p-3 text-red-700 text-xs">{d.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log de Ignorados - sempre visivel quando ha ignorados */}
        {ignorados.length > 0 && (
          <div className="mb-6 border border-amber-200 rounded-2xl overflow-hidden">
            <div className="bg-amber-50 px-5 py-3 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600" />
              <h4 className="font-bold text-amber-800 text-sm">{ignorados.length} {ignorados.length === 1 ? 'Registro Ignorado' : 'Registros Ignorados'} (ja existem)</h4>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-bold text-amber-800 w-16">Linha</th>
                    <th className="text-left p-3 font-bold text-amber-800">Email</th>
                    <th className="text-left p-3 font-bold text-amber-800">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {ignorados.map((d: any, i: number) => (
                    <tr key={i} className="border-t border-amber-100">
                      <td className="p-3 text-amber-700 font-bold">{d.linha}</td>
                      <td className="p-3 text-amber-800 font-medium">{d.email}</td>
                      <td className="p-3 text-amber-700 text-xs">{d.mensagem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log de Sucesso - colapsavel */}
        {sucessos.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-600"
            >
              {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {showDetails ? 'Ocultar' : 'Ver'} {sucessos.length} registros importados com sucesso
            </button>

            {showDetails && (
              <div className="mt-4 max-h-48 overflow-y-auto border border-emerald-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-bold text-emerald-800 w-16">Linha</th>
                      <th className="text-left p-3 font-bold text-emerald-800">Email</th>
                      <th className="text-left p-3 font-bold text-emerald-800">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sucessos.map((d: any, i: number) => (
                      <tr key={i} className="border-t border-emerald-50">
                        <td className="p-3 text-emerald-700 font-bold">{d.linha}</td>
                        <td className="p-3 text-slate-800">{d.email}</td>
                        <td className="p-3 text-xs text-emerald-600">{d.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Links - Apenas se foi habilitado e há links */}
        {activeWhatsappLinks.length > 0 && (
          <div className="mb-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800">Mensagens WhatsApp Prontas</h4>
                  <p className="text-xs text-emerald-600">{activeWhatsappLinks.length} links gerados para envio</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppLinks(!showWhatsAppLinks)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                {showWhatsAppLinks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showWhatsAppLinks ? 'Ocultar' : 'Ver Links'}
              </button>
            </div>

            {showWhatsAppLinks && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeWhatsappLinks.map((link, index) => {
                  const usuario = activeUsuarios.filter((u: any) => u.statusPlano === 'ACTIVE')[index];
                  return (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Send size={16} className="text-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">
                          {usuario?.nome || `Paciente ${index + 1}`}
                        </span>
                        <span className="text-xs text-slate-400">{usuario?.celular}</span>
                      </div>
                      <ExternalLink size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </a>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 bg-white rounded-xl">
              <p className="text-xs text-slate-500">
                <strong className="text-emerald-700">Dica:</strong> Clique em cada link para abrir o WhatsApp Web e enviar a mensagem.
                A mensagem de boas-vindas já estará preenchida com os dados de acesso do paciente.
              </p>
            </div>
          </div>
        )}

        {/* Aviso sobre carregamento */}
        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Processamento em Andamento</p>
              <p className="text-xs text-amber-600 mt-1">
                A liberação completa das contas pode levar alguns minutos enquanto o sistema sincroniza com os provedores.
                Os usuários já podem acessar a plataforma em <strong>www.app.vivemus.com.br</strong> com a senha <strong>Saude@123</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Acoes */}
        <div className="flex gap-4">
          <button
            onClick={handleExportReport}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Exportar Relatorio
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} />
            Nova Importacao
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AdminUserImport;
