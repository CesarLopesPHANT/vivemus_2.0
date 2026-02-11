import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import TeleconsultaScreen from '../screens/TeleconsultaScreen';

const Tab = createBottomTabNavigator();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
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
