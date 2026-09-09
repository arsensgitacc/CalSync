import i18n, { getLocaleTag } from '../i18n';
import { CalendarEvent } from '../types';

const ALL_DAY_DEFAULT_HOUR = 9;

/** Resolves an event's start into a concrete local Date, handling all-day events (date-only strings). */
export function getEventStartDate(event: CalendarEvent): Date {
  if (!event.isAllDay) return new Date(event.startISO);

  const [year, month, day] = event.startISO.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, ALL_DAY_DEFAULT_HOUR, 0, 0);
}

/** Resolves an event's end into a concrete local Date, falling back to its start if there's no end. */
export function getEventEndDate(event: CalendarEvent): Date {
  if (!event.endISO) return getEventStartDate(event);
  if (!event.isAllDay) return new Date(event.endISO);

  const [year, month, day] = event.endISO.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, ALL_DAY_DEFAULT_HOUR, 0, 0);
}

export function formatDayHeading(iso: string, isAllDay: boolean): string {
  const date = isAllDay ? new Date(`${iso}T00:00:00`) : new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return i18n.t('common.today');
  if (isTomorrow) return i18n.t('common.tomorrow');
  return date.toLocaleDateString(getLocaleTag(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function dayKey(iso: string, isAllDay: boolean): string {
  const date = isAllDay ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return date.toDateString();
}
