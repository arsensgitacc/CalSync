import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { cancelEventAlarm, getAllNativeAlarmIds } from '../lib/alarmKit';
import { getAllAlarmRecords, removeAlarmRecord } from '../lib/alarmStore';
import { AlarmAnchor, AlarmRecord, CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

function describeAlarm(anchor: AlarmAnchor, offsetMinutes: number): string {
  const anchorLabel = anchor === 'end' ? 'end' : 'start';
  if (offsetMinutes === 0) return `At event ${anchorLabel}`;
  const minutes = Math.abs(offsetMinutes);
  const durationLabel = minutes === 60 ? '1 hr' : `${minutes} min`;
  const direction = offsetMinutes > 0 ? 'before' : 'after';
  return `${durationLabel} ${direction} ${anchorLabel}`;
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
        <Text style={[styles.title, { color: theme.text }]}>All Alarms</Text>

        {records.length === 0 && orphanIds.length === 0 ? (
          <Text style={{ color: theme.subtext }}>No alarms scheduled.</Text>
        ) : null}

        {records.map((record) => {
          const event = eventById.get(record.eventId);
          return (
            <View key={record.optionKey} style={[styles.row, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                  {event?.title ?? '(event not found - deleted or outside sync window)'}
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12 }}>
                  {describeAlarm(record.anchor, record.offsetMinutes)} ·{' '}
                  {new Date(record.fireISO).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Pressable onPress={() => removeTracked(record)} hitSlop={8}>
                <Text style={{ color: theme.danger }}>Remove</Text>
              </Pressable>
            </View>
          );
        })}

        {orphanIds.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.danger }]}>
              Unrecognized alarms (not linked to any event in this app)
            </Text>
            {orphanIds.map((id) => (
              <View key={id} style={[styles.row, { borderColor: theme.danger }]}>
                <Text style={{ color: theme.text, flex: 1 }} numberOfLines={1}>
                  {id}
                </Text>
                <Pressable onPress={() => removeOrphan(id)} hitSlop={8}>
                  <Text style={{ color: theme.danger }}>Remove</Text>
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
