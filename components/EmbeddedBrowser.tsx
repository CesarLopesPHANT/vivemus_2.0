
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, RefreshCw, ExternalLink, Shield, Loader2,
  AlertTriangle, WifiOff
} from 'lucide-react';
import {
  baixarDocumentosConsulta,
  executarAuditoriaPosNavegacao,
  DocumentoMedico
} from '../services/draovivoService';
import { trackApiAction } from '../services/logService';

interface EmbeddedBrowserProps {
  url: string;
  title?: string;
  personId?: string;
  protocolId?: string;
  userId?: string;
  onClose: () => void;
  onSessionEnd?: (documentos: any[]) => void;
}

interface SessionMetrics {
  startTime: Date;
  documentsGenerated: number;
  navigationEvents: number;
}

const EmbeddedBrowser: React.FC<EmbeddedBrowserProps> = ({
  url,
  title = 'Teleconsulta Vivemus',
  personId,
  protocolId,
  userId,
  onClose,
  onSessionEnd,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    startTime: new Date(),
    documentsGenerated: 0,
    navigationEvents: 0
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const headerTimeout = useRef<ReturnType<typeof setTimeout>>();
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Monitor conexao de internet
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timeout: detecta iframe bloqueado por X-Frame-Options (nao dispara onLoad nem onError)
  useEffect(() => {
    if (isLoading && !hasError && !iframeBlocked) {
      loadTimeoutRef.current = setTimeout(() => {
        setIframeBlocked(true);
        setIsLoading(false);
      }, 8000);
    }
    return () => { if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current); };
  }, [isLoading, hasError, iframeBlocked]);

  // Auto-hide header apos carregamento para experiencia nativa
  useEffect(() => {
    if (!isLoading && !hasError && !iframeBlocked) {
      headerTimeout.current = setTimeout(() => setShowHeader(false), 3000);
    }
    return () => { if (headerTimeout.current) clearTimeout(headerTimeout.current); };
  }, [isLoading, hasError, iframeBlocked]);

  // Log de inicio de sessao
  useEffect(() => {
    trackApiAction({
      userId: userId || 'anonymous',
      userName: 'Browser Session',
      actionType: 'EMBEDDED_BROWSER_SESSION_START',
      provider: 'DrAoVivo',
      payload: { url, personId, protocolId, startTime: sessionMetrics.startTime.toISOString() },
      status: 'SUCCESS'
    }).catch(() => {});
  }, [url, personId, protocolId, userId]);

  // Auditoria pos-navegacao ao fechar
  const handleSessionEnd = useCallback(async () => {
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - sessionMetrics.startTime.getTime()) / 1000);
    let documentos: DocumentoMedico[] = [];

    if (personId) {
      try {
        const auditResult = await executarAuditoriaPosNavegacao({
          personId,
          userId: userId || undefined,
          startTime: sessionMetrics.startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationSeconds,
          url,
          documentsGenerated: sessionMetrics.documentsGenerated,
          navigationEvents: sessionMetrics.navigationEvents
        });
        if (auditResult.success) {
          documentos = auditResult.documentos;
        }
      } catch (err) {
        console.warn('[EmbeddedBrowser] Erro na auditoria:', err);
      }
    } else if (protocolId) {
      try {
        documentos = await baixarDocumentosConsulta(protocolId);
      } catch (err) {
        console.warn('[EmbeddedBrowser] Erro ao buscar documentos:', err);
      }
    }

    if (onSessionEnd) onSessionEnd(documentos);
  }, [sessionMetrics, protocolId, personId, userId, url, onSessionEnd]);

  const handleIframeLoad = () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    setIsLoading(false);
    setHasError(false);
    setIframeBlocked(false);
    setSessionMetrics(prev => ({
      ...prev,
      navigationEvents: prev.navigationEvents + 1
    }));
  };

  const handleIframeError = () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setIframeBlocked(false);
    if (iframeRef.current) iframeRef.current.src = url;
  };

  const handleCloseRequest = () => setShowExitConfirm(true);

  const confirmClose = async () => {
    await handleSessionEnd();
    setShowExitConfirm(false);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRequest();
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header minimalista - auto-hide para experiencia nativa */}
      <div
        className={`h-11 bg-slate-900/95 backdrop-blur-sm flex items-center justify-between px-3 shrink-0 transition-all duration-300 z-20 ${
          showHeader
            ? 'translate-y-0 opacity-100 relative'
            : '-translate-y-full opacity-0 absolute top-0 left-0 right-0 pointer-events-none'
        }`}
        onMouseEnter={() => {
          setShowHeader(true);
          if (headerTimeout.current) clearTimeout(headerTimeout.current);
        }}
        onMouseLeave={() => {
          if (!isLoading && !hasError) {
            headerTimeout.current = setTimeout(() => setShowHeader(false), 2000);
          }
        }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCloseRequest}
            className="p-1.5 rounded-lg hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition-colors"
            title="Encerrar (ESC)"
          >
            <X size={18} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Atualizar (F5)"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-lg px-2.5 py-1 max-w-[55%]">
          <Shield size={11} className="text-emerald-400 shrink-0" />
          <span className="text-[10px] text-slate-500 truncate">{url}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOffline && <WifiOff size={13} className="text-amber-400" />}
          <button
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Abrir em nova aba"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Touch/hover area para revelar header quando escondido */}
      {!showHeader && (
        <div
          className="absolute top-0 left-0 right-0 h-5 z-10 cursor-pointer"
          onMouseEnter={() => setShowHeader(true)}
          onTouchStart={() => setShowHeader(true)}
        />
      )}

      {/* Iframe - full frame */}
      <div className="flex-1 relative">
        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center">
            <Loader2 size={48} className="text-blue-600 animate-spin" />
            <p className="mt-4 text-slate-700 font-semibold">Conectando...</p>
            <p className="text-xs text-slate-500 mt-1">Ambiente seguro Dr. ao Vivo</p>
          </div>
        )}

        {/* Error */}
        {hasError && !isLoading && !iframeBlocked && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center p-8">
            <AlertTriangle size={32} className="text-amber-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Erro ao carregar</h3>
            <p className="text-sm text-slate-500 text-center max-w-md mb-6">
              Nao foi possivel conectar a plataforma de telemedicina.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 flex items-center gap-2"
              >
                <ExternalLink size={16} /> Abrir externamente
              </button>
            </div>
          </div>
        )}

        {/* Iframe bloqueado (X-Frame-Options) - fallback para nova aba */}
        {iframeBlocked && (
          <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
              <ExternalLink size={36} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Abrindo consulta</h3>
            <p className="text-sm text-slate-500 text-center max-w-md mb-6">
              A plataforma sera aberta em uma nova aba para garantir a melhor experiencia de video.
            </p>
            <button
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="px-8 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <ExternalLink size={18} />
              Abrir Teleconsulta
            </button>
            <button
              onClick={handleRefresh}
              className="mt-3 text-slate-400 text-sm font-medium hover:text-slate-600"
            >
              Tentar carregar aqui novamente
            </button>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="camera; microphone; fullscreen; autoplay; encrypted-media"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals"
          title={title}
        />
      </div>

      {/* Dialogo de Confirmacao de Saida */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
              Encerrar atendimento?
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              O sistema ira capturar automaticamente documentos gerados (receitas, atestados).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedBrowser;
