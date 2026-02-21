
import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  CheckCircle2, AlertCircle,
  Download, FileText
} from 'lucide-react';
import {
  obterLinkPSO,
  DocumentoMedico
} from '../services/draovivoService';
import { supabase } from '../lib/supabase';
import { trackApiAction } from '../services/logService';
import { checkTeleconsultaConsent } from '../services/consentService';
import ConsentModal from './ConsentModal';
import EmbeddedBrowser from './EmbeddedBrowser';

interface TeleconsultationProps {
  onExit?: () => void;
  activeUrl?: string | null;
  onCallStart?: (url: string) => void;
  onCallEnd?: () => void;
  prefetchedPSO?: { url: string; personId?: string } | null;
}

const HEALTH_TIPS = [
  { icon: '💧', text: 'Beba pelo menos 2 litros de agua por dia para manter o corpo hidratado.' },
  { icon: '🥗', text: 'Inclua frutas e verduras em todas as refeicoes para fortalecer a imunidade.' },
  { icon: '🏃', text: '30 minutos de caminhada diaria reduzem o risco de doencas cardiovasculares.' },
  { icon: '😴', text: 'Durma entre 7 e 9 horas por noite para uma recuperacao completa do organismo.' },
  { icon: '🧘', text: 'Pratique respiracao profunda por 5 minutos ao dia para reduzir o estresse.' },
  { icon: '🦷', text: 'Escove os dentes apos cada refeicao e use fio dental diariamente.' },
  { icon: '☀️', text: 'Use protetor solar diariamente, mesmo em dias nublados.' },
  { icon: '🧴', text: 'Lave as maos frequentemente para prevenir infeccoes respiratorias.' },
  { icon: '🫀', text: 'Monitore sua pressao arterial regularmente, especialmente apos os 40 anos.' },
  { icon: '🧠', text: 'Exercicios de logica e leitura ajudam a manter a saude cognitiva em dia.' },
  { icon: '👁️', text: 'A cada 20 min no computador, olhe para algo a 6 metros por 20 segundos.' },
  { icon: '🥤', text: 'Reduza o consumo de acucar e bebidas industrializadas para prevenir diabetes.' },
];

const Teleconsultation: React.FC<TeleconsultationProps> = ({ onExit, activeUrl, onCallStart, onCallEnd, prefetchedPSO }) => {
  // 'initializing' evita renderizar qualquer UI ate a verificacao de auth/consent concluir
  const [stage, setStage] = useState<'initializing' | 'consent' | 'connecting' | 'call' | 'blocked' | 'summary'>(activeUrl ? 'call' : 'initializing');
  const [consentUserId, setConsentUserId] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [capturedDocuments, setCapturedDocuments] = useState<DocumentoMedico[]>([]);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * HEALTH_TIPS.length));
  const [tipFade, setTipFade] = useState(true);

  // Rotacao de dicas de saude (apenas na fase connecting)
  useEffect(() => {
    if (stage !== 'connecting') return;
    const interval = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setTipIndex(prev => (prev + 1) % HEALTH_TIPS.length);
        setTipFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [stage]);

  // Timeout para a fase de conexao
  useEffect(() => {
    if (stage !== 'connecting') return;
    const timeout = setTimeout(() => {
      alert('Tempo de conexao esgotado. Tente novamente.');
      onExit?.();
    }, 25000);
    return () => clearTimeout(timeout);
  }, [stage]);

  // Usa PSO pre-carregado (evita nova chamada a obterLinkPSO)
  const usePrefetchedPSO = useCallback((pso: { url: string; personId?: string }) => {
    if (pso.personId) setPersonId(pso.personId);
    setRoomUrl(pso.url);
    setStage('call');
    onCallStart?.(pso.url);
    trackApiAction({
      userId: userData?.id || 'unknown', userName: userData?.email || 'Paciente',
      actionType: 'PSO_EMBEDDED_PREFETCHED', provider: 'DrAoVivo',
      payload: { url: pso.url, personId: pso.personId, prefetched: true, embedded: true },
      status: 'SUCCESS'
    }).catch(() => {});
  }, [userData, onCallStart]);

  // Callback apos aceite do consentimento CFM: prossegue para conexao PSO
  const proceedAfterConsent = useCallback(() => {
    // Se temos PSO pre-carregado, usar imediatamente (sem fase connecting)
    if (prefetchedPSO?.url) {
      usePrefetchedPSO(prefetchedPSO);
      return;
    }

    // Fallback: buscar PSO normalmente
    setStage('connecting');
    const startPSO = async () => {
      try {
        const result = await obterLinkPSO();
        if (result.success && result.url) {
          if (result.personId) setPersonId(result.personId);
          setRoomUrl(result.url);
          setStage('call');
          onCallStart?.(result.url);
          trackApiAction({
            userId: userData?.id || 'unknown', userName: userData?.email || 'Paciente',
            actionType: 'PSO_EMBEDDED', provider: 'DrAoVivo',
            payload: { url: result.url, personId: result.personId, embedded: true },
            status: 'SUCCESS'
          }).catch(() => {});
        } else if (result.error?.includes("Plano inativo")) {
          setStage('blocked');
        } else {
          // PSO falhou - usar URL de fallback (login manual DAV)
          console.warn("PSO falhou, redirecionando para login manual DAV:", result.error);
          const fallbackUrl = "https://vivemus.dav.med.br/emergency/person/";
          setRoomUrl(fallbackUrl);
          setStage('call');
          onCallStart?.(fallbackUrl);
          trackApiAction({
            userId: userData?.id || 'unknown', userName: userData?.email || 'Paciente',
            actionType: 'PSO_FALLBACK_MANUAL_LOGIN', provider: 'DrAoVivo',
            payload: { error: result.error, code: result.code, fallbackUrl },
            status: 'ALERT'
          }).catch(() => {});
        }
      } catch (err: any) {
        console.error("Erro PSO apos consent:", err);
        // Fallback para login manual em vez de bloquear o usuario
        const fallbackUrl = "https://vivemus.dav.med.br/emergency/person/";
        setRoomUrl(fallbackUrl);
        setStage('call');
        onCallStart?.(fallbackUrl);
      }
    };
    startPSO();
  }, [userData, onCallStart, onExit, prefetchedPSO, usePrefetchedPSO]);

  // Ao montar: verifica consentimento CFM, depois obtem link PSO
  useEffect(() => {
    if (activeUrl) {
      setRoomUrl(activeUrl);
      setStage('call');
      return;
    }

    let cancelled = false;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) { alert("Erro: Usuario nao autenticado."); onExit?.(); }
        return;
      }

      setUserData({ id: user.id, email: user.email });
      setConsentUserId(user.id);

      // Verificar consentimento CFM antes de prosseguir
      const hasConsent = await checkTeleconsultaConsent(user.id);
      if (!hasConsent && !cancelled) {
        // Mostra ConsentModal; ao aceitar, proceedAfterConsent cuida do PSO
        setStage('consent');
        return;
      }
      if (cancelled) return;

      // Consentimento ja aceito: verificar se temos PSO pre-carregado
      if (prefetchedPSO?.url) {
        // PSO pre-fetched disponivel - abrir janela imediatamente (sem fase connecting!)
        usePrefetchedPSO(prefetchedPSO);
        return;
      }

      // Fallback: pre-fetch nao pronto, buscar PSO normalmente
      setStage('connecting');

      try {
        const result = await obterLinkPSO();
        if (cancelled) return;

        if (result.success && result.url) {
          if (result.personId) setPersonId(result.personId);
          setRoomUrl(result.url);
          setStage('call');
          onCallStart?.(result.url);

          trackApiAction({
            userId: user.id, userName: user.email || 'Paciente',
            actionType: 'PSO_EMBEDDED', provider: 'DrAoVivo',
            payload: { url: result.url, personId: result.personId, embedded: true },
            status: 'SUCCESS'
          }).catch(() => {});
        } else if (result.error?.includes("Plano inativo")) {
          setStage('blocked');
        } else {
          // PSO falhou - usar fallback (login manual DAV)
          if (!cancelled) {
            console.warn("PSO falhou, redirecionando para login manual DAV:", result.error);
            const fallbackUrl = "https://vivemus.dav.med.br/emergency/person/";
            setRoomUrl(fallbackUrl);
            setStage('call');
            onCallStart?.(fallbackUrl);
            trackApiAction({
              userId: user.id, userName: user.email || 'Paciente',
              actionType: 'PSO_FALLBACK_MANUAL_LOGIN', provider: 'DrAoVivo',
              payload: { error: result.error, fallbackUrl },
              status: 'ALERT'
            }).catch(() => {});
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Erro PSO:", err);
          // Fallback para login manual em vez de bloquear o usuario
          const fallbackUrl = "https://vivemus.dav.med.br/emergency/person/";
          setRoomUrl(fallbackUrl);
          setStage('call');
          onCallStart?.(fallbackUrl);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // Callback quando EmbeddedBrowser encerra sessao (auditoria e feita internamente pelo EmbeddedBrowser)
  const handleEmbeddedSessionEnd = useCallback((documentos: any[]) => {
    onCallEnd?.();
    setCapturedDocuments(documentos as DocumentoMedico[]);
    if (documentos.length > 0) {
      setStage('summary');
    } else {
      onExit?.();
    }
  }, [onCallEnd, onExit]);

  const currentTip = HEALTH_TIPS[tipIndex];

  // ===== RENDER: Consent (CFM) =====
  if (stage === 'consent' && consentUserId) {
    return (
      <ConsentModal
        userId={consentUserId}
        termTypes={['tcle_vivemus']}
        onAllAccepted={proceedAfterConsent}
        onCancel={onExit}
      />
    );
  }

  // ===== RENDER: Connecting (com dicas de saude) =====
  if (stage === 'connecting') {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center px-6 animate-in fade-in duration-500">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-200">
            <Loader2 size={36} className="text-white animate-spin" />
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-1">Preparando sua consulta</h3>
        <p className="text-slate-400 text-xs mb-10">Conectando ao pronto atendimento...</p>

        <div className={`max-w-xs text-center transition-opacity duration-300 ${tipFade ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">{currentTip.icon}</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            {currentTip.text}
          </p>
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-4">Dica de Saude Vivemus</p>
        </div>
      </div>
    );
  }

  // ===== RENDER: In-call (EmbeddedBrowser com iframe) =====
  if (stage === 'call' && roomUrl) {
    return (
      <div style={{ height: 'calc(100vh - 5rem)' }}>
        <EmbeddedBrowser
          url={roomUrl}
          personId={personId || undefined}
          userId={userData?.id}
          onClose={() => {}}
          onSessionEnd={handleEmbeddedSessionEnd}
        />
      </div>
    );
  }

  // ===== RENDER: Blocked =====
  if (stage === 'blocked') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-4">Plano Bloqueado</h1>
        <p className="text-slate-500 mb-8">
          Identificamos uma pendencia em seu plano. Para acessar a teleconsulta,
          regularize sua situacao financeira.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95"
          >
            Falar com Suporte
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="w-full py-3 text-slate-400 font-bold hover:text-slate-600"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: Summary =====
  if (stage === 'summary') {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Consulta Finalizada</h1>
          <p className="text-slate-500">
            Sua sessao foi encerrada com sucesso. Confira os documentos gerados.
          </p>
        </div>

        {capturedDocuments.length > 0 ? (
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Documentos Disponiveis ({capturedDocuments.length})
            </h3>
            <div className="space-y-3">
              {capturedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{doc.tipo}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(doc.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(doc.url_download, '_blank')}
                    className="p-2 bg-slate-100 rounded-xl hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center mb-8">
            <FileText size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              Nenhum documento foi gerado nesta consulta.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => { setCapturedDocuments([]); onExit?.(); }}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors"
          >
            Voltar ao Inicio
          </button>
          {capturedDocuments.length > 0 && (
            <button
              onClick={() => capturedDocuments.forEach(doc => window.open(doc.url_download, '_blank'))}
              className="w-full py-3 bg-blue-50 text-blue-600 font-semibold rounded-2xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Baixar todos os documentos
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: Initializing (aguarda verificacao de auth/consent) =====
  if (stage === 'initializing') {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center px-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
          <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Preparando teleconsulta...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Teleconsultation;
