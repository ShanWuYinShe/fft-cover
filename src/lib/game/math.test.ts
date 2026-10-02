import { describe, expect, it } from 'vitest';
import { SIZE, T0 } from './constants';
import { armAngle, buildPoints, chainAt, resample, tipAt } from './math';
import type { Arm, Vec } from './types';

describe('resample', () => {
  it('沿正方形边均匀取点，首点在起点', () => {
    const square: Vec[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 0 },
    ];
    // 闭曲线撒点语义：间隔 = 周长/n = 400/5 = 80，不含重复终点
    const out = resample(square, 5);
    expect(out).toHaveLength(5);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[1].x).toBeCloseTo(80, 5);
    expect(out[1].y).toBeCloseTo(0, 5);
    expect(out[2].x).toBeCloseTo(100, 5);
    expect(out[2].y).toBeCloseTo(60, 5);
  });
});

describe('chainAt / tipAt', () => {
  it('单根指针 t=0 时指向 +x 方向', () => {
    const arms: Arm[] = [{ on: true, r: 120, freq: 1, phase: 0 }];
    const tip = tipAt(arms, 0);
    expect(tip.x).toBeCloseTo(SIZE / 2 + 120, 5);
    expect(tip.y).toBeCloseTo(SIZE / 2, 5);
  });

  it('单根 1× 指针在四分之一周期转到 +y 方向', () => {
    const arms: Arm[] = [{ on: true, r: 120, freq: 1, phase: 0 }];
    const tip = tipAt(arms, T0 / 4);
    expect(tip.x).toBeCloseTo(SIZE / 2, 5);
    expect(tip.y).toBeCloseTo(SIZE / 2 + 120, 5);
  });

  it('双臂首尾相连：尖端 = 中心 + 各向量之和', () => {
    const arms: Arm[] = [
      { on: true, r: 100, freq: 1, phase: 0 },
      { on: true, r: 50, freq: 2, phase: 0 },
    ];
    const tip = tipAt(arms, 0);
    expect(tip.x).toBeCloseTo(SIZE / 2 + 150, 5);
  });

  it('负频率指针反向旋转', () => {
    const pos: Arm = { on: true, r: 100, freq: 1, phase: 0 };
    const neg: Arm = { on: true, r: 100, freq: -1, phase: 0 };
    const t = T0 / 4;
    expect(armAngle(pos, t)).toBeCloseTo(Math.PI / 2, 5);
    expect(armAngle(neg, t)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('禁用的指针不参与链', () => {
    const arms: Arm[] = [
      { on: false, r: 100, freq: 1, phase: 0 },
      { on: true, r: 30, freq: 1, phase: 0 },
    ];
    const joints = chainAt(arms, 0);
    expect(joints).toHaveLength(2); // 起点 + 1 根启用指针
    expect(joints[1].x).toBeCloseTo(SIZE / 2 + 30, 5);
  });
});

describe('buildPoints', () => {
  it('圆归一化后点半径一致且位于画布中心', () => {
    const pts = buildPoints((t) => ({ x: 200 * Math.cos(t), y: 200 * Math.sin(t) }), 24);
    expect(pts).toHaveLength(24);
    for (const p of pts) {
      const r = Math.hypot(p.x - SIZE / 2, p.y - SIZE / 2);
      expect(r).toBeCloseTo(120, 1); // 240/400 * 200
    }
  });
});
