import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle2, Loader2 } from 'lucide-react';
import {
  ConsentTerm,
  getActiveTerms,
  getUserConsents,
  acceptTerm,
} from '../services/consentService';

interface ConsentModalProps {
  userId: string;
  termTypes: string[];
  onAllAccepted: () => void;
  onCancel?: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({
  userId,
  termTypes,
  onAllAccepted,
  onCancel,
}) => {
  const [terms, setTerms] = useState<ConsentTerm[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [activeTerms, userConsents] = await Promise.all([
        getActiveTerms(termTypes),
        getUserConsents(userId),
      ]);

      const alreadyAccepted = new Set(userConsents.map(c => c.term_id));
      const pending = activeTerms.filter(t => !alreadyAccepted.has(t.id));

      if (pending.length === 0) {
        onAllAccepted();
        return;
      }

      setTerms(pending);
      setLoading(false);
    };
    load();
  }, [userId, termTypes]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setScrolledToBottom(true);
    }
  };

  const handleSubmit = async () => {
    if (!accepted) return;
    setSubmitting(true);

    const results = await Promise.all(
      terms.map(t => acceptTerm(userId, t.id, t.term_type, t.version))
    );

    if (results.every(Boolean)) {
      onAllAccepted();
    } else {
      alert('Erro ao registrar consentimento. Tente novamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center">
          <Loader2 size={32} className="text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando termos...</p>
        </div>
      </div>
    );
  }

  // Pega o primeiro termo (TCLE unificado)
  const tcle = terms[0];
  if (!tcle) return null;

  // Formata o conteudo em secoes
  const sections = tcle.content.split('\n\n').map(section => {
    const lines = section.split('\n');
    const title = lines[0];
    const body = lines.slice(1).join('\n');
    return { title, body };
  });

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-5 pb-3 text-center shrink-0">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">
            {tcle.title}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Versao {tcle.version} · Leia atentamente antes de prosseguir
          </p>
        </div>

        {/* Corpo do TCLE com scroll */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 pb-2 min-h-0"
        >
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div key={i}>
                <h3 className="text-sm font-bold text-slate-800 mb-1.5">
                  {section.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Indicador de scroll se nao chegou ao final */}
          {!scrolledToBottom && (
            <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none flex items-end justify-center pb-1">
              <span className="text-[10px] text-slate-400 font-medium animate-bounce">
                Role para baixo para ler o termo completo
              </span>
            </div>
          )}
        </div>

        {/* Footer: checkbox + botao */}
        <div className="p-4 pt-3 border-t border-slate-100 shrink-0 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={!scrolledToBottom}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 shrink-0 disabled:opacity-40"
            />
            <span className={`text-xs leading-relaxed ${scrolledToBottom ? 'text-slate-700' : 'text-slate-400'}`}>
              Declaro que li, compreendi e aceito os termos acima, autorizando o
              tratamento de meus dados para fins de prestacao de servicos de saude.
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={!accepted || submitting}
            className={`w-full py-3.5 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm ${
              accepted
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {submitting ? 'Registrando aceite...' : 'Aceito e Continuar'}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
