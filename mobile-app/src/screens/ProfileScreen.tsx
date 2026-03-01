import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { supabase } from '../lib/supabase';

const TERMS_URL   = 'https://vivemus.com.br/termos-de-uso';
const PRIVACY_URL = 'https://vivemus.com.br/politica-de-privacidade';
const SITE_URL    = 'https://vivemus.com.br/';

const openURL = (url: string) => {
  Linking.openURL(url).catch(() =>
    Alert.alert('Erro', 'Não foi possível abrir o link. Tente novamente.')
  );
};

const ProfileScreen: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  const performDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
      Alert.alert(
        'Conta Excluída',
        'Seus dados pessoais foram removidos conforme a LGPD (Lei 13.709/2018).',
        [{ text: 'OK', onPress: () => DeviceEventEmitter.emit('accountDeleted') }]
      );
    } catch {
      Alert.alert(
        'Erro ao Excluir',
        'Não foi possível excluir a conta.\nContate: suporte@vivemus.com.br'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Dupla confirmação — obrigatória pela Apple (App Store Rule 5.1.1)
  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Minha Conta',
      'Esta ação removerá permanentemente todos os seus dados do Vivemus, incluindo histórico de consultas.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirmação Final',
              'Esta ação é irreversível. Seus dados serão excluídos conforme a LGPD.\n\nConfirmar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir Permanentemente', style: 'destructive', onPress: performDeleteAccount },
              ]
            ),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.userName}>Meu Perfil</Text>
        <Text style={styles.userSubtitle}>Gerencie sua conta e seus dados</Text>
      </View>

      {/* Dependentes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dependentes</Text>
          <TouchableOpacity onPress={() => openURL(SITE_URL)} activeOpacity={0.7}>
            <Text style={styles.addBtn}>+ Novo dependente</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
          <Text style={styles.emptyText}>Nenhum dependente cadastrado</Text>
          <Text style={styles.emptyHint}>
            Gerencie dependentes pelo site Vivemus
          </Text>
        </View>
      </View>

      {/* Documentos Legais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documentos Legais</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => openURL(TERMS_URL)} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemIcon}>📄</Text>
            <Text style={styles.menuItemText}>Termos de Uso</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => openURL(PRIVACY_URL)} activeOpacity={0.7}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemIcon}>🔒</Text>
            <Text style={styles.menuItemText}>Política de Privacidade</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Rodapé com link discreto de exclusão */}
      <View style={styles.footer}>
        <Text style={styles.version}>Vivemus v1.1.7</Text>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          activeOpacity={0.6}
          style={styles.deleteLink}
        >
          {isDeleting
            ? <ActivityIndicator size="small" color="#ef4444" />
            : <Text style={styles.deleteLinkText}>Excluir minha conta</Text>
          }
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 52, paddingBottom: 40 },

  // Cabeçalho
  header: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 34 },
  userName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  userSubtitle: { fontSize: 12, color: '#94a3b8' },

  // Seções
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Estado vazio — dependentes
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4 },
  emptyHint: { fontSize: 11, color: '#94a3b8' },

  // Itens de menu
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuItemIcon: { fontSize: 15 },
  menuItemText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  menuItemArrow: { fontSize: 22, color: '#94a3b8' },

  // Rodapé discreto
  footer: { alignItems: 'center', marginTop: 8, gap: 10 },
  version: { fontSize: 11, color: '#cbd5e1' },
  deleteLink: { paddingVertical: 6, paddingHorizontal: 12 },
  deleteLinkText: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;
