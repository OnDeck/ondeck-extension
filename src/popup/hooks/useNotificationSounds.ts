import { useEffect, useRef } from 'react';
import type { NotificationSettings } from './useNotificationSettings';

function playNotificationSound() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Close context after sound completes to prevent resource leaks
    oscillator.onended = () => {
      audioContext.close().catch(() => {
        // Already closed or closing, ignore
      });
    };
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string;
  }>;
}

const SOUND_THROTTLE_MS = 2000;

export function useNotificationSounds(settings: NotificationSettings | null) {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!settings) return;

    const handleMessage = (message: any) => {
      if (message.type !== 'NEW_NOTIFICATIONS') return;

      const typedMessage = message as NewNotificationMessage;

      // Check if any notification type should trigger a sound
      const shouldPlaySound = typedMessage.notifications.some((n) => {
        const type = n.subjectType;
        // Only play for known types that are explicitly enabled
        if (type in settings.soundEnabled) {
          return settings.soundEnabled[type as keyof NotificationSettings['soundEnabled']] === true;
        }
        return false;
      });

      if (shouldPlaySound) {
        const now = Date.now();
        if (now - lastPlayedRef.current > SOUND_THROTTLE_MS) {
          playNotificationSound();
          lastPlayedRef.current = now;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [settings]);
}
