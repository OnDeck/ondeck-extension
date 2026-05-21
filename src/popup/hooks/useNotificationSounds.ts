import { useEffect, useRef } from 'react';
import type { NotificationSettings } from './useNotificationSettings';
import type { NewNotificationMessage } from '../../shared/types/notifications';

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
    // Silently fail - notification sounds are non-critical
    // eslint-disable-next-line no-console
    console.error('Failed to play notification sound:', error);
  }
}

const SOUND_THROTTLE_MS = 2000;

export function useNotificationSounds(settings: NotificationSettings | null) {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!settings) return;

    const handleMessage = (message: unknown) => {
      // Type guard: ensure message has correct shape
      if (!message || typeof message !== 'object') return;
      if (!('type' in message) || message.type !== 'NEW_NOTIFICATIONS') return;
      if (!('notifications' in message) || !Array.isArray(message.notifications)) return;

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
