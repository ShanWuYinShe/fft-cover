import {
  LEVEL_DEFS,
  makeDailyLevel,
  makeLevel,
  makeRandomLevel,
  mulberry32,
  todayKey,
} from './levels';
import { describe, expect, it } from 'vitest';
import { SIZE } from './constants';

describe('makeLevel', () => {
  it('每个内置关卡都生成指定数量的画布内点集', () => {
    for (const def of LEVEL_DEFS) {
      const lv = makeLevel(def);
      expect(lv.pts).toHaveLength(def.n);
      for (const p of lv.pts) {
        expect(p.x).toBeGreaterThanOrEqual(SIZE / 2 - 245);
        expect(p.x).toBeLessThanOrEqual(SIZE / 2 + 245);
        expect(p.y).toBeGreaterThanOrEqual(SIZE / 2 - 245);
        expect(p.y).toBeLessThanOrEqual(SIZE / 2 + 245);
      }
    }
  });
});

describe('makeRandomLevel', () => {
  it('同 seed 生成完全相同的点集（可复现）', () => {
    const a = makeRandomLevel(42);
    const b = makeRandomLevel(42);
    expect(a.pts).toEqual(b.pts);
  });

  it('不同 seed 生成不同关卡', () => {
    const a = makeRandomLevel(1);
    const b = makeRandomLevel(2);
    expect(a.pts[0]).not.toEqual(b.pts[0]);
  });
});

describe('makeDailyLevel', () => {
  it('同一天生成同一关卡，且名称含日期', () => {
    const a = makeDailyLevel();
    const b = makeDailyLevel();
    expect(a.id).toBe(b.id);
    expect(a.id).toBe('daily-' + todayKey());
    expect(a.name).toContain(todayKey().slice(5));
    expect(a.pts).toEqual(b.pts);
    expect(a.random).toBe(true);
  });

  it('内置关卡总数为 10', () => {
    expect(LEVEL_DEFS).toHaveLength(10);
  });
});

describe('mulberry32', () => {
  it('同 seed 序列一致', () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
  });
});
