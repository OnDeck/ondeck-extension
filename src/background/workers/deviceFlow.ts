import { signInWithToken } from '../../lib/auth';
import {
  DeviceFlowError,
  pollDeviceToken,
  requestDeviceCode,
  type TokenPoll,
} from '../../lib/deviceFlow';
import {
  clearDeviceFlowState,
  readDeviceFlowState,
  writeDeviceFlowState,
} from '../../shared/auth/deviceFlowState';
import { DEVICE_FLOW_ALARM_NAME, GITHUB_CLIENT_ID } from '../../shared/constants';
import { logger } from '../../shared/logger';

const MODULE = 'device-flow';

// Polling runs here rather than in the popup because the popup closes as soon
// as the user switches to the GitHub tab to enter the code.
let activeDeviceCode: string | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'GitHub sign-in failed.';
}

async function fail(message: string): Promise<void> {
  await writeDeviceFlowState({ status: 'failed', message });
  await chrome.alarms.clear(DEVICE_FLOW_ALARM_NAME);
}

export async function startDeviceFlow(clientId: string | null = GITHUB_CLIENT_ID): Promise<void> {
  if (!clientId) {
    await fail("Sign in with GitHub isn't set up in this build. Use a personal access token.");
    return;
  }
  await writeDeviceFlowState({ status: 'starting' });
  try {
    const code = await requestDeviceCode(clientId);
    await writeDeviceFlowState({
      status: 'waiting',
      deviceCode: code.deviceCode,
      userCode: code.userCode,
      verificationUri: code.verificationUri,
      expiresAt: Date.now() + code.expiresInSeconds * 1000,
      intervalSeconds: code.intervalSeconds,
    });
  } catch (error) {
    logger.error({ module: MODULE, message: 'Device code request failed', error });
    await fail(messageOf(error));
    return;
  }
  // Backstop for when Chrome stops the worker mid-wait: the alarm wakes it and
  // resumeDeviceFlow picks polling back up.
  await chrome.alarms.create(DEVICE_FLOW_ALARM_NAME, { periodInMinutes: 0.5 });
  void pollUntilDone(clientId);
}

export async function cancelDeviceFlow(): Promise<void> {
  await clearDeviceFlowState();
  await chrome.alarms.clear(DEVICE_FLOW_ALARM_NAME);
}

export async function resumeDeviceFlow(clientId: string | null = GITHUB_CLIENT_ID): Promise<void> {
  const state = await readDeviceFlowState();
  if (state?.status !== 'waiting' || !clientId) {
    await chrome.alarms.clear(DEVICE_FLOW_ALARM_NAME);
    return;
  }
  await pollUntilDone(clientId);
}

async function pollOnce(clientId: string, deviceCode: string): Promise<TokenPoll> {
  try {
    return await pollDeviceToken(clientId, deviceCode);
  } catch (error) {
    if (error instanceof DeviceFlowError && error.transient) return { kind: 'pending' };
    return { kind: 'failed', message: messageOf(error) };
  }
}

async function isCurrent(deviceCode: string): Promise<boolean> {
  const state = await readDeviceFlowState();
  return state?.status === 'waiting' && state.deviceCode === deviceCode;
}

async function pollUntilDone(clientId: string): Promise<void> {
  const initial = await readDeviceFlowState();
  if (initial?.status !== 'waiting' || activeDeviceCode === initial.deviceCode) return;
  const mine = initial.deviceCode;
  activeDeviceCode = mine;

  try {
    for (;;) {
      const state = await readDeviceFlowState();
      // Cancelled, finished, or replaced by a newer attempt.
      if (state?.status !== 'waiting' || state.deviceCode !== mine) return;
      if (Date.now() >= state.expiresAt) {
        await fail('The code expired before it was entered. Start again.');
        return;
      }

      await sleep(state.intervalSeconds * 1000);
      if (!(await isCurrent(mine))) return;

      const result = await pollOnce(clientId, mine);
      if (result.kind === 'pending') continue;
      if (result.kind === 'slow_down') {
        await writeDeviceFlowState({ ...state, intervalSeconds: result.intervalSeconds });
        continue;
      }
      // The user may have cancelled while the request was in flight.
      if (!(await isCurrent(mine))) return;
      if (result.kind === 'failed') {
        await fail(result.message);
        return;
      }

      try {
        await signInWithToken(result.token);
        await cancelDeviceFlow();
      } catch (error) {
        await fail(messageOf(error));
      }
      return;
    }
  } finally {
    if (activeDeviceCode === mine) activeDeviceCode = null;
  }
}

export function registerDeviceFlowAlarm(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DEVICE_FLOW_ALARM_NAME) void resumeDeviceFlow();
  });
}
