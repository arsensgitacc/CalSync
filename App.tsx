import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EventsScreen } from './src/screens/EventsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useGoogleAuth } from './src/lib/googleAuth';
import { useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  const { isSignedIn, isRequestReady, signIn, signOut } = useGoogleAuth();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
        {isSignedIn === null ? null : isSignedIn ? (
          <EventsScreen onSignOut={signOut} />
        ) : (
          <LoginScreen isRequestReady={isRequestReady} onSignIn={signIn} />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
