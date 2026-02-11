
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal, CheckCircle2, Server, Search, RefreshCw, Loader2,
  AlertCircle, ChevronDown, ChevronRight, Download, Activity,
  ShieldAlert, Clock, ChevronLeft
} from 'lucide-react';
import { fetchLogs, fetchLogStats } from '../services/logService';

const PER_PAGE = 50;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-400/10',
  UPDATE: 'text-blue-400 bg-blue-400/10',
  DELETE: 'text-red-400 bg-red-400/10',
  BLOCK: 'text-amber-400 bg-amber-400/10',
  LOGIN: 'text-violet-400 bg-violet-400/10',
  API_CALL: 'text-cyan-400 bg-cyan-400/10',
  SYSTEM: 'text-slate-400 bg-slate-400/10',
  // PSO / Teleconsulta
  PSO_START: 'text-indigo-400 bg-indigo-400/10',
  PSO_AUTH: 'text-violet-400 bg-violet-400/10',
  PSO_LOOKUP: 'text-sky-400 bg-sky-400/10',
  PSO_DAV: 'text-teal-400 bg-teal-400/10',
  PSO_GENERATE: 'text-orange-400 bg-orange-400/10',
  PSO_GENERATED: 'text-emerald-400 bg-emerald-400/10',
  PSO_BLOCKED: 'text-red-400 bg-red-400/10',
  PSO_FAIL: 'text-red-400 bg-red-400/10',
  PSO_CRASH: 'text-red-500 bg-red-500/10',
  PSO_DB: 'text-amber-400 bg-amber-400/10',
  PSO_INVOKE_START: 'text-indigo-400 bg-indigo-400/10',
  PSO_INVOKE_RESPONSE: 'text-cyan-400 bg-cyan-400/10',
  PSO_SDK_ERROR: 'text-red-400 bg-red-400/10',
  PSO_FRONTEND_ERROR: 'text-red-400 bg-red-400/10',
  PSO_CATCH_ERROR: 'text-red-500 bg-red-500/10',
};

const AdminSystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState({ total: 0, errors: 0, today: 0 });

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActionType, setFilterActionType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLogs({
        search: searchTerm || undefined,
        action_type: filterActionType || undefined,
        status: filterStatus || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: currentPage,
        per_page: PER_PAGE
      });
      setLogs(result.data);
      setTotalLogs(result.total);
    } catch (err: any) {
      console.error("Falha ao buscar logs:", err.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterActionType, filterStatus, dateFrom, dateTo, currentPage]);

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchLogStats();
      setStats(s);
    } catch (err: any) {
      console.error("Falha ao buscar stats:", err.message);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActionType, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { loadLogs(); loadStats(); }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs, loadStats]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchTerm(value), 300);
  };

  const handleRefresh = () => { loadLogs(); loadStats(); };

  const totalPages = Math.max(1, Math.ceil(totalLogs / PER_PAGE));
  const rangeStart = totalLogs === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * PER_PAGE, totalLogs);

  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Data', 'Acao', 'Recurso', 'Descricao', 'Usuario', 'Status', 'Payload'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.action_type || '',
      (log.provider || log.resource || '').replace(/"/g, '""'),
      (log.description || '').replace(/"/g, '""'),
      (log.user_name || '').replace(/"/g, '""'),
      log.response_status || '',
      log.payload ? JSON.stringify(log.payload).replace(/"/g, '""') : ''
    ]);
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_vivemus_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => ACTION_COLORS[action] || 'text-slate-400 bg-slate-400/10';

  return (
    <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-500 border border-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400">
            <Terminal size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Eventos Vivemus OS</h3>
            <p className="text-slate-500 text-sm font-medium">Registro permanente de auditoria, chamadas API e alteracoes de sistema.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              autoRefresh
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
            }`}
          >
            {autoRefresh ? 'Live' : 'Auto'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/10"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-blue-400" />
            <div>
              <p className="text-3xl font-black text-white">{stats.total.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total de Eventos</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-red-400" />
            <div>
              <p className="text-3xl font-black text-white">{stats.errors.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Erros Registrados</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-emerald-400" />
            <div>
              <p className="text-3xl font-black text-white">{stats.today.toLocaleString('pt-BR')}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Eventos Hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por descricao, usuario, recurso..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
        </div>
        <select
          value={filterActionType}
          onChange={e => setFilterActionType(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-blue-500 appearance-none cursor-pointer"
        >
          <option value="" className="bg-slate-900">Todas Acoes</option>
          <option value="CREATE" className="bg-slate-900">CREATE</option>
          <option value="UPDATE" className="bg-slate-900">UPDATE</option>
          <option value="DELETE" className="bg-slate-900">DELETE</option>
          <option value="LOGIN" className="bg-slate-900">LOGIN</option>
          <option value="BLOCK" className="bg-slate-900">BLOCK</option>
          <option value="API_CALL" className="bg-slate-900">API_CALL</option>
          <option value="SYSTEM" className="bg-slate-900">SYSTEM</option>
          <option value="PSO_START" className="bg-slate-900">PSO_START</option>
          <option value="PSO_AUTH" className="bg-slate-900">PSO_AUTH</option>
          <option value="PSO_LOOKUP" className="bg-slate-900">PSO_LOOKUP</option>
          <option value="PSO_DAV" className="bg-slate-900">PSO_DAV</option>
          <option value="PSO_GENERATED" className="bg-slate-900">PSO_GENERATED</option>
          <option value="PSO_FAIL" className="bg-slate-900">PSO_FAIL</option>
          <option value="PSO_CRASH" className="bg-slate-900">PSO_CRASH</option>
          <option value="PSO_SDK_ERROR" className="bg-slate-900">PSO_SDK_ERROR</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-blue-500 appearance-none cursor-pointer"
        >
          <option value="" className="bg-slate-900">Todos Status</option>
          <option value="SUCCESS" className="bg-slate-900">SUCCESS</option>
          <option value="ERROR" className="bg-slate-900">ERROR</option>
          <option value="ALERT" className="bg-slate-900">ALERT</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-blue-500"
          title="Data inicio"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-blue-500"
          title="Data fim"
        />
        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/10 disabled:opacity-30"
          title="Exportar CSV"
        >
          <Download size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Acao</th>
                <th className="px-4 py-4">Recurso</th>
                <th className="px-4 py-4">Descricao</th>
                <th className="px-4 py-4">Usuario</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-4 text-slate-600">
                      {log.payload ? (
                        expandedRow === log.id
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                      ) : <span className="w-[14px] inline-block" />}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${getActionColor(log.action_type)}`}>
                        {log.action_type || 'EVENT'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-xs font-bold uppercase">
                      {log.provider || log.resource || '-'}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-300 text-xs max-w-[300px] truncate">
                      {log.description || '-'}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-400 text-xs">
                      {log.user_name || '-'}
                    </td>
                    <td className="px-4 py-4">
                      {log.response_status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1 text-emerald-500 font-bold text-[9px] uppercase">
                          <CheckCircle2 size={12} /> OK
                        </div>
                      ) : log.response_status === 'ERROR' ? (
                        <div className="flex items-center gap-1 text-red-500 font-bold text-[9px] uppercase">
                          <AlertCircle size={12} /> FAIL
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-[9px] uppercase">
                          <AlertCircle size={12} /> {log.response_status || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-500 text-[10px] font-mono">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                  {expandedRow === log.id && log.payload && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-4">
                        <div className="bg-black/50 rounded-xl p-4 ml-8 border border-white/5">
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Payload</p>
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all max-h-60 overflow-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-600 italic">
                    Nenhum evento localizado nos criterios atuais.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="animate-spin text-slate-600 mx-auto" size={24} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          {totalLogs > 0
            ? `Mostrando ${rangeStart}-${rangeEnd} de ${totalLogs.toLocaleString('pt-BR')} eventos`
            : 'Nenhum evento'
          }
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/10 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-400 font-bold px-3">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/10 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <Server size={18} className="text-blue-500" />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Conexao Segura com Cluster Vivemus DB
          </p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-slate-600'
        }`}>
          {autoRefresh ? 'Live Sync Ativo' : 'Sync Manual'}
        </span>
      </div>
    </div>
  );
};

export default AdminSystemLogs;
