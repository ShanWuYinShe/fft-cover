/**
 * 上届节奏（ghost pace）：把"上一局每个点的收集时刻"存下来，
 * 让新的一局能与自己的上一次同屏竞速——领先还是落后，一眼可见。
 *
 * 时间轴统一用**游戏时间 t（秒）**（快进 2× / 沙盒转速都不改变它），
 * 因此不同跑法之间可直接比较。
 */

import type { Arm } from './types';

/** 一局的节奏：每个点的收集时刻（秒，升序） */
export type Pace = number[];

/** 节奏存档上限（点数最多 ~34，超出视为脏数据） */
export const PACE_MAX = 64;

/** t 时刻上届已收集的点数（二分查找；无节奏则为 0） */
export function ghostProgressAt(pace: Pace | undefined, t: number): number {
  if (!pace || pace.length === 0) return 0;
  let lo = 0;
  let hi = pace.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pace[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** t 时刻的领先（正）/落后（负）点数 */
export function paceDelta(pace: Pace | undefined, t: number, collected: number): number {
  return collected - ghostProgressAt(pace, t);
}

/** t 时刻上届的进度比例 0~1（总点数为 0 时为 0） */
export function paceRatio(pace: Pace | undefined, t: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, ghostProgressAt(pace, t) / total);
}

/** 当前指针组能否与上届节奏比较（参数一致时轨迹必然同步，比了没有意义） */
export function paceComparable(pace: Pace | undefined, sameArms: boolean): boolean {
  return !!pace && pace.length > 0 && !sameArms;
}

/**
 * 清洗从 localStorage 读出的节奏存档：
 * 只保留"非空数组 + 有限非负数 + 升序"，并截断到 PACE_MAX。
 * 任何非法字段直接丢弃（存档损坏不应让游戏崩）。
 */
export function sanitizePace(raw: unknown): Record<string, Pace> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Pace> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value) || value.length === 0 || value.length > PACE_MAX) continue;
    const times = value.filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0,
    );
    if (times.length !== value.length) continue;
    times.sort((a, b) => a - b);
    out[key] = times;
  }
  return out;
}
/* ---------- 个人最佳（race your best） ---------- */

/** 个人最佳的那一局：解法参数与节奏必须同源（幽灵轨迹与节奏竞速才对得上） */
export interface BestRun {
  arms: Arm[];
  pace: Pace;
}

/**
 * 哪条节奏更值得竞速：收得多者优先；收得一样多时收完得更早者优先；
 * 完全打平返回 a（保持既有参照，避免无意义的"来源"翻转）。
 */
export function strongerPace(a: Pace | undefined, b: Pace | undefined): Pace | undefined {
  if (!a || a.length === 0) return b;
  if (!b || b.length === 0) return a;
  if (a.length !== b.length) return a.length > b.length ? a : b;
  const fa = a[a.length - 1];
  const fb = b[b.length - 1];
  return fb < fa ? b : a;
}

/** 哪一局更配当"个人最佳"：节奏更强者胜；节奏打平保留旧纪录（幂等） */
export function strongerRun(prev: BestRun | undefined, cand: BestRun): BestRun {
  if (!prev) return cand;
  return strongerPace(prev.pace, cand.pace) === cand.pace && cand.pace !== prev.pace ? cand : prev;
}

/**
 * 清洗「个人最佳」存档：结构完整（arms 数组 + 合法节奏）才保留，
 * 节奏部分复用 sanitizePace 的口径；任何脏数据整条丢弃。
 */
export function sanitizeBestRuns(raw: unknown): Record<string, BestRun> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, BestRun> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const arms = (value as { arms?: unknown }).arms;
    const pace = (value as { pace?: unknown }).pace;
    if (!Array.isArray(arms) || arms.length === 0) continue;
    if (!arms.every((a) => !!a && typeof a === 'object')) continue;
    const clean = sanitizePace({ p: pace }).p;
    if (!clean) continue;
    out[key] = { arms: arms as Arm[], pace: clean };
  }
  return out;
}
