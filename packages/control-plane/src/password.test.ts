import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, randomToken } from './password';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored.startsWith('pbkdf2$')).toBe(true);
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(await verifyPassword('wrong password', stored)).toBe(false);
  });

  it('uses a fresh salt so equal passwords hash differently', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$0$$')).toBe(false);
  });
});

describe('randomToken', () => {
  it('is url-safe and unique', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
