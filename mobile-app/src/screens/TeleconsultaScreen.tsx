import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { PipModule, TeleconsultaServiceModule } = NativeModules;

const ALLOWED_HOSTS = ['api.v2.doutoraovivo.com.br', 'doutoraovivo.com.br', 'vivemus.dav.med.br'];

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
  const [loading, setLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [isInPipMode, setIsInPipMode] = useState(false);
  const psoUrl = route.params?.url;

  // Solicita permissoes de camera/mic ao montar
  useEffect(() => {
    requestAndroidMediaPermissions().then(setPermissionsGranted);
  }, []);

  // Ativa PiP e Foreground Service quando a teleconsulta carrega
  useEffect(() => {
    if (permissionsGranted && psoUrl && Platform.OS === 'android') {
      // Sinaliza para o nativo que a teleconsulta esta ativa (auto-PiP ao minimizar)
      PipModule?.setTeleconsultaAtiva(true);

      // Previne capturas de tela durante a teleconsulta (compliance LGPD/CFM)
      PipModule?.setScreenSecure(true);

      // Inicia Foreground Service para manter conexao WebRTC em segundo plano
      TeleconsultaServiceModule?.iniciar().catch(() => {
        // Service pode falhar em alguns devices - teleconsulta continua funcionando
      });
    }

    return () => {
      if (Platform.OS === 'android') {
        // Desativa auto-PiP, FLAG_SECURE e para o Foreground Service ao sair da tela
        PipModule?.setTeleconsultaAtiva(false);
        PipModule?.setScreenSecure(false);
        TeleconsultaServiceModule?.parar().catch(() => {});
      }
    };
  }, [permissionsGranted, psoUrl]);

  // Escuta eventos de mudanca do modo PiP vindos do nativo
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      setIsInPipMode(inPip);
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

  if (!psoUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>URL da consulta nao disponivel</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Aguarda verificacao de permissoes
  if (permissionsGranted === null) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Verificando permissoes...</Text>
      </View>
    );
  }

  // Permissoes negadas
  if (permissionsGranted === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Permissoes de camera e microfone sao necessarias para a teleconsulta.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => requestAndroidMediaPermissions().then(setPermissionsGranted)}
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

  return (
    <View style={styles.container}>
      {/* WebView da teleconsulta - navegacao restrita ao dominio Dr. ao Vivo */}
      <WebView
        source={{ uri: psoUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={handleNavigationRequest}
        originWhitelist={ALLOWED_HOSTS.map(h => `https://${h}`)}
        // WebRTC: configuracoes essenciais para teleconsulta
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // Concessao automatica de camera/mic na WebView (sem popup interno)
        mediaCapturePermissionGrantType="grant"
        // Manter WebView ativa em segundo plano (PiP/minimizado)
        androidLayerType="hardware"
      />

      {/* Loading overlay - esconde no modo PiP para mostrar so o video */}
      {loading && !isInPipMode && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Conectando ao medico...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  backButton: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#fff', fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },
});

export default TeleconsultaScreen;
