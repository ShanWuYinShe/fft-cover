import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CHAPTERS, LEVEL_DEFS, makeDailyLevel, makeRandomLevel } from './levels';
import { dayKey, todayKey, yesterdayKey } from './dates';
import { HISTORY_KEY, LAST_CUSTOM_KEY, LAST_LEVEL_KEY } from './constants';
import { GameEngine } from './engine.svelte';
import { fitScore, solveFromSpectrum } from './scoring';

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

  it('随机关按邀请码复现（含难度），每日挑战按今天重建', () => {
    const e = new GameEngine();
    e.loadRandomSeed(4242);
    const random = new GameEngine();
    expect(random.level?.id).toBe('random-4242');
    expect(random.level?.random).toBe(true);

    // 难度也要复现：同一 seed 在困难档是另一条曲线
    e.loadRandomSeed(4242, 'hard');
    const hard = new GameEngine();
    expect(hard.randomDiff).toBe('hard');
    expect(hard.level?.pts).toEqual(makeRandomLevel(4242, 'hard').pts);

    e.loadDaily();
    const daily = new GameEngine();
    expect(daily.level?.id.startsWith('daily-')).toBe(true);
  });

  it('创作关：系数已存档 → 刷新后原样回来', () => {
    const e = new GameEngine();
    const coeffs = [
      { k: 1, mag: 80, phase: 0 },
      { k: 3, mag: 55, phase: 0 },
      { k: 5, mag: 28, phase: 0 },
    ];
    e.loadCustomLevel(coeffs, '创作关卡');
    const id = e.level!.id;
    expect(id.startsWith('custom-')).toBe(true);
    expect(localStorage.getItem(LAST_LEVEL_KEY)).toBe(id);

    const next = new GameEngine();
    expect(next.level?.id).toBe(id);
    expect(next.level?.name).toBe('创作关卡');
    expect(next.level?.pts).toEqual(e.level!.pts);
  });

  it('换回非创作关后，创作关记忆被清除（不会很久之后突然跳回去）', () => {
    const e = new GameEngine();
    e.loadCustomLevel([{ k: 1, mag: 100, phase: 0 }], '测试关');
    expect(localStorage.getItem(LAST_CUSTOM_KEY)).not.toBeNull();
    e.loadLevel(LEVEL_DEFS.find((d) => d.id === 'heart')!);
    expect(localStorage.getItem(LAST_CUSTOM_KEY)).toBeNull();
    const next = new GameEngine();
    expect(next.level?.id).toBe('heart');
  });

  it('创作关存档损坏 → 安全回落第一关，不崩', () => {
    const e = new GameEngine();
    e.loadCustomLevel([{ k: 1, mag: 100, phase: 0 }], '测试关');
    localStorage.setItem(LAST_CUSTOM_KEY, '{broken json');
    const next = new GameEngine();
    expect(next.level?.id).toBe('circle');
  });

  it('创作关存档结构与期望不符 → 回落第一关', () => {
    localStorage.setItem(LAST_LEVEL_KEY, 'custom-1-100-0');
    localStorage.setItem(
      LAST_CUSTOM_KEY,
      JSON.stringify({ id: 'custom-1-100-0', name: '测试关', coeffs: [{ k: 'x' }] }),
    );
    const next = new GameEngine();
    expect(next.level?.id).toBe('circle');
  });

  it('每日关的趋势按同难度跨天聚合（否则每天都是新 id，只有一条）', () => {
    // 先写存档再建引擎：引擎在构造时读取历史
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        [dayKey(new Date(Date.now() - 2 * 86400000)) &&
        'daily-' + dayKey(new Date(Date.now() - 2 * 86400000)) + '-hard']: [
          { t: 1, score: 100, collected: 10, total: 24, stars: 1, clearT: null },
          { t: 2, score: 200, collected: 12, total: 24, stars: 1, clearT: null },
        ],
        ['daily-' + dayKey(new Date(Date.now() - 86400000)) + '-hard']: [
          { t: 3, score: 300, collected: 14, total: 24, stars: 2, clearT: null },
        ],
        ['daily-' + todayKey() + '-hard']: [
          { t: 5, score: 400, collected: 18, total: 24, stars: 2, clearT: null },
        ],
        ['daily-' + dayKey(new Date(Date.now() - 86400000)) + '-easy']: [
          { t: 4, score: 999, collected: 20, total: 24, stars: 3, clearT: null },
        ],
      }),
    );
    const engine2 = new GameEngine();
    engine2.setDifficulty('hard');
    engine2.loadDaily(); // 载入今日（hard）每日关
    const hist = engine2.recentHistory(10);
    expect(hist).toHaveLength(4); // 同难度的三天空数 + 今天，全部聚合
    expect(hist.map((h) => h.score)).toEqual([100, 200, 300, 400]); // 按时间升序
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

  it('撤销 / 重做：三次间隔编辑各自一步', async () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 100, freq: 1, phase: 0 });
    await new Promise((r) => setTimeout(r, 700));
    engine.setArm(0, { r: 110 });
    await new Promise((r) => setTimeout(r, 700));
    engine.setArm(0, { r: 120 });
    expect(engine.arms[0].r).toBe(120);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(110);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(100);
    engine.undoArms();
    // 再撤销回到载关后的初始状态（不再是 100）
    expect(engine.arms[0].r).not.toBe(100);
    engine.redoArms();
    expect(engine.arms[0].r).toBe(100);
  });

  it('撤销 / 重做：600ms 内的连续编辑合并成一步', async () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 100, freq: 1, phase: 0 });
    await new Promise((r) => setTimeout(r, 700));
    const before = engine.armUndoCount;
    // 模拟拖动 / 长按连发
    for (let i = 1; i <= 8; i++) engine.setArm(0, { r: 100 + i });
    expect(engine.arms[0].r).toBe(108);
    expect(engine.armUndoCount).toBe(before + 1);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(100);
  });

  it('撤销后再编辑：重做栈被清空（不会跳到废弃分支）', () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 100, freq: 1, phase: 0 });
    engine.setArm(0, { r: 140 });
    engine.undoArms();
    engine.setArm(0, { r: 180 });
    expect(engine.armRedoCount).toBe(0);
    engine.redoArms();
    expect(engine.arms[0].r).toBe(180);
  });

  it('强制入栈的动作之后，第一次编辑仍然是独立的一步', () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 100, freq: 1, phase: 0 });
    engine.clearArms(); // 强制入栈
    const cleared = engine.arms[0].r;
    engine.setArm(0, { r: cleared + 5 }); // 紧随其后的编辑
    // 撤销应当先回到"清零后"的状态，而不是直接跳回清零前
    engine.undoArms();
    expect(engine.arms[0].r).toBe(cleared);
  });

  it('整块动作之后，撤销栈还能继续长（回归：别再用 MAX_SAFE_INTEGER 禁止合并）', async () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 100, freq: 1, phase: 0 });
    await new Promise((r) => setTimeout(r, 700));
    engine.resetAllArms(); // 整块动作
    const afterForce = engine.armUndoCount;
    const afterReset = engine.arms[0].r; // 复位后的值（不等于复位前的 100）
    expect(afterReset).not.toBe(100);
    await new Promise((r) => setTimeout(r, 700));
    engine.setArm(0, { r: 150 });
    await new Promise((r) => setTimeout(r, 700));
    engine.setArm(0, { r: 160 });
    // 两步编辑都要入栈（修复前这里只会 +1 甚至 +0）
    expect(engine.armUndoCount).toBe(afterForce + 2);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(150);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(afterReset);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(100); // 再撤一步回到复位前
  });

  it('撤销栈上限 60：旧记录被丢弃且不崩', async () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 0));
      engine.setArm(0, { on: true, r: 60 + (i % 100), freq: 1, phase: 0 });
    }
    expect(engine.armUndoCount).toBeLessThanOrEqual(60);
    for (let i = 0; i < 80; i++) engine.undoArms();
    expect(engine.arms[0].r).toBeGreaterThanOrEqual(0);
  });

  it('空栈上撤销 / 重做是安全的空操作', () => {
    const fresh = new GameEngine();
    const before = fresh.arms.map((a) => ({ ...a }));
    fresh.undoArms();
    fresh.redoArms();
    expect(fresh.arms).toEqual(before);
  });

  it('一键套用精确解可以撤销（求助按钮不该毁掉玩家原参数）', () => {
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.setArm(0, { on: true, r: 37, freq: 1, phase: 0 });
    const mine = engine.arms[0].r;
    const applied = engine.applyExactSolution();
    expect(applied).toBeGreaterThan(0);
    expect(engine.arms[0].r).not.toBe(mine);
    engine.undoArms();
    expect(engine.arms[0].r).toBe(mine);
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

  it('记录上一局漏点，换关后失效', () => {
    engine.setArm(0, { on: true, r: 120, freq: 1, phase: 0 });
    engine.startRun();
    let g = 0;
    while (engine.collectedCount / engine.total < 0.5 && g < 1500) {
      engine.advance(1 / 60);
      g++;
    }
    engine.stopRun();
    const missed = engine.lastMissedSet;
    expect(missed.size).toBe(engine.total - engine.collectedCount);
    expect(missed.size).toBeGreaterThan(0);
    // 索引都落在合法范围，且都不是已收集的点
    for (const i of missed) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(engine.total);
      expect(engine.collected.has(i)).toBe(false);
    }
    // 换关后失效，避免把上一关的漏点画到新关上
    engine.loadLevel(LEVEL_DEFS.find((d) => d.id === 'ellipse')!);
    expect(engine.lastMissedSet.size).toBe(0);
  });

  it('成就口径：随机关的成绩不算内置关进度（引擎侧接线也要对）', () => {
    // 只打随机关，每局三星
    const stars: Record<string, number> = {};
    for (let i = 0; i < LEVEL_DEFS.length; i++) stars['random-' + i] = 3;
    engine.bestStars = stars;
    engine.checkAchievements();
    expect(engine.achievements['all-three']).toBeUndefined();
    expect(engine.achievements['half-stars']).toBeUndefined();
    // 内置关打满 → 照常解锁
    const full: Record<string, number> = {};
    for (const d of LEVEL_DEFS) full[d.id] = 3;
    engine.bestStars = full;
    engine.checkAchievements();
    // 成就表里存的是解锁时间戳，只要"有记录"即可
    expect(engine.achievements['all-three']).toBeTruthy();
  });

  it('巧变三器：第六章三关全三星才解锁', () => {
    const craft = LEVEL_DEFS.filter((d) => d.chapter === 'craft');
    expect(craft).toHaveLength(3);
    // 只拿两关三星 → 不解锁
    engine.bestStars = { [craft[0].id]: 3, [craft[1].id]: 3, [craft[2].id]: 2 };
    engine.checkAchievements();
    expect(engine.achievements['craft-master']).toBeUndefined();
    // 三关全三星 → 解锁
    engine.bestStars = { [craft[0].id]: 3, [craft[1].id]: 3, [craft[2].id]: 3 };
    engine.checkAchievements();
    expect(engine.achievements['craft-master']).toBeTruthy();
  });

  it('setFlag 可开可关，且不影响其它标记', () => {
    engine.setFlag('reduceMotion', true);
    expect(engine.flags.reduceMotion).toBe(true);
    engine.setFlag('reduceMotion', false);
    expect(engine.flags.reduceMotion).toBeUndefined();
    // 其它标记不受影响
    engine.markFlag('sandboxUsed');
    engine.setFlag('reduceMotion', true);
    engine.setFlag('reduceMotion', false);
    expect(engine.flags.sandboxUsed).toBe(true);
  });

  it('每日打卡日历与连续天数统计', () => {
    const best: Record<string, number> = {};
    // 最近 5 天连续 + 更早的孤立一天（中间断开）
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      best['daily-' + dayKey(d) + '-normal'] = 1000;
    }
    const older = new Date();
    older.setDate(older.getDate() - 7);
    best['daily-' + dayKey(older) + '-easy'] = 500;
    engine.dailyBest = best;

    expect(engine.dailyDaysTotal).toBe(6);
    expect(engine.longestDailyStreak).toBe(5);

    const cal = engine.dailyCalendar(5);
    expect(cal).toHaveLength(5);
    expect(cal.every((row) => row.length === 7)).toBe(true);
    const flat = cal.flat();
    expect(flat.filter((c) => c.done)).toHaveLength(6);
    // 今天在日历里，且已完成
    const todayCell = flat.find((c) => c.today);
    expect(todayCell?.done).toBe(true);
    // 还没到的日期不会被标记为已完成
    expect(flat.every((c) => !(c.future && c.done))).toBe(true);
    // 日历按日期升序
    const dates = flat.map((c) => c.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('第六章三关都能用精确解在指针上限内全清（新增关卡的硬约束）', () => {
    for (const id of ['pinwheel', 'twin', 'wisp']) {
      const def = LEVEL_DEFS.find((d) => d.id === id)!;
      engine.loadLevel(def);
      const lv = engine.level!;
      // 精确解用到的根数不超过本关上限
      const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
      expect(sol.filter((a) => a.on).length, id).toBeLessThanOrEqual(lv.armLimit);
      expect(fitScore(lv.spectrum, sol), id).toBeGreaterThanOrEqual(0.99);
      sol.forEach((a, i) => engine.setArm(i, { ...a }));
      engine.startRun();
      for (let i = 0; i < 2000 && engine.phase === 'running'; i++) engine.advance(1 / 60);
      // 关键：解得出来还得真能收齐（否则关卡不可通关）
      expect(engine.collectedCount, id).toBe(engine.total);
    }
  });

  it('一键套用精确解：参数与分解一致，可达成精确解认证', () => {
    // 先把指针调乱（单指针、错的频率与相位）
    engine.setArm(0, { on: true, r: 30, freq: 3, phase: 1 });
    const applied = engine.applyExactSolution();
    const lv = engine.level!;
    expect(applied).toBeGreaterThan(0);
    // 启用根数不超过本关上限，且与返回值一致
    expect(engine.arms.filter((a) => a.on).length).toBe(applied);
    expect(applied).toBeLessThanOrEqual(lv.armLimit);
    // 拟合度达到精确解认证线
    expect(fitScore(lv.spectrum, engine.arms)).toBeGreaterThanOrEqual(0.99);
    // 跑一局全清 → 认证成立
    engine.startRun();
    for (let i = 0; i < 1500 && engine.phase === 'running'; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.isExact).toBe(true);
  });

  it('运行中星级阈值实时点亮，重置后归零', () => {
    const lv = engine.level!;
    const sol = solveFromSpectrum(lv.spectrum, lv.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    expect(engine.starReached).toBe(0);
    engine.startRun();
    const seen = new Set<number>();
    for (let i = 0; i < 1500 && engine.phase === 'running'; i++) {
      engine.advance(1 / 60);
      if (engine.starReached > 0) seen.add(engine.starReached);
    }
    // 全清必然越过三星阈值，且中途应观察到逐档点亮
    expect(engine.starReached).toBe(3);
    expect(seen.has(1)).toBe(true);
    expect(engine.starReachedAt).toBeGreaterThan(0);
    engine.resetRun();
    expect(engine.starReached).toBe(0);
  });

  it('sealSummary 汇总全局朱印与章节印', () => {
    expect(engine.sealSummary).toEqual({
      done: 0,
      total: LEVEL_DEFS.length * 4,
      chapters: 0,
      chaptersTotal: CHAPTERS.length,
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

  it('周而复始：本周挑战全清 → 解锁成就（引擎侧接线）', () => {
    // 先有一关的一颗星（满足"全清"记录之外的基础状态）
    engine.loadWeekly();
    expect(engine.level!.id.startsWith('weekly-')).toBe(true);
    const sol = solveFromSpectrum(engine.level!.spectrum, engine.level!.armLimit);
    sol.forEach((a, i) => engine.setArm(i, { ...a }));
    engine.startRun();
    for (let i = 0; i < 4000 && engine.phase === 'running'; i++) engine.advance(1 / 60);
    expect(engine.collectedCount).toBe(engine.total);
    expect(engine.level!.id.startsWith('weekly-')).toBe(true);
    engine.checkAchievements();
    expect(engine.achievements['weekly-clear']).toBeTruthy();
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
