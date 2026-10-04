import { beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { GameEngine } from './engine.svelte';
import { solveFromSpectrum } from './scoring';
import { evalAchievements } from './scoring';

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
