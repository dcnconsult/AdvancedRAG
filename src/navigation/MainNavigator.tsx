/**
 * Main Navigator for authenticated users
 * 
 * Provides bottom tab navigation for the main app sections
 */

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import QueryConfigScreen from '@/screens/QueryConfigScreen';
import ResultsComparisonScreen from '@/screens/ResultsComparisonScreen';
import DomainManagementScreen from '@/screens/DomainManagementScreen';
import SavedSessionsScreen from '@/screens/SavedSessionsScreen';
import SettingsScreen from '@/screens/SettingsScreen';

// Types
import {RootStackParamList} from '@/types';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

// Main tab navigator
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'QueryConfig':
              iconName = 'search';
              break;
            case 'DomainManagement':
              iconName = 'folder';
              break;
            case 'SavedSessions':
              iconName = 'history';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1173d4',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}>
      <Tab.Screen
        name="QueryConfig"
        component={QueryConfigScreen}
        options={{
          tabBarLabel: 'Query',
          title: 'RAG Query',
        }}
      />
      <Tab.Screen
        name="DomainManagement"
        component={DomainManagementScreen}
        options={{
          tabBarLabel: 'Domains',
          title: 'Domain Management',
        }}
      />
      <Tab.Screen
        name="SavedSessions"
        component={SavedSessionsScreen}
        options={{
          tabBarLabel: 'Sessions',
          title: 'Saved Sessions',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          title: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Main stack navigator
const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="ResultsComparison"
        component={ResultsComparisonScreen}
        options={{
          headerShown: true,
          title: 'Results Comparison',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
