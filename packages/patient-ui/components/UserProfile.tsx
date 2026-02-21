
import React, { useState } from 'react';
import {
  User,
  Mail,
  CreditCard,
  ShieldCheck,
  Users,
  Plus,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building2,
  AlertCircle,
  Loader2,
  BadgeCheck,
  Trash2,
  XCircle
} from 'lucide-react';
import { UserData } from '../../shared/types';

interface UserProfileProps {
  user: UserData;
  onUpdate: (data: Partial<UserData>) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [showAddDependent, setShowAddDependent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [dependents, setDependents] = useState([
    { name: 'Maria Oliveira', relation: 'Cônjuge', active: true },
    { name: 'Joãozinho Oliveira', relation: 'Filho', active: true }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Simula delay de rede
    setTimeout(() => {
      onUpdate({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      });
      setIsSaving(false);
      setSaveStatus('success');
      
      // Limpa status após 3 segundos
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Lado Esquerdo: Resumo e Status do Plano */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center animate-in slide-in-from-left duration-500">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-slate-50 shadow-xl group">
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              </div>
              {user.isValidated && (
                <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg">
                  <BadgeCheck className="text-blue-500" size={24} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <h3 className="text-xl font-bold text-slate-800">{user.name}</h3>
              {user.isValidated && <ShieldCheck size={16} className="text-blue-500" />}
            </div>
            <p className="text-slate-400 text-sm">Usuário desde 2024</p>
            
            <div className="w-full mt-8 pt-6 border-t border-slate-50 space-y-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 size={14} />
                  Ativo
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Plano</span>
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  user.type === 'PJ' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {user.type === 'PF' ? 'Individual PF' : 'Empresarial'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Validação</span>
                <span className={`text-[10px] font-black uppercase ${user.isValidated ? 'text-blue-600' : 'text-amber-600'}`}>
                  {user.isValidated ? 'Verificado' : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden transition-all duration-700 ${
            user.type === 'PJ' ? 'bg-gradient-to-br from-indigo-600 to-indigo-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'
          }`}>
             <div className="relative z-10">
                <h4 className="font-bold text-lg mb-2">Informação do Plano</h4>
                {user.type === 'PJ' ? (
                  <>
                    <p className="text-indigo-100 text-sm leading-relaxed mb-6">Sua conta é mantida pela parceria <b>Vivemus Business</b>. Suas consultas são ilimitadas e prioritárias.</p>
                    <div className="bg-white/10 p-4 rounded-2xl flex items-center gap-3 border border-white/10">
                       <Building2 size={20} className="text-indigo-200" />
                       <span className="text-xs font-bold uppercase tracking-widest">PJ ATIVO</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-blue-100 text-sm leading-relaxed mb-6">Plano Individual com cobertura completa em teleconsultas 24h em todo o Brasil.</p>
                    <div className="bg-white/10 p-4 rounded-2xl flex items-center gap-3 border border-white/10">
                       <ShieldCheck size={20} className="text-blue-200" />
                       <span className="text-xs font-bold uppercase tracking-widest">PF SEGURO</span>
                    </div>
                  </>
                )}
             </div>
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Lado Direito: Dados e Dependentes */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Dados Cadastrais */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-right duration-500">
            <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
              <User size={24} className="text-blue-600" />
              Dados do Cadastro
            </h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    name="name"
                    type="text" 
                    defaultValue={user.name} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" 
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    name="email"
                    type="email" 
                    defaultValue={user.email} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" 
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Documento Identificador</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" defaultValue="***.***.123-XX" disabled className="w-full pl-12 pr-4 py-4 bg-slate-100 border-transparent rounded-2xl text-slate-400 cursor-not-allowed outline-none font-mono" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Telefone WhatsApp</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" defaultValue="(11) 99999-9999" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all" />
                </div>
              </div>
              <div className="md:col-span-2 pt-4 flex items-center gap-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 active:scale-95 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={20} className="animate-spin" /> : 'Salvar Alterações'}
                </button>
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-left duration-300">
                    <CheckCircle2 size={18} />
                    Salvo com sucesso!
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* Gestão de Dependentes */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom duration-700">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Users size={24} className="text-blue-600" />
                Dependentes
              </h3>
              <button 
                onClick={() => setShowAddDependent(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-600 hover:text-white active:scale-95 hover:scale-[1.02] transition-all text-sm"
              >
                <Plus size={18} />
                Adicionar
              </button>
            </div>

            <div className="space-y-4">
              {dependents.map((dep, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                         <User size={22} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-800">{dep.name}</p>
                         <p className="text-xs text-slate-500">{dep.relation}</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">Ativo</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
               <AlertCircle className="text-amber-600 shrink-0" size={24} />
               <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>Nota Financeira:</strong> A inclusão de dependentes gera uma cobrança adicional recorrente no seu faturamento mensal via Asaas.
               </p>
            </div>
          </section>
        </div>
      </div>

      {/* Zona de Perigo — Exclusao de Conta (LGPD Art. 18) */}
      <section className="bg-white p-10 rounded-[2.5rem] border border-red-100 shadow-sm animate-in slide-in-from-bottom duration-700">
        <h3 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-3">
          <AlertCircle size={24} className="text-red-500" />
          Zona de Perigo
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Ao excluir sua conta, seus dados pessoais serao permanentemente removidos. Conforme a
          <strong> Resolucao CFM 1.821/2007</strong>, seus prontuarios medicos serao anonimizados e retidos por
          <strong> 20 anos</strong> para fins legais, sem qualquer vinculo com sua identidade.
        </p>
        <button
          onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(''); setDeleteError(null); }}
          className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white active:scale-95 transition-all text-sm border border-red-200"
        >
          <Trash2 size={18} />
          Excluir minha conta e dados
        </button>
      </section>

      {/* MODAL DE ADIÇÃO (ASAAS) */}
      {showAddDependent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Users size={40} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800">Novo Dependente</h3>
                 <p className="text-slate-500 text-sm mt-2 mb-8 px-4">Utilizamos o checkout seguro do <b>Asaas</b> para processar o valor adicional do seu plano.</p>
                 
                 <div className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-4 text-left border border-slate-100">
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-500 font-medium">Valor Adicional</span>
                       <span className="font-bold text-slate-800">R$ 29,90 / mês</span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-500 font-medium">Ativação Imediata</span>
                       <span className="font-bold text-emerald-600 uppercase text-[10px] bg-emerald-100 px-2 py-1 rounded">SIM</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-baseline">
                       <span className="font-bold text-slate-800">Total</span>
                       <span className="text-2xl font-black text-blue-600">R$ 29,90</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                       Acessar Checkout
                       <ArrowRight size={20} />
                    </button>
                    <button 
                      onClick={() => setShowAddDependent(false)}
                      className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-all active:scale-90"
                    >
                      Depois eu faço
                    </button>
                 </div>

                 <p className="text-[10px] text-slate-400 mt-8 uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 opacity-60">
                   <ShieldCheck size={14} />
                   Segurança Vivemus & Asaas
                 </p>
              </div>
           </div>
        </div>
      )}
      {/* MODAL DE EXCLUSAO DE CONTA (LGPD) */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <XCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Excluir Conta</h3>
              <p className="text-slate-500 text-sm mt-2 mb-4 px-4">
                Esta acao e <strong>irreversivel</strong>. Todos os seus dados pessoais serao removidos.
              </p>

              <div className="bg-amber-50 p-4 rounded-2xl mb-6 text-left border border-amber-100">
                <div className="flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    <strong>Retencao Legal:</strong> Seus prontuarios medicos serao anonimizados e retidos
                    por 20 anos conforme Resolucao CFM 1.821/2007. Nenhum dado identificavel permanecera vinculado.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-left mb-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Digite EXCLUIR para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-red-500/10 transition-all font-mono text-center text-lg tracking-widest"
                />
              </div>

              {deleteError && (
                <div className="bg-red-50 p-3 rounded-xl mb-4 text-red-600 text-xs font-medium border border-red-100">
                  {deleteError}
                </div>
              )}

              <div className="space-y-4">
                <button
                  disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    setDeleteError(null);
                    try {
                      const res = await fetch('/api/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.location.href = '/';
                      } else {
                        setDeleteError(data.error || 'Erro ao excluir conta. Tente novamente.');
                      }
                    } catch {
                      setDeleteError('Erro de conexao. Verifique sua internet e tente novamente.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : (
                    <>
                      <Trash2 size={20} />
                      Excluir Permanentemente
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-all active:scale-90"
                >
                  Cancelar
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mt-8 uppercase font-bold tracking-widest flex items-center justify-center gap-1.5 opacity-60">
                <ShieldCheck size={14} />
                Protegido pela LGPD
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
