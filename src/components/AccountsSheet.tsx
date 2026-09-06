import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
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

        <Pressable
          onPress={onAddAccount}
          style={[styles.addButton, { borderColor: theme.accent }]}
        >
          <Text style={{ color: theme.accent, fontWeight: '600' }}>+ Add another account</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
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
