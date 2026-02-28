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

// ⚠️  AÇÃO NECESSÁRIA: Substitua pelas URLs reais dos seus documentos legais
const TERMS_URL = 'https://vivemus.com.br/termos-de-uso';
const PRIVACY_URL = 'https://vivemus.com.br/politica-de-privacidade';

const openURL = (url: string) => {
  Linking.openURL(url).catch(() =>
    Alert.alert('Erro', 'Não foi possível abrir o link. Tente novamente.')
  );
};

const ProfileScreen: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Passo 2 de 2: executa a exclusão após confirmação dupla ──────────────
  const performDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Chama RPC no Supabase que apaga dados do usuário (LGPD Art. 18, VI)
      // Você deve criar a função `delete_user_account` no seu Supabase:
      //   CREATE OR REPLACE FUNCTION delete_user_account()
      //   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
      //   BEGIN
      //     DELETE FROM profiles WHERE id = auth.uid();
      //     -- adicione outras tabelas conforme necessário
      //   END; $$;
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) throw rpcError;

      // Encerra a sessão autenticada
      await supabase.auth.signOut();

      Alert.alert(
        'Conta Excluída',
        'Seus dados pessoais foram removidos com sucesso, conforme previsto na LGPD (Lei 13.709/2018).',
        [
          {
            text: 'OK',
            // Emite evento global para AppNavigator redefinir o estado de auth
            onPress: () => DeviceEventEmitter.emit('accountDeleted'),
          },
        ]
      );
    } catch {
      Alert.alert(
        'Erro ao Excluir',
        'Não foi possível excluir a conta no momento.\nTente novamente ou contate: suporte@vivemus.com.br'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Confirmação dupla — obrigatória pela Apple (App Store Rule 5.1.1) ────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Minha Conta',
      'Esta ação irá remover permanentemente todos os seus dados pessoais do Vivemus, incluindo histórico de consultas e documentos médicos.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirmação Final',
              'ATENÇÃO: Esta ação é irreversível. Seus dados serão permanentemente excluídos conforme a LGPD.\n\nConfirmar exclusão definitiva?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Excluir Permanentemente',
                  style: 'destructive',
                  onPress: performDeleteAccount,
                },
              ]
            ),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.userName}>Meu Perfil</Text>
        <Text style={styles.userSubtitle}>Gerencie sua conta e seus dados</Text>
      </View>

      {/* Seção: Documentos Legais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documentos Legais</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openURL(TERMS_URL)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemIcon}>📄</Text>
            <Text style={styles.menuItemText}>Termos de Uso</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemLast]}
          onPress={() => openURL(PRIVACY_URL)}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemIcon}>🔒</Text>
            <Text style={styles.menuItemText}>Política de Privacidade</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Seção: Dados e Conta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados e Conta</Text>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.deleteButtonIcon}>🗑</Text>
              <Text style={styles.deleteButtonText}>Excluir Minha Conta</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.deleteHint}>
          A exclusão é permanente e remove todos os seus dados pessoais
          conforme a LGPD (Lei 13.709/2018, Art. 18, VI).
        </Text>
      </View>

      {/* Versão do app — usa version do app.json (visível nas stores) */}
      <Text style={styles.version}>Vivemus v1.1.7</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 52, paddingBottom: 48 },

  // Cabeçalho
  header: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 38 },
  userName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  userSubtitle: { fontSize: 13, color: '#94a3b8' },

  // Seções
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

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
  menuItemIcon: { fontSize: 16 },
  menuItemText: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  menuItemArrow: { fontSize: 22, color: '#94a3b8' },

  // Botão de exclusão
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonDisabled: { backgroundColor: '#fca5a5' },
  deleteButtonIcon: { fontSize: 15 },
  deleteButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Rodapé
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 8,
  },
});

export default ProfileScreen;
