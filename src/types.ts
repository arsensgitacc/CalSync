export interface CalendarEvent {
  id: string;
  title: string;
  startISO: string;
  endISO: string | null;
  isAllDay: boolean;
  location: string | null;
  calendarColor: string;
}

export interface AlarmRecord {
  eventId: string;
  alarmId: string;
  offsetMinutes: number;
  fireISO: string;
}
