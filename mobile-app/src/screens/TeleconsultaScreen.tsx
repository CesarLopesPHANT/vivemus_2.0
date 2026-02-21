import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useConsultation } from '../context/ConsultationContext';
import { fetchPSO as fetchPSOFromCache, getCachedPSO } from '../lib/psoCache';

const { PipModule } = NativeModules;

const ALLOWED_HOSTS = ['api.v2.doutoraovivo.com.br', 'doutoraovivo.com.br', 'vivemus.dav.med.br'];
const PORTAL_URL = 'https://vivemus.dav.med.br';

// Padroes de URL que indicam erro de autenticacao na DAV
const AUTH_ERROR_PATTERNS = ['/error', '/login', '/unauthorized', '/expired', '/session-expired'];

// Padroes de URL que indicam fim da consulta
const CONSULTATION_END_PATTERNS = ['/feedback', '/rating', '/finalizado', '/encerrad'];

// Cor de fundo identica ao SplashScreen — suaviza transicao visual
const BG_COLOR = '#ffffff';
// Cor de fundo da WebView durante carregamento — esconde conteudo parcial do DAV
const WEBVIEW_BG_COLOR = '#0f172a';

const requestAndroidMediaPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
};

interface TeleconsultaScreenProps {
  route: any;
  navigation: any;
}

const TeleconsultaScreen: React.FC<TeleconsultaScreenProps> = ({ route, navigation }) => {
  const [webviewReady, setWebviewReady] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [isInPipMode, setIsInPipMode] = useState(false);
  const [psoUrl, setPsoUrl] = useState<string | null>(
    route.params?.url || getCachedPSO()?.url || null
  );
  const [isFetchingPSO, setIsFetchingPSO] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const mountedRef = useRef(true);
  const webviewRef = useRef<WebView>(null);
  const renewalAttemptRef = useRef(0);
  const { isActive, setActive } = useConsultation();

  // Busca PSO via cache compartilhado (fallback ou renovacao)
  const fetchFreshPSO = useCallback(async (): Promise<string | null> => {
    const cached = await fetchPSOFromCache();
    return cached?.url ?? null;
  }, []);

  // useLayoutEffect para definir estado visual antes da pintura da tela
  useLayoutEffect(() => {
    setWebviewReady(false);
    return () => { mountedRef.current = false; };
  }, []);

  // Se nao recebeu URL via params, busca PSO como fallback
  useEffect(() => {
    if (psoUrl) return;

    let cancelled = false;
    setIsFetchingPSO(true);

    const tryFetch = async () => {
      // Tenta cache primeiro
      let cached = getCachedPSO();
      if (cached) {
        if (!cancelled) { setPsoUrl(cached.url); setIsFetchingPSO(false); }
        return;
      }
      // Forca fetch fresco
      cached = await fetchPSOFromCache();
      if (cancelled) return;
      if (cached) { setPsoUrl(cached.url); }
      setIsFetchingPSO(false);
    };

    tryFetch();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Solicita permissoes de camera/mic ao montar
  useEffect(() => {
    requestAndroidMediaPermissions().then((granted) => {
      if (mountedRef.current) setPermissionsGranted(granted);
    });
  }, []);

  // Ativa FLAG_SECURE quando a teleconsulta esta visivel
  // PiP e Foreground Service sao gerenciados no AppNavigator via ConsultationContext
  useEffect(() => {
    if (permissionsGranted && psoUrl && Platform.OS === 'android') {
      PipModule?.setScreenSecure(true);
    }

    return () => {
      if (Platform.OS === 'android') {
        PipModule?.setScreenSecure(false);
      }
    };
  }, [permissionsGranted, psoUrl]);

  // Escuta eventos de mudanca do modo PiP vindos do nativo
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      if (mountedRef.current) setIsInPipMode(inPip);
    });

    return () => subscription.remove();
  }, []);

  const handleNavigationRequest = useCallback((event: { url: string }) => {
    try {
      const { hostname } = new URL(event.url);
      return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
    } catch {
      return false;
    }
  }, []);

  const handleWebViewLoad = useCallback(() => {
    if (mountedRef.current) {
      setWebviewReady(true);
      if (!isActive) setActive(true);
    }
  }, [isActive, setActive]);

  // Detecta erro de autenticacao e fim de consulta na WebView
  const handleNavigationStateChange = useCallback(async (navState: WebViewNavigation) => {
    const { url } = navState;
    if (!url) return;

    // Detecta fim da consulta
    const isEndOfConsultation = CONSULTATION_END_PATTERNS.some(p => url.includes(p));
    if (isEndOfConsultation) {
      setActive(false);
      return;
    }

    // Verifica se a URL indica erro de autenticacao
    const isAuthError = AUTH_ERROR_PATTERNS.some(pattern => url.includes(pattern));

    // Tambem detecta se saiu do portal DAV (redirecionou para login)
    const isOutsidePortal = url.startsWith(PORTAL_URL) &&
      (url.includes('/login') || url.includes('/auth'));

    if ((isAuthError || isOutsidePortal) && !isRenewing && renewalAttemptRef.current < 2) {
      renewalAttemptRef.current += 1;
      setIsRenewing(true);

      const newUrl = await fetchFreshPSO();
      if (!mountedRef.current) return;

      if (newUrl) {
        setPsoUrl(newUrl);
        setIsRenewing(false);
      } else {
        setIsRenewing(false);
        navigation.goBack();
      }
    }
  }, [isRenewing, fetchFreshPSO, navigation, setActive]);

  // ===== GUARD: Buscando PSO (fallback) =====
  if (isFetchingPSO || (!psoUrl && !isFetchingPSO)) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          {isFetchingPSO ? 'Preparando sua consulta...' : 'URL da consulta nao disponivel'}
        </Text>
        {!isFetchingPSO && !psoUrl && (
          <TouchableOpacity style={[styles.backButton, { marginTop: 16 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ===== GUARD: Verificando permissoes =====
  if (permissionsGranted === null) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verificando permissoes...</Text>
      </View>
    );
  }

  // ===== GUARD: Permissoes negadas =====
  if (permissionsGranted === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Permissoes de camera e microfone sao necessarias para a teleconsulta.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => requestAndroidMediaPermissions().then((g) => {
            if (mountedRef.current) setPermissionsGranted(g);
          })}
        >
          <Text style={styles.backButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: '#64748b', marginTop: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ===== RENDER: WebView com overlay anti-flicker =====
  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: psoUrl! }}
        style={[styles.webview, !webviewReady && styles.webviewHidden]}
        onLoadEnd={handleWebViewLoad}
        onShouldStartLoadWithRequest={handleNavigationRequest}
        onNavigationStateChange={handleNavigationStateChange}
        originWhitelist={['*']}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaCapturePermissionGrantType="grant"
        androidLayerType="hardware"
      />

      {/* Overlay de carregamento — pointerEvents none para nao bloquear toques na WebView */}
      {(!webviewReady || isRenewing) && !isInPipMode && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            {isRenewing ? 'Renovando sessao...' : 'Conectando ao medico...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WEBVIEW_BG_COLOR,
  },
  webview: {
    flex: 1,
    backgroundColor: WEBVIEW_BG_COLOR,
  },
  webviewHidden: {
    opacity: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: BG_COLOR,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WEBVIEW_BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
});

export default TeleconsultaScreen;
