import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarEvent } from '../types';
import { Theme, radius, spacing } from '../theme';

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatTimeRange(event: CalendarEvent) {
  if (event.isAllDay) return 'All day';
  const start = formatClock(event.startISO);
  if (!event.endISO) return start;
  return `${start} - ${formatClock(event.endISO)}`;
}

export function EventRow({
  event,
  hasAlarm,
  theme,
  onPress,
}: {
  event: CalendarEvent;
  hasAlarm: boolean;
  theme: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.colorBar, { backgroundColor: event.calendarColor }]} />
      <View style={styles.textBlock}>
        <Text style={[styles.time, { color: theme.subtext }]}>{formatTimeRange(event)}</Text>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.location ? (
          <Text style={[styles.location, { color: theme.subtext }]} numberOfLines={1}>
            {event.location}
          </Text>
        ) : null}
      </View>
      <View style={styles.bellWrap}>
        <Text style={[styles.bell, { color: hasAlarm ? theme.bellOn : theme.bellOff }]}>
          {hasAlarm ? '🔔' : '🔕'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: spacing.md,
  },
  textBlock: { flex: 1 },
  time: { fontSize: 13, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '600' },
  location: { fontSize: 13, marginTop: 2 },
  bellWrap: { paddingLeft: spacing.sm },
  bell: { fontSize: 22 },
});
