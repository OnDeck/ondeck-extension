export const DEVICE_FLOW_STORAGE_KEY = 'device_flow_v1';

// Lives in chrome.storage.session: memory-only, cleared when the browser
// closes, and shared by the popup and the service worker.
export type DeviceFlowState =
  | { status: 'starting' }
  | {
      status: 'waiting';
      deviceCode: string;
      userCode: string;
      verificationUri: string;
      expiresAt: number;
      intervalSeconds: number;
    }
  | { status: 'failed'; message: string };

export function isDeviceFlowState(value: unknown): value is DeviceFlowState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v.status) {
    case 'starting':
      return true;
    case 'waiting':
      return (
        typeof v.deviceCode === 'string' &&
        typeof v.userCode === 'string' &&
        typeof v.verificationUri === 'string' &&
        typeof v.expiresAt === 'number' &&
        typeof v.intervalSeconds === 'number'
      );
    case 'failed':
      return typeof v.message === 'string';
    default:
      return false;
  }
}

export async function readDeviceFlowState(): Promise<DeviceFlowState | null> {
  const bag = await chrome.storage.session.get(DEVICE_FLOW_STORAGE_KEY);
  const value: unknown = bag[DEVICE_FLOW_STORAGE_KEY];
  return isDeviceFlowState(value) ? value : null;
}

export async function writeDeviceFlowState(state: DeviceFlowState): Promise<void> {
  await chrome.storage.session.set({ [DEVICE_FLOW_STORAGE_KEY]: state });
}

export async function clearDeviceFlowState(): Promise<void> {
  await chrome.storage.session.remove(DEVICE_FLOW_STORAGE_KEY);
}
