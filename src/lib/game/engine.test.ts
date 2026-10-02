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

  it('切到上限更低的关卡时裁剪超出指针', () => {
    engine.loadLevel(LEVEL_DEFS[6]); // 心形上限 8
    engine.setArm(2, { on: true });
    engine.setArm(3, { on: true });
    engine.setArm(4, { on: true });
    engine.setArm(5, { on: true });
    expect(engine.arms.filter((a) => a.on)).toHaveLength(5); // 圆关裁剩 1 根 + 新启 4 根
    engine.loadLevel(LEVEL_DEFS[1]); // 椭圆上限 2
    expect(engine.arms.filter((a) => a.on)).toHaveLength(2);
  });
});
