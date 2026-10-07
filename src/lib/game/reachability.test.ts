import { describe, expect, it } from 'vitest';
import { makeDailyLevel, makeRandomLevel } from './levels';
import { solveFromSpectrum, starsFor } from './scoring';
import { tipAt } from './math';
import { RUN_DUR } from './constants';
import type { Level } from './types';

/**
 * 用"精确解"跑一遍，看最多能收多少点（即玩家理论上限）。
 * 收集判定与引擎 tryCollect 一致：tip 距点 < tol。
 */
function bestCollectRate(lv: Level): number {
  const arms = solveFromSpectrum(lv.spectrum, lv.armLimit);
  const got = new Set<number>();
  const steps = 3000;
  for (let i = 0; i <= steps; i++) {
    const tip = tipAt(arms, (i / steps) * RUN_DUR);
    for (let k = 0; k < lv.pts.length; k++) {
      if (got.has(k)) continue;
      if (Math.hypot(lv.pts[k].x - tip.x, lv.pts[k].y - tip.y) < lv.tol) got.add(k);
    }
  }
  return got.size / lv.pts.length;
}

/**
 * 可达性底线：随机/每日关卡必须能拿到三星。
 * 这些关卡是程序生成的，一旦生成出"理论上限都到不了 90%"的关卡，
 * 玩家就是白打——所以用精确解算出上限来兜底（2026-10-07 实测三档最低 96.7%）。
 */
describe('可达性：程序生成的关卡必须能三星', () => {
  for (const diff of ['easy', 'normal', 'hard'] as const) {
    it(diff + '：60 个种子全部能三星', () => {
      for (let seed = 1; seed <= 60; seed++) {
        const lv = makeRandomLevel(seed, diff);
        const rate = bestCollectRate(lv);
        expect(starsFor(rate), diff + ' #' + seed + ' 上限 ' + (rate * 100).toFixed(0) + '%').toBe(
          3,
        );
      }
    });
  }

  it('今日每日挑战（三档难度）都能三星', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      const rate = bestCollectRate(makeDailyLevel(diff));
      expect(starsFor(rate), diff + ' 上限 ' + (rate * 100).toFixed(0) + '%').toBe(3);
    }
  });
});
