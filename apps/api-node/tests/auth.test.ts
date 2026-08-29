import { describe, expect, it } from 'vitest';

import {
  generateToken,
  hashPassword,
  verifyPassword,
  verifyToken,
  type TokenPayload,
} from '../src/services/auth';

const payload: TokenPayload = {
  userId: 'user-123',
  email: 'agent@cc-ops.dev',
  role: 'ADMIN',
  tokenVersion: 1,
};

describe('auth.generateToken / verifyToken', () => {
  it('round-trips a payload through sign+verify', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.tokenVersion).toBe(payload.tokenVersion);
  });

  it('produces a distinct token for a changed payload', () => {
    const a = generateToken(payload);
    const b = generateToken({ ...payload, tokenVersion: 2 });
    expect(a).not.toBe(b);
    expect(verifyToken(b).tokenVersion).toBe(2);
  });

  it('rejects a tampered token', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'b' : 'a');
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects an empty token', () => {
    expect(() => verifyToken('')).toThrow();
  });
});

describe('auth.hashPassword / verifyPassword', () => {
  it('hashes a password and verifies the same password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPassword('Sup3rSecret!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('Sup3rSecret!');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces a unique hash per call (salt)', async () => {
    const h1 = await hashPassword('same');
    const h2 = await hashPassword('same');
    expect(h1).not.toBe(h2);
    expect(await verifyPassword('same', h1)).toBe(true);
    expect(await verifyPassword('same', h2)).toBe(true);
  });
});
