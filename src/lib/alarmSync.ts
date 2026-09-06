import { cancelEventAlarm, requestAlarmAuthorization, scheduleEventAlarm } from './alarmKit';
import { getAllAlarmRecords, makeOptionKey, removeAlarmRecord, saveAlarmRecord } from './alarmStore';
import { getEventEndDate, getEventStartDate } from './dates';
import { CalendarEvent } from '../types';

/**
 * Cancels alarms for deleted events and reschedules alarms whose event time
 * has changed since it was last scheduled. Events outside the current sync
 * window (already started, or pushed past the window) are left untouched -
 * we can't tell "moved further out" from "deleted" without them, and it's
 * safer to leave a stale alarm than to risk cancelling one about to fire.
 */
export async function reconcileAlarmsWithEvents(
  events: CalendarEvent[],
  cancelledEventIds: string[]
): Promise<void> {
  const records = await getAllAlarmRecords();
  const eventById = new Map(events.map((e) => [e.id, e]));
  const cancelledSet = new Set(cancelledEventIds);

  console.log(
    `[alarmSync] checked ${records.length} alarms against ${events.length} events (${cancelledSet.size} cancelled)`
  );

  for (const record of records) {
    if (cancelledSet.has(record.eventId)) {
      try {
        await cancelEventAlarm(record.alarmId);
        await removeAlarmRecord(record.optionKey);
        console.log(`[alarmSync] removed alarm for deleted event ${record.eventId}`);
      } catch (err) {
        console.warn(`[alarmSync] failed to remove alarm for deleted event ${record.eventId}`, err);
      }
      continue;
    }

    const event = eventById.get(record.eventId);
    if (!event) continue; // Outside the synced window - leave as-is.

    const newAnchorDate = record.anchor === 'end' ? getEventEndDate(event) : getEventStartDate(event);
    const newAnchorISO = newAnchorDate.toISOString();
    if (newAnchorISO === record.anchorISO) continue;

    try {
      await cancelEventAlarm(record.alarmId);
      const fireDate = new Date(newAnchorDate.getTime() - record.offsetMinutes * 60_000);
      const alarmId = await scheduleEventAlarm({ eventId: event.id, title: event.title, fireDate });
      await saveAlarmRecord({
        ...record,
        alarmId,
        fireISO: fireDate.toISOString(),
        anchorISO: newAnchorISO,
      });
      console.log(
        `[alarmSync] rescheduled ${record.optionKey}: ${record.anchorISO ?? '(unknown)'} -> ${newAnchorISO}`
      );
    } catch (err) {
      console.warn(`[alarmSync] failed to reschedule ${record.optionKey}`, err);
    }
  }
}

const AUTO_ALARM_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Auto-creates a start-time alarm for events that don't have one yet, scoped
 * to events starting within the next 24 hours (not the whole sync window) so
 * we don't mass-schedule alarms far in advance. Callers are responsible for
 * pre-filtering `events` to whichever accounts have auto-alarm enabled - this
 * function stays decoupled from account concerns.
 */
export async function applyAutoAlarms(events: CalendarEvent[]): Promise<void> {
  const now = Date.now();
  const candidates = events.filter((e) => {
    if (e.isAllDay) return false;
    const startMs = getEventStartDate(e).getTime();
    return startMs >= now && startMs <= now + AUTO_ALARM_WINDOW_MS;
  });
  if (candidates.length === 0) return;

  const records = await getAllAlarmRecords();
  const existingKeys = new Set(records.map((r) => r.optionKey));
  const toSchedule = candidates.filter((e) => !existingKeys.has(makeOptionKey(e.id, 'start', 0)));
  if (toSchedule.length === 0) return;

  const authorized = await requestAlarmAuthorization();
  if (!authorized) return;

  for (const event of toSchedule) {
    try {
      const fireDate = getEventStartDate(event);
      const alarmId = await scheduleEventAlarm({ eventId: event.id, title: event.title, fireDate });
      await saveAlarmRecord({
        optionKey: makeOptionKey(event.id, 'start', 0),
        eventId: event.id,
        alarmId,
        anchor: 'start',
        offsetMinutes: 0,
        fireISO: fireDate.toISOString(),
        anchorISO: fireDate.toISOString(),
      });
      console.log(`[alarmSync] auto-created alarm for "${event.title}" at ${fireDate.toISOString()}`);
    } catch (err) {
      console.warn('[alarmSync] failed to auto-create alarm for event', event.id, err);
    }
  }
}
