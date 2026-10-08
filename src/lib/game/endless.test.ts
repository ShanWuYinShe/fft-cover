import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { ENDLESS_KEY, RUN_DUR } from './constants';
import { GameEngine } from './engine.svelte';

/** 内存 Storage 实现（Node 环境没有 localStorage） */
function memStore(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

/** 按帧推进一整局（精确解参数应收集全部点），返回引擎是否在局内自动结算 */
function runFull(e: GameEngine): void {
  e.startRun();
  const frames = 600;
  for (let i = 0; i < frames; i++) {
    e.advance(RUN_DUR / frames);
    if (e.phase === 'done') return;
  }
}

describe('无尽挑战', () => {
  let original: PropertyDescriptor | undefined;

  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: memStore(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('开局：第 1 波是简单档随机关，进入无尽模式', () => {
    const e = new GameEngine();
    e.startEndless();
    expect(e.endless).toBe(true);
    expect(e.endlessWave).toBe(1);
    expect(e.endlessScore).toBe(0);
    expect(e.level?.random).toBe(true);
    expect(e.phase).toBe('edit');
  });

  it('存活：精确解跑完一波 → 过波奖励入账，下一波难度不变档、波次 +1', () => {
    const e = new GameEngine();
    e.startEndless();
    e.applyExactSolution();
    const level1 = e.level?.id;
    runFull(e);
    expect(e.phase).toBe('done');
    expect(e.endlessSurvived).toBe(true);
    expect(e.collectedCount).toBe(e.total);
    // 过波奖励 = 波次 × 500
    expect(e.endlessScore).toBe(e.score + 500);
    e.nextEndlessWave();
    expect(e.endlessWave).toBe(2);
    expect(e.endless).toBe(true);
    expect(e.phase).toBe('edit');
    expect(e.level?.id).not.toBe(level1);
  });

  it('失败：一局 0 收集 → 挑战结束，历史最佳落盘且新实例可读', () => {
    const e = new GameEngine();
    e.startEndless();
    e.startRun();
    e.stopRun(); // 立刻停：0 收集
    expect(e.phase).toBe('done');
    expect(e.endlessSurvived).toBe(false);
    expect(e.endlessBest.wave).toBe(1);
    expect(localStorage.getItem(ENDLESS_KEY)).toBeTruthy();
    const next = new GameEngine();
    expect(next.endlessBest).toEqual({ wave: 1, score: 0 });
  });

  it('最佳口径：先比波次，同波次才比累计分', () => {
    // 手工落一份"高波次低分"的旧纪录（先落盘，再让引擎读进字段）
    localStorage.setItem(ENDLESS_KEY, JSON.stringify({ wave: 5, score: 100 }));
    const e = new GameEngine();
    e.startEndless();
    e.startRun();
    e.stopRun();
    // 第 1 波失败不会覆盖第 5 波的纪录
    expect(e.endlessBest).toEqual({ wave: 5, score: 100 });
  });

  it('波次成绩不写各关档案：星级/最佳分/历史都不受无尽波次污染', () => {
    const e = new GameEngine();
    e.startEndless();
    e.applyExactSolution();
    runFull(e);
    const id = e.level?.id ?? '';
    expect(e.bestStars[id]).toBeUndefined();
    expect(e.bestScores[id]).toBeUndefined();
    expect(e.history[id]).toBeUndefined();
  });

  it('载入任何常规关卡都会退出无尽模式', () => {
    const e = new GameEngine();
    e.startEndless();
    expect(e.endless).toBe(true);
    e.loadLevel(LEVEL_DEFS[0]!);
    expect(e.endless).toBe(false);
    expect(e.endlessWave).toBe(0);
  });

  it('exitEndless：回到普通模式并复位对局', () => {
    const e = new GameEngine();
    e.startEndless();
    e.startRun();
    e.exitEndless();
    expect(e.endless).toBe(false);
    expect(e.phase).toBe('edit');
    expect(e.collectedCount).toBe(0);
  });
});
