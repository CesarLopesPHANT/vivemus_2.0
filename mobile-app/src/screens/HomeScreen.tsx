import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Ola, Paciente</Text>
        <Text style={styles.subtitle}>Como voce esta hoje?</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.emergencyCard]}
          onPress={() => navigation.navigate('Teleconsulta')}
        >
          <Text style={styles.actionIcon}>🏥</Text>
          <Text style={styles.actionTitle}>Pronto Atendimento</Text>
          <Text style={styles.actionSubtitle}>Consulta imediata com medico</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Agenda')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionTitle}>Minha Agenda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Saude')}
        >
          <Text style={styles.actionIcon}>❤️</Text>
          <Text style={styles.actionTitle}>Minha Saude</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 48 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  quickActions: { padding: 16, gap: 12 },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emergencyCard: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  actionSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});

export default HomeScreen;
