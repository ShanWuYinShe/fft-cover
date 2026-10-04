import {
  ACHV_KEY,
  ARMS_MAX,
  ARMS_SAVE_KEY,
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  COMBO_WINDOW,
  FLAGS_KEY,
  RUN_DUR,
  SOUND_KEY,
  CIRCLED,
  DAILY_KEY,
  HISTORY_KEY,
  HISTORY_MAX,
} from './constants';
import {
  decodeCoeffs,
  LEVEL_DEFS,
  levelFromCoeffs,
  makeDailyLevel,
  makeLevel,
  makeRandomLevel,
  todayKey,
  type RandomDifficulty,
} from './levels';
import { tipAt } from './math';
import {
  ACHIEVEMENTS,
  evalAchievements,
  scoreForPoint,
  solveFromSpectrum,
  starsFor,
} from './scoring';
import type { Arm, Floater, GamePhase, HistoryEntry, Level, LevelDef, Vec } from './types';

export { starsFor };

/** 指针初始参数：默认启用 1×、2×，其余关闭待玩家启用 */
function armDefaults(): Arm[] {
  return [
    { on: true, r: 130, freq: 1, phase: 0 },
    { on: true, r: 60, freq: 2, phase: 0 },
    { on: false, r: 40, freq: 3, phase: 0 },
    { on: false, r: 32, freq: 4, phase: 0 },
    { on: false, r: 26, freq: 5, phase: 0 },
    { on: false, r: 22, freq: 6, phase: 0 },
    { on: false, r: 18, freq: 7, phase: 0 },
    { on: false, r: 16, freq: 8, phase: 0 },
    { on: false, r: 14, freq: 9, phase: 0 },
    { on: false, r: 12, freq: 10, phase: 0 },
  ];
}

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_SCORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0';
  } catch {
    return true;
  }
}

function loadClears(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLEAR_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadArmsSaves(): Record<string, Arm[]> {
  try {
    return JSON.parse(localStorage.getItem(ARMS_SAVE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadDailyBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadHistory(): Record<string, HistoryEntry[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, HistoryEntry[]>) : {};
  } catch {
    return {};
  }
}

function loadAchv(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(ACHV_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadFlags(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FLAGS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/**
 * 游戏状态引擎（Svelte 5 runes 深层响应式）。
 * 音效与画布渲染不在此处：音效由组件触发，渲染循环读这里的状态。
 */
export class GameEngine {
  arms = $state<Arm[]>(armDefaults());
  level = $state<Level | null>(null);
  phase = $state<GamePhase>('edit');
  /** 运行时间（秒） */
  t = $state(0);
  /** 已收集点数（响应式，供 UI） */
  collectedCount = $state(0);
  /** 本次运行得分（连击计分） */
  score = $state(0);
  /** 结算浮层是否被折叠（点画布恢复） */
  resultDismissed = $state(false);
  /** 结算时是否刷新了本关最佳得分 */
  newRecord = $state(false);
  /** 各关卡历史最佳得分 */
  bestScores = $state<Record<string, number>>(loadScores());
  /** 上次收集时刻（连击窗口判定；-Infinity 表示尚无收集） */
  lastCollectAt = -Infinity;
  /** 音效开关（持久化） */
  soundOn = $state(loadSound());
  /** 沙盒模式：无限时长自由旋转，成绩不计入记录 */
  sandbox = $state(false);
  /** 刚结束的一局是否为沙盒（结算浮层展示用） */
  lastRunSandbox = $state(false);
  /** 各关卡历史最佳星级 */
  bestStars = $state<Record<string, number>>(loadBest());
  /** 调参高亮：各指针关节的画布高亮截止时刻（滑块/拖拽联动） */
  flashTil = $state<number[]>(Array(ARMS_MAX).fill(0));
  /** 全清冲击波起始时刻（画布特效用） */
  fullClearAt = 0;
  /** 切关淡入动画起始时刻（画布特效用） */
  levelSwitchAt = 0;
  /** 各关卡历史最快全清用时（秒） */
  bestClears = $state<Record<string, number>>(loadClears());
  /** 已解锁成就（id → 解锁时间戳） */
  achievements = $state<Record<string, number>>(loadAchv());
  /** 行为标记（"用过"类成就的数据源） */
  flags = $state<Record<string, boolean>>(loadFlags());
  /** 当前弹出的成就提示（一次一条） */
  toast = $state<{ id: string; name: string } | null>(null);
  /** 沙盒转速档位 */
  speed = $state(1);
  /** 随机关卡难度（🎲 生成时生效，持久化） */
  difficulty = $state<RandomDifficulty>(
    ((): RandomDifficulty => {
      try {
        const v = localStorage.getItem('fft-pointers-diff-v1');
        return v === 'easy' || v === 'hard' ? v : 'normal';
      } catch {
        return 'normal';
      }
    })(),
  );

  /** 切换随机关卡难度（下次生成生效），并持久化 */
  setDifficulty(d: RandomDifficulty): void {
    this.difficulty = d;
    try {
      localStorage.setItem('fft-pointers-diff-v1', d);
    } catch {
      /* 忽略 */
    }
  }
  /** 频谱对比开关：在频谱仪上叠加目标曲线的真实频谱 */
  spectrumCompare = $state(false);
  /** 自动拟合动画进行中（仅沙盒） */
  autoSolve = $state(false);
  /** 自动拟合进度 0→1 */
  autoProgress = $state(0);
  /** 插值起点快照 */
  private autoFrom: Arm[] | null = null;
  /** 拟合中参与插值的指针位；用户改动的位会退出该集合（保留用户值） */
  private autoSlots = new Set<number>();
  /** 插值目标（DFT 解） */
  private autoTo: Arm[] | null = null;
  /** 结算浮层是否显示"全清新纪录" */
  newClearRecord = $state(false);
  /** 各关保存的解法参数（最佳得分那局的指针配置） */
  armsSaves = $state<Record<string, Arm[]>>(loadArmsSaves());
  /** 每日挑战历史最佳得分（key = 日期） */
  dailyBest = $state<Record<string, number>>(loadDailyBest());
  /** 每关历史成绩（key = 关卡 id，最多 HISTORY_MAX 条，用于趋势展示） */
  history = $state<Record<string, HistoryEntry[]>>(loadHistory());
  /** 本局全清时刻（秒）；null = 未全清 */
  private clearT: number | null = null;
  /** 结算快照：全清用时 */
  lastClearT: number | null = null;

  /** 已收集点索引（画布渲染用，无需响应式） */
  readonly collected = new Set<number>();
  /** 收集时刻（发光动画） */
  readonly collectAnim = new Map<number, number>();
  /** 运行尾迹 */
  trail: Vec[] = [];
  /** 连击数（音高用） */
  combo = 0;
  /** 收集飘字（连击反馈，画布绘制用），advance 中清理过期项 */
  floaters: Floater[] = [];
  /** 挑战模式 2× 快进（跳过明显无法全清的等待，不影响计分公平） */
  fastForward = $state(false);

  constructor() {
    this.loadLevel(LEVEL_DEFS[0]);
  }

  get total(): number {
    return this.level ? this.level.pts.length : 0;
  }

  /** 本关历史最佳得分 */
  get bestScore(): number {
    return this.level ? (this.bestScores[this.level.id] ?? 0) : 0;
  }

  get runLabel(): string {
    return this.phase === 'running' ? '⏸ 暂停' : '▶ 开始旋转';
  }

  loadLevel(def: LevelDef): void {
    this.cancelAutoSolve();
    this.level = makeLevel(def);
    this.trimArmsToLimit();
    this.resetRun();
    this.levelSwitchAt = performance.now(); // 切关淡入动画起点
  }

  loadRandom(): void {
    this.loadRandomSeed(Math.floor(Math.random() * 1e9), this.difficulty);
  }

  /** 按邀请码（seed）重建随机关卡：同码必同关卡。难度不影响已有关卡复现 */
  loadRandomSeed(seed: number, diff: RandomDifficulty = 'normal'): void {
    this.cancelAutoSolve();
    this.sandbox = false;
    this.level = makeRandomLevel(seed, diff);
    this.trimArmsToLimit();
    this.resetRun();
    this.markFlag('inviteLoaded');
  }

  /** 关卡切换后按上限裁剪已启用指针（保留序号靠前者） */
  private trimArmsToLimit(): void {
    const limit = this.level?.armLimit ?? ARMS_MAX;
    let n = 0;
    for (const a of this.arms) {
      if (a.on) {
        n++;
        if (n > limit) a.on = false;
      }
    }
  }

  /** 回到编辑态：清空尾迹与收集 */
  resetRun(): void {
    this.phase = 'edit';
    this.t = 0;
    this.trail = [];
    this.combo = 0;
    this.collected.clear();
    this.collectAnim.clear();
    this.collectedCount = 0;
    this.score = 0;
    this.resultDismissed = false;
    this.lastCollectAt = -Infinity;
    this.fullClearAt = 0;
    this.clearT = null;
    this.newClearRecord = false;
    this.newRecord = false;
  }

  /** 沙盒转速档位循环 0.5× → 1× → 2× */
  cycleSpeed(): void {
    this.speed = this.speed === 0.5 ? 1 : this.speed === 1 ? 2 : 0.5;
  }

  /** 切换频谱对比叠加 */
  toggleSpectrumCompare(): void {
    this.spectrumCompare = !this.spectrumCompare;
  }

  /**
   * 沙盒自动拟合演示：按目标频谱解出精确参数，
   * 并在 2 秒内把指针从当前值平滑过渡过去（傅立叶逐项逼近可视化）。
   */
  /** 终止自动拟合（用户主动操作 / 切关 / 退出沙盒时调用，防止插值覆盖新状态） */
  cancelAutoSolve(): void {
    this.autoSolve = false;
    this.autoFrom = null;
    this.autoTo = null;
  }

  startAutoSolve(): void {
    if (!this.sandbox || !this.level || this.autoSolve) return;
    this.autoFrom = this.arms.map((a) => ({ ...a }));
    this.autoTo = solveFromSpectrum(this.level.spectrum, this.level.armLimit);
    // 参与插值的指针位 = 拟合解中启用的位；用户中途改动的位会退出该集合
    this.autoSlots = new Set<number>();
    this.autoTo.forEach((a, i) => {
      if (a.on) this.autoSlots.add(i);
    });
    this.autoSolve = true;
    this.autoProgress = 0;
    this.markFlag('autoTry');
  }

  /**
   * 插值推进自动拟合（advance 内调用）。
   * 只插值 autoSlots 中仍参与的指针位；用户中途改动的位
   * （setArm 时从 autoSlots 移除）保持用户值，互不覆盖。
   */
  private stepAutoSolve(dt: number): void {
    if (!this.autoSolve || !this.autoFrom || !this.autoTo) return;
    this.autoProgress = Math.min(this.autoProgress + dt / 2, 1);
    const e = 1 - Math.pow(1 - this.autoProgress, 3); // easeOutCubic
    const wrap = (d: number) => {
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    };
    for (const i of this.autoSlots) {
      const from = this.autoFrom[i];
      const to = this.autoTo[i];
      if (!from || !to) continue;
      let dp = wrap(to.phase - from.phase);
      const phase = from.phase + dp * e;
      this.arms[i] = {
        on: e > 0.15 ? to.on : from.on,
        r: Math.round(from.r + (to.r - from.r) * e),
        freq: e > 0.5 ? to.freq : from.freq,
        phase,
      };
    }
    if (this.autoProgress >= 1) {
      this.autoSolve = false;
      this.autoFrom = null;
      this.autoTo = null;
      this.autoSlots.clear();
    }
  }

  /**
   * 本局拿星后新解锁的下一关（无则 null）——结算浮层引导用。
   * 条件：本局 st>=1、存在下一关、且下一关此前从未拿过星（首次解锁）。
   */
  get newlyUnlockedNext(): LevelDef | null {
    const id = this.level?.id;
    if (!id) return null;
    const idx = LEVEL_DEFS.findIndex((d) => d.id === id);
    const next = idx >= 0 ? LEVEL_DEFS[idx + 1] : undefined;
    if (!next) return null;
    // 本局至少 1 星 且 下一关此前未拿过星（本局前还锁定）→ 首次解锁
    if ((this.bestStars[id] ?? 0) < 1) return null;
    if ((this.bestStars[next.id] ?? 0) > 0) return null;
    if (this.starsBeforeRun >= 1) return null; // 上一局就解锁过了
    return next;
  }

  /** 本关最近的历史成绩（新的在后），取最近 n 条 */
  recentHistory(n = 10): HistoryEntry[] {
    const id = this.level?.id;
    if (!id) return [];
    const list = this.history[id] ?? [];
    return list.slice(-n);
  }

  /** 本关历史最快全清用时（未全清过返回 null） */
  get bestClear(): number | null {
    return this.level ? (this.bestClears[this.level.id] ?? null) : null;
  }

  /** 标记一个行为标志并重查成就 */
  markFlag(key: string): void {
    if (this.flags[key]) return;
    this.flags = { ...this.flags, [key]: true };
    try {
      localStorage.setItem(FLAGS_KEY, JSON.stringify(this.flags));
    } catch {
      /* 存储不可用则忽略 */
    }
    this.checkAchievements();
  }

  /** 重新判定成就，新解锁的依次弹出提示 */
  checkAchievements(): void {
    const ctx = {
      bestStars: this.bestStars,
      bestScores: this.bestScores,
      bestClears: this.bestClears,
      flags: this.flags,
      levelCount: LEVEL_DEFS.length,
    };
    const now = Date.now();
    for (const id of evalAchievements(ctx)) {
      if (this.achievements[id]) continue;
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (!def) continue;
      this.achievements = { ...this.achievements, [id]: now };
      try {
        localStorage.setItem(ACHV_KEY, JSON.stringify(this.achievements));
      } catch {
        /* 存储不可用则忽略 */
      }
      this.toast = { id, name: def.name };
    }
  }

  /** 清除成就提示（UI 延时调用） */
  clearToast(): void {
    this.toast = null;
  }

  /** 从编辑/暂停态开始或继续 */
  startRun(): void {
    this.sandbox = false;
    this.phase = 'running';
  }

  /** 进入沙盒：无限时长自由旋转，实时调参扫点，成绩不计入记录 */
  enterSandbox(): void {
    this.resetRun();
    this.sandbox = true;
    this.lastRunSandbox = true;
    this.phase = 'running';
    this.markFlag('sandboxUsed');
  }

  /** 结束沙盒：展示成果但不记录 */
  exitSandbox(): void {
    this.cancelAutoSolve();
    if (!this.sandbox) return;
    this.sandbox = false;
    this.phase = 'done';
    this.resultDismissed = false;
  }

  /** 音效开关（持久化） */
  setSound(on: boolean): void {
    this.soundOn = on;
    try {
      localStorage.setItem(SOUND_KEY, on ? '1' : '0');
    } catch {
      /* 存储不可用则忽略 */
    }
  }

  /** 随机化所有已启用指针的半径与相位（激发灵感用） */
  randomizeArms(): void {
    this.cancelAutoSolve();
    this.pushArmHistory(true);
    for (const a of this.arms) {
      if (!a.on) continue;
      a.r = Math.round(30 + Math.random() * 120);
      a.phase = (Math.round(Math.random() * 360) * Math.PI) / 180;
    }
  }

  /** 全部指针清零关闭 */
  clearArms(): void {
    this.cancelAutoSolve();
    this.pushArmHistory(true);
    for (const a of this.arms) {
      a.on = false;
      a.r = 60;
      a.phase = 0;
    }
  }

  /** 复位第 i 根指针到默认参数（半径/频率/相位/方向） */
  resetArm(i: number): void {
    this.pushArmHistory(true);
    const def = armDefaults()[i];
    if (!def) return;
    Object.assign(this.arms[i], def);
    this.flashArm(i);
  }

  /** 全部指针复位到默认参数 */
  resetAllArms(): void {
    this.cancelAutoSolve();
    this.pushArmHistory(true);
    const defs = armDefaults();
    this.arms.forEach((a, i) => Object.assign(a, defs[i]));
  }

  toggleRun(): void {
    if (this.phase === 'edit' || this.phase === 'paused') {
      if (this.phase === 'edit') {
        this.t = 0;
        this.trail = [];
        this.combo = 0;
      }
      this.phase = 'running';
    } else if (this.phase === 'running') {
      this.phase = 'paused';
    }
  }

  /** 停止并结算星级（记录最佳；沙盒不计入记录） */
  /** 结算前的本关星数（判断"首次解锁下一关"用） */
  private starsBeforeRun = 0;

  stopRun(): void {
    if (this.phase !== 'running' && this.phase !== 'paused') return;
    this.starsBeforeRun = this.level ? (this.bestStars[this.level.id] ?? 0) : 0;
    this.phase = 'done';
    this.resultDismissed = false;
    if (this.sandbox) {
      this.sandbox = false;
      return;
    }
    // 最快全清时间竞速（挑战模式）
    this.lastClearT = this.clearT;
    this.newClearRecord = false;
    const id = this.level?.id;
    if (!id) return;
    if (this.clearT !== null && this.clearT < (this.bestClears[id] ?? Infinity)) {
      this.bestClears = { ...this.bestClears, [id]: this.clearT };
      this.newClearRecord = true;
      try {
        localStorage.setItem(CLEAR_KEY, JSON.stringify(this.bestClears));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    const ratio = this.total ? this.collectedCount / this.total : 0;
    const st = starsFor(ratio);
    this.newRecord = false;
    if (st > (this.bestStars[id] ?? 0)) {
      this.bestStars = { ...this.bestStars, [id]: st };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(this.bestStars));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    if (this.score > (this.bestScores[id] ?? 0)) {
      this.bestScores = { ...this.bestScores, [id]: this.score };
      this.newRecord = true;
      try {
        localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(this.bestScores));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    // 历史成绩入档（趋势展示；每关保留最近 HISTORY_MAX 局）
    const entry: HistoryEntry = {
      t: Date.now(),
      score: this.score,
      collected: this.collectedCount,
      total: this.total,
      stars: st,
      clearT: this.clearT,
    };
    const list = [...(this.history[id] ?? []), entry];
    if (list.length > HISTORY_MAX) list.splice(0, list.length - HISTORY_MAX);
    this.history = { ...this.history, [id]: list };
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch {
      /* 存储不可用则忽略 */
    }

    // 最佳得分那局的解法参数入档（"载入上届解法"用）
    if (this.score > 0) {
      this.armsSaves = { ...this.armsSaves, [id]: this.arms.map((a) => ({ ...a })) };
      try {
        localStorage.setItem(ARMS_SAVE_KEY, JSON.stringify(this.armsSaves));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    // 每日挑战：刷新今日最佳
    if (id.startsWith('daily-') && this.score > (this.dailyBest[id] ?? 0)) {
      this.dailyBest = { ...this.dailyBest, [id]: this.score };
      this.newRecord = true;
      this.markFlag('dailyWon');
      try {
        localStorage.setItem(DAILY_KEY, JSON.stringify(this.dailyBest));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    this.checkAchievements();
  }

  /** 载入玩家创作的谐波合成关卡 */
  loadCustomLevel(coeffs: { k: number; mag: number; phase: number }[], name: string): void {
    this.cancelAutoSolve();
    this.sandbox = false;
    this.level = levelFromCoeffs(coeffs, name);
    this.trimArmsToLimit();
    this.resetRun();
    this.markFlag('composerPlayed');
  }

  /** 进入今日每日挑战（seed 由日期+难度决定，人人同关） */
  loadDaily(): void {
    this.cancelAutoSolve();
    this.sandbox = false;
    this.level = makeDailyLevel(this.difficulty);
    this.trimArmsToLimit();
    this.resetRun();
  }

  /** 今日最佳得分 */
  get todayBest(): number {
    return this.dailyBest['daily-' + todayKey()] ?? 0;
  }

  /** 载入本关已保存的解法参数（无存档则不动） */
  loadSavedArms(): boolean {
    const id = this.level?.id;
    const saved = id ? this.armsSaves[id] : undefined;
    if (!saved) return false;
    this.pushArmHistory(true);
    this.arms = saved.map((a) => ({ ...a }));
    this.resetRun();
    return true;
  }

  hasSavedArms(): boolean {
    const id = this.level?.id;
    return !!(id && this.armsSaves[id]);
  }

  /** 启用指针的解法参数串（如 ①120/1×/0° + ②60/2×/90°） */
  armsLine(): string {
    const parts = this.arms
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.on)
      .map(
        ({ a, i }) =>
          CIRCLED[i] + a.r + '/' + a.freq + '×/' + Math.round((a.phase * 180) / Math.PI) + '°',
      );
    return parts.join(' + ') || '（无启用指针）';
  }

  /** 生成可分享的战报文本 */
  buildReport(): string {
    const lines: string[] = [];
    const name = this.level?.name ?? '未知关卡';
    const st = starsFor(this.total ? this.collectedCount / this.total : 0);
    lines.push(
      '【傅立叶指针】' +
        name +
        ' · ' +
        '★'.repeat(st) +
        '☆'.repeat(3 - st) +
        ' · ' +
        this.score +
        ' 分',
    );
    lines.push(
      '收集 ' +
        this.collectedCount +
        '/' +
        this.total +
        ' 点' +
        (this.clearT !== null ? ' · 全清 ' + this.clearT.toFixed(1) + 's' : ''),
    );
    lines.push('解法：' + this.armsLine());
    if (this.level?.random) lines.push('邀请码：' + this.level.id.replace('random-', ''));
    return lines.join('\n');
  }

  /* ---------- 调参撤销/重做 ---------- */
  private armUndoStack: Arm[][] = [];
  private armRedoStack: Arm[][] = [];
  /** 上次压栈时刻（600ms 内的连续变化合并为一条记录） */
  private lastArmPushAt = 0;
  /** 拖拽进行中：整段拖动合并为一条记录 */
  private armEditSession = false;
  armUndoCount = $state(0);
  armRedoCount = $state(0);

  private syncArmCounts(): void {
    this.armUndoCount = this.armUndoStack.length;
    this.armRedoCount = this.armRedoStack.length;
  }

  /** 把当前参数压入撤销栈（会话合并：600ms 内或拖拽进行中不重复压） */
  private pushArmHistory(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastArmPushAt < 600) {
      this.lastArmPushAt = now;
      return;
    }
    this.armUndoStack.push(this.arms.map((a) => ({ ...a })));
    if (this.armUndoStack.length > 60) this.armUndoStack.shift();
    this.armRedoStack = [];
    this.syncArmCounts();
    this.lastArmPushAt = force ? Number.MAX_SAFE_INTEGER : now;
  }

  /** 拖拽/滑块等连续交互的会话开始 */
  beginArmEdit(): void {
    this.pushArmHistory(true);
    this.armEditSession = true;
  }

  /** 连续交互结束 */
  endArmEdit(): void {
    this.armEditSession = false;
    this.lastArmPushAt = Date.now();
  }

  undoArms(): void {
    const prev = this.armUndoStack.pop();
    if (!prev) return;
    this.armRedoStack.push(this.arms.map((a) => ({ ...a })));
    this.arms = prev.map((a) => ({ ...a }));
    this.syncArmCounts();
    this.lastArmPushAt = 0;
  }

  redoArms(): void {
    const next = this.armRedoStack.pop();
    if (!next) return;
    this.armUndoStack.push(this.arms.map((a) => ({ ...a })));
    this.arms = next.map((a) => ({ ...a }));
    this.syncArmCounts();
    this.lastArmPushAt = 0;
  }

  /** 修改第 i 根指针参数（启用受本关上限约束） */
  setArm(i: number, patch: Partial<Arm>): void {
    // 拟合动画期间：用户改动的指针位退出拟合范围（保留用户值），其余位继续插值
    if (this.autoSolve) this.autoSlots.delete(i);
    if (patch.on === true && !this.arms[i].on && !this.canEnableMore()) return;
    const touchesTunable = 'r' in patch || 'freq' in patch || 'phase' in patch || 'on' in patch;
    if (touchesTunable) this.pushArmHistory();
    Object.assign(this.arms[i], patch);
  }

  /** 是否还能再启用一根指针 */
  canEnableMore(): boolean {
    return this.arms.filter((a) => a.on).length < (this.level?.armLimit ?? ARMS_MAX);
  }

  /** 滑块/拖拽调参时短暂高亮对应关节（画布联动） */
  flashArm(i: number): void {
    this.flashTil[i] = performance.now() + 900;
  }

  /** 尖端处尝试收集：命中则按连击计分（COMBO_WINDOW 内连收 combo 递增） */
  tryCollect(p: Vec): boolean {
    const pts = this.level?.pts;
    if (!pts) return false;
    const tolSq = (this.level?.tol ?? 13) ** 2;
    for (let i = 0; i < pts.length; i++) {
      if (this.collected.has(i)) continue;
      const dx = pts[i].x - p.x;
      const dy = pts[i].y - p.y;
      if (dx * dx + dy * dy < tolSq) {
        const now = performance.now();
        this.combo = now - this.lastCollectAt < COMBO_WINDOW ? this.combo + 1 : 0;
        this.lastCollectAt = now;
        this.score += scoreForPoint(this.combo);
        this.collected.add(i);
        this.collectAnim.set(i, now);
        this.collectedCount++;
        this.floaters.push({
          x: pts[i].x,
          y: pts[i].y,
          score: scoreForPoint(this.combo),
          combo: this.combo,
          born: now,
        });
        if (this.floaters.length > 24) this.floaters.shift();
        if (this.collectedCount === pts.length) {
          this.fullClearAt = now; // 全清冲击波
          this.clearT = this.t; // 竞速：记录全清用时
        }
        return true;
      }
    }
    return false;
  }

  /**
   * 推进一个渲染帧（仅在 running 阶段生效）。
   * 子步进采样防止高速漏判。返回本帧收集数与是否刚结束。
   */
  advance(dt: number): { got: number; finished: boolean } {
    if (this.phase !== 'running') return { got: 0, finished: false };
    if (this.autoSolve) this.stepAutoSolve(dt);
    // 清理过期飘字（900ms 生命周期，见 Stage 绘制）
    if (this.floaters.length > 0) {
      const nowMs = performance.now();
      this.floaters = this.floaters.filter((f) => nowMs - f.born < 900);
    }
    const prev = this.t;
    // 沙盒不设时长上限（封顶防浮点溢出）也不自动结算，且可调转速
    const step = dt * (this.sandbox ? this.speed : this.fastForward ? 2 : 1);
    this.t = Math.min(this.t + step, this.sandbox ? 100000 : RUN_DUR);
    let got = 0;
    const SUB = 6;
    for (let s = 1; s <= SUB; s++) {
      const st = prev + ((this.t - prev) * s) / SUB;
      const p = tipAt(this.arms, st);
      if (this.tryCollect(p)) got++;
      this.trail.push({ x: p.x, y: p.y });
    }
    if (this.trail.length > 2400) this.trail.splice(0, this.trail.length - 2400);
    let finished = false;
    if (!this.sandbox && this.t >= RUN_DUR) {
      this.stopRun();
      finished = true;
    }
    // 全清 3 秒后自动结算：免去第二圈的空转等待
    if (
      !this.sandbox &&
      !finished &&
      this.clearT !== null &&
      this.t - this.clearT >= 3 &&
      this.phase === 'running'
    ) {
      this.stopRun();
      finished = true;
    }
    return { got, finished };
  }
}

/** 全局单例 */
export const engine = new GameEngine();
