import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { CALENDAR_SCOPE, GOOGLE_IOS_CLIENT_ID, OAUTH_SCHEME } from '../constants';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const REFRESH_TOKEN_KEY = 'calsync.googleRefreshToken';
const ACCESS_TOKEN_KEY = 'calsync.googleAccessToken';
const ACCESS_TOKEN_EXPIRES_KEY = 'calsync.googleAccessTokenExpiresAt';

const redirectUri = AuthSession.makeRedirectUri({ scheme: OAUTH_SCHEME });

async function persistTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  const expiresAt = Date.now() + (tokens.expiresIn ?? 3600) * 1000;
  await SecureStore.setItemAsync(ACCESS_TOKEN_EXPIRES_KEY, String(expiresAt));
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRES_KEY);
}

/**
 * Returns a valid access token, silently refreshing it if it's expired
 * or close to expiring. Throws if there's no session to refresh from.
 */
export async function getValidAccessToken(): Promise<string> {
  const [accessToken, expiresAtRaw] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(ACCESS_TOKEN_EXPIRES_KEY),
  ]);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
  const stillValid = accessToken && expiresAt - Date.now() > 60_000;
  if (stillValid) return accessToken;

  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Not signed in.');
  }

  const result = await AuthSession.refreshAsync(
    { clientId: GOOGLE_IOS_CLIENT_ID, refreshToken },
    discovery
  );
  await persistTokens({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? refreshToken,
    expiresIn: result.expiresIn,
  });
  return result.accessToken;
}

export function useGoogleAuth() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    getStoredRefreshToken().then((token) => setIsSignedIn(!!token));
  }, []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_IOS_CLIENT_ID,
      scopes: [CALENDAR_SCOPE, 'openid'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier) return;
    (async () => {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_IOS_CLIENT_ID,
          code: response.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier! },
        },
        discovery
      );
      await persistTokens({
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
      });
      setIsSignedIn(true);
    })();
  }, [response]);

  const signIn = useCallback(() => {
    promptAsync();
  }, [promptAsync]);

  const doSignOut = useCallback(async () => {
    await signOut();
    setIsSignedIn(false);
  }, []);

  return { isSignedIn, isRequestReady: !!request, signIn, signOut: doSignOut };
}
