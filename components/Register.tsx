
import React, { useState } from 'react';
import { User, Mail, Lock, CreditCard, Phone, ShieldCheck, AlertCircle, Loader2, ChevronLeft, Calendar, Globe, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { syncPatientToProvider } from '../services/draovivoService';

interface RegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onBack, onSuccess }) => {
  const [type, setType] = useState<'PF' | 'PJ' | 'ADM'>('PJ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('America/Cuiaba');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatCPF = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = (formData.get('email') as string).toLowerCase().trim();
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const birthDate = formData.get('birth_date') as string;
    const rawCPF = cpf.replace(/\D/g, '');
    const rawPhone = phone.replace(/\D/g, '');
    const tagId = crypto.randomUUID();

    try {
      // 1. Verificar se o e-mail já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg("Esta conta já está ATIVA. Por favor, retorne à tela anterior e faça login.");
        setIsSubmitting(false);
        return;
      }

      let finalPlanId = 'plano_individual';
      let finalPlanStatus = 'ACTIVE';
      let finalType: any = type;

      // 2. Lógica Baseada no Tipo de Registro
      if (type === 'PJ') {
        const { data: registry } = await supabase.from('patient_registry').select('*').eq('email', email).maybeSingle();
        if (!registry) throw new Error("E-mail não autorizado para convênio. Entre em contato com seu RH.");
        finalPlanId = `plano_${(registry.empresa || 'corporativo').toLowerCase().replace(/\s/g, '_')}`;
        finalPlanStatus = registry.plan_status || 'ACTIVE';
      } 
      else if (type === 'ADM') {
        const { data: company } = await supabase.from('companies').select('*').eq('rh_email', email).maybeSingle();
        if (!company) throw new Error("Acesso de gestor não pré-autorizado. O MASTER deve cadastrar sua empresa primeiro.");
        finalPlanId = `plano_${(company.name).toLowerCase().replace(/\s/g, '_')}`;
        finalType = 'ADM';
      }

      // 3. Criar Conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            user_type: finalType,
            plan_status: finalPlanStatus,
            plan_id: finalPlanId,
            cpf: rawCPF,
            cell_phone: rawPhone,
            birth_date: birthDate,
            timezone: timezone,
            tag_id: tagId
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 4. Sincronizar com Provedor de Telemedicina (Apenas se for Paciente PF/PJ)
        if (finalType === 'PF' || finalType === 'PJ') {
          try {
            await syncPatientToProvider({
              id: authData.user.id,
              name, email, password,
              cpf: rawCPF, cell_phone: rawPhone, birth_date: birthDate,
              plan_id: finalPlanId, plan_status: finalPlanStatus,
              timezone, tag_id: tagId, user_type: finalType
            });
          } catch (sErr) {
            console.warn("Falha na sincronização inicial DrAoVivo:", sErr);
          }
        }

        alert("Cadastro realizado! Seja bem-vindo ao ecossistema Vivemus.");
        onSuccess();
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
        <div className="p-10 md:p-14">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-8 transition-colors text-xs font-black uppercase tracking-widest outline-none">
            <ChevronLeft size={16} /> Voltar
          </button>
          
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Ativar Acesso</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Complete seus dados para o sistema Vivemus.</p>
          </div>

          <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-10">
            <button type="button" onClick={() => setType('PJ')} className={`flex-1 py-4 rounded-xl text-[9px] font-black tracking-widest transition-all ${type === 'PJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>BENEFICIÁRIO</button>
            <button type="button" onClick={() => setType('PF')} className={`flex-1 py-4 rounded-xl text-[9px] font-black tracking-widest transition-all ${type === 'PF' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>INDIVIDUAL</button>
            <button type="button" onClick={() => setType('ADM')} className={`flex-1 py-4 rounded-xl text-[9px] font-black tracking-widest transition-all ${type === 'ADM' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>GESTOR RH</button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0" size={20} />
              <p className="text-xs text-red-800 font-bold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input name="email" type="email" placeholder="seu@email.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input name="name" type="text" placeholder="Como no RG" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-sm font-bold outline-none transition-all" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Celular</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input name="birth_date" type="date" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuso Horário</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={timezone} 
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none appearance-none"
                    >
                      <option value="America/Cuiaba">America/Cuiaba (Padrão)</option>
                      <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                      <option value="America/Manaus">America/Manaus</option>
                      <option value="America/Fortaleza">America/Fortaleza</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input name="password" type="password" placeholder="Mínimo 6 caracteres" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold outline-none" required minLength={6} />
                </div>
              </div>
            </div>
            
            <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-blue-600 transition-all active:scale-95">
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : (
                <>
                  Concluir e Ativar
                  <ShieldCheck size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
