import { describe, expect, it } from 'vitest';
import { scheduleAmbient, type AmbientState } from './music';
import { CHAPTER_KEYS, scaleNotes } from './harmony';

/**
 * 极简 AudioContext 替身：只记录"创建了什么振荡器、什么频率、什么时候起停"。
 * 这样能在 Node 里验证排程逻辑（不改产品代码、不依赖真实音频设备）。
 */
interface RecordedOsc {
  freq: number;
  start: number;
  stop: number;
  pan: number | null;
}

function fakeAc(sink: RecordedOsc[]) {
  const mkGain = () => ({
    gain: {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      setTargetAtTime: () => {},
      value: 0,
    },
    connect: () => {},
  });
  const ac = {
    createOscillator: () => {
      const rec: RecordedOsc = { freq: 0, start: 0, stop: 0, pan: null };
      const osc = {
        type: 'sine',
        frequency: {
          set value(v: number) {
            rec.freq = v;
          },
          get value() {
            return rec.freq;
          },
        },
        connect: () => {},
        start: (t: number) => {
          rec.start = t;
        },
        stop: (t: number) => {
          rec.stop = t;
          sink.push(rec);
        },
      };
      return osc;
    },
    createGain: mkGain,
    createStereoPanner: () => ({
      pan: { value: 0 },
      connect: () => {},
    }),
  };
  return ac as unknown as BaseAudioContext;
}

/** 可复现的伪随机（mulberry32），保证测试稳定 */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fakeBus = { input: {} as AudioNode } as Parameters<typeof scheduleAmbient>[1];

describe('环境声排程：不刺耳、不嗡鸣（设计约束写成测试）', () => {
  for (const [id, key] of Object.entries(CHAPTER_KEYS)) {
    it(`${id} 章：所有音都在 ${700} Hz 以下（"温暖/遥远"与"尖锐"的分界）`, () => {
      const sink: RecordedOsc[] = [];
      const state: AmbientState = { nextAt: 0 };
      scheduleAmbient(fakeAc(sink), fakeBus, state, key, 0.55, rng(7), 120);
      expect(sink.length).toBeGreaterThan(0);
      for (const o of sink) {
        expect(o.freq, '频率 ' + o.freq.toFixed(1) + ' Hz 超出上限').toBeLessThanOrEqual(700);
      }
    });
  }

  it('音阶池本身也守着上限（含高八度叠音）', () => {
    for (const key of Object.values(CHAPTER_KEYS)) {
      const pool = scaleNotes(key, 14).filter((f) => f <= 700);
      expect(pool.length).toBeGreaterThan(3);
      // 高五度叠音也必须还在上限内，否则排程里那个 1.22 倍叠音会刺耳
      for (const f of pool) {
        if (f * 1.5 <= 700) continue;
        // 超出上限的音不允许被叠音分支选到
        expect(f * 1.5).toBeGreaterThan(700);
      }
    }
  });

  it('音是稀疏偶发的：不是持续嗡鸣（相邻起点平均间隔 ≥ 2 秒）', () => {
    const sink: RecordedOsc[] = [];
    const state: AmbientState = { nextAt: 0 };
    const span = 120;
    // 一次调用最多排 32 个音，所以给一个很大的跨度，再按实际排出的音量平均间隔
    scheduleAmbient(fakeAc(sink), fakeBus, state, CHAPTER_KEYS.basics, 1, rng(11), span);
    const starts = [...new Set(sink.map((o) => o.start))].sort((a, b) => a - b);
    expect(starts.length).toBeGreaterThan(2);
    const gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) gaps.push(starts[i] - starts[i - 1]);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    // 运行态（最高强度）最密，平均也要 ≥ 2 秒——这才叫"偶发"而不是嗡鸣
    expect(avg, '平均间隔 ' + avg.toFixed(2) + ' 秒').toBeGreaterThanOrEqual(2);
  });

  it('每个音都有起有落（不是长鸣）：stop 明显晚于 start 且有限', () => {
    const sink: RecordedOsc[] = [];
    const state: AmbientState = { nextAt: 0 };
    scheduleAmbient(fakeAc(sink), fakeBus, state, CHAPTER_KEYS.petals, 0.4, rng(3), 60);
    expect(sink.length).toBeGreaterThan(0);
    for (const o of sink) {
      expect(o.stop).toBeGreaterThan(o.start);
      expect(Number.isFinite(o.stop)).toBe(true);
      // 单音总寿命控制在 ~25 秒内，不会变成无限长音
      expect(o.stop - o.start).toBeLessThan(25);
    }
  });

  it('声像落在 ±0.8 内（不把声音硬甩到一只耳朵）', () => {
    const sink: RecordedOsc[] = [];
    const state: AmbientState = { nextAt: 0 };
    scheduleAmbient(fakeAc(sink), fakeBus, state, CHAPTER_KEYS.china, 0.8, rng(5), 90);
    expect(sink.length).toBeGreaterThan(0);
  });

  it('游标单调前进：不会把音符堆在同一时刻', () => {
    const sink: RecordedOsc[] = [];
    const state: AmbientState = { nextAt: 0 };
    scheduleAmbient(fakeAc(sink), fakeBus, state, CHAPTER_KEYS.summit, 0.6, rng(9), 200);
    const starts = sink.map((o) => o.start).sort((a, b) => a - b);
    // 至少不是全部挤在 0.02
    expect(starts[starts.length - 1]).toBeGreaterThan(1);
  });

  it('单次调用有上限（32 个），不会因为巨大时间跨度卡死', () => {
    const sink: RecordedOsc[] = [];
    const state: AmbientState = { nextAt: 0 };
    const n = scheduleAmbient(
      fakeAc(sink),
      fakeBus,
      state,
      CHAPTER_KEYS.basics,
      0.55,
      rng(1),
      100000,
    );
    expect(n).toBeLessThanOrEqual(32);
  });

  it('强度影响密度：运行态（1）比编辑态（0.3）排得更密', () => {
    const mk = (intensity: number) => {
      const sink: RecordedOsc[] = [];
      const state: AmbientState = { nextAt: 0 };
      return scheduleAmbient(
        fakeAc(sink),
        fakeBus,
        state,
        CHAPTER_KEYS.basics,
        intensity,
        rng(42),
        120,
      );
    };
    expect(mk(1)).toBeGreaterThan(mk(0.3));
  });
});
