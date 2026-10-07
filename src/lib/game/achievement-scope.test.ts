import { describe, expect, it } from 'vitest';
import { evalAchievements } from './achievements';
import { LEVEL_DEFS } from './levels';

describe('成就判定：随机关/每日关不能冒充内置关进度（回归）', () => {
  const builtIn = LEVEL_DEFS.map((d) => d.id);

  it('只靠随机关三星，拿不到"全部内置关卡三星"与"半程大师"', () => {
    // 玩家只打了 18 局随机关，每局三星，内置关一颗星都没有
    const bestStars: Record<string, number> = {};
    for (let i = 0; i < LEVEL_DEFS.length; i++) bestStars['random-' + i] = 3;
    const got = evalAchievements({
      bestStars,
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
      builtInIds: builtIn,
    });
    expect(got).not.toContain('all-three');
    expect(got).not.toContain('half-stars');
  });

  it('随机关的完美全清/精确解同样不算内置关进度', () => {
    const perfect: Record<string, true> = {};
    const exact: Record<string, true> = {};
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      perfect['daily-2026-10-0' + (i % 10) + '-normal'] = true;
      exact['random-' + i] = true;
    }
    const got = evalAchievements({
      bestStars: {},
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
      perfect,
      exact,
      builtInIds: builtIn,
    });
    expect(got).not.toContain('all-perfect');
    expect(got).not.toContain('exact-award');
  });

  it('内置关打满仍然照常解锁（别把功能修坏）', () => {
    const bestStars: Record<string, number> = {};
    for (const id of builtIn) bestStars[id] = 3;
    const got = evalAchievements({
      bestStars,
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
      builtInIds: builtIn,
    });
    expect(got).toContain('all-three');
    expect(got).toContain('half-stars');
  });

  it('与关卡无关的成就（得分/速度/首星）仍然看任意关卡', () => {
    const got = evalAchievements({
      bestStars: { 'random-7': 2 },
      bestScores: { 'random-7': 42000 },
      bestClears: { 'random-7': 7 },
      flags: {},
      levelCount: LEVEL_DEFS.length,
      builtInIds: builtIn,
    });
    expect(got).toContain('first-star');
    expect(got).toContain('first-clear');
    expect(got).toContain('combo-king');
    expect(got).toContain('speed-demon');
  });
});
