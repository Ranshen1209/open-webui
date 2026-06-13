import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	deriveGroups,
	resolveSelectedGroupId,
	resolveDefaultModelId,
	formatGroupLabel,
	getSavedGroupId,
	saveGroupId
} from './modelGroups';

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

describe('resolveDefaultModelId', () => {
	const model = (id: string, groupId?: number, name?: string) => ({
		id,
		...(groupId == null ? {} : { group: { id: groupId, name } })
	});

	it('picks the first model belonging to the default-named group, not the first overall', () => {
		const models = [
			model('claude-haiku-4-5-20251001', 3, 'Claude-Max'),
			model('gpt-5.4', 12, 'GPT-Pro'),
			model('gpt-5.5', 12, 'GPT-Pro')
		];
		expect(resolveDefaultModelId(models, null, 'GPT-Pro')).toBe('gpt-5.4');
	});

	it('honors the saved group over the default name', () => {
		const models = [
			model('claude-haiku-4-5-20251001', 3, 'Claude-Max'),
			model('gpt-5.4', 12, 'GPT-Pro')
		];
		expect(resolveDefaultModelId(models, 3, 'GPT-Pro')).toBe('claude-haiku-4-5-20251001');
	});

	it('falls back to the first model when no group metadata exists', () => {
		const models = [model('claude-haiku-4-5-20251001'), model('gpt-5.4')];
		expect(resolveDefaultModelId(models, null, 'GPT-Pro')).toBe('claude-haiku-4-5-20251001');
	});

	it('returns undefined for an empty model list', () => {
		expect(resolveDefaultModelId([], null, 'GPT-Pro')).toBeUndefined();
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

describe('getSavedGroupId / saveGroupId', () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
			setItem: (k: string, v: string) => {
				store.set(k, String(v));
			},
			removeItem: (k: string) => {
				store.delete(k);
			}
		});
	});
	afterEach(() => vi.unstubAllGlobals());

	it('round-trips a saved id', () => {
		saveGroupId(12);
		expect(getSavedGroupId()).toBe(12);
	});

	it('returns null when nothing saved', () => {
		expect(getSavedGroupId()).toBeNull();
	});

	it('returns null for a non-numeric stored value', () => {
		localStorage.setItem('sakrylle-web.selected-model-group', 'abc');
		expect(getSavedGroupId()).toBeNull();
	});

	it('recovers from storage errors without throwing', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			},
			removeItem: () => {}
		});
		expect(getSavedGroupId()).toBeNull();
		expect(() => saveGroupId(1)).not.toThrow();
	});
});
