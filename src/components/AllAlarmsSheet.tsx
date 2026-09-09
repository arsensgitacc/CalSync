import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { getLocaleTag } from '../i18n';
import { cancelEventAlarm, getAllNativeAlarmIds } from '../lib/alarmKit';
import { getAllAlarmRecords, removeAlarmRecord } from '../lib/alarmStore';
import { AlarmAnchor, AlarmRecord, CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

function describeAlarm(
  t: TFunction,
  anchorType: AlarmAnchor,
  offsetMinutes: number
): string {
  if (offsetMinutes === 0) {
    return t(anchorType === 'end' ? 'alarmSheet.atEnd' : 'alarmSheet.atStart');
  }
  const minutes = Math.abs(offsetMinutes);
  const duration = minutes === 60 ? t('common.durationHour') : t('common.durationMinutes', { count: minutes });
  const anchor = t(anchorType === 'end' ? 'allAlarmsSheet.anchorEnd' : 'allAlarmsSheet.anchorStart');
  return offsetMinutes > 0
    ? t('allAlarmsSheet.offsetBefore', { duration, anchor })
    : t('allAlarmsSheet.offsetAfter', { duration, anchor });
}

export function AllAlarmsSheet({
  visible,
  events,
  theme,
  onClose,
  onChanged,
}: {
  visible: boolean;
  events: CalendarEvent[];
  theme: Theme;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<AlarmRecord[]>([]);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const allRecords = await getAllAlarmRecords();
    const nativeIds = getAllNativeAlarmIds();
    const trackedIds = new Set(allRecords.map((r) => r.alarmId));
    setRecords(allRecords);
    setOrphanIds(nativeIds.filter((id) => !trackedIds.has(id)));
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const removeTracked = async (record: AlarmRecord) => {
    await cancelEventAlarm(record.alarmId);
    await removeAlarmRecord(record.optionKey);
    onChanged();
    load();
  };

  const removeOrphan = async (alarmId: string) => {
    await cancelEventAlarm(alarmId);
    load();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme}>
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>{t('allAlarmsSheet.title')}</Text>

        {records.length === 0 && orphanIds.length === 0 ? (
          <Text style={{ color: theme.subtext }}>{t('allAlarmsSheet.noAlarms')}</Text>
        ) : null}

        {records.map((record) => {
          const event = eventById.get(record.eventId);
          return (
            <View key={record.optionKey} style={[styles.row, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                  {event?.title ?? t('allAlarmsSheet.eventNotFound')}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  {describeAlarm(t, record.anchor, record.offsetMinutes)} ·{' '}
                  {new Date(record.fireISO).toLocaleString(getLocaleTag(), {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Pressable onPress={() => removeTracked(record)} hitSlop={8}>
                <Text style={{ color: theme.danger }}>{t('common.remove')}</Text>
              </Pressable>
            </View>
          );
        })}

        {orphanIds.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.danger }]}>
              {t('allAlarmsSheet.unrecognizedSection')}
            </Text>
            {orphanIds.map((id) => (
              <View key={id} style={[styles.row, { borderColor: theme.danger }]}>
                <Text style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                  {id}
                </Text>
                <Pressable onPress={() => removeOrphan(id)} hitSlop={8}>
                  <Text style={{ color: theme.danger }}>{t('common.remove')}</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});
