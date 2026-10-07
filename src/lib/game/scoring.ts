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

/**
 * 拟合度：目标频谱与玩家频谱的相对误差（0~1，1 = 完全贴合）。
 * k=0 直流项与玩家多余分量均计入偏差。
 */
export function fitScore(target: SpectrumEntry[], arms: Arm[]): number {
  const cur = armSpectrum(arms);
  let num = 0;
  let den = 0;
  for (const t of target) {
    if (t.k === 0) continue;
    const c = cur.get(t.k) ?? { re: 0, im: 0 };
    const tr = t.mag * Math.cos(t.phase);
    const ti = t.mag * Math.sin(t.phase);
    num += (tr - c.re) ** 2 + (ti - c.im) ** 2;
    den += tr * tr + ti * ti;
  }
  for (const [k, c] of cur) {
    if (k === 0 || target.some((t) => t.k === k)) continue;
    num += c.re ** 2 + c.im ** 2;
  }
  if (den === 0) return num === 0 ? 1 : 0;
  return Math.max(0, 1 - Math.sqrt(num / den));
}

/**
 * 从目标频谱直接解出指针参数（DFT 系数即答案）：
 * 按模排序取前 limit 根，相位归一到 [0, 2π)。
 * 返回固定 10 槽位的指针数组（未用槽位关闭、半径 0）。
 */
export function solveFromSpectrum(spectrum: SpectrumEntry[], limit: number, slots = 10): Arm[] {
  const sorted = spectrum
    .filter((s) => s.k !== 0)
    .sort((a, b) => b.mag - a.mag)
    .slice(0, limit);
  const out: Arm[] = Array.from({ length: slots }, () => ({ on: false, r: 0, freq: 1, phase: 0 }));
  sorted.forEach((s, i) => {
    let phase = s.phase;
    if (phase < 0) phase += Math.PI * 2;
    out[i] = { on: true, r: Math.round(s.mag), freq: s.k, phase };
  });
  return out;
}
