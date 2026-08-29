// Runs before any test module is imported. auth.ts reads JWT_SECRET at
// module-load time, so it must be set here — not in a beforeAll.
process.env.JWT_SECRET ??= 'test-secret-at-least-32-chars-long-for-vitest';
