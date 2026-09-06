# One-time setup

## 1. Google Calendar OAuth client

The app can't talk to your Google Calendar until you create an OAuth client for it. This has to be done from your own Google account — takes about 5 minutes.

1. Go to https://console.cloud.google.com/ and create a new project (any name, e.g. "CalSync").
2. **APIs & Services > Library** — search for "Google Calendar API" and click **Enable**.
3. **APIs & Services > OAuth consent screen**:
   - User type: **External**.
   - Fill in the required fields (app name, your email for support/developer contact).
   - Scopes: add `.../auth/calendar.readonly`.
   - Save through to the end, then on the consent screen's summary page click **PUBLISH APP** to move it from "Testing" to "In production". You'll see a warning that verification isn't done — that's fine and expected for a personal single-user app; ignore it. This step matters: apps left in "Testing" mode get refresh tokens that expire every 7 days, which would force you to re-login constantly.
4. **APIs & Services > Credentials > Create Credentials > OAuth client ID**:
   - Application type: **iOS**.
   - Bundle ID: `com.arsenanikyan.calsync` (must match exactly).
5. Copy the generated Client ID (looks like `xxxxxxxx.apps.googleusercontent.com`) into `src/constants.ts`, replacing `REPLACE_ME.apps.googleusercontent.com`.

The first time you sign in on the phone, you'll see an "unverified app" warning screen from Google — tap **Advanced > Go to CalSync (unsafe)** to continue. This is expected and safe here since it's your own app and your own Google account.

## 2. Running on your iPhone

1. Plug your iPhone into your Mac (or connect over the same WiFi network with wireless debugging already paired in Xcode).
2. Open `ios/CalSync.xcworkspace` in Xcode (not the `.xcodeproj`).
3. Select the `CalSync` target > **Signing & Capabilities** > set **Team** to your personal Apple ID (Xcode will auto-manage signing).
4. Select your iPhone as the run destination (top toolbar) and hit **Run** (▶).
5. On first install, on the iPhone go to **Settings > General > VPN & Device Management** and trust your developer certificate.
6. The free-account provisioning profile expires after 7 days — repeat step 4 (just hit Run again in Xcode) about once a week to keep the app working.

Alternatively from the command line, once signing is configured in Xcode at least once:

```bash
npx expo run:ios --device
```

This will list connected devices and build straight to your phone.
