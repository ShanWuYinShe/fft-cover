import { describe, expect, it } from 'vitest';
import { LEVEL_DEFS, makeLevel } from './levels';
import { solveFromSpectrum } from './scoring';
import { tipAt } from './math';
import { RUN_DUR } from './constants';
import type { Vec } from './types';

/** 点集质心（等权平均） */
function centroid(pts: Vec[]): Vec {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
  };
}

describe('几何审计：点集质心 vs 指针链原点 (320,320)', () => {
  it('各关质心偏移不超过容差的一半', () => {
    for (const def of LEVEL_DEFS) {
      const lv = makeLevel(def);
      const c = centroid(lv.pts);
      const off = Math.hypot(c.x - 320, c.y - 320);
      expect(off, def.id + ' 质心偏移 ' + off.toFixed(1)).toBeLessThan(lv.tol / 2);
    }
  });
});

describe('数学正确性：每关 DFT 精确分解应能 100% 全清', () => {
  for (const def of LEVEL_DEFS) {
    it(def.name + '（' + def.id + '）精确分解全清', () => {
      const lv = makeLevel(def);
      const arms = solveFromSpectrum(lv.spectrum, lv.armLimit);
      // 收集判定与引擎 tryCollect 一致：tip 距点 < tol
      const got = new Set<number>();
      const steps = 2000;
      for (let i = 0; i <= steps; i++) {
        const tip = tipAt(arms, (i / steps) * RUN_DUR);
        for (let k = 0; k < lv.pts.length; k++) {
          if (got.has(k)) continue;
          if (Math.hypot(lv.pts[k].x - tip.x, lv.pts[k].y - tip.y) < lv.tol) got.add(k);
        }
      }
      expect(got.size, def.id + ' 精确分解收集 ' + got.size + '/' + lv.pts.length).toBe(
        lv.pts.length,
      );
    });
  }
});
