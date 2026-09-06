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
- [x] Multi-account support (2026-09-06): add/remove multiple Google accounts, events merged into one list with a per-account color bar, account picker forces Google's chooser (`select_account`), removing an account cleans up its alarms too
- [x] Reconcile-on-change (2026-09-06): alarms reschedule automatically when an event's time changes, and cancel automatically when an event is deleted - runs on every foreground sync (app open + pull-to-refresh). Known limitation: events that fall outside the 30-day sync window (already started, or pushed further out) aren't touched, to avoid risking cancellation of an alarm about to legitimately fire.
- [x] Best-effort background reconcile added via `expo-background-task`/`expo-task-manager` - same reconcile logic, but iOS schedules it opportunistically (not guaranteed timing); the foreground reconcile remains the reliable path.
- [~] Not yet verified: an alarm actually firing end-to-end from a real calendar event with the phone on silent (the core premise of the whole app)
- [ ] Weekly re-sign reminder is a manual habit, not automated
- Decision (2026-09-06): CalSync will be open-sourced (MIT), not pursued as a paid App Store app - market research found 10+ closed-source AlarmKit-based competitors already live, none open source. Prep work (scrub committed secrets/personal identifiers, replace boilerplate LICENSE, write README) is planned but not yet started.

**Note on build config**: the last few installs were Debug builds (`npx expo run:ios --device <udid>`, no `--configuration Release`), which need Metro (`npm start`) running to serve JS - this is a step back from the earlier "standalone, no Metro needed" state and was a side effect of iterating quickly on-device. Rebuild with `--configuration Release` when back to day-to-day use without a cable/Metro.

**Next steps**: verify a real fired alarm; verify the background reconcile task actually gets scheduled and run by iOS (`BackgroundTask.triggerTaskWorkerForTestingAsync()` works in debug builds for testing this without waiting on the real OS scheduler); execute the open-source prep work; no remote git repo yet (local commits only).

See also: SecondBrain vault note `02 - Projects/CalSync.md` for the full history.
