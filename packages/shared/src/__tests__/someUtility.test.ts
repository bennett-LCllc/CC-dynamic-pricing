import { describe, it, expect } from 'vitest';
import { someUtility } from '../someUtility';

describe('someUtility', () => {
  it('should return true when passed a truthy value', () => {
    expect(someUtility(true)).toBe(true);
  });

  it('should return false when passed a falsy value', () => {
    expect(someUtility(false)).toBe(false);
  });
});