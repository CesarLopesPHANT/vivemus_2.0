import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  ActivityIndicator,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { supabase } from '../lib/supabase';

// ─── Constantes ──────────────────────────────────────────────────────────────
const BLUE        = '#007BFF';
const BLUE_DARK   = '#0056CC';
const DARK_NAVY   = '#0f172a';
const GRAPHITE    = '#2D2D2D';
const SOFT_GRAY   = '#9E9E9E';
const BG_FIELD    = '#F8F9FA';
const ERROR_RED   = '#DC3545';

const SITE_URL    = 'https://www.vivemus.com.br';
const TERMS_URL   = 'https://vivemus.com.br/termos-de-uso';
const PRIVACY_URL = 'https://vivemus.com.br/politica-de-privacidade';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const openURL = (url: string) =>
  Linking.openURL(url).catch(() => {});

// ─── Icon substitutos (sem dependência externa) ───────────────────────────────
const IconEmail = () => (
  <View style={iconStyles.wrap}>
    <Text style={iconStyles.at}>@</Text>
  </View>
);

const IconLock = () => (
  <View style={iconStyles.wrap}>
    <Text style={iconStyles.lock}>🔑</Text>
  </View>
);

const iconStyles = StyleSheet.create({
  wrap: { width: 20, alignItems: 'center', marginRight: 10 },
  at:   { fontSize: 15, fontWeight: '800', color: SOFT_GRAY },
  lock: { fontSize: 14 },
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface LoginScreenProps {
  onLoginSuccess: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────
const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const passwordRef = useRef<TextInput>(null);

  const isFormValid = isValidEmail(email) && password.length >= 6;

  // ── Animação do botão ao pressionar ──────────────────────────────────────
  const onPressIn  = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }, [buttonScale]);
  const onPressOut = useCallback(() => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [buttonScale]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!isFormValid || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError) {
        setError(
          authError.message.includes('Invalid login credentials')
            ? 'E-mail ou senha incorretos.'
            : 'Erro de conexão. Verifique sua internet.'
        );
      } else {
        onLoginSuccess();
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isFormValid, isLoading, onLoginSuccess]);

  // ── Recuperação de senha ──────────────────────────────────────────────────
  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Recuperar Senha', 'Digite seu e-mail primeiro para receber o link de recuperação.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Recuperar Senha', 'Digite um e-mail válido.');
      return;
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase()
      );
      if (resetError) throw resetError;
      Alert.alert('E-mail enviado', `Link de recuperação enviado para ${email.trim()}.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Tente novamente.');
    }
  }, [email]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={DARK_NAVY} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ══════════════ BANNER ASPIRACIONAL ══════════════ */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => openURL(SITE_URL)}
          style={styles.banner}
        >
          {/* Fundo e decorações geométricas */}
          <View style={styles.bannerBg} />
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />
          <View style={styles.circle4} />

          {/* Overlay degradê inferior (simula gradient transparente → escuro) */}
          <View style={styles.bannerOverlay} />

          {/* Texto aspiracional */}
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              Sua saúde,{'\n'}onde você estiver.
            </Text>
            <Text style={styles.bannerSubtitle}>Toque para assinar a Vivemus</Text>
          </View>
        </TouchableOpacity>

        {/* ══════════════ LOGO FLUTUANTE ══════════════ */}
        <View style={styles.logoWrapper}>
          {/* Borda branca externa (3px) */}
          <View style={styles.logoRing}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>V</Text>
            </View>
          </View>
        </View>

        {/* ══════════════ CARD DO FORMULÁRIO ══════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bem-vindo de volta</Text>
          <Text style={styles.cardSubtitle}>Acesse sua conta Vivemus</Text>

          {/* ── Mensagem de erro ── */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠  {error}</Text>
            </View>
          )}

          {/* ── Campo E-mail ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>E-MAIL</Text>
            <View style={[
              styles.inputWrapper,
              emailFocused && styles.inputFocused,
            ]}>
              <IconEmail />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={SOFT_GRAY}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* ── Campo Senha ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>SENHA</Text>
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.inputWrapper,
              passwordFocused && styles.inputFocused,
            ]}>
              <IconLock />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={SOFT_GRAY}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                activeOpacity={0.6}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeText}>
                  {showPass ? 'Ocultar' : 'Mostrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Botão Entrar ── */}
          <Animated.View style={[styles.btnWrapper, { transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity
              style={[styles.loginBtn, !isFormValid && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
              activeOpacity={1}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              {/* Brilho interno superior (simula gradiente) */}
              <View style={styles.btnGlow} />
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.loginBtnText}>Entrar</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          {/* ── Rodapé legal (obrigatório App Store / Play Store) ── */}
          <View style={styles.legalRow}>
            <Text style={styles.legalText}>Ao entrar, você concorda com nossos </Text>
            <TouchableOpacity onPress={() => openURL(TERMS_URL)} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Termos</Text>
            </TouchableOpacity>
            <Text style={styles.legalText}> e </Text>
            <TouchableOpacity onPress={() => openURL(PRIVACY_URL)} activeOpacity={0.7}>
              <Text style={styles.legalLink}>Privacidade</Text>
            </TouchableOpacity>
            <Text style={styles.legalText}>.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },

  // ── Banner ──────────────────────────────────────────────────────────────
  banner: {
    height: 220,
    backgroundColor: DARK_NAVY,
    overflow: 'hidden',
  },
  bannerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_NAVY,
  },
  // Círculos decorativos simulando fundo orgânico
  circle1: {
    position: 'absolute', width: 280, height: 280,
    borderRadius: 140, backgroundColor: BLUE, opacity: 0.14,
    top: -80, right: -60,
  },
  circle2: {
    position: 'absolute', width: 180, height: 180,
    borderRadius: 90, backgroundColor: '#38bdf8', opacity: 0.09,
    bottom: -50, left: -30,
  },
  circle3: {
    position: 'absolute', width: 100, height: 100,
    borderRadius: 50, backgroundColor: '#60a5fa', opacity: 0.11,
    top: 30, left: '38%',
  },
  circle4: {
    position: 'absolute', width: 50, height: 50,
    borderRadius: 25, backgroundColor: '#bfdbfe', opacity: 0.1,
    bottom: 20, right: '25%',
  },
  // Overlay escuro na base do banner (simula gradient → preto)
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
    backgroundColor: 'rgba(5, 10, 20, 0.55)',
  },
  bannerContent: {
    position: 'absolute', bottom: 22, left: 28, right: 28,
  },
  bannerTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 30, marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.88)',
  },

  // ── Logo flutuante ───────────────────────────────────────────────────────
  logoWrapper: {
    alignItems: 'center',
    marginTop: -37,
    zIndex: 10,
  },
  logoRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 10,
  },
  logo: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontSize: 30, fontWeight: '900', color: '#fff' },

  // ── Card formulário ──────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 20, fontWeight: '800', color: GRAPHITE,
    textAlign: 'center', marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13, color: SOFT_GRAY,
    textAlign: 'center', marginBottom: 28,
  },

  // ── Erro ─────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 12, padding: 12,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { fontSize: 13, color: ERROR_RED, fontWeight: '500' },

  // ── Campos ───────────────────────────────────────────────────────────────
  fieldGroup:  { marginBottom: 16 },
  labelRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel:  { fontSize: 10, fontWeight: '800', color: GRAPHITE, letterSpacing: 0.8 },
  forgotLink:  { fontSize: 12, color: BLUE, fontWeight: '600' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG_FIELD,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  inputFocused: { borderBottomColor: BLUE },
  input: {
    flex: 1, fontSize: 15, color: GRAPHITE, fontWeight: '500',
  },
  eyeBtn: { paddingLeft: 8 },
  eyeText: { fontSize: 11, fontWeight: '700', color: BLUE },

  // ── Botão Entrar ─────────────────────────────────────────────────────────
  btnWrapper: { marginTop: 8 },
  loginBtn: {
    height: 56,
    backgroundColor: BLUE,
    borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: BLUE_DARK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  // Brilho interno superior para dar sensação de gradiente
  btnGlow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 28, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  loginBtnText: {
    fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.4,
  },

  // ── Rodapé legal ─────────────────────────────────────────────────────────
  legalRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', marginTop: 22,
  },
  legalText: { fontSize: 10, color: SOFT_GRAY },
  legalLink: { fontSize: 10, color: BLUE, textDecorationLine: 'underline' },
});

export default LoginScreen;
