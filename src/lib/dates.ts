import { CalendarEvent } from '../types';

const ALL_DAY_DEFAULT_HOUR = 9;

/** Resolves an event's start into a concrete local Date, handling all-day events (date-only strings). */
export function getEventStartDate(event: CalendarEvent): Date {
  if (!event.isAllDay) return new Date(event.startISO);

  const [year, month, day] = event.startISO.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, ALL_DAY_DEFAULT_HOUR, 0, 0);
}

export function formatDayHeading(iso: string, isAllDay: boolean): string {
  const date = isAllDay ? new Date(`${iso}T00:00:00`) : new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function dayKey(iso: string, isAllDay: boolean): string {
  const date = isAllDay ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toDateString();
}
