import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
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

const DURATIONS = [5, 10, 15, 30, 60];

function formatDuration(t: TFunction, minutes: number): string {
  return minutes === 60 ? t('common.durationHour') : t('common.durationMinutes', { count: minutes });
}

function buildOptions(t: TFunction) {
  const anchorOptions: AnchorOption[] = [
    { key: 'start', label: t('alarmSheet.atStart'), anchor: 'start', offsetMinutes: 0 },
    { key: 'end', label: t('alarmSheet.atEnd'), anchor: 'end', offsetMinutes: 0 },
  ];

  const durationRows: DurationRow[] = DURATIONS.map((minutes) => ({
    minutes,
    label: formatDuration(t, minutes),
    before: {
      key: `before-${minutes}`,
      label: t('common.before'),
      anchor: 'start',
      offsetMinutes: minutes,
    },
    after: {
      key: `after-${minutes}`,
      label: t('common.after'),
      anchor: 'start',
      offsetMinutes: -minutes,
    },
  }));

  const allOptions: AnchorOption[] = [
    ...anchorOptions,
    ...durationRows.flatMap((row) => [row.before, row.after]),
  ];

  return { anchorOptions, durationRows, allOptions };
}

function keyForRecord(allOptions: AnchorOption[], record: AlarmRecord): string | undefined {
  return allOptions.find(
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
  const { t } = useTranslation();
  const { anchorOptions, durationRows, allOptions } = useMemo(() => buildOptions(t), [t]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (!event) return;
    const keys = existingAlarms.map((r) => keyForRecord(allOptions, r)).filter((k): k is string => !!k);
    setSelected(new Set(keys));
    setDescriptionExpanded(false);
  }, [event?.id, visible, allOptions]);

  if (!event) return null;

  const isLongDescription = (event.description?.length ?? 0) > 150;

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
    <BottomSheet visible={visible} onClose={onClose} theme={theme}>
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {event.title}
        </Text>

        {event.description ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Text
              style={[styles.description, { color: theme.subtext, marginBottom: 0 }]}
              numberOfLines={!descriptionExpanded && isLongDescription ? 3 : undefined}
            >
              {event.description}
            </Text>
            {isLongDescription ? (
              <Pressable onPress={() => setDescriptionExpanded((v) => !v)}>
                <Text style={[styles.readMore, { color: theme.accent }]}>
                  {descriptionExpanded ? t('alarmSheet.showLess') : t('alarmSheet.readMore')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          {t('alarmSheet.selectPrompt')}
        </Text>

        {anchorOptions.map((opt) => renderToggle(opt))}

        {durationRows.map((row) => (
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
                const opt = allOptions.find((o) => o.key === key)!;
                return { anchor: opt.anchor, offsetMinutes: opt.offsetMinutes };
              })
            )
          }
          style={[styles.confirmButton, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.confirmLabel, { color: theme.accentText }]}>
            {selected.size === 0
              ? t('alarmSheet.clearAlarms')
              : t('alarmSheet.saveAlarms', { count: selected.size })}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  description: { fontSize: 14, lineHeight: 19, marginBottom: spacing.sm },
  readMore: { fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
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
