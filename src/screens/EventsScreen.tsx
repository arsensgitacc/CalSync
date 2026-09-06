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
import { AccountsSheet } from '../components/AccountsSheet';
import { AllAlarmsSheet } from '../components/AllAlarmsSheet';
import { AlarmSheet } from '../components/AlarmSheet';
import { EventRow } from '../components/EventRow';
import { cancelEventAlarm, requestAlarmAuthorization, scheduleEventAlarm } from '../lib/alarmKit';
import {
  getAllAlarmRecords,
  makeOptionKey,
  removeAlarmRecord,
  saveAlarmRecord,
} from '../lib/alarmStore';
import { applyAutoAlarms, reconcileAlarmsWithEvents } from '../lib/alarmSync';
import { fetchEventsForAccounts } from '../lib/calendarService';
import { dayKey, formatDayHeading, getEventEndDate, getEventStartDate } from '../lib/dates';
import { AlarmAnchor, AlarmRecord, CalendarEvent, GoogleAccount } from '../types';
import { spacing, useTheme } from '../theme';

interface Section {
  title: string;
  data: CalendarEvent[];
}

export function EventsScreen({
  accounts,
  onAddAccount,
  onRemoveAccount,
  onToggleAutoAlarm,
}: {
  accounts: GoogleAccount[];
  onAddAccount: () => void;
  onRemoveAccount: (accountId: string) => Promise<void>;
  onToggleAutoAlarm: (accountId: string, autoAlarm: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [alarms, setAlarms] = useState<Record<string, AlarmRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [accountsSheetVisible, setAccountsSheetVisible] = useState(false);
  const [allAlarmsSheetVisible, setAllAlarmsSheetVisible] = useState(false);

  const loadAlarms = useCallback(async () => {
    const records = await getAllAlarmRecords();
    const map: Record<string, AlarmRecord[]> = {};
    for (const r of records) {
      (map[r.eventId] ??= []).push(r);
    }
    setAlarms(map);
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [{ events: fetched, cancelledEventIds, failedAccounts }] = await Promise.all([
        fetchEventsForAccounts(accounts),
        loadAlarms(),
      ]);
      await reconcileAlarmsWithEvents(fetched, cancelledEventIds);
      try {
        const autoAlarmAccountIds = new Set(
          accounts.filter((a) => a.autoAlarm).map((a) => a.id)
        );
        if (autoAlarmAccountIds.size > 0) {
          await applyAutoAlarms(fetched.filter((e) => autoAlarmAccountIds.has(e.accountId)));
        }
      } catch (err) {
        console.warn('[EventsScreen] applyAutoAlarms failed', err);
      }
      await loadAlarms();
      setEvents(fetched);
      setSyncWarning(
        failedAccounts.length > 0
          ? `Couldn't sync: ${failedAccounts.map((a) => a.email).join(', ')}`
          : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync calendar.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [loadAlarms, accounts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemoveAccount = useCallback(
    async (accountId: string) => {
      const all = await getAllAlarmRecords();
      const toClean = all.filter((r) => r.eventId.startsWith(`${accountId}:`));
      await Promise.all(
        toClean.map(async (r) => {
          await cancelEventAlarm(r.alarmId);
          await removeAlarmRecord(r.optionKey);
        })
      );
      await onRemoveAccount(accountId);
      await loadAlarms();
    },
    [onRemoveAccount, loadAlarms]
  );

  const handleToggleAutoAlarm = useCallback(
    async (accountId: string, autoAlarm: boolean) => {
      await onToggleAutoAlarm(accountId, autoAlarm);
      if (autoAlarm) {
        try {
          await applyAutoAlarms(events.filter((e) => e.accountId === accountId));
          await loadAlarms();
        } catch (err) {
          console.warn('[EventsScreen] immediate applyAutoAlarms failed', err);
        }
      }
    },
    [onToggleAutoAlarm, events, loadAlarms]
  );

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

  const handleSaveAlarms = useCallback(
    async (selections: { anchor: AlarmAnchor; offsetMinutes: number }[]) => {
      if (!selectedEvent) return;
      const event = selectedEvent;
      try {
        const existing = alarms[event.id] ?? [];
        const existingByKey = new Map(existing.map((r) => [r.optionKey, r]));
        const wantedKeys = new Set(
          selections.map((s) => makeOptionKey(event.id, s.anchor, s.offsetMinutes))
        );

        if (selections.length > 0) {
          const authorized = await requestAlarmAuthorization();
          if (!authorized) {
            Alert.alert('Alarm permission denied', 'Enable alarms for CalSync in Settings.');
            return;
          }
        }

        const toRemove = existing.filter((r) => !wantedKeys.has(r.optionKey));
        const toAdd = selections.filter(
          (s) => !existingByKey.has(makeOptionKey(event.id, s.anchor, s.offsetMinutes))
        );

        await Promise.all(
          toRemove.map(async (r) => {
            await cancelEventAlarm(r.alarmId);
            await removeAlarmRecord(r.optionKey);
          })
        );

        const added: AlarmRecord[] = [];
        for (const s of toAdd) {
          const anchorDate = s.anchor === 'end' ? getEventEndDate(event) : getEventStartDate(event);
          const fireDate = new Date(anchorDate.getTime() - s.offsetMinutes * 60_000);
          const alarmId = await scheduleEventAlarm({
            eventId: event.id,
            title: event.title,
            fireDate,
          });
          const record: AlarmRecord = {
            optionKey: makeOptionKey(event.id, s.anchor, s.offsetMinutes),
            eventId: event.id,
            alarmId,
            anchor: s.anchor,
            offsetMinutes: s.offsetMinutes,
            fireISO: fireDate.toISOString(),
            anchorISO: anchorDate.toISOString(),
          };
          await saveAlarmRecord(record);
          added.push(record);
        }

        const removedKeys = new Set(toRemove.map((r) => r.optionKey));
        setAlarms((prev) => ({
          ...prev,
          [event.id]: [...existing.filter((r) => !removedKeys.has(r.optionKey)), ...added],
        }));
        setSelectedEvent(null);
      } catch (e) {
        Alert.alert('Could not update alarms', e instanceof Error ? e.message : String(e));
      }
    },
    [selectedEvent, alarms]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Upcoming</Text>
        <View style={styles.headerButtons}>
          <Pressable onPress={() => setAllAlarmsSheetVisible(true)}>
            <Text style={{ color: theme.subtext }}>Alarms</Text>
          </Pressable>
          <Pressable onPress={() => setAccountsSheetVisible(true)}>
            <Text style={{ color: theme.subtext }}>Accounts</Text>
          </Pressable>
        </View>
      </View>

      {syncWarning ? (
        <Text style={[styles.syncWarning, { color: theme.danger }]} numberOfLines={2}>
          {syncWarning}
        </Text>
      ) : null}

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
              hasAlarm={(alarms[item.id]?.length ?? 0) > 0}
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
        existingAlarms={selectedEvent ? alarms[selectedEvent.id] ?? [] : []}
        theme={theme}
        onClose={() => setSelectedEvent(null)}
        onSave={handleSaveAlarms}
      />

      <AccountsSheet
        visible={accountsSheetVisible}
        accounts={accounts}
        theme={theme}
        onClose={() => setAccountsSheetVisible(false)}
        onAddAccount={onAddAccount}
        onRemoveAccount={handleRemoveAccount}
        onToggleAutoAlarm={handleToggleAutoAlarm}
      />

      <AllAlarmsSheet
        visible={allAlarmsSheetVisible}
        events={events}
        theme={theme}
        onClose={() => setAllAlarmsSheetVisible(false)}
        onChanged={loadAlarms}
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
  headerButtons: { flexDirection: 'row', gap: spacing.md },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  syncWarning: { fontSize: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  sectionHeader: { fontSize: 13, fontWeight: '700', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textTransform: 'uppercase' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { textAlign: 'center' },
});
