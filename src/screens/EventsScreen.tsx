import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlarmSheet } from '../components/AlarmSheet';
import { EventRow } from '../components/EventRow';
import { cancelEventAlarm, requestAlarmAuthorization, scheduleEventAlarm } from '../lib/alarmKit';
import { getAllAlarmRecords, removeAlarmRecord, saveAlarmRecord } from '../lib/alarmStore';
import { fetchUpcomingEvents } from '../lib/calendarService';
import { dayKey, formatDayHeading, getEventStartDate } from '../lib/dates';
import { AlarmRecord, CalendarEvent } from '../types';
import { spacing, useTheme } from '../theme';

interface Section {
  title: string;
  data: CalendarEvent[];
}

export function EventsScreen({ onSignOut }: { onSignOut: () => void }) {
  const theme = useTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [alarms, setAlarms] = useState<Record<string, AlarmRecord>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const loadAlarms = useCallback(async () => {
    const records = await getAllAlarmRecords();
    const map: Record<string, AlarmRecord> = {};
    for (const r of records) map[r.eventId] = r;
    setAlarms(map);
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [fetched] = await Promise.all([fetchUpcomingEvents(), loadAlarms()]);
      setEvents(fetched);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync calendar.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [loadAlarms]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, Section>();
    for (const event of events) {
      const key = dayKey(event.startISO, event.isAllDay);
      if (!groups.has(key)) {
        groups.set(key, { title: formatDayHeading(event.startISO, event.isAllDay), data: [] });
      }
      groups.get(key)!.data.push(event);
    }
    return Array.from(groups.values());
  }, [events]);

  const handleConfirmAlarm = useCallback(
    async (offsetMinutes: number) => {
      if (!selectedEvent) return;
      try {
        const authorized = await requestAlarmAuthorization();
        if (!authorized) {
          Alert.alert('Alarm permission denied', 'Enable alarms for CalSync in Settings.');
          return;
        }

        const existing = alarms[selectedEvent.id];
        if (existing) {
          await cancelEventAlarm(existing.alarmId);
        }

        const fireDate = new Date(
          getEventStartDate(selectedEvent).getTime() - offsetMinutes * 60_000
        );
        const alarmId = await scheduleEventAlarm({
          eventId: selectedEvent.id,
          title: selectedEvent.title,
          fireDate,
        });

        const record: AlarmRecord = {
          eventId: selectedEvent.id,
          alarmId,
          offsetMinutes,
          fireISO: fireDate.toISOString(),
        };
        await saveAlarmRecord(record);
        setAlarms((prev) => ({ ...prev, [selectedEvent.id]: record }));
        setSelectedEvent(null);
      } catch (e) {
        Alert.alert('Could not set alarm', e instanceof Error ? e.message : String(e));
      }
    },
    [selectedEvent, alarms]
  );

  const handleRemoveAlarm = useCallback(async () => {
    if (!selectedEvent) return;
    const existing = alarms[selectedEvent.id];
    if (existing) {
      await cancelEventAlarm(existing.alarmId);
      await removeAlarmRecord(selectedEvent.id);
      setAlarms((prev) => {
        const next = { ...prev };
        delete next[selectedEvent.id];
        return next;
      });
    }
    setSelectedEvent(null);
  }, [selectedEvent, alarms]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Upcoming</Text>
        <Pressable onPress={onSignOut}>
          <Text style={{ color: theme.subtext }}>Sign out</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          <Pressable onPress={() => load()}>
            <Text style={{ color: theme.accent, marginTop: spacing.sm }}>Try again</Text>
          </Pressable>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={{ color: theme.subtext }}>No upcoming events in the next 30 days.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: theme.subtext, backgroundColor: theme.background }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <EventRow
              event={item}
              hasAlarm={!!alarms[item.id]}
              theme={theme}
              onPress={() => setSelectedEvent(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}

      <AlarmSheet
        visible={!!selectedEvent}
        event={selectedEvent}
        hasAlarm={!!(selectedEvent && alarms[selectedEvent.id])}
        theme={theme}
        onClose={() => setSelectedEvent(null)}
        onConfirm={handleConfirmAlarm}
        onRemove={handleRemoveAlarm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  sectionHeader: { fontSize: 13, fontWeight: '700', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textTransform: 'uppercase' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { textAlign: 'center' },
});
