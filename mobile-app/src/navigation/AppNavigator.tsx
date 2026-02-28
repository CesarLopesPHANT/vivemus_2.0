import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TeleconsultaScreen from '../screens/TeleconsultaScreen';
import ConsentScreen from '../screens/ConsentScreen';
import SplashScreen from '../components/SplashScreen';
import ConsultationBanner from '../components/ConsultationBanner';
import { ConsultationProvider, useConsultation } from '../context/ConsultationContext';
import { startAutoRefresh, stopAutoRefresh } from '../lib/psoCache';

const { PipModule, TeleconsultaServiceModule } = NativeModules;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Estado centralizado de inicializacao — evita flicker entre renders parciais
interface InitState {
  authReady: boolean;
  consentChecked: boolean;
  consentAccepted: boolean;
  brandLoaded: boolean;
}

const INIT_DEFAULT: InitState = {
  authReady: false,
  consentChecked: false,
  consentAccepted: false,
  brandLoaded: false,
};

// TabNavigator com banner de consulta em andamento
const TabNavigator = () => {
  const navigation = useNavigation<any>();
  const [isInPipMode, setIsInPipMode] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      setIsInPipMode(inPip);
    });
    return () => subscription.remove();
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
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="Agenda"
          component={HomeScreen}
          options={{ tabBarLabel: 'Agenda' }}
        />
        <Tab.Screen
          name="IA"
          component={HomeScreen}
          options={{ tabBarLabel: 'IA' }}
        />
        <Tab.Screen
          name="Saude"
          component={HomeScreen}
          options={{ tabBarLabel: 'Saude' }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{ tabBarLabel: 'Perfil' }}
        />
      </Tab.Navigator>
    </View>
  );
};

// Gerenciador de servicos vinculado ao estado da consulta
const ConsultationServiceManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isActive } = useConsultation();

  // Gerencia PiP e Foreground Service baseado no estado global da consulta
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

const AppNavigator: React.FC = () => {
  const [init, setInit] = useState<InitState>(INIT_DEFAULT);
  const mountedRef = useRef(true);

  // Gate principal: so renderiza conteudo apos TODAS as verificacoes
  const isReady = init.authReady && init.consentChecked && init.brandLoaded;

  // Inicializacao consolidada — executa todas as promises em paralelo
  // para minimizar o tempo de splash e evitar renders intermediarios
  const initialize = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        // 1. Verificar sessao Supabase Auth
        (async () => {
          // TODO: integrar com Supabase Auth real
          return true;
        })(),

        // 2. Verificar consentimento LGPD/TCLE
        (async () => {
          // TODO: substituir por chamada real ao Supabase
          return false; // TODO: chamada real
        })(),

        // 3. Carregar configuracoes de branding/parceiro
        (async () => {
          // TODO: integrar com system_settings do Supabase
          return true;
        })(),
      ]);

      if (!mountedRef.current) return;

      const [authResult, consentResult, brandResult] = results;

      setInit({
        authReady: authResult.status === 'fulfilled',
        consentChecked: true,
        consentAccepted: consentResult.status === 'fulfilled' && consentResult.value === true,
        brandLoaded: brandResult.status === 'fulfilled',
      });
    } catch {
      if (!mountedRef.current) return;
      // Em caso de erro total, libera a tela para o usuario nao ficar preso no splash
      setInit({
        authReady: true,
        consentChecked: true,
        consentAccepted: false,
        brandLoaded: true,
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    initialize();
    return () => { mountedRef.current = false; };
  }, [initialize]);

  // Reinicia fluxo de autenticação após exclusão de conta (LGPD / Apple 5.1.1)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('accountDeleted', () => {
      setInit(INIT_DEFAULT);
    });
    return () => sub.remove();
  }, []);

  // Inicia prefetch de PSO apos autenticacao e consentimento
  useEffect(() => {
    if (init.authReady && init.consentAccepted) {
      startAutoRefresh();
      return () => stopAutoRefresh();
    }
  }, [init.authReady, init.consentAccepted]);

  // ===== SPLASH: Aguarda hidratacao completa antes de renderizar qualquer conteudo =====
  if (!isReady) {
    return <SplashScreen />;
  }

  // ===== GATE: Consentimento LGPD obrigatorio antes de acessar o app =====
  if (!init.consentAccepted) {
    return (
      <ConsentScreen
        onAccepted={() => setInit((prev: InitState) => ({ ...prev, consentAccepted: true }))}
      />
    );
  }

  // ===== APP: Renderiza somente apos init completo + consent aceito =====
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
