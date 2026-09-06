import { cancelEventAlarm, scheduleEventAlarm } from './alarmKit';
import { getAllAlarmRecords, removeAlarmRecord, saveAlarmRecord } from './alarmStore';
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
