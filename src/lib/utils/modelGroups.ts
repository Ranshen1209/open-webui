// Pure logic + thin localStorage wrappers for Sakrylle model groups.
// Group data comes from each model's `group:{id,name,rate_multiplier}` in /v1/models?groups=all.

export interface ModelGroup {
	id: number;
	name: string;
	rate_multiplier?: number;
}

/** Default group name for this deployment (exact-name match). Change the default group here. */
export const DEFAULT_MODEL_GROUP_NAME = 'GPT-Pro';

const STORAGE_KEY = 'sakrylle-web.selected-model-group';

/** Derive deduped groups from selector items, sorted by name asc. Models without a group are ignored. */
export function deriveGroups(items: Array<{ model?: any }>): ModelGroup[] {
	const map = new Map<number, ModelGroup>();
	for (const item of items ?? []) {
		const g = item?.model?.group;
		if (g == null || typeof g.id !== 'number') continue;
		if (!map.has(g.id)) {
			map.set(g.id, {
				id: g.id,
				name: typeof g.name === 'string' && g.name ? g.name : `Group ${g.id}`,
				rate_multiplier: typeof g.rate_multiplier === 'number' ? g.rate_multiplier : undefined
			});
		}
	}
	return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Selected-group priority: saved (if still available) > default-named > first. */
export function resolveSelectedGroupId(
	groups: ModelGroup[],
	savedId: number | null,
	defaultName: string
): number | undefined {
	if (!groups.length) return undefined;
	if (savedId != null && groups.some((g) => g.id === savedId)) return savedId;
	const byName = groups.find((g) => g.name === defaultName);
	if (byName) return byName.id;
	return groups[0].id;
}

/** Dropdown label: "Name ·2x" when rate_multiplier present, else just the name. */
export function formatGroupLabel(group: ModelGroup): string {
	return group.rate_multiplier != null ? `${group.name} ·${group.rate_multiplier}x` : group.name;
}

/**
 * Pick the default model id so it agrees with the group the dropdown will resolve to.
 * Mirrors `resolveSelectedGroupId` (saved > default-named > first), then returns the first
 * model in that group — instead of the first model overall, which may live in another group.
 * Falls back to the first model id when no group metadata is present.
 */
export function resolveDefaultModelId(
	models: Array<{ id: string; group?: { id?: number } | null }>,
	savedId: number | null,
	defaultName: string
): string | undefined {
	if (!models?.length) return undefined;
	const groups = deriveGroups(models.map((m) => ({ model: m })));
	const groupId = resolveSelectedGroupId(groups, savedId, defaultName);
	if (groupId === undefined) return models[0]?.id;
	const inGroup = models.find((m) => m?.group?.id === groupId);
	return (inGroup ?? models[0])?.id;
}

export function getSavedGroupId(): number | null {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v == null) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

export function saveGroupId(id: number): void {
	try {
		localStorage.setItem(STORAGE_KEY, String(id));
	} catch {
		// ignore storage errors
	}
}
