import { describe, expect, it } from 'vitest';
import {
  PACE_MAX,
  ghostProgressAt,
  paceComparable,
  paceDelta,
  paceRatio,
  sanitizeBestRuns,
  sanitizePace,
  strongerPace,
  strongerRun,
  type BestRun,
} from './pace';

describe('ghostProgressAt', () => {
  const pace = [0.5, 1.2, 3.4];

  it('无节奏 → 0（第一次玩某关时没有可比对象）', () => {
    expect(ghostProgressAt(undefined, 5)).toBe(0);
    expect(ghostProgressAt([], 5)).toBe(0);
  });

  it('按时刻统计"上届到这里收了几点"（含边界相等）', () => {
    expect(ghostProgressAt(pace, 0)).toBe(0);
    expect(ghostProgressAt(pace, 0.49)).toBe(0);
    expect(ghostProgressAt(pace, 0.5)).toBe(1);
    expect(ghostProgressAt(pace, 1.199)).toBe(1);
    expect(ghostProgressAt(pace, 1.2)).toBe(2);
    expect(ghostProgressAt(pace, 99)).toBe(3);
  });
});

describe('paceDelta', () => {
  const pace = [1, 2, 3, 4];

  it('领先为正、落后为负、持平为 0', () => {
    expect(paceDelta(pace, 2.5, 3)).toBe(1); // 上届 2 点，本局 3 点
    expect(paceDelta(pace, 2.5, 1)).toBe(-1);
    expect(paceDelta(pace, 2.5, 2)).toBe(0);
  });

  it('无上届时不产生差值（全部记为自己的进度）', () => {
    expect(paceDelta(undefined, 2.5, 3)).toBe(3);
  });
});

describe('paceRatio', () => {
  it('进度比例落在 0~1，用于画布顶部刻度线', () => {
    const pace = [1, 2, 3, 4];
    expect(paceRatio(pace, 0, 8)).toBe(0);
    expect(paceRatio(pace, 2, 8)).toBe(0.25);
    expect(paceRatio(pace, 99, 8)).toBe(0.5);
    expect(paceRatio(pace, 99, 4)).toBe(1);
  });

  it('总点数 <= 0（空关卡）不产生除零', () => {
    expect(paceRatio([1, 2], 5, 0)).toBe(0);
  });
});

describe('paceComparable', () => {
  it('没有上届节奏、或参数与上届完全一致时都不比较', () => {
    expect(paceComparable(undefined, false)).toBe(false);
    expect(paceComparable([], false)).toBe(false);
    expect(paceComparable([1, 2], true)).toBe(false);
    expect(paceComparable([1, 2], false)).toBe(true);
  });
});

describe('strongerPace（幽灵对准更强的那条）', () => {
  it('收得多者优先', () => {
    const a = [1, 2];
    const b = [1, 2, 3];
    expect(strongerPace(a, b)).toBe(b);
    expect(strongerPace(b, a)).toBe(b);
  });

  it('收得一样多时收完更早者优先', () => {
    const a = [1, 5];
    const b = [1, 4];
    expect(strongerPace(a, b)).toBe(b);
    expect(strongerPace(b, a)).toBe(b);
  });

  it('缺省方回落到另一方；完全打平保留 a（不翻转参照）', () => {
    const a = [1, 2];
    expect(strongerPace(undefined, a)).toBe(a);
    expect(strongerPace(a, undefined)).toBe(a);
    expect(strongerPace([], a)).toBe(a);
    expect(strongerPace(a, [1, 2])).toBe(a);
  });
});

describe('strongerRun（个人最佳那局的择优）', () => {
  const run = (pace: number[]): BestRun => ({ arms: [], pace });

  it('无旧纪录直接当选；更弱的挑战者不撼动旧纪录', () => {
    const best = run([1, 2, 3]);
    expect(strongerRun(undefined, best)).toBe(best);
    expect(strongerRun(best, run([1]))).toBe(best);
  });

  it('收得更多或同数更快才换；打平幂等保留旧纪录', () => {
    const best = run([1, 5]);
    const faster = run([1, 4]);
    expect(strongerRun(best, faster)).toBe(faster);
    expect(strongerRun(best, run([1, 5]))).toBe(best);
  });
});

describe('sanitizeBestRuns（个人最佳存档清洗）', () => {
  it('保留结构完整的一条，丢弃缺 arms / 缺节奏 / 脏节奏的条目', () => {
    const out = sanitizeBestRuns({
      circle: { arms: [{ on: true, r: 80, freq: 1, phase: 0 }], pace: [3, 1, 2] },
      noArms: { pace: [1] },
      emptyArms: { arms: [], pace: [1] },
      badPace: { arms: [{ on: true, r: 1, freq: 1, phase: 0 }], pace: 'x' },
      junk: 42,
    });
    expect(Object.keys(out)).toEqual(['circle']);
    expect(out.circle.pace).toEqual([1, 2, 3]);
  });

  it('非对象输入一律返回空表', () => {
    expect(sanitizeBestRuns(null)).toEqual({});
    expect(sanitizeBestRuns('x')).toEqual({});
    expect(sanitizeBestRuns([1])).toEqual({});
  });
});

describe('sanitizePace', () => {
  it('丢弃脏数据、排序并保留合法关卡', () => {
    const raw = {
      circle: [3, 1, 2],
      ellipse: [],
      inf8: [1, 'x'],
      heart: [-1, 2],
      star5: 'nope',
    };
    const out = sanitizePace(raw);
    expect(Object.keys(out)).toEqual(['circle']);
    expect(out.circle).toEqual([1, 2, 3]);
  });

  it('非对象输入一律返回空表（存档损坏不应让游戏崩）', () => {
    expect(sanitizePace(null)).toEqual({});
    expect(sanitizePace([1, 2, 3])).toEqual({});
    expect(sanitizePace('x')).toEqual({});
    expect(sanitizePace(undefined)).toEqual({});
  });

  it('超长数组（脏数据）整条丢弃', () => {
    const tooLong = Array.from({ length: PACE_MAX + 1 }, (_, i) => i);
    expect(sanitizePace({ circle: tooLong })).toEqual({});
    expect(sanitizePace({ circle: tooLong.slice(0, PACE_MAX) }).circle).toHaveLength(PACE_MAX);
  });
});
