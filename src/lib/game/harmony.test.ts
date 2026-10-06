import { describe, expect, it } from 'vitest';
import {
  armToVoice,
  armsToVoices,
  DETUNE_CENTS,
  MAX_HARMONIC,
  ROOT_HZ,
  musicIntensity,
} from './harmony';
import type { Arm } from './types';

const arm = (patch: Partial<Arm> = {}): Arm => ({ on: true, r: 120, freq: 1, phase: 0, ...patch });

describe('armToVoice', () => {
  it('未启用或半径 ≤ 0 的指针不发声', () => {
    expect(armToVoice(arm({ on: false }), 0)).toBeNull();
    expect(armToVoice(arm({ r: 0 }), 0)).toBeNull();
    expect(armToVoice(arm({ r: -5 }), 0)).toBeNull();
  });

  it('频率 k 落在第 k 次谐波上（1× 根音、2× 八度、3× 十二度）', () => {
    expect(armToVoice(arm({ freq: 1 }), 0)?.freq).toBeCloseTo(ROOT_HZ, 5);
    expect(armToVoice(arm({ freq: 2 }), 0)?.freq).toBeCloseTo(ROOT_HZ * 2, 5);
    expect(armToVoice(arm({ freq: 3 }), 0)?.freq).toBeCloseTo(ROOT_HZ * 3, 5);
  });

  it('负频率（反转）音高与正频率相同，但失谐方向相反', () => {
    const pos = armToVoice(arm({ freq: 2 }), 0)!;
    const neg = armToVoice(arm({ freq: -2 }), 0)!;
    expect(neg.freq).toBeCloseTo(pos.freq, 5);
    expect(pos.detune).toBe(DETUNE_CENTS);
    expect(neg.detune).toBe(-DETUNE_CENTS);
    // 一升一降构成拍音，这正是 ±k 频率对可听见的原因
    expect(pos.detune + neg.detune).toBe(0);
  });

  it('谐波次数被限制在 1..MAX_HARMONIC（不会推出刺耳音区）', () => {
    expect(armToVoice(arm({ freq: 0 }), 0)?.freq).toBeCloseTo(ROOT_HZ, 5);
    expect(armToVoice(arm({ freq: 99 }), 0)?.freq).toBeCloseTo(ROOT_HZ * MAX_HARMONIC, 5);
    expect(armToVoice(arm({ freq: -99 }), 0)?.freq).toBeCloseTo(ROOT_HZ * MAX_HARMONIC, 5);
  });

  it('半径越大越响，且始终落在安全区间内', () => {
    const small = armToVoice(arm({ r: 1 }), 0)!;
    const mid = armToVoice(arm({ r: 85 }), 0)!;
    const big = armToVoice(arm({ r: 170, freq: 2 }), 0)!;
    const huge = armToVoice(arm({ r: 100000, freq: 3 }), 0)!;
    expect(small.gain).toBeLessThan(mid.gain);
    expect(mid.gain).toBeLessThan(big.gain);
    expect(huge.gain).toBe(big.gain);
    expect(small.gain).toBeGreaterThan(0);
    expect(huge.gain).toBeLessThanOrEqual(0.25);
  });

  it('相位映射到声像 [-1, 1]（0 居中、π/2 全右）', () => {
    expect(armToVoice(arm({ phase: 0 }), 0)?.pan).toBeCloseTo(0, 6);
    expect(armToVoice(arm({ phase: Math.PI / 2 }), 0)?.pan).toBeCloseTo(1, 6);
    expect(armToVoice(arm({ phase: -Math.PI / 2 }), 0)?.pan).toBeCloseTo(-1, 6);
    for (const phase of [0.3, 1.7, 3.9, 5.5, 9.1]) {
      const pan = armToVoice(arm({ phase }), 0)!.pan;
      expect(pan).toBeGreaterThanOrEqual(-1);
      expect(pan).toBeLessThanOrEqual(1);
    }
  });

  it('保留指针序号，供实时混音复用同一组振荡器', () => {
    expect(armToVoice(arm(), 7)?.index).toBe(7);
  });
});

describe('armsToVoices', () => {
  it('只取启用中的指针，且保持原序号', () => {
    const arms = [
      arm({ on: true, freq: 1 }),
      arm({ on: false, freq: 2 }),
      arm({ on: true, freq: -2 }),
    ];
    const voices = armsToVoices(arms);
    expect(voices.map((v) => v.index)).toEqual([0, 2]);
    expect(voices.map((v) => v.freq)).toEqual([ROOT_HZ, ROOT_HZ * 2]);
  });

  it('全关（指针上限为 1 的圆关清零后）→ 无声部，只剩垫音', () => {
    expect(armsToVoices([arm({ on: false }), arm({ on: false })])).toEqual([]);
  });

  it('满配 10 根指针 → 至多 10 个声部', () => {
    const arms = Array.from({ length: 10 }, (_, i) => arm({ freq: i + 1, phase: i }));
    expect(armsToVoices(arms)).toHaveLength(10);
  });
});

describe('musicIntensity', () => {
  it('旋转时最饱满，暂停时退到背景', () => {
    expect(musicIntensity('running', false)).toBe(1);
    expect(musicIntensity('paused', false)).toBeLessThan(musicIntensity('edit', false));
    expect(musicIntensity('done', false)).toBeGreaterThan(musicIntensity('edit', false));
    expect(musicIntensity('edit', false)).toBeGreaterThan(0);
  });

  it('沙盒不设时长但更松弛', () => {
    expect(musicIntensity('running', true)).toBeLessThan(musicIntensity('running', false));
  });
});
