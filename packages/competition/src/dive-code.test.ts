import { describe, it, expect } from 'vitest';
import { parseDiveCode } from './dive-code';

describe('parseDiveCode', () => {
  it('parses a forward dive (groups 1–4)', () => {
    const r = parseDiveCode('105');
    expect(r.ok).toBe(true);
    expect(r.parsed).toMatchObject({ group: 1, flying: false, halfSomersaults: 5, halfTwists: 0 });
  });

  it('parses a flying dive', () => {
    expect(parseDiveCode('113').parsed).toMatchObject({ group: 1, flying: true, halfSomersaults: 3 });
  });

  it('parses a twisting dive (group 5)', () => {
    const r = parseDiveCode('5253');
    expect(r.parsed).toMatchObject({ group: 5, direction: 2, halfSomersaults: 5, halfTwists: 3 });
  });

  it('parses an armstand dive (group 6)', () => {
    expect(parseDiveCode('612').parsed).toMatchObject({ group: 6, direction: 1, halfSomersaults: 2 });
  });

  it('rejects non-numeric codes', () => {
    expect(parseDiveCode('10A').ok).toBe(false);
  });

  it('rejects an invalid group digit', () => {
    expect(parseDiveCode('705').ok).toBe(false);
  });

  it('rejects a malformed length', () => {
    expect(parseDiveCode('10').ok).toBe(false);
    expect(parseDiveCode('525').ok).toBe(false); // group 5 needs 4 digits
  });
});
