import { beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { GameEngine } from './engine.svelte';

describe('自动拟合与手动操作共存', () => {
  let engine: GameEngine;
  beforeEach(() => {
    engine = new GameEngine();
    // 三叶草关：armLimit=2，精确解为 4× 与 −2×（负频率）
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'clover')!);
    engine.enterSandbox();
  });

  it('拟合中用户改动参与位 → 该位退出拟合保留用户值，其余位继续到位', () => {
    // 用户先手动启用 ②（freq 2）作为自己的起点之一
    engine.setArm(1, { on: true, r: 60, freq: 2, phase: 0 });
    engine.startAutoSolve();
    expect(engine.autoSolve).toBe(true);

    // 拟合中用户改动参与位 ①（r=120→50）
    engine.setArm(0, { r: 50 });

    // 推进拟合到结束（2 秒动画 → 2s/2=1s 逻辑，用 240 帧 × dt 覆盖并留余量）
    for (let i = 0; i < 240; i++) engine.advance(1 / 60);
    expect(engine.autoSolve).toBe(false);

    // 用户改过的位保持用户值（不被插值覆盖回目标）
    expect(engine.arms[0].r).toBe(50);
    // 其余拟合到位：三叶草精确解的 −2× 与 4×（DFT 幅值经归一化缩放）至少一根启用且半径非零
    const fitted = engine.arms.slice(1).filter((a) => a.on && a.r > 30);
    expect(fitted.length).toBeGreaterThanOrEqual(1);
  });

  it('拟合中切关自动取消（不污染新关参数）', () => {
    engine.startAutoSolve();
    expect(engine.autoSolve).toBe(true);
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'circle')!);
    expect(engine.autoSolve).toBe(false);
  });

  it('退出沙盒自动取消拟合', () => {
    engine.startAutoSolve();
    engine.exitSandbox();
    expect(engine.autoSolve).toBe(false);
  });

  it('拟合中启用新指针正常生效（非参与位不受影响）', () => {
    engine.startAutoSolve();
    const before = engine.arms[5];
    engine.setArm(5, { on: true, r: 33, freq: 5, phase: 0 });
    expect(engine.arms[5].on).toBe(true);
    expect(engine.arms[5].r).toBe(33);
    void before;
  });
});
