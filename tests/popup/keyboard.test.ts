import { describe, expect, it } from 'vitest';
import { stepIndex } from '../../src/popup/lib/keyboard';

describe('stepIndex', () => {
  it('starts at the top going down and at the bottom going up', () => {
    expect(stepIndex(-1, 5, 1)).toBe(0);
    expect(stepIndex(-1, 5, -1)).toBe(4);
  });

  it('moves one row and stops at either end', () => {
    expect(stepIndex(2, 5, 1)).toBe(3);
    expect(stepIndex(2, 5, -1)).toBe(1);
    expect(stepIndex(4, 5, 1)).toBe(4);
    expect(stepIndex(0, 5, -1)).toBe(0);
  });

  it('has nowhere to go in an empty list', () => {
    expect(stepIndex(-1, 0, 1)).toBe(-1);
  });
});
