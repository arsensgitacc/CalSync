import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlarmAnchor, AlarmRecord, CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

interface AnchorOption {
  key: string;
  label: string;
  anchor: AlarmAnchor;
  offsetMinutes: number;
}

interface DurationRow {
  minutes: number;
  label: string;
  before: AnchorOption;
  after: AnchorOption;
}

const ANCHOR_OPTIONS: AnchorOption[] = [
  { key: 'start', label: 'At event start', anchor: 'start', offsetMinutes: 0 },
  { key: 'end', label: 'At event end', anchor: 'end', offsetMinutes: 0 },
];

const DURATIONS = [5, 10, 15, 30, 60];

const DURATION_ROWS: DurationRow[] = DURATIONS.map((minutes) => ({
  minutes,
  label: minutes === 60 ? '1 hr' : `${minutes} min`,
  before: { key: `before-${minutes}`, label: 'before', anchor: 'start', offsetMinutes: minutes },
  after: { key: `after-${minutes}`, label: 'after', anchor: 'start', offsetMinutes: -minutes },
}));

const ALL_OPTIONS: AnchorOption[] = [
  ...ANCHOR_OPTIONS,
  ...DURATION_ROWS.flatMap((row) => [row.before, row.after]),
];

function keyForRecord(record: AlarmRecord): string | undefined {
  return ALL_OPTIONS.find(
    (o) => o.anchor === record.anchor && o.offsetMinutes === record.offsetMinutes
  )?.key;
}

export function AlarmSheet({
  visible,
  event,
  existingAlarms,
  theme,
  onClose,
  onSave,
}: {
  visible: boolean;
  event: CalendarEvent | null;
  existingAlarms: AlarmRecord[];
  theme: Theme;
  onClose: () => void;
  onSave: (selected: { anchor: AlarmAnchor; offsetMinutes: number }[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!event) return;
    const keys = existingAlarms.map(keyForRecord).filter((k): k is string => !!k);
    setSelected(new Set(keys));
  }, [event?.id, visible]);

  if (!event) return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderToggle = (opt: AnchorOption, style?: object) => {
    const isSelected = selected.has(opt.key);
    return (
      <Pressable
        key={opt.key}
        onPress={() => toggle(opt.key)}
        style={[
          styles.option,
          { borderColor: theme.border },
          isSelected && { borderColor: theme.accent, backgroundColor: theme.accent + '15' },
          style,
        ]}
      >
        <Text
          style={{
            color: isSelected ? theme.accent : theme.text,
            fontWeight: isSelected ? '600' : '400',
          }}
        >
          {opt.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.card }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.description ? (
          <Text style={[styles.description, { color: theme.subtext }]}>
            {event.description}
          </Text>
        ) : null}
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Select as many alarms as you need
        </Text>

        {ANCHOR_OPTIONS.map((opt) => renderToggle(opt))}

        {DURATION_ROWS.map((row) => (
          <View key={row.minutes} style={styles.durationRow}>
            <Text style={[styles.durationLabel, { color: theme.subtext }]}>{row.label}</Text>
            <View style={styles.pairRow}>
              {renderToggle(row.before, styles.pairButton)}
              {renderToggle(row.after, styles.pairButton)}
            </View>
          </View>
        ))}

        <Pressable
          onPress={() =>
            onSave(
              Array.from(selected).map((key) => {
                const opt = ALL_OPTIONS.find((o) => o.key === key)!;
                return { anchor: opt.anchor, offsetMinutes: opt.offsetMinutes };
              })
            )
          }
          style={[styles.confirmButton, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.confirmLabel, { color: theme.accentText }]}>
            {selected.size === 0 ? 'Clear Alarms' : `Save ${selected.size} Alarm${selected.size > 1 ? 's' : ''}`}
          </Text>
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
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  description: { fontSize: 14, lineHeight: 19, marginBottom: spacing.sm },
  subtitle: { fontSize: 13, marginBottom: spacing.md },
  option: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  durationRow: { marginBottom: spacing.sm },
  durationLabel: { fontSize: 12, marginBottom: spacing.xs },
  pairRow: { flexDirection: 'row', gap: spacing.sm },
  pairButton: { flex: 1, marginBottom: 0 },
  confirmButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  confirmLabel: { fontSize: 16, fontWeight: '700' },
});
