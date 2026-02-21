import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Ola! Bem-vindo ao Vivemus</Text>
      <Text style={styles.subtitle}>Sua saude, onde voce estiver.</Text>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Teleconsulta')}
      >
        <Text style={styles.cardTitle}>Iniciar Teleconsulta</Text>
        <Text style={styles.cardDescription}>Consulte um medico agora por video</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <Text style={styles.cardTitle}>Meu Historico</Text>
        <Text style={styles.cardDescription}>Veja suas consultas anteriores</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} activeOpacity={0.8}>
        <Text style={styles.cardTitle}>Meus Documentos</Text>
        <Text style={styles.cardDescription}>Receitas, atestados e laudos</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 48 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 32 },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardDescription: { fontSize: 13, color: '#64748b' },
});

export default HomeScreen;
