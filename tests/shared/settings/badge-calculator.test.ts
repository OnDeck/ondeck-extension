import { describe, it, expect } from 'vitest';
import { calculateBadgeCount } from '../../../src/background/workers/sync';
import type { CountsCache, UserSettings } from '../../../src/shared/settings/types';

describe('calculateBadgeCount', () => {
  const mockCounts: CountsCache = {
    prs: 3,
    reviews: 5,
    mentions: 12,
    notifications: 8,
    timestamp: Date.now(),
  };

  describe('formula: all', () => {
    it('should sum all counts', () => {
      const badgeSettings: UserSettings['badge'] = { formula: 'all' };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(28); // 3 + 5 + 12 + 8
    });
  });

  describe('formula: actionable', () => {
    it('should sum PRs and reviews only', () => {
      const badgeSettings: UserSettings['badge'] = { formula: 'actionable' };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(8); // 3 + 5
    });
  });

  describe('formula: reviews-only', () => {
    it('should return only review count', () => {
      const badgeSettings: UserSettings['badge'] = { formula: 'reviews-only' };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(5);
    });
  });

  describe('formula: custom', () => {
    it('should sum only selected tabs', () => {
      const badgeSettings: UserSettings['badge'] = {
        formula: 'custom',
        customTabs: ['prs', 'mentions'],
      };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(15); // 3 + 12
    });

    it('should return 0 when customTabs is empty', () => {
      const badgeSettings: UserSettings['badge'] = {
        formula: 'custom',
        customTabs: [],
      };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(0);
    });

    it('should return 0 when customTabs is undefined', () => {
      const badgeSettings: UserSettings['badge'] = {
        formula: 'custom',
      };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(0);
    });

    it('should handle single tab selection', () => {
      const badgeSettings: UserSettings['badge'] = {
        formula: 'custom',
        customTabs: ['notifications'],
      };
      const result = calculateBadgeCount(mockCounts, badgeSettings);
      expect(result).toBe(8);
    });
  });

  describe('edge cases', () => {
    it('should handle zero counts', () => {
      const zeroCounts: CountsCache = {
        prs: 0,
        reviews: 0,
        mentions: 0,
        notifications: 0,
        timestamp: Date.now(),
      };
      const badgeSettings: UserSettings['badge'] = { formula: 'all' };
      const result = calculateBadgeCount(zeroCounts, badgeSettings);
      expect(result).toBe(0);
    });
  });
});
