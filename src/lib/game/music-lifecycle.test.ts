import { beforeEach, describe, expect, it } from 'vitest';
import { __setAudioGraphForTests, setMusicSuspended, updateMusic, type AmbientBus } from './music';
import type { Arm } from './types';

/**
 * 带"创建计数"的假 AudioContext：验证声部链生命周期与页面挂起/恢复。
 * 记录 suspend/resume 调用（visibilitychange 的委托路径）。
 * 注：每条声部链含 2 个振荡器（声部 + LFO 涨落），计数按 2 的倍数走。
 */
function fakeContext() {
  const calls: string[] = [];
  let oscCount = 0;
  const mkParam = (initial: number) => ({
    value: initial,
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
        frequency: mkParam(0),
        detune: mkParam(0),
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    },
    createGain: () => ({ gain: mkParam(0), connect: () => {} }),
    createStereoPanner: () => ({ pan: mkParam(0), connect: () => {} }),
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

function fakeBus(): AmbientBus {
  const mkGain = () => ({
    gain: {
      value: 0,
      setTargetAtTime: () => {},
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

describe('updateMusic 声部链生命周期', () => {
  let ac1: ReturnType<typeof fakeContext>;

  beforeEach(() => {
    ac1 = fakeContext();
    __setAudioGraphForTests(ac1, fakeBus());
  });

  it('有声部时建链（4 = 2 链 × 2 振荡器）；静音释放；取消静音重建', () => {
    updateMusic(arms, 1, true, 0.5);
    expect(ac1.__oscCount()).toBe(4);

    updateMusic(arms, 1, false, 0.5); // 静音：释放全部（不新建）
    expect(ac1.__oscCount()).toBe(4);
    updateMusic(arms, 1, true, 0.5); // 取消静音：重建 2 条链
    expect(ac1.__oscCount()).toBe(8);
  });

  it('同一 context 内的参数微调复用已有链，不再新建振荡器', () => {
    updateMusic(arms, 1, true, 0.5);
    expect(ac1.__oscCount()).toBe(4);
    // 半径变了 → 只更新参数（setTargetAtTime），不新建
    updateMusic(
      [
        { ...arms[0], r: 100 },
        { ...arms[1], r: 80 },
      ],
      1,
      true,
      0.5,
    );
    expect(ac1.__oscCount()).toBe(4);
  });

  it('context 重建后声部链能重新建出来（回归：stale chains 让音乐永久消失）', () => {
    updateMusic(arms, 1, true, 0.5);
    expect(ac1.__oscCount()).toBe(4);

    // 模拟 startMusic 重建音频图：换上新 context（测试钩子与重建做同样的 chains.clear）
    const ac2 = fakeContext();
    __setAudioGraphForTests(ac2, fakeBus());
    updateMusic(arms, 1, true, 0.5);

    // 修复前：chains 里是旧 context 的链，updateMusic 命中"已有链"只改参数，
    // 新 context 一个振荡器都不建 → 音乐永久消失
    expect(ac2.__oscCount()).toBe(4);
  });
});

describe('setMusicSuspended：页面挂起/恢复的委托', () => {
  it('挂起调 ctx.suspend，恢复调 ctx.resume，且不破坏已建声部', () => {
    const ac = fakeContext();
    __setAudioGraphForTests(ac, fakeBus());
    updateMusic(arms, 1, true, 0.5);
    expect(ac.__oscCount()).toBe(4);

    setMusicSuspended(true);
    setMusicSuspended(false);
    expect(ac.__calls()).toEqual(['suspend', 'resume']);
    // 声部链不因挂起/恢复被破坏（再次 updateMusic 不重建）
    updateMusic(arms, 1, true, 0.5);
    expect(ac.__oscCount()).toBe(4);
  });

  it('没有音频图时（未获得手势）挂起/恢复是安全的空操作', () => {
    expect(() => {
      setMusicSuspended(true);
      setMusicSuspended(false);
    }).not.toThrow();
  });
});
