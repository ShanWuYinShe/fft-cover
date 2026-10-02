import type { Arm, SpectrumEntry } from './types';
import { STAR_LEVELS } from './constants';

/** 按收集比例定星级（≥90% 三星、≥65% 二星、≥35% 一星） */
export function starsFor(p: number): number {
  return p >= STAR_LEVELS[0] ? 3 : p >= STAR_LEVELS[1] ? 2 : p >= STAR_LEVELS[2] ? 1 : 0;
}

/** 连击中第 combo 击收集的点得分：100 × (1 + combo) */
export function scoreForPoint(combo: number): number {
  return 100 * (1 + combo);
}

/** 指针组的等效频谱：同频率指针向量化叠加（k ≠ 0） */
export function armSpectrum(arms: Arm[]): Map<number, { re: number; im: number }> {
  const map = new Map<number, { re: number; im: number }>();
  for (const a of arms) {
    if (!a.on) continue;
    const cur = map.get(a.freq) ?? { re: 0, im: 0 };
    cur.re += a.r * Math.cos(a.phase);
    cur.im += a.r * Math.sin(a.phase);
    map.set(a.freq, cur);
  }
  return map;
}

export interface SpectrumGap {
  k: number;
  /** 需要修正的模（画布像素） */
  mag: number;
  /** 1 = 该频率能量不足，-1 = 过量 */
  sign: 1 | -1;
}

/**
 * 偏差诊断：对比目标频谱与玩家当前频谱，返回差距最大的前 2 个频率分量。
 * 跳过 k=0（直流项，指针链无法表达）与已贴合项（差 < 4px）。
 */
export function spectrumGaps(target: SpectrumEntry[], arms: Arm[], top = 2): SpectrumGap[] {
  const cur = armSpectrum(arms);
  const gaps: SpectrumGap[] = [];
  for (const t of target) {
    if (t.k === 0) continue;
    const c = cur.get(t.k) ?? { re: 0, im: 0 };
    const tr = t.mag * Math.cos(t.phase);
    const ti = t.mag * Math.sin(t.phase);
    const mag = Math.hypot(tr - c.re, ti - c.im);
    if (mag < 4) continue;
    gaps.push({ k: t.k, mag, sign: mag * mag * 2 > t.mag * t.mag ? -1 : 1 });
  }
  for (const [k, c] of cur) {
    if (target.some((t) => t.k === k)) continue;
    const mag = Math.hypot(c.re, c.im);
    if (mag >= 4) gaps.push({ k, mag, sign: -1 });
  }
  gaps.sort((a, b) => b.mag - a.mag);
  return gaps.slice(0, top);
}

/** 成就定义 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

/** 全部成就 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-star', name: '初露锋芒', desc: '获得第一颗星' },
  { id: 'first-clear', name: '首次全清', desc: '收集齐任意一关的全部点' },
  { id: 'combo-king', name: '连击之王', desc: '单局得分达到 30000' },
  { id: 'all-three', name: '谐波大师', desc: '全部内置关卡三星' },
  { id: 'speed-demon', name: '光速谐波', desc: '任意一关 8 秒内全清' },
  { id: 'sandboxer', name: '自由爵士', desc: '体验一次沙盒模式' },
  { id: 'inviter', name: '牵线搭桥', desc: '使用过随机关邀请码' },
  { id: 'drag-master', name: '机械臂大师', desc: '用画布拖拽调过指针' },
  { id: 'daily-player', name: '每日一练', desc: '每日挑战中拿到得分' },
];

/** 成就判定上下文（全部来自引擎的持久化数据） */
export interface AchievementContext {
  bestStars: Record<string, number>;
  bestScores: Record<string, number>;
  bestClears: Record<string, number>;
  flags: Record<string, boolean>;
  /** 内置关卡总数（总星数满分 = 关卡数 × 3） */
  levelCount: number;
}

/** 按上下文返回全部已达成成就的 id */
export function evalAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  const stars = Object.values(ctx.bestStars);
  const any = (v: Record<string, number>, pred: (n: number) => boolean) =>
    Object.values(v).some(pred);
  if (stars.some((s) => s >= 1)) unlocked.push('first-star');
  if (any(ctx.bestClears, () => true)) unlocked.push('first-clear');
  if (any(ctx.bestScores, (s) => s >= 30000)) unlocked.push('combo-king');
  if (stars.length >= ctx.levelCount && stars.reduce((a, b) => a + b, 0) >= ctx.levelCount * 3) {
    unlocked.push('all-three');
  }
  if (any(ctx.bestClears, (t) => t <= 8)) unlocked.push('speed-demon');
  if (ctx.flags.sandboxUsed) unlocked.push('sandboxer');
  if (ctx.flags.inviteLoaded) unlocked.push('inviter');
  if (ctx.flags.dragUsed) unlocked.push('drag-master');
  if (ctx.flags.dailyWon) unlocked.push('daily-player');
  return unlocked;
}