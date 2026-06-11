// Sakrylle 模型分组的纯逻辑 + localStorage 薄封装。
// 分组数据来自 /v1/models?groups=all 返回的每个模型 model.group:{id,name,rate_multiplier}。

export interface ModelGroup {
	id: number;
	name: string;
	rate_multiplier?: number;
}

/** 本部署的默认分组名（精确名匹配）。换默认组只改这里。 */
export const DEFAULT_MODEL_GROUP_NAME = 'GPT-Pro';

const STORAGE_KEY = 'sakrylle-web.selected-model-group';

/** 从选择器 items 派生去重分组，按 name 升序。无 group 的模型忽略。 */
export function deriveGroups(items: Array<{ model?: any }>): ModelGroup[] {
	const map = new Map<number, ModelGroup>();
	for (const item of items ?? []) {
		const g = item?.model?.group;
		if (!g || typeof g.id !== 'number') continue;
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

/** 选中组优先级：已保存(仍可用) > 默认名组 > 第一个组。 */
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

/** 下拉项文案：有倍率显示 "Name ·2x"，否则只显示名字。 */
export function formatGroupLabel(group: ModelGroup): string {
	return group.rate_multiplier != null ? `${group.name} ·${group.rate_multiplier}x` : group.name;
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
