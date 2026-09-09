import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, spacing, radius } from '../theme';

export function LoginScreen({
  isRequestReady,
  onSignIn,
}: {
  isRequestReady: boolean;
  onSignIn: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.logo}>📅</Text>
      <Text style={[styles.title, { color: theme.text }]}>CalSync</Text>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>{t('login.subtitle')}</Text>

      {isRequestReady ? (
        <Pressable
          onPress={onSignIn}
          style={[styles.button, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.buttonLabel, { color: theme.accentText }]}>
            {t('login.signIn')}
          </Text>
        </Pressable>
      ) : (
        <ActivityIndicator style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.sm },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 21 },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
});
