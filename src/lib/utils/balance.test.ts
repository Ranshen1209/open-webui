import { describe, it, expect } from 'vitest';
import { formatBalance } from './balance';

describe('formatBalance', () => {
	it('formats a positive amount with the symbol and 2 decimals', () => {
		expect(formatBalance(8.945, '¥')).toBe('¥8.95');
	});

	it('formats zero', () => {
		expect(formatBalance(0, '¥')).toBe('¥0.00');
	});

	it('falls back to ¥ when symbol is missing', () => {
		expect(formatBalance(3, null)).toBe('¥3.00');
		expect(formatBalance(3, undefined)).toBe('¥3.00');
		expect(formatBalance(3, '')).toBe('¥3.00');
	});

	it('returns empty string for non-numeric amount', () => {
		expect(formatBalance(null, '¥')).toBe('');
		expect(formatBalance(undefined, '¥')).toBe('');
		expect(formatBalance(NaN, '¥')).toBe('');
	});
});
