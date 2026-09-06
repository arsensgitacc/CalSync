import { SYNC_WINDOW_DAYS } from '../constants';
import { CalendarEvent } from '../types';
import { getValidAccessToken } from './googleAuth';

interface GoogleEvent {
  id: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

const DEFAULT_COLOR = '#5E5CE6';

export async function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken();

  const now = new Date();
  const until = new Date(now.getTime() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Calendar sync failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { items?: GoogleEvent[] };
  const items = json.items ?? [];

  return items
    .filter((e) => e.status !== 'cancelled' && e.start)
    .map((e): CalendarEvent => {
      const isAllDay = !e.start?.dateTime;
      const startISO = e.start?.dateTime ?? e.start?.date ?? now.toISOString();
      const endISO = e.end?.dateTime ?? e.end?.date ?? null;
      return {
        id: e.id,
        title: e.summary ?? '(No title)',
        startISO,
        endISO,
        isAllDay,
        location: e.location ?? null,
        calendarColor: DEFAULT_COLOR,
      };
    });
}
