import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface ConsentScreenProps {
  onAccept: () => void;
  onCancel: () => void;
}

const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept, onCancel }) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isBottom) setScrolledToBottom(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Termo de Consentimento</Text>
        <Text style={styles.subtitle}>TCLE - Teleconsulta Vivemus</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.termText}>
          {`TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)

Ao utilizar o servico de teleconsulta da Vivemus, voce declara estar ciente e concordar com os seguintes termos:

1. NATUREZA DO SERVICO
A teleconsulta e realizada por medicos devidamente registrados no CRM, em conformidade com a Resolucao CFM n. 2.314/2022.

2. LIMITACOES
A teleconsulta possui limitacoes inerentes a ausencia de exame fisico presencial. O medico podera solicitar atendimento presencial quando julgar necessario.

3. PRIVACIDADE E SIGILO
Todas as informacoes compartilhadas sao protegidas pelo sigilo medico e pela Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).

4. CONSENTIMENTO
Ao prosseguir, voce autoriza:
- A realizacao da consulta medica por videoconferencia
- O armazenamento seguro dos registros medicos
- A emissao de receitas e atestados digitais quando aplicavel

5. REVOGACAO
Este consentimento pode ser revogado a qualquer momento atraves das configuracoes do aplicativo.

Role ate o final para aceitar os termos.`}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>Recusar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.acceptButton, !scrolledToBottom && styles.disabled]}
          onPress={onAccept}
          disabled={!scrolledToBottom}
        >
          <Text style={styles.acceptText}>
            {scrolledToBottom ? 'Aceitar e Continuar' : 'Leia ate o final'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  content: { flex: 1, padding: 24 },
  termText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9' },
  acceptButton: { backgroundColor: '#059669' },
  disabled: { backgroundColor: '#94a3b8' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  acceptText: { fontWeight: '700', color: '#fff' },
});

export default ConsentScreen;
