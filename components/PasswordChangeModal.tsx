
import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PasswordChangeModalProps {
  userId: string;
  onSuccess: () => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ userId, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Atualizar a senha no Supabase Auth (Gera a troca real)
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Atualizar a flag must_change_password no banco público
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          must_change_password: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.warn("Erro ao desativar flag de troca de senha:", profileError.message);
      }

      setIsSuccess(true);
      
      // Delay curto para o usuário ver o check de sucesso
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao atualizar senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[340px] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${
            isSuccess ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-600'
          }`}>
            {isSuccess ? <CheckCircle2 size={28} /> : <Lock size={28} />}
          </div>
          
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Nova Senha</h3>
          <p className="text-slate-500 text-[11px] mt-1 mb-6 font-medium">
            Sua conta utiliza uma senha temporária. Escolha uma nova senha agora.
          </p>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 animate-in shake duration-300">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={12} />
              <p className="text-[10px] text-red-700 font-bold text-left leading-tight">{errorMsg}</p>
            </div>
          )}

          {isSuccess ? (
            <div className="py-4 animate-in fade-in zoom-in">
              <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Senha Alterada!</p>
              <Loader2 size={16} className="animate-spin text-emerald-500 mx-auto mt-2" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type={showPass ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha" 
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type={showPass ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Salvar Senha <ArrowRight size={14} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
