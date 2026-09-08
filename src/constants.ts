// Set via EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env (copy .env.example to .env).
// See SETUP.md for how to create this OAuth 2.0 "iOS" client in Google Cloud Console.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

export const APP_GROUP_ID = 'group.com.arsenanikyan.calsync';

export const OAUTH_SCHEME = 'com.arsenanikyan.calsync';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Rolling window of events to sync, in days.
export const SYNC_WINDOW_DAYS = 30;
