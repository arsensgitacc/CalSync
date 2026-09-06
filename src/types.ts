export interface CalendarEvent {
  id: string;
  title: string;
  startISO: string;
  endISO: string | null;
  isAllDay: boolean;
  location: string | null;
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
}
