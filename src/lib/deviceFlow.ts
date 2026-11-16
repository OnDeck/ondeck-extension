// GitHub's OAuth device flow: https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
// github.com/login doesn't send CORS headers, so these calls rely on the
// extension's host permission for https://github.com/login/*.

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

export const DEVICE_FLOW_SCOPES = 'notifications repo';

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresInSeconds: number;
  intervalSeconds: number;
}

export type TokenPoll =
  | { kind: 'pending' }
  | { kind: 'slow_down'; intervalSeconds: number }
  | { kind: 'token'; token: string }
  | { kind: 'failed'; message: string };

export class DeviceFlowError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
  ) {
    super(message);
    this.name = 'DeviceFlowError';
  }
}

type Json = Record<string, unknown>;

async function postForm(
  url: string,
  body: Record<string, string>,
): Promise<{ status: number; json: Json }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      cache: 'no-store',
    });
  } catch {
    throw new DeviceFlowError("Couldn't reach GitHub. Check your connection.", true);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new DeviceFlowError(
      `GitHub returned an unexpected response (${response.status}).`,
      response.status >= 500,
    );
  }
  if (typeof json !== 'object' || json === null) {
    throw new DeviceFlowError(
      `GitHub returned an unexpected response (${response.status}).`,
      false,
    );
  }
  return { status: response.status, json: json as Json };
}

const str = (json: Json, key: string): string | null =>
  typeof json[key] === 'string' ? (json[key] as string) : null;
const num = (json: Json, key: string): number | null =>
  typeof json[key] === 'number' && Number.isFinite(json[key]) ? (json[key] as number) : null;

function describe(json: Json, fallback: string): string {
  return str(json, 'error_description') ?? str(json, 'error') ?? fallback;
}

export async function requestDeviceCode(clientId: string): Promise<DeviceCode> {
  const { status, json } = await postForm(DEVICE_CODE_URL, {
    client_id: clientId,
    scope: DEVICE_FLOW_SCOPES,
  });
  const deviceCode = str(json, 'device_code');
  const userCode = str(json, 'user_code');
  const verificationUri = str(json, 'verification_uri');
  const expiresInSeconds = num(json, 'expires_in');
  const intervalSeconds = num(json, 'interval');

  if (!deviceCode || !userCode || !verificationUri || !expiresInSeconds || !intervalSeconds) {
    throw new DeviceFlowError(
      describe(json, `GitHub couldn't start sign-in (${status}).`),
      status >= 500,
    );
  }
  // Opened in a tab later, so only ever accept a GitHub URL.
  if (!verificationUri.startsWith('https://github.com/')) {
    throw new DeviceFlowError('GitHub returned an unexpected verification link.', false);
  }
  return { deviceCode, userCode, verificationUri, expiresInSeconds, intervalSeconds };
}

export async function pollDeviceToken(clientId: string, deviceCode: string): Promise<TokenPoll> {
  const { json } = await postForm(ACCESS_TOKEN_URL, {
    client_id: clientId,
    device_code: deviceCode,
    grant_type: DEVICE_GRANT,
  });

  const token = str(json, 'access_token');
  if (token) return { kind: 'token', token };

  switch (str(json, 'error')) {
    case 'authorization_pending':
      return { kind: 'pending' };
    case 'slow_down':
      return { kind: 'slow_down', intervalSeconds: num(json, 'interval') ?? 10 };
    case 'expired_token':
      return { kind: 'failed', message: 'The code expired before it was entered. Start again.' };
    case 'access_denied':
      return { kind: 'failed', message: 'Sign-in was cancelled on GitHub.' };
    default:
      return { kind: 'failed', message: describe(json, 'GitHub sign-in failed.') };
  }
}
