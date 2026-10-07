import { describe, expect, it } from 'vitest';
import {
  armToVoice,
  armsToVoices,
  CHAPTER_KEYS,
  DEFAULT_KEY,
  DETUNE_CENTS,
  keyForChapter,
  keyForLevel,
  HARMONIC_ROLLOFF,
  harmonicRolloff,
  MAX_HARMONIC,
  nextNoteDelay,
  ROOT_HZ,
  scaleNotes,
  musicIntensity,
} from './harmony';
import { CHAPTERS, LEVEL_DEFS } from './levels';
import { PENTATONIC } from './constants';
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
    const big = armToVoice(arm({ r: 170 }), 0)!;
    const huge = armToVoice(arm({ r: 100000 }), 0)!;
    expect(small.gain).toBeLessThan(mid.gain);
    expect(mid.gain).toBeLessThan(big.gain);
    expect(huge.gain).toBe(big.gain); // 半径饱和后不再增长
    expect(small.gain).toBeGreaterThan(0);
    expect(huge.gain).toBeLessThanOrEqual(0.25);
  });

  it('高次谐波按 1/(1+0.15(k-1)) 衰减：越高的泛音越轻，不刺耳', () => {
    const g1 = armToVoice(arm({ r: 120, freq: 1 }), 0)!.gain;
    const g4 = armToVoice(arm({ r: 120, freq: 4 }), 0)!.gain;
    const g10 = armToVoice(arm({ r: 120, freq: 10 }), 0)!.gain;
    expect(harmonicRolloff(1)).toBe(1);
    expect(harmonicRolloff(2)).toBeCloseTo(1 / (1 + HARMONIC_ROLLOFF), 10);
    expect(g1).toBeGreaterThan(g4);
    expect(g4).toBeGreaterThan(g10);
    // 10× 分量只剩基频的四成左右——这是"不刺耳"的关键
    expect(g10 / g1).toBeLessThan(0.45);
    // 同一半径下，频率越高越轻（正负频一致）
    expect(armToVoice(arm({ r: 120, freq: -10 }), 0)!.gain).toBeCloseTo(g10, 10);
    // 单调下降
    for (let k = 2; k <= MAX_HARMONIC; k++) {
      expect(harmonicRolloff(k)).toBeLessThan(harmonicRolloff(k - 1));
    }
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

  it('根音可换（章节转调）：声部频率 = 根音 × 谐波次数', () => {
    const summit = CHAPTER_KEYS.summit.root;
    expect(armToVoice(arm({ freq: 1 }), 0, summit)?.freq).toBeCloseTo(summit, 5);
    expect(armToVoice(arm({ freq: 3 }), 0, summit)?.freq).toBeCloseTo(summit * 3, 5);
    expect(armsToVoices([arm({ freq: 2 })], summit)[0].freq).toBeCloseTo(summit * 2, 5);
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

describe('章节调性', () => {
  it('每个章节都有自己的调性，且根音各不相同', () => {
    const roots = CHAPTERS.map((c) => keyForChapter(c.id).root);
    expect(roots).toHaveLength(CHAPTERS.length);
    expect(new Set(roots).size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) {
      expect(CHAPTER_KEYS[c.id]).toBeTruthy();
      expect(keyForChapter(c.id).name.length).toBeGreaterThan(0);
    }
  });

  it('未知章节 / 无章节回落默认调性', () => {
    expect(keyForChapter()).toBe(DEFAULT_KEY);
    expect(keyForChapter('nope')).toBe(DEFAULT_KEY);
    expect(keyForLevel(null)).toBe(DEFAULT_KEY);
  });

  it('关卡调性：内置关跟章节，随机关按 id 稳定散列', () => {
    expect(keyForLevel({ id: 'heart', chapter: 'summit' })).toBe(CHAPTER_KEYS.summit);
    expect(keyForLevel({ id: 'circle', chapter: 'basics' })).toBe(CHAPTER_KEYS.basics);
    // 同一邀请码每次进来都是同一个调
    const a = keyForLevel({ id: 'random-123456' });
    const b = keyForLevel({ id: 'random-123456' });
    expect(a).toBe(b);
    expect(Object.values(CHAPTER_KEYS)).toContain(a);
  });

  it('章节调性覆盖了全部内置关卡（不会出现无调性关卡）', () => {
    for (const d of LEVEL_DEFS) {
      expect(CHAPTER_KEYS[d.chapter]).toBeTruthy();
    }
  });
});

describe('nextNoteDelay（探索环境音的疏密）', () => {
  it('间隔落在合理区间：0.7~1.5 倍基准，不会密成连音也不会空到失联', () => {
    // 2026-10 放宽：环境音改得更稀（留白更长），上限从 11s 提到 17s
    for (const intensity of [0, 0.45, 0.55, 0.7, 1]) {
      for (const rnd of [0, 0.25, 0.5, 0.75, 0.999]) {
        const d = nextNoteDelay(rnd, intensity);
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThanOrEqual(17);
      }
    }
  });

  it('越投入越密：运行态的平均间隔明显小于编辑态', () => {
    const avg = (intensity: number): number => {
      let sum = 0;
      for (let i = 0; i < 20; i++) sum += nextNoteDelay(i / 20, intensity);
      return sum / 20;
    };
    const edit = avg(0.55);
    const running = avg(1);
    expect(running).toBeLessThan(edit);
    expect(edit / running).toBeGreaterThan(1.2);
  });

  it('输入越界（负强度 / rnd > 1）不会产生负间隔', () => {
    expect(nextNoteDelay(-5, -1)).toBeGreaterThan(0);
    expect(nextNoteDelay(2, 2)).toBeGreaterThan(0);
  });
});

describe('scaleNotes', () => {
  it('默认调性的音阶与旧的 PENTATONIC 常量一致（听感不变）', () => {
    const notes = scaleNotes();
    expect(notes).toHaveLength(PENTATONIC.length);
    notes.forEach((n, i) => expect(Math.abs(n - PENTATONIC[i])).toBeLessThan(0.5));
  });

  it('音阶升序、落在合理音域内', () => {
    for (const key of Object.values(CHAPTER_KEYS)) {
      const notes = scaleNotes(key, 11);
      expect(notes).toHaveLength(11);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i]).toBeGreaterThan(notes[i - 1]);
      }
      expect(notes[0]).toBeCloseTo(key.root * 2, 2);
      expect(notes[notes.length - 1]).toBeLessThan(1600);
    }
  });

  it('可以生成更短的音阶（自动拟合的 5 个上行音）', () => {
    const five = scaleNotes(CHAPTER_KEYS.summit, 5);
    expect(five).toHaveLength(5);
    expect(five[0]).toBeCloseTo(CHAPTER_KEYS.summit.root * 2, 2);
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
