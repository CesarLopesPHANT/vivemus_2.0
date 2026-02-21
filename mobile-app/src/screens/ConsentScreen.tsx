import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

interface ConsentScreenProps {
  onAccepted: () => void;
}

const TCLE_CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)
TELECONSULTA MEDICA — VIVEMUS

1. NATUREZA DO SERVICO
A Vivemus, em parceria com a Doutor ao Vivo (DAV), oferece servico de teleconsulta medica para atendimentos de baixa e media complexidade, por meio de videoconferencia com medicos devidamente registrados no CRM.

2. LIMITACOES DA TELEMEDICINA
Conforme a Resolucao CFM 2.314/2022:
- A teleconsulta NAO substitui o atendimento presencial em todas as situacoes clinicas.
- O medico pode indicar a necessidade de consulta presencial a qualquer momento.
- Em caso de EMERGENCIA (dor no peito, dificuldade respiratoria, AVC, hemorragias, trauma grave), ligue para o SAMU (192) ou va ao pronto-socorro mais proximo.

3. COMPARTILHAMENTO DE DADOS (LGPD)
Ao aceitar este termo, voce autoriza o compartilhamento dos seguintes dados com a plataforma Doutor ao Vivo para viabilizar a teleconsulta:
- Nome completo, CPF, e-mail
- Dados de saude relatados durante a consulta

Seus dados sao protegidos pela Lei Geral de Protecao de Dados (Lei 13.709/2018) e tratados exclusivamente para fins de prestacao de servicos de saude.

4. PRONTUARIOS MEDICOS
Os prontuarios eletronicos gerados durante as consultas serao armazenados por no minimo 20 (vinte) anos, conforme Resolucao CFM 1.821/2007, Art. 8.

5. SIGILO MEDICO
Todas as informacoes de saude compartilhadas durante a teleconsulta estao protegidas pelo sigilo medico (Art. 73 do Codigo de Etica Medica), sendo acessiveis apenas ao medico responsavel pelo atendimento e ao proprio paciente.

6. DIREITOS DO PACIENTE
Voce tem o direito de:
- Revogar este consentimento a qualquer momento
- Solicitar atendimento presencial
- Acessar, corrigir ou solicitar a exclusao de seus dados pessoais
- Recusar a teleconsulta sem prejuizo

7. DECLARACAO
Ao aceitar, declaro que li, compreendi e aceito os termos acima, autorizando o tratamento de meus dados para fins de prestacao de servicos de saude por meio da plataforma Vivemus e Doutor ao Vivo.`;

const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccepted }) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    // Em producao, chamaria consentService.acceptTerm() via Supabase
    // Por ora, sinaliza aceite para o AppNavigator
    setTimeout(() => {
      onAccepted();
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🛡️</Text>
        <Text style={styles.headerTitle}>Termo de Consentimento</Text>
        <Text style={styles.headerSubtitle}>Leia o termo completo antes de aceitar</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {TCLE_CONTENT.split('\n\n').map((section, idx) => (
          <Text key={idx} style={styles.sectionText}>{section}</Text>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {!hasScrolledToEnd && (
        <Text style={styles.scrollHint}>Role ate o final para habilitar o aceite</Text>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => hasScrolledToEnd && setIsChecked(!isChecked)}
          disabled={!hasScrolledToEnd}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked, !hasScrolledToEnd && styles.checkboxDisabled]}>
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkboxLabel, !hasScrolledToEnd && styles.labelDisabled]}>
            Declaro que li, compreendi e aceito os termos acima, autorizando o tratamento de meus dados
            para fins de prestacao de servicos de saude.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptButton, (!isChecked || isSubmitting) && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!isChecked || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>Aceitar e Continuar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIcon: { fontSize: 36, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: '#94a3b8' },
  scrollArea: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  sectionText: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16 },
  scrollHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    fontWeight: '600',
  },
  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#2563eb' },
  checkboxDisabled: { borderColor: '#cbd5e1' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  checkboxLabel: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
  labelDisabled: { color: '#cbd5e1' },
  acceptButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  acceptButtonDisabled: { backgroundColor: '#cbd5e1' },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default ConsentScreen;
