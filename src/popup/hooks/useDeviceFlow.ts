import { useCallback, useEffect, useState } from 'react';
import {
  DEVICE_FLOW_STORAGE_KEY,
  isDeviceFlowState,
  readDeviceFlowState,
  type DeviceFlowState,
} from '../../shared/auth/deviceFlowState';

export interface UseDeviceFlow {
  state: DeviceFlowState | null;
  start: () => void;
  cancel: () => void;
}

export function useDeviceFlow(): UseDeviceFlow {
  const [state, setState] = useState<DeviceFlowState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readDeviceFlowState().then((s) => {
      if (!cancelled) setState(s);
    });
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const change = changes[DEVICE_FLOW_STORAGE_KEY];
      if (area !== 'session' || !change) return;
      setState(isDeviceFlowState(change.newValue) ? change.newValue : null);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // The service worker owns the flow; show "starting" straight away rather
  // than waiting for it to wake and write state.
  const start = useCallback(() => {
    setState({ status: 'starting' });
    void chrome.runtime.sendMessage({ type: 'START_DEVICE_FLOW' });
  }, []);

  const cancel = useCallback(() => {
    setState(null);
    void chrome.runtime.sendMessage({ type: 'CANCEL_DEVICE_FLOW' });
  }, []);

  return { state, start, cancel };
}
