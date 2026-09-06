import { SYNC_WINDOW_DAYS } from '../constants';
import { CalendarEvent, GoogleAccount } from '../types';
import { getValidAccessToken } from './googleAuth';

interface GoogleEvent {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

const ACCOUNT_COLORS = ['#5E5CE6', '#FF9F0A', '#30D158', '#FF375F', '#64D2FF'];

interface AccountFetchResult {
  events: CalendarEvent[];
  cancelledEventIds: string[];
}

async function fetchEventsForAccount(
  account: GoogleAccount,
  color: string
): Promise<AccountFetchResult> {
  const accessToken = await getValidAccessToken(account.id);

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

  const cancelledEventIds = items
    .filter((e) => e.status === 'cancelled')
    .map((e) => `${account.id}:${e.id}`);

  const events = items
    .filter((e) => e.status !== 'cancelled' && e.start)
    .map((e): CalendarEvent => {
      const isAllDay = !e.start?.dateTime;
      const startISO = e.start?.dateTime ?? e.start?.date ?? now.toISOString();
      const endISO = e.end?.dateTime ?? e.end?.date ?? null;
      return {
        id: `${account.id}:${e.id}`,
        accountId: account.id,
        title: e.summary ?? '(No title)',
        startISO,
        endISO,
        isAllDay,
        location: e.location ?? null,
        description: e.description ?? null,
        calendarColor: color,
      };
    });

  events.forEach((event) => {
    if (event.description) {
      console.log(`[calendarService] "${event.title}" description: ${event.description}`);
    }
  });

  console.log(
    `[calendarService] ${account.email} raw events:`,
    events.map((e) => `${e.title} @ ${e.startISO} -> ${e.endISO}`)
  );

  return { events, cancelledEventIds };
}

/**
 * Fetches upcoming events for every connected account and merges them into a
 * single sorted list. An account whose fetch fails (e.g. a revoked token)
 * doesn't block the others - it's reported back so the UI can surface it.
 */
export async function fetchEventsForAccounts(accounts: GoogleAccount[]): Promise<{
  events: CalendarEvent[];
  cancelledEventIds: string[];
  failedAccounts: GoogleAccount[];
}> {
  const results = await Promise.allSettled(
    accounts.map((account, i) =>
      fetchEventsForAccount(account, ACCOUNT_COLORS[i % ACCOUNT_COLORS.length])
    )
  );

  const events: CalendarEvent[] = [];
  const cancelledEventIds: string[] = [];
  const failedAccounts: GoogleAccount[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      events.push(...result.value.events);
      cancelledEventIds.push(...result.value.cancelledEventIds);
    } else {
      failedAccounts.push(accounts[i]);
    }
  });

  events.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return { events, cancelledEventIds, failedAccounts };
}
