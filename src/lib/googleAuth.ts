import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { CALENDAR_SCOPE, GOOGLE_IOS_CLIENT_ID, OAUTH_SCHEME, USERINFO_ENDPOINT } from '../constants';
import { GoogleAccount } from '../types';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const ACCOUNTS_KEY = 'calsync.accounts';

const redirectUri = AuthSession.makeRedirectUri({ scheme: OAUTH_SCHEME });

function tokenKey(accountId: string, field: 'accessToken' | 'refreshToken' | 'expiresAt') {
  return `calsync.acct.${accountId}.${field}`;
}

export async function getAccounts(): Promise<GoogleAccount[]> {
  const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
  return raw ? (JSON.parse(raw) as GoogleAccount[]) : [];
}

async function saveAccounts(accounts: GoogleAccount[]): Promise<void> {
  await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function persistTokens(
  accountId: string,
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }
) {
  await SecureStore.setItemAsync(tokenKey(accountId, 'accessToken'), tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(tokenKey(accountId, 'refreshToken'), tokens.refreshToken);
  }
  const expiresAt = Date.now() + (tokens.expiresIn ?? 3600) * 1000;
  await SecureStore.setItemAsync(tokenKey(accountId, 'expiresAt'), String(expiresAt));
}

async function getStoredRefreshToken(accountId: string): Promise<string | null> {
  return SecureStore.getItemAsync(tokenKey(accountId, 'refreshToken'));
}

async function deleteTokens(accountId: string): Promise<void> {
  await SecureStore.deleteItemAsync(tokenKey(accountId, 'accessToken'));
  await SecureStore.deleteItemAsync(tokenKey(accountId, 'refreshToken'));
  await SecureStore.deleteItemAsync(tokenKey(accountId, 'expiresAt'));
}

/**
 * Returns a valid access token for the given account, silently refreshing it
 * if it's expired or close to expiring. Throws if the account has no session.
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const [accessToken, expiresAtRaw] = await Promise.all([
    SecureStore.getItemAsync(tokenKey(accountId, 'accessToken')),
    SecureStore.getItemAsync(tokenKey(accountId, 'expiresAt')),
  ]);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;
  const stillValid = accessToken && expiresAt - Date.now() > 60_000;
  if (stillValid) return accessToken;

  const refreshToken = await getStoredRefreshToken(accountId);
  if (!refreshToken) {
    throw new Error('Account is signed out.');
  }

  const result = await AuthSession.refreshAsync(
    { clientId: GOOGLE_IOS_CLIENT_ID, refreshToken },
    discovery
  );
  await persistTokens(accountId, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? refreshToken,
    expiresIn: result.expiresIn,
  });
  return result.accessToken;
}

export async function removeAccount(accountId: string): Promise<void> {
  const refreshToken = await getStoredRefreshToken(accountId);
  if (refreshToken) {
    try {
      await AuthSession.revokeAsync({ token: refreshToken }, discovery);
    } catch {
      // Best-effort revoke; local removal proceeds regardless.
    }
  }
  await deleteTokens(accountId);
  const accounts = await getAccounts();
  await saveAccounts(accounts.filter((a) => a.id !== accountId));
}

export function useGoogleAccounts() {
  const [accounts, setAccounts] = useState<GoogleAccount[] | null>(null);

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, []);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_IOS_CLIENT_ID,
      scopes: [CALENDAR_SCOPE, 'openid', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      // select_account forces Google's account chooser instead of silently
      // reusing whichever Google session is already active in the web view.
      extraParams: { access_type: 'offline', prompt: 'consent select_account' },
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

      const userInfoRes = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      });
      const userInfo = (await userInfoRes.json()) as { email?: string };
      const email = userInfo.email ?? 'Unknown account';

      const current = await getAccounts();
      const existing = current.find((a) => a.email === email);
      const accountId = existing?.id ?? Crypto.randomUUID();

      await persistTokens(accountId, {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
      });

      const nextAccounts = existing ? current : [...current, { id: accountId, email }];
      await saveAccounts(nextAccounts);
      setAccounts(nextAccounts);
    })();
  }, [response]);

  const addAccount = useCallback(() => {
    promptAsync();
  }, [promptAsync]);

  const removeAccountAndUpdate = useCallback(async (accountId: string) => {
    await removeAccount(accountId);
    setAccounts((prev) => (prev ?? []).filter((a) => a.id !== accountId));
  }, []);

  return {
    accounts,
    isRequestReady: !!request,
    addAccount,
    removeAccount: removeAccountAndUpdate,
  };
}
