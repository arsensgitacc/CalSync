# CalSync

An iOS app that syncs your Google Calendar and lets you attach real alarms to
events — the same kind the Clock app uses, so they ring through Silent mode
and Focus, unlike a normal notification.

Sideloaded with a free Apple ID (no paid Apple Developer account needed).

## How it works

- **Alarms**: uses Apple's [AlarmKit](https://developer.apple.com/documentation/alarmkit)
  (new in iOS 26) via the community wrapper
  [`expo-alarm-kit`](https://github.com/nickdeupree/expo-alarm-kit), which grants
  real Clock-app alarm privileges — no paid account, no App Store review.
- **Calendar sync**: read-only Google Calendar access via OAuth (PKCE, no
  client secret) using `expo-auth-session`.
- **Alarm scheduling**: pick alarms per event — at start, at end, or offset
  before/after (5/10/15/30/60 min) — from a bottom sheet. A local SQLite
  store maps each `(event, anchor, offset)` to its AlarmKit alarm ID, so
  saving diffs your selection against what's already scheduled.
- **Reconcile-on-change**: alarms auto-reschedule when an event's time
  changes and auto-cancel when an event is deleted, on every foreground
  sync. A best-effort background task does the same opportunistically.
- **Multi-account**: add multiple Google accounts; events merge into one
  list with a per-account color bar.
- **Auto-alarm**: optionally flag an account so its events automatically
  get a start-time alarm as they enter the next 24 hours.
- **Localization**: English and Russian, auto-detected from the device's
  language (`i18next`/`react-i18next`, `src/i18n/locales/`).

## Requirements

- An iPhone on **iOS 26.1+**
- A Mac with Xcode
- A free Apple ID (Settings > Sign in, or a throwaway one) — no paid
  Apple Developer Program enrollment needed
- Node.js and a Google account to create your own OAuth client

## Setup

Google Calendar access requires an OAuth client tied to your own Google
Cloud project, and building requires signing with your own Apple ID —
see **[SETUP.md](./SETUP.md)** for the full walkthrough.

Quick version:

```bash
npm install
cp .env.example .env   # then fill in EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (see SETUP.md)
npx expo run:ios --device
```

## Known limitations

- The free-Apple-ID provisioning profile expires every 7 days — re-run
  `npx expo run:ios --device` (or hit Run in Xcode) weekly to keep it working.
- Reconcile-on-change only touches events inside the rolling 30-day sync
  window, to avoid risking cancellation of an alarm that's about to
  legitimately fire.
- The background reconcile task runs on iOS's own opportunistic schedule,
  not a guaranteed timer — the foreground sync (app open / pull-to-refresh)
  is the reliable path.

## Tech stack

Expo (prebuild) + React Native, TypeScript, `expo-alarm-kit`,
`expo-auth-session`, `expo-sqlite`, `expo-background-task`,
`@gorhom/bottom-sheet`.

## License

MIT — see [LICENSE](./LICENSE).
