import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EventsScreen } from './src/screens/EventsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { registerBackgroundSync } from './src/lib/backgroundSync';
import { useGoogleAccounts } from './src/lib/googleAuth';
import { useTheme } from './src/theme';

export default function App() {
  const theme = useTheme();
  const { accounts, isRequestReady, addAccount, removeAccount } = useGoogleAccounts();

  useEffect(() => {
    registerBackgroundSync().catch((err) => console.warn('[backgroundSync] registration failed', err));
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
        {accounts === null ? null : accounts.length > 0 ? (
          <EventsScreen
            accounts={accounts}
            onAddAccount={addAccount}
            onRemoveAccount={removeAccount}
          />
        ) : (
          <LoginScreen isRequestReady={isRequestReady} onSignIn={addAccount} />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
