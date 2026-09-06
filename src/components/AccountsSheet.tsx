import { BottomSheetView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { GoogleAccount } from '../types';
import { Theme, radius, spacing } from '../theme';

export function AccountsSheet({
  visible,
  accounts,
  theme,
  onClose,
  onAddAccount,
  onRemoveAccount,
}: {
  visible: boolean;
  accounts: GoogleAccount[];
  theme: Theme;
  onClose: () => void;
  onAddAccount: () => void;
  onRemoveAccount: (accountId: string) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme}>
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Accounts</Text>

        {accounts.map((account) => (
          <View key={account.id} style={[styles.row, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
              {account.email}
            </Text>
            <Pressable onPress={() => onRemoveAccount(account.id)} hitSlop={8}>
              <Text style={{ color: theme.danger }}>Remove</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={onAddAccount} style={[styles.addButton, { borderColor: theme.accent }]}>
          <Text style={{ color: theme.accent, fontWeight: '600' }}>+ Add another account</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addButton: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
