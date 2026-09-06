export interface GoogleAccount {
  id: string;
  email: string;
  autoAlarm?: boolean;
}

export interface CalendarEvent {
  id: string;
  accountId: string;
  title: string;
  startISO: string;
  endISO: string | null;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
  calendarColor: string;
}

export type AlarmAnchor = 'start' | 'end';

export interface AlarmRecord {
  optionKey: string;
  eventId: string;
  alarmId: string;
  anchor: AlarmAnchor;
  offsetMinutes: number;
  fireISO: string;
  anchorISO: string | null;
}
