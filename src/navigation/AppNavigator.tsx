/**
 * Main App Navigator
 * 
 * Sets up the navigation structure for the RAG Showcase App
 * Based on the user journey defined in PRD Section 2.2
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {useSupabase} from '@/services/supabase/SupabaseProvider';

// Import screens
import WelcomeScreen from '@/screens/WelcomeScreen';
import AuthenticationScreen from '@/screens/AuthenticationScreen';
import MainNavigator from './MainNavigator';

// Types
import {RootStackParamList} from '@/types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const {user, loading} = useSupabase();

  // Show loading screen while checking auth state
  if (loading) {
    // You can add a loading screen component here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({current, layouts}) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}>
        {user ? (
          // User is authenticated - show main app
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          // User is not authenticated - show auth flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Authentication" component={AuthenticationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
