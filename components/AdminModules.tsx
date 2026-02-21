
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cpu, Save, Key, CheckCircle2, Terminal, RefreshCw, 
  AlertCircle, Loader2, ShieldCheck, DatabaseZap, 
  ExternalLink, Copy, Terminal as TerminalIcon, ShieldQuestion, Globe2, Monitor,
  MessageSquare, Lock, Unlock, Building2, Plus, Filter, Search, User, Trash2,
  FileSpreadsheet, Upload, Download, WalletCards, Activity, Building, X, XCircle,
  MessageCircle, ShieldAlert
} from 'lucide-react';
import { Partner } from '../types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { trackAction } from '../services/logService';

// Re-exports de componentes existentes
import AdminOverview from './AdminOverview';
import AdminAPIManagement from './AdminAPIManagement';
import AdminAITraining from './AdminAITraining';
import AdminSystemLogs from './AdminSystemLogs';
import AdminUserImport from './AdminUserImport';
import AdminPatientManagement from './AdminPatientManagement';
import AdminPatientSections from './AdminPatientSections';

export const OverviewModule = AdminOverview;
export const APIModule = AdminAPIManagement;
export const AIModule = AdminAITraining;
export const LogsModule = AdminSystemLogs;
export const ImportUsersModule = AdminUserImport;
export const PatientManagementModule = AdminPatientManagement;
export const PatientSectionsModule = AdminPatientSections;

export const WhatsAppConfigModule: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    phone: '5511999999999',
    recovery_template: 'Olá Suporte Vivemus! Solicito o protocolo de recuperação para o e-mail: {email}',
    welcome_template: 'Olá, gostaria de iniciar uma triagem médica via Vivemus.'
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'whatsapp_config').single();
      if (data) setConfig(data.value);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('system_settings').upsert({ 
        key: 'whatsapp_config', 
        value: config, 
        updated_at: new Date().toISOString() 
      });
      alert("Configuração de WhatsApp atualizada!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
               <MessageSquare size={28} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Canais WhatsApp</h3>
               <p className="text-slate-500 text-sm font-medium">Configuração do motor de mensagens e suporte.</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar Configuração
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número Oficial (Apenas números com DDI)</label>
            <input 
              type="text" 
              value={config.phone}
              onChange={e => setConfig({...config, phone: e.target.value})}
              placeholder="5511999999999"
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 border-2 border-transparent focus:border-emerald-100" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template: Recuperação de Senha</label>
            <textarea 
              value={config.recovery_template}
              onChange={e => setConfig({...config, recovery_template: e.target.value})}
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-medium text-slate-600 border-2 border-transparent focus:border-emerald-100 min-h-[100px]" 
            />
            <p className="text-[9px] text-slate-400 font-bold italic">* Use {`{email}`} para injetar o e-mail do usuário automaticamente.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template: Início de Triagem</label>
            <textarea 
              value={config.welcome_template}
              onChange={e => setConfig({...config, welcome_template: e.target.value})}
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-medium text-slate-600 border-2 border-transparent focus:border-emerald-100 min-h-[100px]" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const CompaniesManagementModule: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [newCompany, setNewCompany] = useState({
    name: '',
    rh_email: '',
    rh_password: '',
    contracted_lives: 100,
    value_per_life: 25.00
  });

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '@1';
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data: companiesData, error } = await supabase.from('companies').select('*').order('name');
      if (error) throw error;
      
      const { data: profiles } = await supabase.from('profiles').select('email, last_sign_in_at');

      const merged = (companiesData || []).map(comp => ({
        ...comp,
        is_activated: profiles?.some(p => p.email?.toLowerCase() === comp.rh_email?.toLowerCase()) || false
      }));

      setCompanies(merged);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(`Erro ao carregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const toggleCompanyStatus = async (id: string, currentStatus: any, name: string) => {
    try {
      const isActive = currentStatus === true;
      const { error } = await supabase.from('companies').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await trackAction({
        user_id: user?.id || 'system',
        user_name: 'Master Admin',
        action_type: 'UPDATE',
        resource: 'COMPANIES',
        description: `${!isActive ? 'Ativou' : 'Desativou'} contrato da empresa ${name}`,
        status: 'SUCCESS'
      });
      
      fetchCompanies();
    } catch (err: any) {
      alert("Erro ao alterar status: " + err.message);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const companySlug = newCompany.name.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const planId = `plano_${companySlug}`;
      const tempPassword = newCompany.rh_password || generateTempPassword();
      const rhEmail = newCompany.rh_email.toLowerCase().trim();

      // Verificar se já existe um usuário Auth com este email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', rhEmail)
        .maybeSingle();

      if (existingProfile) {
        throw new Error("Já existe um usuário cadastrado com este e-mail.");
      }

      // Salvar sessão atual do Master
      const { data: { session: masterSession } } = await supabase.auth.getSession();
      if (!masterSession) {
        throw new Error("Sessão do Master expirou. Faça login novamente.");
      }

      const { data: comp, error: compErr } = await supabase
        .from('companies')
        .insert([{
          name: newCompany.name,
          rh_email: rhEmail,
          plan_id: planId,
          contracted_lives: newCompany.contracted_lives,
          value_per_life: newCompany.value_per_life,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select().single();

      if (compErr) {
        if (compErr.code === '23505') throw new Error("Este e-mail de RH já está vinculado a outra empresa.");
        throw compErr;
      }

      // Criar usuário RH REAL no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: rhEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: `RH - ${newCompany.name}`,
            user_type: 'ADM',
            plan_status: 'ACTIVE',
            plan_id: planId,
            cpf: '',
            cell_phone: '',
            birth_date: null,
            timezone: 'America/Sao_Paulo',
            tag_id: crypto.randomUUID()
          }
        }
      });

      if (authError) {
        // Se falhar a criação do usuário, remove a empresa criada
        await supabase.from('companies').delete().eq('id', comp.id);
        throw new Error(`Erro ao criar usuário RH: ${authError.message}`);
      }

      // Restaurar sessão do Master (importante!)
      await supabase.auth.setSession({
        access_token: masterSession.access_token,
        refresh_token: masterSession.refresh_token
      });

      // Também salvar no patient_registry para referência
      await supabase.from('patient_registry').upsert({
        name: `RH - ${newCompany.name}`,
        email: rhEmail,
        password: tempPassword,
        plan_id: planId,
        empresa: newCompany.name,
        type: 'ADM',
        cpf: '',
        cell_phone: '',
        birth_date: null
      }, { onConflict: 'email' });

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await trackAction({
        user_id: currentUser?.id || 'system',
        user_name: 'Master Admin',
        action_type: 'CREATE',
        resource: 'COMPANIES',
        description: `Criou novo contrato para ${newCompany.name} (${rhEmail}) com acesso RH real`,
        payload: comp,
        status: 'SUCCESS'
      });

      setGeneratedPassword(tempPassword);
      setNewCompany({ name: '', rh_email: '', rh_password: '', contracted_lives: 100, value_per_life: 25.00 });
      fetchCompanies();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: editingCompany.name,
          rh_email: editingCompany.rh_email.toLowerCase().trim(),
          contracted_lives: editingCompany.contracted_lives,
          value_per_life: editingCompany.value_per_life
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await trackAction({
        user_id: currentUser?.id || 'system',
        user_name: 'Master Admin',
        action_type: 'UPDATE',
        resource: 'COMPANIES',
        description: `Editou contrato da empresa ${editingCompany.name}`,
        status: 'SUCCESS'
      });

      alert("Empresa atualizada!");
      setShowEditModal(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompany = async (company: any) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR a empresa "${company.name}"?\n\nEsta ação é irreversível e removerá todos os dados do contrato.`)) return;

    try {
      const { error } = await supabase.from('companies').delete().eq('id', company.id);
      if (error) throw error;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await trackAction({
        user_id: currentUser?.id || 'system',
        user_name: 'Master Admin',
        action_type: 'DELETE',
        resource: 'COMPANIES',
        description: `Excluiu contrato da empresa ${company.name}`,
        status: 'SUCCESS'
      });

      alert("Empresa excluída com sucesso!");
      fetchCompanies();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleResetRHPassword = async (company: any) => {
    const newPassword = generateTempPassword();
    const rhEmail = company.rh_email.toLowerCase().trim();

    try {
      // Verificar se o usuário RH já existe no Auth
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', rhEmail)
        .maybeSingle();

      if (existingProfile) {
        // Usuário existe - não podemos alterar senha pelo cliente sem Admin API
        // Vamos mostrar um aviso e sugerir que o RH use "Esqueci minha senha"
        alert(`O usuário RH já possui conta ativa.\n\nPara redefinir a senha, o RH deve usar a opção "Esqueci minha senha" na tela de login.\n\nE-mail: ${rhEmail}`);
        return;
      }

      // Usuário não existe - criar novo usuário Auth
      const { data: { session: masterSession } } = await supabase.auth.getSession();
      if (!masterSession) {
        throw new Error("Sessão expirou. Faça login novamente.");
      }

      const { error: authError } = await supabase.auth.signUp({
        email: rhEmail,
        password: newPassword,
        options: {
          data: {
            full_name: `RH - ${company.name}`,
            user_type: 'ADM',
            plan_status: 'ACTIVE',
            plan_id: company.plan_id,
            cpf: '',
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

      // Restaurar sessão do Master
      await supabase.auth.setSession({
        access_token: masterSession.access_token,
        refresh_token: masterSession.refresh_token
      });

      // Salvar no patient_registry
      await supabase.from('patient_registry').upsert({
        name: `RH - ${company.name}`,
        email: rhEmail,
        password: newPassword,
        plan_id: company.plan_id,
        empresa: company.name,
        type: 'ADM',
        cpf: '',
        cell_phone: '',
        birth_date: null
      }, { onConflict: 'email' });

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await trackAction({
        user_id: currentUser?.id || 'system',
        user_name: 'Master Admin',
        action_type: 'CREATE',
        resource: 'COMPANIES',
        description: `Criou acesso RH para empresa ${company.name}`,
        status: 'SUCCESS'
      });

      setEditingCompany({ ...company, newPassword });
      setShowEditModal(true);
    } catch (err: any) {
      alert("Erro ao criar/resetar senha: " + err.message);
    }
  };

  const openEditModal = (company: any) => {
    setEditingCompany({ ...company, newPassword: null });
    setErrorMsg(null);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Building className="text-blue-600" />
          Contratos de Empresas
        </h3>
        <button 
          onClick={() => { setErrorMsg(null); setShowModal(true); }} 
          className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-blue-900/10"
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && companies.length === 0 ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : companies.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma empresa cadastrada</p>
          </div>
        ) : companies.map(comp => (
          <div key={comp.id} className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all ${comp.is_active === false ? 'opacity-60 bg-slate-50' : 'hover:shadow-md'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${comp.is_active !== false ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                <Building size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-800">{comp.name}</h4>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500 font-medium">RH: {comp.rh_email}</p>
                  {comp.is_activated ? (
                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Conta Ativa</span>
                  ) : (
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Aguardando Ativação</span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-tighter">Plan ID: {comp.plan_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase">Vidas</p>
                <p className="font-bold text-slate-700">{comp.contracted_lives || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(comp)}
                  className="p-2.5 rounded-xl text-blue-500 bg-blue-50 hover:bg-blue-100 transition-all"
                  title="Editar empresa"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => handleResetRHPassword(comp)}
                  className="p-2.5 rounded-xl text-amber-500 bg-amber-50 hover:bg-amber-100 transition-all"
                  title="Resetar senha RH"
                >
                  <Key size={16} />
                </button>
                <button
                  onClick={() => toggleCompanyStatus(comp.id, comp.is_active, comp.name)}
                  className={`p-2.5 rounded-xl transition-all ${comp.is_active !== false ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
                  title={comp.is_active !== false ? 'Desativar' : 'Ativar'}
                >
                  {comp.is_active !== false ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteCompany(comp)}
                  className="p-2.5 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                  title="Excluir empresa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black text-slate-900">Novo Contrato</h3>
               <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={24} />
               </button>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in shake">
                 <AlertCircle className="text-red-500 shrink-0" size={18} />
                 <p className="text-xs text-red-700 font-bold leading-tight">{errorMsg}</p>
              </div>
            )}

            {generatedPassword ? (
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                  <CheckCircle2 className="text-emerald-600 mx-auto mb-3" size={40} />
                  <h4 className="font-black text-emerald-800 text-lg mb-2">Empresa Criada com Sucesso!</h4>
                  <p className="text-sm text-emerald-700 mb-4">Compartilhe as credenciais abaixo com o RH:</p>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200">
                    <p className="text-xs text-slate-500 mb-1">E-mail:</p>
                    <p className="font-bold text-slate-800 mb-3">{newCompany.rh_email || 'N/A'}</p>
                    <p className="text-xs text-slate-500 mb-1">Senha Temporária:</p>
                    <p className="font-mono font-black text-2xl text-emerald-600">{generatedPassword}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setGeneratedPassword(null); setShowModal(false); }}
                  className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome</label>
                  <input type="text" placeholder="Ex: Vivemus LTDA" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Gestor RH</label>
                  <input type="email" placeholder="rh@empresa.com" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" value={newCompany.rh_email} onChange={e => setNewCompany({...newCompany, rh_email: e.target.value})} required />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Temporária RH (opcional)</label>
                  <input type="text" placeholder="Deixe vazio para gerar automaticamente" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" value={newCompany.rh_password} onChange={e => setNewCompany({...newCompany, rh_password: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vidas</label>
                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={newCompany.contracted_lives} onChange={e => setNewCompany({...newCompany, contracted_lives: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço/Vida</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={newCompany.value_per_life} onChange={e => setNewCompany({...newCompany, value_per_life: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl mt-6 hover:bg-blue-600 transition-all shadow-xl"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Ativar Contrato'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-900">Editar Empresa</h3>
              <button onClick={() => { setShowEditModal(false); setEditingCompany(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            {editingCompany.newPassword && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <p className="text-xs font-bold text-amber-700 mb-2">Nova Senha Temporária Gerada:</p>
                <p className="font-mono font-black text-xl text-amber-600">{editingCompany.newPassword}</p>
                <p className="text-[10px] text-amber-600 mt-2">Compartilhe com o RH da empresa.</p>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs text-red-700 font-bold leading-tight">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" value={editingCompany.name} onChange={e => setEditingCompany({...editingCompany, name: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Gestor RH</label>
                <input type="email" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-medium focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" value={editingCompany.rh_email} onChange={e => setEditingCompany({...editingCompany, rh_email: e.target.value})} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vidas</label>
                  <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={editingCompany.contracted_lives} onChange={e => setEditingCompany({...editingCompany, contracted_lives: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço/Vida</label>
                  <input type="number" step="0.01" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={editingCompany.value_per_life} onChange={e => setEditingCompany({...editingCompany, value_per_life: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="text-xs text-slate-400 font-mono p-3 bg-slate-50 rounded-xl">
                Plan ID: {editingCompany.plan_id}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl mt-4 hover:bg-blue-700 transition-all shadow-xl"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const UsersModule: React.FC<{ isMaster?: boolean }> = ({ isMaster }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('companies').select('id, name, plan_id')
      ]);
      setUsers(uRes.data || []);
      setCompanies(cRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
        <Search className="text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar usuários..." 
          className="flex-1 outline-none font-bold text-slate-700"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <th className="px-8 py-4">Usuário</th>
              <th className="px-8 py-4">Perfil</th>
              <th className="px-8 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={3} className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr> :
             filtered.map(u => (
               <tr key={u.id}>
                 <td className="px-8 py-4">
                    <p className="font-bold">{u.full_name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                 </td>
                 <td className="px-8 py-4 uppercase font-black text-[10px] text-blue-500">{u.user_type}</td>
                 <td className="px-8 py-4">
                    <span className={`px-2 py-1 rounded text-[9px] font-black ${u.plan_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{u.plan_status}</span>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AsaasConfigModule: React.FC = () => {
  const [config, setConfig] = useState({ token: '', mode: 'sandbox' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'asaas_config').single();
      if (data) setConfig(data.value);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await supabase.from('system_settings').upsert({ key: 'asaas_config', value: config, updated_at: new Date().toISOString() });
    alert("Configuração Salva!");
    setIsSaving(false);
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
      <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
        <WalletCards className="text-emerald-600" />
        Configuração Asaas
      </h3>
      <div className="space-y-6">
        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Access Token</label>
           <input type="password" value={config.token} onChange={e => setConfig({...config, token: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl outline-none" />
        </div>
        <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all">
          {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Gateway'}
        </button>
      </div>
    </div>
  );
};

// ImportUsersModule foi movido para AdminUserImport.tsx
