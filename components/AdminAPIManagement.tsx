
import React, { useState, useEffect } from 'react';
import { Link2, ShieldCheck, Lock, CheckCircle2, XCircle, Save, Loader2, Globe, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DAV_BASE_URL_DEFAULT = 'https://api.v2.doutoraovivo.com.br';

const AdminAPIManagement: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionDetail, setConnectionDetail] = useState('');
  const [config, setConfig] = useState({
    draovivo_endpoint: DAV_BASE_URL_DEFAULT,
    draovivo_api_key: '',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'api_gateways').single();
      if (data?.value) {
        setConfig(prev => ({
          ...prev,
          draovivo_endpoint: data.value.draovivo_endpoint || DAV_BASE_URL_DEFAULT,
          draovivo_api_key: data.value.draovivo_api_key || '',
        }));
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config.draovivo_api_key.trim()) {
      alert("Preencha a x-api-key antes de salvar.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'api_gateways',
        value: {
          active_provider: 'DrAoVivo',
          draovivo_endpoint: config.draovivo_endpoint.trim(),
          draovivo_api_key: config.draovivo_api_key.trim(),
          status: connectionStatus === 'success' ? 'connected' : 'pending',
        },
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert("Configuracao salva com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');
    setConnectionDetail('');

    try {
      // Testa via Edge Function pso-proxy (evita CORS)
      const startTime = Date.now();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setConnectionStatus('error');
        setConnectionDetail('Admin nao autenticado. Faca login novamente.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('pso-proxy', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const latency = Date.now() - startTime;

      if (!error && data?.success) {
        setConnectionStatus('success');
        setConnectionDetail(`Edge Function OK - PSO gerado (${latency}ms)`);
      } else if (error) {
        const msg = error.message || '';
        if (msg.includes('bloqueado') || msg.includes('Plano')) {
          // Plano bloqueado = API funciona, so o plano esta inativo
          setConnectionStatus('success');
          setConnectionDetail(`API conectada (${latency}ms) - Plano do admin bloqueado (normal)`);
        } else {
          setConnectionStatus('error');
          setConnectionDetail(msg || 'Erro na Edge Function');
        }
      } else if (data?.error) {
        // Erros de negocio (404 paciente, etc) = API funciona
        if (data.error.includes('cadastrado') || data.error.includes('Paciente')) {
          setConnectionStatus('success');
          setConnectionDetail(`API conectada (${latency}ms) - Admin sem cadastro de paciente (normal)`);
        } else {
          setConnectionStatus('error');
          setConnectionDetail(data.error);
        }
      }
    } catch (err: any) {
      setConnectionStatus('error');
      if (err.message === 'Failed to fetch' || err instanceof TypeError) {
        setConnectionDetail('Edge Function nao acessivel. Verifique o deploy.');
      } else {
        setConnectionDetail(err.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Link2 className="text-blue-600" />
              API Doutor ao Vivo
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Credencial para gerar acesso direto (PSO)
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>

        <div className="space-y-6">
          {/* Endpoint */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endpoint da API</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={config.draovivo_endpoint}
                onChange={e => setConfig({...config, draovivo_endpoint: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="https://api.v2.doutoraovivo.com.br"
              />
            </div>
          </div>

          {/* x-api-key */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              x-api-key (Chave de Autenticacao)
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="password"
                value={config.draovivo_api_key}
                onChange={e => setConfig({...config, draovivo_api_key: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-mono outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Sua chave x-api-key aqui"
              />
            </div>
            <p className="text-[10px] text-slate-400 ml-1">
              Usada no header <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">x-api-key</code> para POST /credential/pso/person e demais endpoints
            </p>
          </div>
        </div>
      </div>

      {/* Status de Conectividade */}
      <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black flex items-center gap-3">
            <ShieldCheck className="text-blue-400" />
            Teste de Conexao
          </h3>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl text-xs hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
            {isTesting ? 'Testando...' : 'Testar Conexao'}
          </button>
        </div>

        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status da API</p>
            <p className="text-sm font-bold text-white mt-1">
              {connectionStatus === 'idle' && 'Aguardando teste...'}
              {connectionStatus === 'success' && connectionDetail}
              {connectionStatus === 'error' && connectionDetail}
            </p>
          </div>
          {connectionStatus === 'success' && <CheckCircle2 className="text-emerald-500" size={24} />}
          {connectionStatus === 'error' && <XCircle className="text-red-500" size={24} />}
          {connectionStatus === 'idle' && <WifiOff className="text-slate-600" size={24} />}
        </div>
      </div>
    </div>
  );
};

export default AdminAPIManagement;
