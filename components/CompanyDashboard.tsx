
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, BarChart3, Download, FileText, CheckCircle2, TrendingUp, Briefcase,
  Plus, Trash2, Wallet, QrCode, CreditCard, Calendar, AlertCircle, Loader2, X, Search,
  Upload, FileSpreadsheet
} from 'lucide-react';
import { UserData } from '../App';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface CompanyDashboardProps {
  user: UserData;
}

const TEMPLATE_COLUMNS = ['name', 'cpf', 'birth_date', 'email', 'plan_id', 'cell_phone', 'cell_phone_ddi', 'timezone', 'password'];

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'billing'>('users');
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    email: '',
    cpf: '',
    password: 'Mudar@123',
    plan_id: 'pj_vivemus_standard'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: comp } = await supabase
        .from('companies')
        .select('*')
        .eq('rh_email', user.email)
        .single();
      
      setCompanyData(comp);

      if (comp) {
        const { data: vids } = await supabase
          .from('patient_registry')
          .select('*')
          .eq('empresa', comp.name)
          .order('name');
        
        setBeneficiaries(vids || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyData) return;

    setLoading(true);
    const benefEmail = newBeneficiary.email.toLowerCase().trim();
    const benefPassword = newBeneficiary.password || 'Mudar@123';

    try {
      // Verificar se já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', benefEmail)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("Este e-mail já está cadastrado no sistema.");
      }

      // Salvar sessão atual do RH
      const { data: { session: rhSession } } = await supabase.auth.getSession();
      if (!rhSession) {
        throw new Error("Sessão expirou. Faça login novamente.");
      }

      // Criar usuário REAL no Supabase Auth
      const { error: authError } = await supabase.auth.signUp({
        email: benefEmail,
        password: benefPassword,
        options: {
          data: {
            full_name: newBeneficiary.name,
            user_type: 'PJ',
            plan_status: 'ACTIVE',
            plan_id: companyData.plan_id,
            cpf: newBeneficiary.cpf.replace(/\D/g, ''),
            cell_phone: '',
            birth_date: null,
            timezone: 'America/Sao_Paulo',
            tag_id: crypto.randomUUID()
          }
        }
      });

      if (authError) {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      // Restaurar sessão do RH
      await supabase.auth.setSession({
        access_token: rhSession.access_token,
        refresh_token: rhSession.refresh_token
      });

      // Salvar no patient_registry para referência
      await supabase.from('patient_registry').upsert({
        name: newBeneficiary.name,
        email: benefEmail,
        cpf: newBeneficiary.cpf.replace(/\D/g, ''),
        password: benefPassword,
        plan_id: companyData.plan_id,
        empresa: companyData.name,
        type: 'PJ'
      }, { onConflict: 'email' });

      alert("Beneficiário adicionado com sucesso! Ele já pode fazer login.");
      setShowAddModal(false);
      setNewBeneficiary({ name: '', email: '', cpf: '', password: 'Mudar@123', plan_id: 'pj_vivemus_standard' });
      fetchData();
    } catch (err: any) {
      alert("Erro ao adicionar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!window.confirm("Remover este beneficiário da base da empresa? O acesso será bloqueado imediatamente.")) return;
    try {
      await supabase.from('patient_registry').delete().eq('email', email);
      fetchData();
    } catch (err) {}
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        name: 'EXEMPLO NOME COMPLETO',
        cpf: '00000000000',
        birth_date: '1990-01-01',
        email: 'exemplo@empresa.com',
        plan_id: companyData?.plan_id || 'plano_empresa',
        cell_phone: '11999999999',
        cell_phone_ddi: '+55',
        timezone: 'America/Sao_Paulo',
        password: 'Senha@123'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Beneficiarios');
    XLSX.writeFile(wb, `Modelo_Importacao_${companyData?.name || 'Empresa'}.xlsx`);
  };

  const exportCurrentList = () => {
    if (beneficiaries.length === 0) {
      alert('Nenhum beneficiário para exportar.');
      return;
    }
    const exportData = beneficiaries.map(b => ({
      name: b.name,
      cpf: b.cpf,
      birth_date: b.birth_date || '',
      email: b.email,
      plan_id: b.plan_id || companyData?.plan_id,
      cell_phone: b.cell_phone || '',
      cell_phone_ddi: b.cell_phone_ddi || '+55',
      timezone: b.timezone || 'America/Sao_Paulo'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Beneficiarios');
    XLSX.writeFile(wb, `Beneficiarios_${companyData?.name || 'Empresa'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyData) return;

    setImporting(true);
    setImportResults(null);

    try {
      // Salvar sessão atual do RH antes de começar
      const { data: { session: rhSession } } = await supabase.auth.getSession();
      if (!rhSession) {
        throw new Error("Sessão expirou. Faça login novamente.");
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        throw new Error('Planilha vazia');
      }

      const firstRow = rows[0];
      const missingCols = TEMPLATE_COLUMNS.filter(col => !(col in firstRow) && col !== 'cell_phone_ddi' && col !== 'timezone');
      if (missingCols.length > 0) {
        throw new Error(`Colunas obrigatórias faltando: ${missingCols.join(', ')}`);
      }

      let success = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const benefEmail = row.email?.toString().toLowerCase().trim();
        const benefPassword = row.password || 'Mudar@123';

        try {
          // Verificar se já existe
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', benefEmail)
            .maybeSingle();

          if (existingProfile) {
            errors.push(`${benefEmail}: já cadastrado`);
            continue;
          }

          // Criar usuário REAL no Supabase Auth
          const { error: authError } = await supabase.auth.signUp({
            email: benefEmail,
            password: benefPassword,
            options: {
              data: {
                full_name: row.name?.toString().trim(),
                user_type: 'PJ',
                plan_status: 'ACTIVE',
                plan_id: row.plan_id || companyData.plan_id,
                cpf: row.cpf?.toString().replace(/\D/g, ''),
                cell_phone: row.cell_phone?.toString().replace(/\D/g, '') || '',
                birth_date: row.birth_date || null,
                timezone: row.timezone || 'America/Sao_Paulo',
                tag_id: crypto.randomUUID()
              }
            }
          });

          if (authError) {
            errors.push(`${benefEmail}: ${authError.message}`);
            continue;
          }

          // Restaurar sessão do RH após cada criação
          await supabase.auth.setSession({
            access_token: rhSession.access_token,
            refresh_token: rhSession.refresh_token
          });

          // Salvar no patient_registry
          await supabase.from('patient_registry').upsert({
            name: row.name?.toString().trim(),
            cpf: row.cpf?.toString().replace(/\D/g, ''),
            birth_date: row.birth_date,
            email: benefEmail,
            plan_id: row.plan_id || companyData.plan_id,
            cell_phone: row.cell_phone?.toString().replace(/\D/g, ''),
            cell_phone_ddi: row.cell_phone_ddi || '+55',
            timezone: row.timezone || 'America/Sao_Paulo',
            password: benefPassword,
            empresa: companyData.name,
            type: 'PJ'
          }, { onConflict: 'email' });

          success++;
        } catch (err: any) {
          errors.push(`${benefEmail}: ${err.message}`);
        }
      }

      // Garantir que a sessão do RH está restaurada no final
      await supabase.auth.setSession({
        access_token: rhSession.access_token,
        refresh_token: rhSession.refresh_token
      });

      setImportResults({ success, errors });
      fetchData();
    } catch (err: any) {
      setImportResults({ success: 0, errors: [err.message] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filtered = beneficiaries.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const billingTotal = companyData ? (beneficiaries.length * companyData.value_per_life) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <p className="text-indigo-200 text-xs font-black uppercase tracking-widest">Dashboard de Gestão RH</p>
          <h1 className="text-4xl font-black">{companyData?.name || 'Vivemus Client'}</h1>
          <p className="text-indigo-100 max-w-lg">Controle de acessos da equipe e acompanhamento de faturamento.</p>
        </div>
        <Briefcase size={200} className="absolute -right-20 -bottom-20 text-white/5" />
      </header>

      <nav className="flex p-1.5 bg-slate-100 rounded-[2rem] w-fit">
        <button onClick={() => setActiveTab('users')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Gestão de Vidas</button>
        <button onClick={() => setActiveTab('billing')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'billing' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Financeiro & Faturas</button>
      </nav>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          {/* Barra de ações: Upload, Download, Pesquisa */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={downloadTemplate}
                className="px-5 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-200 transition-all text-sm"
              >
                <Download size={16} /> Baixar Modelo
              </button>
              <button
                onClick={exportCurrentList}
                className="px-5 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center gap-2 hover:bg-emerald-100 transition-all text-sm"
              >
                <FileSpreadsheet size={16} /> Exportar Lista Atual
              </button>
              <label className="px-5 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-all text-sm cursor-pointer">
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? 'Importando...' : 'Importar Planilha'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button onClick={() => setShowAddModal(true)} className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm ml-auto">
                <Plus size={16} /> Adicionar Individual
              </button>
            </div>

            {importResults && (
              <div className={`p-4 rounded-xl ${importResults.errors.length === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                <div className="flex items-center gap-2">
                  {importResults.errors.length === 0 ? (
                    <CheckCircle2 className="text-emerald-600" size={18} />
                  ) : (
                    <AlertCircle className="text-amber-600" size={18} />
                  )}
                  <span className="font-bold text-sm">
                    {importResults.success} importado(s) com sucesso
                  </span>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    {importResults.errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-600 font-mono">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de pesquisa */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por nome ou e-mail..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none shadow-sm font-medium"
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400 font-bold">{filtered.length} de {beneficiaries.length} beneficiário(s)</p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-8 py-4">Beneficiário</th>
                  <th className="px-8 py-4">E-mail</th>
                  <th className="px-8 py-4">Documento</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4 text-right">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr> : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase text-[10px]">Nenhum registro localizado</td></tr>
                ) : filtered.map(beneficiary => (
                  <tr key={beneficiary.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-bold text-slate-800">{beneficiary.name}</td>
                    <td className="px-8 py-4 text-slate-500 text-sm font-medium">{beneficiary.email}</td>
                    <td className="px-8 py-4 text-slate-400 font-mono text-xs">{beneficiary.cpf || 'Não inf.'}</td>
                    <td className="px-8 py-4 text-center">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded border border-emerald-100">ATIVO</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button onClick={() => handleDelete(beneficiary.email)} className="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <h3 className="text-xl font-bold mb-8">Próxima Fatura</h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Métrica de Faturamento</p>
                  <p className="text-sm font-bold text-slate-700">{beneficiaries.length} vidas ativas × R$ {companyData?.value_per_life?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Projetado</p>
                  <p className="text-4xl font-black text-emerald-600">R$ {billingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              
              <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
                <Calendar className="text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800">Fechamento Mensal</h4>
                  <p className="text-xs text-amber-700">A fatura oficial fecha todo dia <b>10</b>. Alterações feitas hoje serão refletidas no próximo boleto.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6">Financeiro Self-Service</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-emerald-50 rounded-3xl transition-all group border border-transparent hover:border-emerald-200">
                   <QrCode className="text-slate-400 group-hover:text-emerald-600" />
                   <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-emerald-700">Código PIX</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-blue-50 rounded-3xl transition-all group border border-transparent hover:border-blue-200">
                   <FileText className="text-slate-400 group-hover:text-blue-600" />
                   <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-blue-700">Boleto</span>
                </button>
                <button className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-indigo-50 rounded-3xl transition-all group border border-transparent hover:border-indigo-200">
                   <CheckCircle2 className="text-slate-400 group-hover:text-indigo-600" />
                   <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-indigo-700">Nota Fiscal</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl h-fit">
             <Wallet className="text-emerald-400 mb-6" size={40} />
             <h3 className="text-2xl font-black mb-4 tracking-tighter">Histórico</h3>
             <div className="space-y-4">
                {[
                  { month: 'Maio/2024', val: 'R$ 2.500,00', status: 'Pago' },
                  { month: 'Abril/2024', val: 'R$ 2.450,00', status: 'Pago' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-4 border-b border-white/10 last:border-0">
                    <div>
                       <p className="text-sm font-bold text-white">{item.month}</p>
                       <p className="text-[10px] text-slate-500 font-mono">{item.val}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">PAGO</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black">Novo Beneficiário</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-red-500"><X /></button>
            </div>
            <form onSubmit={handleAddIndividual} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" placeholder="Nome do funcionário" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border-2 border-transparent focus:border-indigo-100" onChange={e => setNewBeneficiary({...newBeneficiary, name: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                <input type="email" placeholder="email@empresa.com" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border-2 border-transparent focus:border-indigo-100" onChange={e => setNewBeneficiary({...newBeneficiary, email: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF (apenas números)</label>
                <input type="text" placeholder="000.000.000-00" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium border-2 border-transparent focus:border-indigo-100" onChange={e => setNewBeneficiary({...newBeneficiary, cpf: e.target.value})} required />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                <AlertCircle className="text-blue-500 shrink-0" size={18} />
                <p className="text-[10px] text-blue-700 leading-relaxed font-bold">A senha provisória será <b>Mudar@123</b>. O sistema pedirá a troca no primeiro acesso.</p>
              </div>
              <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl mt-4 shadow-xl active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Salvar Beneficiário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
