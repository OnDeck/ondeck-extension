import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceFlowError, pollDeviceToken, requestDeviceCode } from '../../src/lib/deviceFlow';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );

const CODE = {
  device_code: 'dc',
  user_code: 'WDJB-MJHT',
  verification_uri: 'https://github.com/login/device',
  expires_in: 900,
  interval: 5,
};

afterEach(() => fetchMock.mockReset());

describe('requestDeviceCode', () => {
  it('posts the client id and scopes as a form and maps the response', async () => {
    fetchMock.mockReturnValueOnce(json(CODE));
    await expect(requestDeviceCode('cid')).resolves.toEqual({
      deviceCode: 'dc',
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      expiresInSeconds: 900,
      intervalSeconds: 5,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://github.com/login/device/code');
    expect(String(init.body)).toBe('client_id=cid&scope=notifications+repo');
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });

  it("surfaces GitHub's error description", async () => {
    fetchMock.mockReturnValueOnce(
      json(
        { error: 'device_flow_disabled', error_description: 'Device flow must be enabled' },
        400,
      ),
    );
    await expect(requestDeviceCode('cid')).rejects.toThrow('Device flow must be enabled');
  });

  it('rejects a verification link that is not on github.com', async () => {
    fetchMock.mockReturnValueOnce(
      json({ ...CODE, verification_uri: 'https://evil.example/device' }),
    );
    await expect(requestDeviceCode('cid')).rejects.toThrow('unexpected verification link');
  });

  it('marks network failures as transient', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await requestDeviceCode('cid').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeviceFlowError);
    expect((error as DeviceFlowError).transient).toBe(true);
  });
});

describe('pollDeviceToken', () => {
  it('sends the device grant', async () => {
    fetchMock.mockReturnValueOnce(json({ error: 'authorization_pending' }));
    await pollDeviceToken('cid', 'dc');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://github.com/login/oauth/access_token');
    expect(new URLSearchParams(String(init.body)).get('grant_type')).toBe(
      'urn:ietf:params:oauth:grant-type:device_code',
    );
  });

  it.each([
    [
      { access_token: 'gho_x', token_type: 'bearer' },
      { kind: 'token', token: 'gho_x' },
    ],
    [{ error: 'authorization_pending' }, { kind: 'pending' }],
    [
      { error: 'slow_down', interval: 10 },
      { kind: 'slow_down', intervalSeconds: 10 },
    ],
    [
      { error: 'expired_token' },
      { kind: 'failed', message: 'The code expired before it was entered. Start again.' },
    ],
    [{ error: 'access_denied' }, { kind: 'failed', message: 'Sign-in was cancelled on GitHub.' }],
    [
      { error: 'incorrect_client_credentials', error_description: 'Bad client' },
      { kind: 'failed', message: 'Bad client' },
    ],
  ])('maps %j', async (body, expected) => {
    fetchMock.mockReturnValueOnce(json(body));
    await expect(pollDeviceToken('cid', 'dc')).resolves.toEqual(expected);
  });
});
