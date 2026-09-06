import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlarmAnchor, CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

interface OffsetOption {
  key: string;
  label: string;
  anchor: AlarmAnchor;
  minutes: number;
}

const OFFSET_OPTIONS: OffsetOption[] = [
  { key: 'start-0', label: 'At event start', anchor: 'start', minutes: 0 },
  { key: 'start-5', label: '5 minutes before start', anchor: 'start', minutes: 5 },
  { key: 'start-10', label: '10 minutes before start', anchor: 'start', minutes: 10 },
  { key: 'start-15', label: '15 minutes before start', anchor: 'start', minutes: 15 },
  { key: 'start-30', label: '30 minutes before start', anchor: 'start', minutes: 30 },
  { key: 'start-60', label: '1 hour before start', anchor: 'start', minutes: 60 },
  { key: 'end-0', label: 'At event end', anchor: 'end', minutes: 0 },
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
  onConfirm: (anchor: AlarmAnchor, offsetMinutes: number) => void;
  onRemove: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState('start-0');

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
          const isSelected = selectedKey === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSelectedKey(opt.key)}
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
          onPress={() => {
            const opt = OFFSET_OPTIONS.find((o) => o.key === selectedKey)!;
            onConfirm(opt.anchor, opt.minutes);
          }}
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
