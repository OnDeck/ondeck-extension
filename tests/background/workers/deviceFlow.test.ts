import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorageArea } from '../../helpers/chromeStorage';
import { DEVICE_FLOW_STORAGE_KEY } from '../../../src/shared/auth/deviceFlowState';

const requestDeviceCode = vi.fn();
const pollDeviceToken = vi.fn();
const signInWithToken = vi.fn();

vi.mock('../../../src/lib/deviceFlow', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/lib/deviceFlow')>()),
  requestDeviceCode: (...args: unknown[]) => requestDeviceCode(...args),
  pollDeviceToken: (...args: unknown[]) => pollDeviceToken(...args),
}));
vi.mock('../../../src/lib/auth', () => ({
  signInWithToken: (...args: unknown[]) => signInWithToken(...args),
}));

const { DeviceFlowError } = await import('../../../src/lib/deviceFlow');
const { cancelDeviceFlow, resumeDeviceFlow, startDeviceFlow } =
  await import('../../../src/background/workers/deviceFlow');

const session = memoryStorageArea();
const alarms = {
  create: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(true),
};
global.chrome = { storage: { session }, alarms } as unknown as typeof chrome;

const state = () => session.data[DEVICE_FLOW_STORAGE_KEY] as Record<string, unknown> | undefined;

const CODE = {
  deviceCode: 'dc',
  userCode: 'WDJB-MJHT',
  verificationUri: 'https://github.com/login/device',
  expiresInSeconds: 900,
  intervalSeconds: 5,
};

describe('device flow worker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    session.clear();
    vi.clearAllMocks();
    requestDeviceCode.mockResolvedValue(CODE);
    signInWithToken.mockResolvedValue({ login: 'me' });
  });
  afterEach(async () => {
    // Let any loop still sleeping see the cleared state and exit, so the next
    // test starts with no poller running.
    await cancelDeviceFlow();
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  it('shows the code, polls at the interval, signs in and clears its state', async () => {
    pollDeviceToken
      .mockResolvedValueOnce({ kind: 'pending' })
      .mockResolvedValueOnce({ kind: 'token', token: 'gho_x' });

    await startDeviceFlow('cid');
    expect(state()).toMatchObject({ status: 'waiting', userCode: 'WDJB-MJHT' });
    expect(alarms.create).toHaveBeenCalledWith('github-device-flow', { periodInMinutes: 0.5 });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(pollDeviceToken).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(pollDeviceToken).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(signInWithToken).toHaveBeenCalledWith('gho_x');
    expect(state()).toBeUndefined();
    expect(alarms.clear).toHaveBeenCalledWith('github-device-flow');
  });

  it('backs off on slow_down', async () => {
    pollDeviceToken
      .mockResolvedValueOnce({ kind: 'slow_down', intervalSeconds: 10 })
      .mockResolvedValue({ kind: 'pending' });
    await startDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(state()).toMatchObject({ intervalSeconds: 10 });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(pollDeviceToken).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(pollDeviceToken).toHaveBeenCalledTimes(2);
  });

  it('keeps polling through network blips and reports a denial', async () => {
    pollDeviceToken
      .mockRejectedValueOnce(new DeviceFlowError('offline', true))
      .mockResolvedValueOnce({ kind: 'failed', message: 'Sign-in was cancelled on GitHub.' });
    await startDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(state()).toEqual({ status: 'failed', message: 'Sign-in was cancelled on GitHub.' });
    expect(signInWithToken).not.toHaveBeenCalled();
  });

  it('stops polling and discards a late token after cancel', async () => {
    let resolvePoll: (value: unknown) => void = () => {};
    pollDeviceToken.mockReturnValueOnce(new Promise((resolve) => (resolvePoll = resolve)));
    await startDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(5_000);
    await cancelDeviceFlow();
    resolvePoll({ kind: 'token', token: 'gho_late' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(signInWithToken).not.toHaveBeenCalled();
    expect(pollDeviceToken).toHaveBeenCalledTimes(1);
  });

  it('a new attempt replaces an old one that is still sleeping', async () => {
    pollDeviceToken.mockResolvedValue({ kind: 'pending' });
    await startDeviceFlow('cid');
    requestDeviceCode.mockResolvedValueOnce({ ...CODE, deviceCode: 'dc2' });
    await startDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(pollDeviceToken.mock.calls.map((c) => c[1])).toEqual(['dc2']);
  });

  it('fails once the code expires', async () => {
    requestDeviceCode.mockResolvedValueOnce({ ...CODE, expiresInSeconds: 8 });
    pollDeviceToken.mockResolvedValue({ kind: 'pending' });
    await startDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(state()).toMatchObject({
      status: 'failed',
      message: expect.stringContaining('expired'),
    });
  });

  it('records request errors and a missing client id', async () => {
    requestDeviceCode.mockRejectedValueOnce(
      new DeviceFlowError('Device flow must be enabled', false),
    );
    await startDeviceFlow('cid');
    expect(state()).toEqual({ status: 'failed', message: 'Device flow must be enabled' });

    await startDeviceFlow(null);
    expect(state()).toMatchObject({
      status: 'failed',
      message: expect.stringContaining('personal access token'),
    });
  });

  it('resumes a waiting flow after the worker restarts', async () => {
    session.data[DEVICE_FLOW_STORAGE_KEY] = {
      status: 'waiting',
      deviceCode: 'dc',
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      expiresAt: Date.now() + 60_000,
      intervalSeconds: 5,
    };
    pollDeviceToken.mockResolvedValueOnce({ kind: 'token', token: 'gho_x' });
    void resumeDeviceFlow('cid');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(signInWithToken).toHaveBeenCalledWith('gho_x');
  });
});
