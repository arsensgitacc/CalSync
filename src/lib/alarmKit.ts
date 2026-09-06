import * as ExpoAlarmKit from 'expo-alarm-kit';
import { APP_GROUP_ID } from '../constants';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const ok = ExpoAlarmKit.configure(APP_GROUP_ID);
  if (!ok) {
    throw new Error(
      `AlarmKit could not access App Group "${APP_GROUP_ID}". Check Signing & Capabilities in Xcode.`
    );
  }
  configured = true;
}

export async function requestAlarmAuthorization(): Promise<boolean> {
  ensureConfigured();
  const status = await ExpoAlarmKit.requestAuthorization();
  return status === 'authorized';
}

export async function scheduleEventAlarm(params: {
  eventId: string;
  title: string;
  fireDate: Date;
}): Promise<string> {
  ensureConfigured();
  const id = ExpoAlarmKit.generateUUID();
  const ok = await ExpoAlarmKit.scheduleAlarm({
    id,
    date: params.fireDate,
    title: params.title,
    launchAppOnDismiss: true,
    dismissPayload: params.eventId,
    doSnoozeIntent: true,
    launchAppOnSnooze: true,
    snoozePayload: params.eventId,
    snoozeDuration: 300,
    stopButtonLabel: 'Stop',
    snoozeButtonLabel: 'Snooze',
  });
  if (!ok) {
    throw new Error('AlarmKit refused to schedule the alarm.');
  }
  console.log(`[alarmKit] scheduled ${id} for ${params.fireDate.toISOString()}`);
  return id;
}

export async function cancelEventAlarm(alarmId: string): Promise<void> {
  ensureConfigured();
  await ExpoAlarmKit.cancelAlarm(alarmId);
  console.log(`[alarmKit] cancelled ${alarmId}`);
}
