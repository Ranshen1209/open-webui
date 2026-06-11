import { describe, it, expect } from 'vitest';
import { deriveGroups, resolveSelectedGroupId, formatGroupLabel } from './modelGroups';

const item = (groupId?: number, name?: string, rate?: number) => ({
	model: groupId == null ? {} : { group: { id: groupId, name, rate_multiplier: rate } }
});

describe('deriveGroups', () => {
	it('dedupes by id, ignores models without group, sorts by name', () => {
		const groups = deriveGroups([
			item(12, 'GPT-Pro', 2),
			item(12, 'GPT-Pro', 2),
			item(3, 'Claude-Max', 1),
			item()
		]);
		expect(groups.map((g) => g.name)).toEqual(['Claude-Max', 'GPT-Pro']);
		expect(groups.find((g) => g.id === 12)?.rate_multiplier).toBe(2);
	});

	it('returns [] when no model has a group', () => {
		expect(deriveGroups([item(), item()])).toEqual([]);
	});
});

describe('resolveSelectedGroupId', () => {
	const groups = [
		{ id: 3, name: 'Claude-Max' },
		{ id: 12, name: 'GPT-Pro' }
	];

	it('uses saved id when still available', () => {
		expect(resolveSelectedGroupId(groups, 3, 'GPT-Pro')).toBe(3);
	});

	it('falls back to default-named group when saved is gone', () => {
		expect(resolveSelectedGroupId(groups, 999, 'GPT-Pro')).toBe(12);
	});

	it('falls back to first group when default name absent', () => {
		expect(resolveSelectedGroupId(groups, null, 'Nope')).toBe(3);
	});

	it('returns undefined for empty groups', () => {
		expect(resolveSelectedGroupId([], 1, 'GPT-Pro')).toBeUndefined();
	});
});

describe('formatGroupLabel', () => {
	it('appends multiplier when present', () => {
		expect(formatGroupLabel({ id: 1, name: 'GPT-Pro', rate_multiplier: 2 })).toBe('GPT-Pro ·2x');
	});
	it('shows only name when multiplier missing', () => {
		expect(formatGroupLabel({ id: 1, name: 'GPT-Pro' })).toBe('GPT-Pro');
	});
});
