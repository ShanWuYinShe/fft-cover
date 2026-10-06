import { describe, expect, it } from 'vitest';
import {
  evalAchievements,
  fitScore,
  scoreForPoint,
  solveFromSpectrum,
  spectrumGaps,
  starsFor,
} from './scoring';
import type { SpectrumEntry } from './types';

describe('starsFor', () => {
  it('按 90%/65%/35% 阈值定星级', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.9)).toBe(3);
    expect(starsFor(0.89)).toBe(2);
    expect(starsFor(0.65)).toBe(2);
    expect(starsFor(0.64)).toBe(1);
    expect(starsFor(0.35)).toBe(1);
    expect(starsFor(0.34)).toBe(0);
    expect(starsFor(0)).toBe(0);
  });
});

describe('scoreForPoint', () => {
  it('连击得分 = 100 × (1 + combo)', () => {
    expect(scoreForPoint(0)).toBe(100);
    expect(scoreForPoint(1)).toBe(200);
    expect(scoreForPoint(9)).toBe(1000);
  });
});
describe('evalAchievements', () => {
  const base = { bestStars: {}, bestScores: {}, bestClears: {}, flags: {}, levelCount: 9 };
  it('空数据无成就', () => {
    expect(evalAchievements(base)).toEqual([]);
  });
  it('章节印成就：集齐任意一章 / 全部章节', () => {
    expect(evalAchievements({ ...base, chapterSeals: { basics: false } })).not.toContain(
      'chapter-seal',
    );
    expect(evalAchievements({ ...base, chapterSeals: { basics: true } })).toContain('chapter-seal');
    expect(evalAchievements({ ...base, chapterSeals: { basics: true } })).not.toContain(
      'all-chapter-seals',
    );
    const all = { basics: true, petals: true, pairs: true, summit: true, china: true };
    expect(evalAchievements({ ...base, chapterSeals: all, chapterCount: 5 })).toContain(
      'all-chapter-seals',
    );
  });

  it('首星/首清/连击/竞速按数据判定', () => {
    expect(evalAchievements({ ...base, bestStars: { circle: 1 } })).toContain('first-star');
    expect(evalAchievements({ ...base, bestClears: { circle: 7.5 } })).toContain('first-clear');
    expect(evalAchievements({ ...base, bestScores: { circle: 30000 } })).toContain('combo-king');
    expect(evalAchievements({ ...base, bestScores: { circle: 29999 } })).not.toContain(
      'combo-king',
    );
    expect(evalAchievements({ ...base, bestClears: { circle: 8 } })).toContain('speed-demon');
    expect(evalAchievements({ ...base, bestClears: { circle: 8.1 } })).not.toContain('speed-demon');
  });
  it('行为标记类成就', () => {
    expect(evalAchievements({ ...base, flags: { sandboxUsed: true } })).toContain('sandboxer');
    expect(evalAchievements({ ...base, flags: { inviteLoaded: true } })).toContain('inviter');
    expect(evalAchievements({ ...base, flags: { dragUsed: true } })).toContain('drag-master');
  });
  it('fitScore 完美贴合为 1，偏差按能量比扣减', () => {
    const target: SpectrumEntry[] = [{ k: 1, mag: 120, phase: 0 }];
    expect(fitScore(target, [{ on: true, r: 120, freq: 1, phase: 0 }])).toBe(1);
    // 半径 60：误差能量 (60/120)² = 0.25 → 拟合度 1 - 0.5 ≈ 0.5
    const half = fitScore(target, [{ on: true, r: 60, freq: 1, phase: 0 }]);
    expect(half).toBeGreaterThan(0.45);
    expect(half).toBeLessThan(0.55);
    // 多余分量计偏差
    const extra = fitScore(target, [
      { on: true, r: 120, freq: 1, phase: 0 },
      { on: true, r: 60, freq: 5, phase: 0 },
    ]);
    expect(extra).toBeLessThan(1);
  });

  it('solveFromSpectrum 从频谱解出指针参数', () => {
    const spectrum = [
      { k: 0, mag: 320, phase: 0 },
      { k: 1, mag: 120, phase: 0 },
      { k: -2, mag: 60, phase: 1.5 },
      { k: 3, mag: 0.5, phase: 0 },
    ];
    const arms = solveFromSpectrum(spectrum, 3);
    expect(arms).toHaveLength(10);
    const on = arms.filter((a) => a.on);
    expect(on).toHaveLength(3); // k=0 跳过，按模取前三
    expect(on[0]).toEqual({ on: true, r: 120, freq: 1, phase: 0 });
    expect(on[1].r).toBe(60);
    expect(on[1].freq).toBe(-2);
    expect(on[1].phase).toBeCloseTo(1.5, 5);
    expect(arms.filter((a) => !a.on)).toHaveLength(7);
  });

  it('全关三星判定谐波大师', () => {
    const nine = { bestStars: {}, bestScores: {}, bestClears: {}, flags: {}, levelCount: 9 };
    const partial = { ...nine, bestStars: { circle: 3, ellipse: 3 } };
    expect(evalAchievements(partial)).not.toContain('all-three');
    const full: Record<string, number> = {};
    for (let i = 0; i < 9; i++) full['lv' + i] = 3;
    expect(evalAchievements({ ...nine, bestStars: full })).toContain('all-three');
  });
});
