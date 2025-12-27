import { describe, it, expect } from 'vitest';
import { normalizeOutput, findFirstNonEmptyString } from '../string.js';

describe('string utils', () => {
  it('normalizeOutput strips surrounding JSON quotes', () => {
    expect(normalizeOutput('"hello"')).toBe('hello');
  });

  it('normalizeOutput returns non-string as string', () => {
    expect(normalizeOutput(123)).toBe('123');
  });

  it('findFirstNonEmptyString finds nested string', () => {
    const obj = { a: null, b: ['', { c: '  ' }, ['\n', 'value']] };
    expect(findFirstNonEmptyString(obj)).toBe('value');
  });
});
