import { beforeEach, describe, expect, it } from 'vitest';
import { __setAudioGraphForTests, setMusicSuspended, updateMusic, type AmbientBus } from './music';
import type { Arm } from './types';

/**
 * 假 AudioContext：统计创建的振荡器数与 suspend/resume 调用。
 * 新语义下 updateMusic **不再建任何持续振荡器**（常鸣 = 嗡鸣的根源），
 * 只更新快照与总线响度；指针出声由排程器的风铃脉冲负责。
 */
function fakeContext() {
  const calls: string[] = [];
  let oscCount = 0;
  const mkParam = () => ({
    value: 0,
    setTargetAtTime: () => {},
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    cancelScheduledValues: () => {},
  });
  const ac = {
    currentTime: 100,
    createOscillator: () => {
      oscCount++;
      return {
        type: 'sine',
        frequency: mkParam(),
        detune: mkParam(),
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    },
    createGain: () => ({ gain: mkParam(), connect: () => {} }),
    createStereoPanner: () => ({ pan: mkParam(), connect: () => {} }),
    suspend: () => {
      calls.push('suspend');
    },
    resume: () => {
      calls.push('resume');
    },
    __oscCount: () => oscCount,
    __calls: () => calls,
  };
  return ac as unknown as BaseAudioContext & {
    __oscCount: () => number;
    __calls: () => string[];
  };
}

/** 可记录 master 包络调用的假总线 */
function fakeBus(record?: number[]): AmbientBus {
  const mkGain = () => ({
    gain: {
      value: 0,
      setTargetAtTime: (v: number) => record?.push(v),
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      cancelScheduledValues: () => {},
    },
    connect: () => {},
  });
  return { input: mkGain() as unknown as GainNode, master: mkGain() as unknown as GainNode };
}

const arms: Arm[] = [
  { on: true, r: 120, freq: 1, phase: 0 },
  { on: true, r: 90, freq: 2, phase: 1 },
];

describe('updateMusic：只更新快照，不建持续振荡器（常鸣 = 嗡鸣的根源）', () => {
  let ac1: ReturnType<typeof fakeContext>;

  beforeEach(() => {
    ac1 = fakeContext();
    __setAudioGraphForTests(ac1, fakeBus());
  });

  it('指针在转（voiced）也不创建任何振荡器，只更新总线响度', () => {
    const master: number[] = [];
    __setAudioGraphForTests(ac1, fakeBus(master));
    updateMusic(arms, 1, true, 0.5);
    expect(ac1.__oscCount()).toBe(0);
    expect(master.length).toBeGreaterThan(0);
    // 响度 = 0.34 × intensity × volume
    expect(master[0]).toBeCloseTo(0.34 * 1 * 0.5, 5);
  });

  it('静音与取消静音都只是包络变化，振荡器数恒为 0', () => {
    updateMusic(arms, 1, true, 0.5);
    updateMusic(arms, 1, false, 0.5);
    updateMusic(arms, 1, true, 0.5);
    expect(ac1.__oscCount()).toBe(0);
  });

  it('context 重建后快照逻辑照常工作（回归：音频图重建路径）', () => {
    updateMusic(arms, 1, true, 0.5);
    const ac2 = fakeContext();
    const master: number[] = [];
    __setAudioGraphForTests(ac2, fakeBus(master));
    updateMusic(arms, 1, true, 0.5);
    expect(ac2.__oscCount()).toBe(0);
    expect(master.length).toBeGreaterThan(0);
  });
});

describe('setMusicSuspended：页面挂起/恢复的委托', () => {
  it('挂起调 ctx.suspend，恢复调 ctx.resume', () => {
    const ac = fakeContext();
    __setAudioGraphForTests(ac, fakeBus());
    updateMusic(arms, 1, true, 0.5);
    setMusicSuspended(true);
    setMusicSuspended(false);
    expect(ac.__calls()).toEqual(['suspend', 'resume']);
  });

  it('没有音频图时（未获得手势）挂起/恢复是安全的空操作', () => {
    expect(() => {
      setMusicSuspended(true);
      setMusicSuspended(false);
    }).not.toThrow();
  });
});
