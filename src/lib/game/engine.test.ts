import { beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { GameEngine } from './engine.svelte';

describe('GameEngine', () => {
  let engine: GameEngine;
  beforeEach(() => {
    engine = new GameEngine();
  });

  it('初始为圆关、编辑态、指针按上限裁剪为 1 根', () => {
    expect(engine.level?.id).toBe('circle');
    expect(engine.phase).toBe('edit');
    expect(engine.level?.armLimit).toBe(1);
    expect(engine.arms.filter((a) => a.on)).toHaveLength(1); // 默认 2 根被裁到上限
  });

  it('指针启用受本关上限约束（圆关 1 根）', () => {
    expect(engine.level?.armLimit).toBe(1);
    engine.setArm(0, { on: false }); // 全关
    expect(engine.arms.filter((a) => a.on)).toHaveLength(0);
    engine.setArm(0, { on: true });
    expect(engine.canEnableMore()).toBe(false);
    engine.setArm(1, { on: true }); // 超限，应被拒绝
    expect(engine.arms.filter((a) => a.on)).toHaveLength(1);
  });

  it('连击计分：窗口内连收 combo 递增', () => {
    const pts = engine.level!.pts;
    engine.phase = 'running';
    expect(engine.tryCollect(pts[0])).toBe(true);
    expect(engine.score).toBe(100); // combo 0
    expect(engine.tryCollect(pts[1])).toBe(true);
    expect(engine.score).toBe(300); // combo 1 → +200
    expect(engine.tryCollect(pts[2])).toBe(true);
    expect(engine.score).toBe(600); // combo 2 → +300
  });

  it('重复收集同一无效（已收点跳过）', () => {
    const pts = engine.level!.pts;
    engine.phase = 'running';
    expect(engine.tryCollect(pts[0])).toBe(true);
    expect(engine.tryCollect(pts[0])).toBe(false);
    expect(engine.score).toBe(100);
  });

  it('stopRun 结算最佳分，resetRun 清零', () => {
    const pts = engine.level!.pts;
    engine.phase = 'running';
    engine.tryCollect(pts[0]);
    engine.tryCollect(pts[1]);
    engine.stopRun();
    expect(engine.phase).toBe('done');
    expect(engine.bestScore).toBeGreaterThanOrEqual(300);
    engine.resetRun();
    expect(engine.score).toBe(0);
    expect(engine.phase).toBe('edit');
    expect(engine.collectedCount).toBe(0);
  });

  it('沙盒模式：超时不自动结算，exitSandbox 不写最佳分', () => {
    engine.enterSandbox();
    expect(engine.sandbox).toBe(true);
    engine.setArm(0, { r: 120 });
    let frames = 0;
    while (engine.t < 16.5 && frames < 1200) {
      engine.advance(0.016);
      frames++;
    }
    expect(engine.t).toBeGreaterThan(16); // 已超过挑战模式时长
    expect(engine.phase).toBe('running'); // 沙盒不自动结算
    engine.exitSandbox();
    expect(engine.phase).toBe('done');
    expect(engine.sandbox).toBe(false);
    expect(engine.bestScore).toBe(0); // 沙盒成绩不写入
    expect(engine.newRecord).toBe(false);
  });

  it('loadRandomSeed 同码复现同一关卡', () => {
    engine.loadRandomSeed(42);
    const a = engine.level!.pts.map((p) => Math.round(p.x * 100));
    const nameA = engine.level!.name;
    engine.loadRandomSeed(42);
    const b = engine.level!.pts.map((p) => Math.round(p.x * 100));
    expect(a).toEqual(b);
    expect(engine.level!.name).toBe(nameA);
    expect(engine.level!.random).toBe(true);
  });

  it('随机化只作用于已启用指针，清零全部关闭', () => {
    engine.setArm(0, { r: 120 });
    engine.randomizeArms();
    const on = engine.arms.filter((a) => a.on);
    expect(on.length).toBeGreaterThan(0);
    expect(on.every((a) => a.r >= 30 && a.r <= 150)).toBe(true);
    engine.clearArms();
    expect(engine.arms.every((a) => !a.on)).toBe(true);
  });

  it('切到上限更低的关卡时裁剪超出指针', () => {
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'heart')!); // 心形上限 8
    engine.setArm(2, { on: true });
    engine.setArm(3, { on: true });
    engine.setArm(4, { on: true });
    engine.setArm(5, { on: true });
    expect(engine.arms.filter((a) => a.on)).toHaveLength(5); // 圆关裁剩 1 根 + 新启 4 根
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'ellipse')!); // 椭圆上限 2
    expect(engine.arms.filter((a) => a.on)).toHaveLength(2);
  });
});
