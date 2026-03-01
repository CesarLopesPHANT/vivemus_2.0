import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import TeleconsultaScreen from '../screens/TeleconsultaScreen';
import ConsentScreen from '../screens/ConsentScreen';
import SplashScreen from '../components/SplashScreen';
import ConsultationBanner from '../components/ConsultationBanner';
import { ConsultationProvider, useConsultation } from '../context/ConsultationContext';
import { startAutoRefresh, stopAutoRefresh } from '../lib/psoCache';
import { supabase } from '../lib/supabase';

const { PipModule, TeleconsultaServiceModule } = NativeModules;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Estado centralizado — evita flicker entre renders parciais ───────────────
interface InitState {
  splashDone:      boolean; // todas as verificações concluídas
  isLoggedIn:      boolean; // sessão Supabase ativa
  consentAccepted: boolean; // TCLE aceito
  brandLoaded:     boolean; // configurações de branding carregadas
}

const INIT_DEFAULT: InitState = {
  splashDone:      false,
  isLoggedIn:      false,
  consentAccepted: false,
  brandLoaded:     false,
};

// ─── Tab Navigator com banner de consulta ────────────────────────────────────
const TabNavigator = () => {
  const navigation = useNavigation<any>();
  const [isInPipMode, setIsInPipMode] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      setIsInPipMode(inPip);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ConsultationBanner onPress={() => navigation.navigate('Teleconsulta')} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: isInPipMode
            ? { display: 'none' }
            : {
                height: 64,
                paddingBottom: 8,
                paddingTop: 8,
                backgroundColor: '#fff',
                borderTopColor: '#f1f5f9',
              },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'uppercase',
          },
        }}
      >
        <Tab.Screen name="Home"   component={HomeScreen}    options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="Agenda" component={HomeScreen}    options={{ tabBarLabel: 'Agenda' }} />
        <Tab.Screen name="IA"     component={HomeScreen}    options={{ tabBarLabel: 'IA' }} />
        <Tab.Screen name="Saude"  component={HomeScreen}    options={{ tabBarLabel: 'Saude' }} />
        <Tab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
      </Tab.Navigator>
    </View>
  );
};

// ─── Gerenciador de Foreground Service + PiP ─────────────────────────────────
const ConsultationServiceManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isActive } = useConsultation();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (isActive) {
      PipModule?.setTeleconsultaAtiva(true);
      TeleconsultaServiceModule?.iniciar().catch(() => {});
    } else {
      PipModule?.setTeleconsultaAtiva(false);
      TeleconsultaServiceModule?.parar().catch(() => {});
    }
  }, [isActive]);

  return <>{children}</>;
};

// ─── AppNavigator ─────────────────────────────────────────────────────────────
const AppNavigator: React.FC = () => {
  const [init, setInit] = useState<InitState>(INIT_DEFAULT);
  const mountedRef = useRef(true);

  // ── Inicialização paralela — minimiza tempo de splash ─────────────────────
  const initialize = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        // 1. Verificar sessão Supabase Auth (real)
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          return !!session;
        })(),

        // 2. Verificar consentimento LGPD/TCLE
        // TODO: substituir por chamada real ao Supabase (tabela consents)
        (async () => false)(),

        // 3. Carregar configurações de branding/parceiro
        // TODO: integrar com system_settings do Supabase
        (async () => true)(),
      ]);

      if (!mountedRef.current) return;

      const [authResult, consentResult, brandResult] = results;

      setInit({
        splashDone:      true,
        isLoggedIn:      authResult.status === 'fulfilled' && authResult.value === true,
        consentAccepted: consentResult.status === 'fulfilled' && consentResult.value === true,
        brandLoaded:     brandResult.status === 'fulfilled',
      });
    } catch {
      if (!mountedRef.current) return;
      // Erro total: libera splash para o usuário não ficar preso
      setInit({ splashDone: true, isLoggedIn: false, consentAccepted: false, brandLoaded: true });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    initialize();
    return () => { mountedRef.current = false; };
  }, [initialize]);

  // ── Escuta exclusão de conta → reinicia fluxo (LGPD / Apple 5.1.1) ────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('accountDeleted', () => {
      setInit(INIT_DEFAULT);
    });
    return () => sub.remove();
  }, []);

  // ── Prefetch PSO após login + consentimento ────────────────────────────────
  useEffect(() => {
    if (init.isLoggedIn && init.consentAccepted) {
      startAutoRefresh();
      return () => stopAutoRefresh();
    }
  }, [init.isLoggedIn, init.consentAccepted]);

  // ═══════════════════ GATES DE RENDERIZAÇÃO ════════════════════════════════

  // 1. Splash: aguarda todas as verificações
  if (!init.splashDone) {
    return <SplashScreen />;
  }

  // 2. Login: usuário sem sessão ativa
  if (!init.isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={() =>
          setInit((prev) => ({ ...prev, isLoggedIn: true }))
        }
      />
    );
  }

  // 3. Consentimento LGPD obrigatório antes do app
  if (!init.consentAccepted) {
    return (
      <ConsentScreen
        onAccepted={() =>
          setInit((prev) => ({ ...prev, consentAccepted: true }))
        }
      />
    );
  }

  // 4. App completo
  return (
    <ConsultationProvider>
      <ConsultationServiceManager>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen
              name="Teleconsulta"
              component={TeleconsultaScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ConsultationServiceManager>
    </ConsultationProvider>
  );
};

export default AppNavigator;
