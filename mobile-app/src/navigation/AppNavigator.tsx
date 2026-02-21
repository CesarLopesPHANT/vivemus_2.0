import React, { useState, useEffect } from 'react';
import { Platform, DeviceEventEmitter, ActivityIndicator, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ConsentScreen from '../screens/ConsentScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  const [isInPipMode, setIsInPipMode] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Verifica se o usuario ja aceitou o TCLE/LGPD
  useEffect(() => {
    const checkConsent = async () => {
      try {
        // Em producao: chamar consentService.checkTCLEAccepted(userId)
        // Por ora, simula verificacao (sera integrado com Supabase)
        const lgpdAccepted = false; // TODO: substituir por chamada real ao Supabase
        setConsentAccepted(lgpdAccepted);
      } catch {
        setConsentAccepted(false);
      } finally {
        setConsentChecked(true);
      }
    };
    checkConsent();
  }, []);

  // Escuta mudancas do modo PiP para ocultar/mostrar a tab bar
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      setIsInPipMode(inPip);
    });

    return () => subscription.remove();
  }, []);

  // Loading enquanto verifica consentimento
  if (!consentChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Gate de consentimento: obriga aceite do TCLE antes de acessar o app
  if (!consentAccepted) {
    return (
      <ConsentScreen
        onAccepted={() => setConsentAccepted(true)}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          // Esconde a tab bar completamente no modo PiP (so mostra o video)
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
          component={HomeScreen}
          options={{ tabBarLabel: 'Perfil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;
