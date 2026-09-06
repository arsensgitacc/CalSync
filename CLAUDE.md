@AGENTS.md

## Project status (updated 2026-09-06)

**Goal**: iOS-only app, sideloaded via a free Apple ID (no paid Apple Developer account), that syncs Google Calendar and lets the user attach real Clock-equivalent alarms (bypass Silent mode/Focus) to events.

**Key decisions**:
- Alarms use Apple's **AlarmKit** (new in iOS 26) via the community wrapper `expo-alarm-kit`, not local notifications - gives real Clock-app alarm privileges, no paid account or Apple review needed, just requires the phone on iOS 26+.
- Built on **Expo (prebuild)**, not bare RN CLI, for config-plugin support around the native setup AlarmKit needs (App Groups, deployment target 26.1).
- Signed with a free Apple ID ("Personal Team"); provisioning profile expires every 7 days, requiring a periodic reconnect + rebuild in Xcode (`npx expo run:ios --device --configuration Release`).
- Google Calendar OAuth (read-only, PKCE, no client secret) via `expo-auth-session`. The Google Cloud OAuth consent screen had to be pushed to "In production" (unverified) rather than left in "Testing", because Testing-mode refresh tokens expire every 7 days. Publishing required Homepage/Privacy Policy URLs (a Google Sites page) and adding `google.com` as an authorized domain.
- Alarm scheduling UI (`src/components/AlarmSheet.tsx`) is multi-select: "At event start", "At event end", and paired before/after buttons per duration (5/10/15/30/60 min relative to start). Saving diffs the selection against existing alarms. Local SQLite (`expo-sqlite`, `src/lib/alarmStore.ts`) maps `(event, anchor, offset) -> AlarmKit alarm id`.

**Current status**:
- [x] App scaffolded, Google OAuth wired with a real client ID, Calendar API sync working
- [x] AlarmKit wrapper integrated and building successfully (native pod, App Groups, entitlements all confirmed via a real device build)
- [x] Multi-select alarm UI (start/end + before/after per duration) implemented
- [x] Release (standalone) build installed on the iPhone - no longer needs Metro or a cable to run day-to-day
- [~] Not yet verified: an alarm actually firing end-to-end from a real calendar event with the phone on silent (the core premise of the whole app)
- [ ] Weekly re-sign reminder is a manual habit, not automated

**Next steps**: verify a real fired alarm; consider handling event-time changes (currently no reschedule-on-change logic); no remote git repo yet (local commits only).

See also: SecondBrain vault note `02 - Projects/CalSync.md` for the full history.
