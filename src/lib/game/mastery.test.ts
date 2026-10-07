import { beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { yesterdayKey } from './dates';
import { GameEngine } from './engine.svelte';
import { solveFromSpectrum } from './scoring';
import { evalAchievements } from './achievements';

describe('精通体系：完美全清与卡关提示', () => {
  let engine: GameEngine;
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* 测试环境可能没有 localStorage */
    }
    engine = new GameEngine();
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'circle')!);
  });

  it('全清（100%）记入完美；非全清不记', () => {
    const lv = engine.level!;
    // 用精确解参数跑一局完整旋转（复用几何审计的验证路径）
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    for (let i = 0; i < 1200; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.isPerfect).toBe(true);
    expect(engine.newPerfect).toBe(true);
    // 再次完美不再触发"首次"演出
    engine.resetRun();
    engine.startRun();
    for (let i = 0; i < 1200; i++) engine.advance(1 / 60);
    expect(engine.newPerfect).toBe(false);
  });

  it('卡关提示：连续 2 次 0 星后解锁', () => {
    expect(engine.hintUnlocked).toBe(false);
    engine.setArm(0, { r: 0 }); // 半径 0 → 收不到任何点
    engine.startRun();
    engine.stopRun();
    expect(engine.failCounts[engine.level!.id]).toBe(1);
    expect(engine.hintUnlocked).toBe(false);
    engine.resetRun();
    engine.startRun();
    engine.stopRun();
    expect(engine.hintUnlocked).toBe(true);
  });

  it('拿到星后卡关计数清零', () => {
    const lv = engine.level!;
    engine.setArm(0, { r: 0 });
    engine.startRun();
    engine.stopRun();
    engine.resetRun();
    // 精确解 → 拿星
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    for (let i = 0; i < 1200; i++) engine.advance(1 / 60);
    expect(engine.hintUnlocked).toBe(false);
  });

  it('精确解文本包含全部启用指针的参数', () => {
    const txt = engine.exactSolutionText();
    expect(txt).toContain('1×');
    expect(txt.length).toBeGreaterThan(4);
    // 相位应归一化到 [0,360)，不出现 360°
    expect(txt).not.toContain('360°');
  });

  it('精确解认证：参数等于精确分解时达成，偏差过大则不认证', () => {
    const lv = engine.level!;
    // 精确解参数 → 拟合度 100% → 认证
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    engine.stopRun();
    expect(engine.isExact).toBe(true);
    expect(engine.newExact).toBe(true);

    // 换到椭圆关并把半径调偏（仍能收点但参数不是精确解）
    const ell = LEVEL_DEFS.find((d) => d.id === 'ellipse')!;
    engine.loadLevel(ell);
    engine.setArm(0, { on: true, r: 60, freq: 1, phase: 0 });
    engine.startRun();
    engine.stopRun();
    expect(engine.exactLevels['ellipse']).toBeUndefined();
  });

  it('专家模式：全清记入专家认证，普通模式不记', () => {
    const lv = engine.level!;
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    // 专家模式开 → 全清 → 认证
    engine.expertMode = true;
    engine.startRun();
    for (let i = 0; i < 1200; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.isExpertClear).toBe(true);
    expect(engine.newExpertClear).toBe(true);

    // 普通模式在另一关全清 → 不记专家
    engine.expertMode = false;
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'ellipse')!);
    const lv2 = engine.level!;
    const sol2 = solveFromSpectrum(lv2.spectrum, lv2.armLimit);
    sol2.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    for (let i = 0; i < 1200; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.expertClears['ellipse']).toBeUndefined();
  });

  it('盲眼大师成就：全部关卡专家全清才解锁', () => {
    const base = {
      bestStars: {},
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
    };
    expect(evalAchievements({ ...base, expert: { circle: true } })).not.toContain('expert-all');
    const all: Record<string, true> = {};
    for (const d of LEVEL_DEFS) all[d.id] = true;
    expect(evalAchievements({ ...base, expert: all })).toContain('expert-all');
  });

  it('每日连胜：首次完成记 1，同日重复不累加，昨天完成则 +1', () => {
    engine.dailyStreak = { streak: 0, last: '' };
    // 首次完成今日挑战 → streak = 1
    engine.loadDaily();
    engine.startRun();
    engine.stopRun();
    expect(engine.dailyStreak.streak).toBe(1);
    expect(engine.streakJustBumped).toBe(1);

    // 同日再完成一次 → 不累加
    engine.resetRun();
    engine.startRun();
    engine.stopRun();
    expect(engine.dailyStreak.streak).toBe(1);

    // 模拟"昨天完成过" → 今天完成累加到 2
    engine.dailyStreak = { streak: 1, last: yesterdayKey() };
    engine.resetRun();
    engine.startRun();
    engine.stopRun();
    expect(engine.dailyStreak.streak).toBe(2);
    expect(engine.streakJustBumped).toBe(2);
  });

  it('连胜成就：flags.streak7 解锁"日拱一卒"', () => {
    const base = {
      bestStars: {},
      bestScores: {},
      bestClears: {},
      levelCount: LEVEL_DEFS.length,
    };
    expect(evalAchievements({ ...base, flags: {} })).not.toContain('streak-7');
    expect(evalAchievements({ ...base, flags: { streak7: true } })).toContain('streak-7');
  });

  it('精确分解成就：全部关卡认证才解锁', () => {
    const base = {
      bestStars: {},
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
    };
    expect(evalAchievements({ ...base, exact: { circle: true } })).not.toContain('exact-award');
    const all: Record<string, true> = {};
    for (const d of LEVEL_DEFS) all[d.id] = true;
    expect(evalAchievements({ ...base, exact: all })).toContain('exact-award');
  });

  it('完美主义成就：全部内置关卡完美才解锁', () => {
    const base = {
      bestStars: {},
      bestScores: {},
      bestClears: {},
      flags: {},
      levelCount: LEVEL_DEFS.length,
    };
    const partial: Record<string, true> = { circle: true };
    expect(evalAchievements({ ...base, perfect: partial })).not.toContain('all-perfect');
    const all: Record<string, true> = {};
    for (const d of LEVEL_DEFS) all[d.id] = true;
    expect(evalAchievements({ ...base, perfect: all })).toContain('all-perfect');
  });
});
