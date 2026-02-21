import React, { useState, useEffect } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  const [isInPipMode, setIsInPipMode] = useState(false);

  // Escuta mudancas do modo PiP para ocultar/mostrar a tab bar
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener('onPipModeChanged', (inPip: boolean) => {
      setIsInPipMode(inPip);
    });

    return () => subscription.remove();
  }, []);

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

export default AppNavigator;
