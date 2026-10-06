import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEVEL_DEFS, todayKey, yesterdayKey } from './levels';
import { LAST_LEVEL_KEY } from './constants';
import { GameEngine } from './engine.svelte';
import { solveFromSpectrum } from './scoring';

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

describe('续玩：记住上次关卡', () => {
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

  it('新实例从上次那一关开始（内置关）', () => {
    const first = new GameEngine();
    expect(first.level?.id).toBe('circle');
    first.loadLevel(LEVEL_DEFS.find((d) => d.id === 'heart')!);
    expect(localStorage.getItem(LAST_LEVEL_KEY)).toBe('heart');
    const next = new GameEngine();
    expect(next.level?.id).toBe('heart');
  });

  it('随机关按邀请码复现，每日挑战按今天重建', () => {
    const e = new GameEngine();
    e.loadRandomSeed(4242);
    const random = new GameEngine();
    expect(random.level?.id).toBe('random-4242');
    expect(random.level?.random).toBe(true);

    e.loadDaily();
    const daily = new GameEngine();
    expect(daily.level?.id.startsWith('daily-')).toBe(true);
  });

  it('创作关无法复现 → 不记住，回落第一关', () => {
    const e = new GameEngine();
    e.loadCustomLevel([{ k: 1, mag: 100, phase: 0 }], '测试关');
    const next = new GameEngine();
    expect(next.level?.id).toBe('circle');
    // 也不该把创作关写进"上次关卡"
    expect(localStorage.getItem(LAST_LEVEL_KEY)).not.toContain('custom-');
  });
});

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

  it('结算记下本局新盖的朱印，第二次达成不再重复盖', () => {
    const pts = engine.level!.pts;
    engine.setArm(0, { on: true, r: 120, freq: 1, phase: 0 });
    engine.phase = 'running';
    for (const p of pts) engine.tryCollect(p);
    engine.stopRun();
    expect(engine.newSeals).toContain('stars');
    expect(engine.newSeals).toContain('perfect');
    // 同一关再拿同样的成绩：没有新印可盖
    engine.resetRun();
    expect(engine.newSeals).toEqual([]);
    engine.phase = 'running';
    for (const p of pts) engine.tryCollect(p);
    engine.stopRun();
    expect(engine.newSeals).toEqual([]);
  });

  it('sealSummary 汇总全局朱印与章节印', () => {
    expect(engine.sealSummary).toEqual({
      done: 0,
      total: LEVEL_DEFS.length * 4,
      chapters: 0,
      chaptersTotal: 5,
    });
    // 集齐第一章（圆 + 椭圆）的全部朱印 → 8 枚印 + 1 方章节印
    engine.bestStars = { circle: 3, ellipse: 3 };
    engine.perfectLevels = { circle: true, ellipse: true };
    engine.exactLevels = { circle: true, ellipse: true };
    engine.expertClears = { circle: true, ellipse: true };
    expect(engine.sealSummary.done).toBe(8);
    expect(engine.sealSummary.chapters).toBe(1);
  });

  it('今日最佳取各难度最高分；7 日格按天标记完成', () => {
    const today = todayKey();
    const yesterday = yesterdayKey();
    engine.dailyBest = {
      ['daily-' + today + '-normal']: 1200,
      ['daily-' + today + '-hard']: 3400,
      ['daily-' + yesterday + '-easy']: 800,
    };
    // 每日关卡 id 带难度后缀，今日最佳必须跨难度取最高
    expect(engine.todayBest).toBe(3400);
    const week = engine.dailyWeek;
    expect(week).toHaveLength(7);
    expect(week[6].today).toBe(true);
    expect(week[6].done).toBe(true);
    expect(week[5].done).toBe(true);
    expect(week[0].done).toBe(false);
    expect(week.every((d) => d.label.length === 1)).toBe(true);
  });

  it('章节印：本局集齐本章最后一枚印时盖章节印，之后不重复盖', () => {
    // 第一章（basics）= 圆 + 椭圆；先只差椭圆的「星」「满」
    engine.bestStars = { circle: 3, ellipse: 2 };
    engine.perfectLevels = { circle: true };
    engine.exactLevels = { circle: true, ellipse: true };
    engine.expertClears = { circle: true, ellipse: true };
    expect(engine.chapterSealsOf('basics').done).toBe(6);
    expect(engine.chapterSealsOf('basics').sealed).toBe(false);

    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'ellipse')!);
    const lv = engine.level!;
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    for (let i = 0; i < 1500 && engine.phase === 'running'; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.newSeals).toContain('perfect');
    expect(engine.chapterSealsOf('basics').sealed).toBe(true);
    expect(engine.newChapterSeal).toBe('basics');

    // 已经集齐，再跑一局不再重复盖
    engine.resetRun();
    engine.startRun();
    for (let i = 0; i < 1500 && engine.phase === 'running'; i++) engine.advance(1 / 60);
    expect(engine.newChapterSeal).toBeNull();
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

  it('全清后结算记录最快全清用时', () => {
    expect(engine.bestClear).toBe(null);
    engine.setArm(0, { r: 120 });
    engine.phase = 'running';
    let guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) {
      engine.advance(0.016);
      guard++;
    }
    expect(engine.collectedCount).toBe(engine.total);
    engine.stopRun();
    expect(engine.lastClearT).not.toBeNull();
    expect(engine.bestClear).not.toBeNull();
    expect(engine.bestClear!).toBeGreaterThan(0);
    expect(engine.newClearRecord).toBe(true);
    // 第二局更慢的全清不会刷新最快纪录
    engine.resetRun();
    engine.phase = 'running';
    guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) {
      engine.advance(0.05);
      guard++;
    }
    engine.stopRun();
    expect(engine.newClearRecord).toBe(false);
  });

  it('沙盒转速影响时间流速，挑战模式不受影响', () => {
    engine.enterSandbox();
    engine.speed = 2;
    engine.advance(0.016);
    expect(engine.t).toBeCloseTo(0.032, 5);
    engine.speed = 0.5;
    engine.advance(0.016);
    expect(engine.t).toBeCloseTo(0.04, 5);
    engine.exitSandbox();
    engine.enterSandbox();
  });

  it('buildReport 生成含成绩与解法的战报', () => {
    engine.setArm(0, { r: 120 });
    engine.phase = 'running';
    let guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) engine.advance(0.016);
    engine.stopRun();
    const rep = engine.buildReport();
    expect(rep).toContain('圆');
    expect(rep).toContain('★');
    expect(rep).toContain('30000');
    expect(rep).toContain('120/1×/0°');
    expect(rep).not.toContain('邀请码');
  });

  it('最佳得分那局的解法入档并可载入', () => {
    engine.setArm(0, { r: 120 });
    engine.phase = 'running';
    let guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) engine.advance(0.016);
    engine.stopRun();
    expect(engine.hasSavedArms()).toBe(true);
    engine.setArm(0, { r: 55 });
    expect(engine.loadSavedArms()).toBe(true);
    expect(engine.arms[0].r).toBe(120);
    expect(engine.phase).toBe('edit');
  });
  it('上届节奏：结算时存下每个点的收集时刻（升序、落在本局时长内）', () => {
    engine.setArm(0, { r: 120 });
    engine.phase = 'running';
    let guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) {
      engine.advance(0.016);
      guard++;
    }
    engine.stopRun();
    const pace = engine.savedPace;
    expect(pace).toBeTruthy();
    expect(pace).toHaveLength(engine.total);
    for (let i = 1; i < pace!.length; i++) {
      expect(pace![i]).toBeGreaterThanOrEqual(pace![i - 1]);
    }
    expect(pace![pace!.length - 1]).toBeLessThanOrEqual(16);
  });

  it('与上届竞速：参数一致时不比较，改参数后可比且结算快照早于节奏覆盖', () => {
    // 第一局：全清 → 存入上届节奏
    engine.setArm(0, { r: 120 });
    engine.phase = 'running';
    let guard = 0;
    while (engine.collectedCount < engine.total && guard < 2000) {
      engine.advance(0.016);
      guard++;
    }
    engine.stopRun();
    const total = engine.total;
    // 参数与上届完全一致：轨迹必然同步，不做竞速显示
    engine.resetRun();
    engine.phase = 'running';
    expect(engine.ghostComparable).toBe(false);
    // 改参数 → 进入竞速状态，时刻 0 双方都是 0 点
    engine.setArm(0, { r: 55 });
    expect(engine.ghostComparable).toBe(true);
    expect(engine.ghostProgress).toBe(0);
    expect(engine.ghostDelta).toBe(0);
    // 跑满一局：r=55 扫不到目标点 → 全程落后上届
    let finished = false;
    guard = 0;
    while (!finished && guard < 2000) {
      finished = engine.advance(0.05).finished;
      guard++;
    }
    expect(engine.phase).toBe('done');
    expect(engine.collectedCount).toBeLessThan(total);
    // 竞速快照用的是"覆盖前"的上届节奏，而不是本局刚存进去的
    expect(engine.lastGhostDelta).toBe(engine.collectedCount - total);
    expect(engine.lastGhostDelta!).toBeLessThan(0);
    // 本局得分为 0 → 上届节奏不被覆盖，仍是第一局那条
    expect(engine.savedPace).toHaveLength(total);
    engine.resetRun();
    expect(engine.lastGhostDelta).toBe(null);
  });

  /** 把圆关跑满一局（r=120 全清），返回结算后的引擎 */
  function runCircle(engine2: GameEngine): GameEngine {
    engine2.setArm(0, { r: 120 });
    engine2.phase = 'running';
    let guard = 0;
    while (engine2.collectedCount < engine2.total && guard < 2000) {
      engine2.advance(0.016);
      guard++;
    }
    engine2.stopRun();
    return engine2;
  }

  it('通关演出：补上最后一关的星才触发，重复游玩不再弹', () => {
    const stars: Record<string, number> = {};
    for (const d of LEVEL_DEFS) stars[d.id] = 1;
    delete stars.circle; // 只差圆关
    engine.bestStars = stars;
    expect(engine.campaign).toBe('none');

    runCircle(engine);
    expect(engine.campaign).toBe('cleared');
    expect(engine.finale).toBe('cleared');
    engine.dismissFinale();
    expect(engine.finale).toBe(null);

    // 再玩一次同一关：战役状态没跨级 → 不再弹
    engine.resetRun();
    runCircle(engine);
    expect(engine.finale).toBe(null);
  });

  it('全三星触发精通结局，resetRun 会收起结局', () => {
    const stars: Record<string, number> = {};
    for (const d of LEVEL_DEFS) stars[d.id] = 3;
    stars.circle = 0;
    engine.bestStars = stars;
    expect(engine.campaign).toBe('none');

    runCircle(engine);
    expect(engine.campaign).toBe('mastered');
    expect(engine.finale).toBe('mastered');
    engine.resetRun();
    expect(engine.finale).toBe(null);
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
