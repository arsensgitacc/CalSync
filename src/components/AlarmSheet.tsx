import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

const OFFSET_OPTIONS = [
  { label: 'At event time', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '10 minutes before', minutes: 10 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
];

export function AlarmSheet({
  visible,
  event,
  hasAlarm,
  theme,
  onClose,
  onConfirm,
  onRemove,
}: {
  visible: boolean;
  event: CalendarEvent | null;
  hasAlarm: boolean;
  theme: Theme;
  onClose: () => void;
  onConfirm: (offsetMinutes: number) => void;
  onRemove: () => void;
}) {
  const [selected, setSelected] = useState(0);

  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Choose when the alarm should go off
        </Text>

        {OFFSET_OPTIONS.map((opt) => {
          const isSelected = selected === opt.minutes;
          return (
            <Pressable
              key={opt.minutes}
              onPress={() => setSelected(opt.minutes)}
              style={[
                styles.option,
                { borderColor: theme.border },
                isSelected && { borderColor: theme.accent, backgroundColor: theme.accent + '15' },
              ]}
            >
              <Text style={{ color: isSelected ? theme.accent : theme.text, fontWeight: isSelected ? '600' : '400' }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => onConfirm(selected)}
          style={[styles.confirmButton, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.confirmLabel, { color: theme.accentText }]}>
            {hasAlarm ? 'Update Alarm' : 'Set Alarm'}
          </Text>
        </Pressable>

        {hasAlarm ? (
          <Pressable onPress={onRemove} style={styles.removeButton}>
            <Text style={{ color: theme.danger, fontWeight: '600' }}>Remove Alarm</Text>
          </Pressable>
        ) : null}
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
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 13, marginBottom: spacing.md },
  option: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  confirmButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmLabel: { fontSize: 16, fontWeight: '700' },
  removeButton: { alignItems: 'center', marginTop: spacing.md },
});
