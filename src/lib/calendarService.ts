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
  colorId?: string;
}

const ACCOUNT_COLORS = ['#5E5CE6', '#FF9F0A', '#30D158', '#FF375F', '#64D2FF'];

// Google's event colorId -> hex palette rarely changes, so it's fetched once
// per app session and shared across every account.
let eventColorMapPromise: Promise<Record<string, string>> | null = null;

function getEventColorMap(accessToken: string): Promise<Record<string, string>> {
  if (!eventColorMapPromise) {
    eventColorMapPromise = fetch('https://www.googleapis.com/calendar/v3/colors', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`colors fetch failed (${res.status})`);
        return res.json() as Promise<{ event?: Record<string, { background: string }> }>;
      })
      .then((json) => {
        const map: Record<string, string> = {};
        for (const [id, c] of Object.entries(json.event ?? {})) {
          map[id] = c.background;
        }
        return map;
      })
      .catch(() => ({}));
  }
  return eventColorMapPromise;
}

// The color the account's primary calendar is assigned in Google Calendar
// (what you see in the calendar list / event chips there), per-account since
// it's a per-user personalization, not a global calendar property.
const calendarColorCache = new Map<string, string>();

async function getPrimaryCalendarColor(
  account: GoogleAccount,
  accessToken: string,
  fallback: string
): Promise<string> {
  const cached = calendarColorCache.get(account.id);
  if (cached) return cached;

  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`calendarList fetch failed (${res.status})`);
    const json = (await res.json()) as { backgroundColor?: string };
    const color = json.backgroundColor ?? fallback;
    calendarColorCache.set(account.id, color);
    return color;
  } catch {
    return fallback;
  }
}

interface AccountFetchResult {
  events: CalendarEvent[];
  cancelledEventIds: string[];
}

async function fetchEventsForAccount(
  account: GoogleAccount,
  fallbackColor: string
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

  const [res, calendarColor, eventColorMap] = await Promise.all([
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
    getPrimaryCalendarColor(account, accessToken, fallbackColor),
    getEventColorMap(accessToken),
  ]);

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
        calendarColor: (e.colorId && eventColorMap[e.colorId]) || calendarColor,
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
