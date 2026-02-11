import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface TeleconsultaScreenProps {
  route: any;
  navigation: any;
}

const TeleconsultaScreen: React.FC<TeleconsultaScreenProps> = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const psoUrl = route.params?.url;

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

  return (
    <View style={styles.container}>
      {/* WebView da teleconsulta - menu inferior do app permanece visivel */}
      <WebView
        source={{ uri: psoUrl }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // Permissoes de camera e microfone
        mediaCapturePermissionGrantType="grant"
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Conectando ao medico...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  backButton: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#fff', fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
});

export default TeleconsultaScreen;
