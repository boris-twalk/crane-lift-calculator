export const weightKeys = ['load', 'hook', 'rigging', 'extra'] as const;
export type WeightKey = typeof weightKeys[number];
export interface Draft {
  brand: string; model: string; load: string; hook: string; rigging: string; extra: string;
  capacity: string; source: string; conditions: string; confirmed: boolean;
}
export const emptyDraft: Draft = { brand: '', model: '', load: '', hook: '0', rigging: '0', extra: '0', capacity: '', source: '', conditions: '', confirmed: false };
export function parseWeight(value: string): number {
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim())) throw new Error('請輸入非負數，最多三位小數。');
  const n = Number(value);
  if (!Number.isFinite(n) || n > 1_000_000) throw new Error('重量需介於 0 至 1,000,000 公噸。');
  return Math.round(n * 1000);
}
export function calculate(draft: Draft) {
  const weights = weightKeys.map(key => parseWeight(draft[key]));
  const capacityKg = parseWeight(draft.capacity);
  if (capacityKg === 0) throw new Error('額定起重能力必須大於 0。');
  const totalKg = weights.reduce((sum, n) => sum + n, 0);
  const utilization = totalKg * 100 / capacityKg;
  return { total: totalKg / 1000, utilization, exceeded: totalKg > capacityKg, atLimit: totalKg === capacityKg };
}
const strings = ['brand','model',...weightKeys,'capacity','source','conditions'] as const;
export function encodeDraft(draft: Draft): string { return JSON.stringify({ version: 1, draft }); }
export function decodeDraft(raw: string): Draft {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('draft' in parsed)) throw new Error('不支援的草稿格式。');
  const d = parsed.draft;
  if (!d || typeof d !== 'object' || !strings.every(key => key in d && typeof (d as Record<string, unknown>)[key] === 'string' && ((d as Record<string, string>)[key].length <= 5000)) || !('confirmed' in d) || typeof d.confirmed !== 'boolean') throw new Error('草稿內容不完整。');
  return Object.fromEntries([...strings.map(key => [key, (d as Record<string, unknown>)[key]]), ['confirmed', d.confirmed]]) as unknown as Draft;
}
