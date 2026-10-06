import {
  ACHV_KEY,
  ARMS_MAX,
  ARMS_SAVE_KEY,
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  COMBO_WINDOW,
  EXACT_FIT,
  EXACT_KEY,
  EXPERT_KEY,
  FAIL_KEY,
  FLAGS_KEY,
  PERFECT_KEY,
  PACE_KEY,
  STREAK_KEY,
  MUSIC_KEY,
  RUN_DUR,
  SOUND_KEY,
  CIRCLED,
  DAILY_KEY,
  HISTORY_KEY,
  HISTORY_MAX,
  LAST_LEVEL_KEY,
} from './constants';
import {
  CHAPTERS,
  decodeCoeffs,
  LEVEL_DEFS,
  levelFromCoeffs,
  makeDailyLevel,
  makeLevel,
  makeRandomLevel,
  lastNDays,
  parseRandomSpec,
  randomSpec,
  todayKey,
  yesterdayKey,
  type RandomDifficulty,
} from './levels';
import { tipAt } from './math';
import { decodeArms } from './share';
import {
  ACHIEVEMENTS,
  evalAchievements,
  scoreForPoint,
  fitScore,
  solveFromSpectrum,
  starsFor,
  type AchievementContext,
} from './scoring';
import { campaignState, type CampaignState } from './campaign';
import {
  chapterSealState,
  levelGoals,
  sealsDone,
  type ChapterSealState,
  type GoalId,
  type GoalState,
} from './goals';
import { keyForLevel, scaleNotes, type MusicalKey } from './harmony';
import { ghostProgressAt, paceDelta, paceRatio, sanitizePace, type Pace } from './pace';
import type { Arm, Floater, GamePhase, HistoryEntry, Level, LevelDef, Vec } from './types';

export { starsFor };

/**
 * 指针组签名：判断"当前参数是否等于上届解法"。
 * 含启用状态——只改开关也是不同的解法，幽灵轨迹必须重画。
 */
function armSignature(arms: Arm[]): string {
  return arms
    .map(
      (a) => (a.on ? '1' : '0') + a.r + ':' + a.freq + ':' + Math.round((a.phase * 180) / Math.PI),
    )
    .join('|');
}

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

/** 背景音乐开关（默认开：游戏该有配乐，且可一键关闭） */
function loadMusic(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== '0';
  } catch {
    return true;
  }
}

function loadPerfect(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(PERFECT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** 连胜记录形状 */
interface StreakRecord {
  streak: number;
  last: string;
}

function loadStreak(): StreakRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null');
    if (raw && typeof raw.streak === 'number' && typeof raw.last === 'string') return raw;
  } catch {
    /* 忽略 */
  }
  return { streak: 0, last: '' };
}

function loadExpert(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(EXPERT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadExact(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(EXACT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function loadFails(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FAIL_KEY) ?? '{}');
  } catch {
    return {};
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

/** 读取上届节奏存档（脏数据丢弃，见 pace.sanitizePace） */
function loadPace(): Record<string, Pace> {
  try {
    return sanitizePace(JSON.parse(localStorage.getItem(PACE_KEY) ?? '{}'));
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
  /** 背景音乐开关（持久化）：把指针参数实时合成为和声垫音 */
  musicOn = $state(loadMusic());
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
  /** 完美全清（100% 收集）过的关卡——三星之上的顶端追求 */
  perfectLevels = $state<Record<string, true>>(loadPerfect());
  /** 每日挑战连胜：{ streak, last } */
  dailyStreak = $state<StreakRecord>(loadStreak());
  /** 本局是否刷新了连胜（结算提示用） */
  streakJustBumped = $state(0);
  /** 达成"精确解"认证的关卡（参数与精确傅立叶分解一致，拟合度 ≥99%） */
  exactLevels = $state<Record<string, true>>(loadExact());
  /** 本局是否首次达成精确解认证 */
  newExact = $state(false);
  /** 专家模式：隐藏目标轮廓与预览轨迹，只能靠频谱与收集反馈调参 */
  expertMode = $state(false);
  /** 本局开始时的专家模式状态（结算判定用，避免中途切换影响） */
  private lastRunExpert = false;
  /** 专家模式全清过的关卡 */
  expertClears = $state<Record<string, true>>(loadExpert());
  /** 本局是否首次达成专家全清 */
  newExpertClear = $state(false);
  /** 各关连续 0 星次数（卡关提示的渐进解锁依据） */
  failCounts = $state<Record<string, number>>(loadFails());
  /** 本局是否首次达成完美全清（结算演出用） */
  newPerfect = $state(false);
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
  /** 本局新盖的朱印（结算演出一枚枚盖下来） */
  newSeals = $state<GoalId[]>([]);
  /** 本局已达成的星级档位（0~3）：运行中实时点亮，越过阈值时给一次弹动 */
  starReached = $state(0);
  /** 最近一次升档的时刻（Stage 用它做弹动动画） */
  starReachedAt = $state(0);
  /** 本局让某一章的朱印集齐 → 该章盖章节印（结算演出用） */
  newChapterSeal = $state<string | null>(null);
  /** 当前随机关卡生成时用的难度（关卡 id 不含难度，分享链接需要它） */
  randomDiff = $state<RandomDifficulty>('normal');
  /** 各关保存的解法参数（上届那局的指针配置） */
  armsSaves = $state<Record<string, Arm[]>>(loadArmsSaves());
  /** 各关上届节奏：每个点的收集时刻（与 armsSaves 同源，都是"上届"那一局） */
  paceSaves = $state<Record<string, Pace>>(loadPace());
  /** 每日挑战历史最佳得分（key = 日期） */
  dailyBest = $state<Record<string, number>>(loadDailyBest());
  /** 每关历史成绩（key = 关卡 id，最多 HISTORY_MAX 条，用于趋势展示） */
  history = $state<Record<string, HistoryEntry[]>>(loadHistory());
  /** 本局竞速结果：结束时相对上届的领先（+）/落后（−）点数；无上届为 null */
  lastGhostDelta = $state<number | null>(null);
  /** 通关演出：本局刚刚达成战役里程碑时置位（'cleared' 全关 ≥1★ / 'mastered' 全关 3★） */
  finale = $state<CampaignState | null>(null);
  /** 本局全清时刻（秒）；null = 未全清 */
  private clearT: number | null = null;
  /** 结算快照：全清用时 */
  lastClearT: number | null = null;

  /** 已收集点索引（画布渲染用，无需响应式） */
  readonly collected = new Set<number>();
  /** 本局每个点的收集时刻（游戏时间，秒）——结算时存入 paceSaves */
  collectTimes: number[] = [];
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
    // "继续游戏"要真的接着上次：能恢复就恢复，否则从第一关开始
    if (!this.restoreLastLevel()) this.loadLevel(LEVEL_DEFS[0]);
    // 静默恢复成就：存档里已有进度（如从备份导入）也应在打开面板时可见，
    // 且不弹 toast（首次游玩时逐个解锁的演出保留在 checkAchievements）
    for (const id of evalAchievements(this.achievementContext())) {
      if (!this.achievements[id]) this.achievements = { ...this.achievements, [id]: Date.now() };
    }
    try {
      localStorage.setItem(ACHV_KEY, JSON.stringify(this.achievements));
    } catch {
      /* 存储不可用则忽略 */
    }
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
    this.rememberLevel(def.id);
  }

  /**
   * 记住当前关卡，"继续游戏"下次直接回到这里。
   * 创作关没有保存系数、无法复现，不记住（回落第一关）。
   */
  private rememberLevel(id: string): void {
    if (id.startsWith('custom-')) return;
    try {
      localStorage.setItem(LAST_LEVEL_KEY, id);
    } catch {
      /* 存储不可用则忽略 */
    }
  }

  /**
   * 恢复上次游玩的关卡：
   * 内置关直接载入；随机关按邀请码复现；每日挑战按今天的日期重建。
   * 返回是否恢复成功（失败则调用方回落到第一关）。
   */
  private restoreLastLevel(): boolean {
    let id = '';
    try {
      id = localStorage.getItem(LAST_LEVEL_KEY) ?? '';
    } catch {
      return false;
    }
    if (!id) return false;
    const def = LEVEL_DEFS.find((d) => d.id === id);
    if (def) {
      this.loadLevel(def);
      return true;
    }
    // 随机关：标识里带难度（random-<seed>-<难度>），否则换难度会复现出另一条曲线
    const rand = parseRandomSpec(id);
    if (rand) {
      this.loadRandomSeed(rand.seed, rand.diff);
      return true;
    }
    if (id.startsWith('daily-')) {
      this.loadDaily();
      return true;
    }
    return false;
  }

  loadRandom(): void {
    this.loadRandomSeed(Math.floor(Math.random() * 1e9), this.difficulty);
  }

  /** 按邀请码（seed）重建随机关卡：同码必同关卡。难度不影响已有关卡复现 */
  loadRandomSeed(seed: number, diff: RandomDifficulty = 'normal'): void {
    this.cancelAutoSolve();
    this.sandbox = false;
    this.randomDiff = diff;
    this.level = makeRandomLevel(seed, diff);
    this.trimArmsToLimit();
    this.resetRun();
    this.markFlag('inviteLoaded');
    // 记忆里带上难度：续玩要复现同一条曲线（关卡 id 本身不含难度）
    this.rememberLevel(randomSpec(seed, diff));
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
    this.collectTimes = [];
    this.collectedCount = 0;
    this.score = 0;
    this.resultDismissed = false;
    this.lastCollectAt = -Infinity;
    this.fullClearAt = 0;
    this.clearT = null;
    this.newClearRecord = false;
    this.newRecord = false;
    this.lastGhostDelta = null;
    this.finale = null;
    this.newSeals = [];
    this.newChapterSeal = null;
    this.starReached = 0;
    this.starReachedAt = 0;
  }

  /** 关闭通关演出（继续挑战 / 回看关卡面板） */
  dismissFinale(): void {
    this.finale = null;
  }

  /** 当前战役状态：未通关 / 已通关 / 全三星精通 */
  get campaign(): CampaignState {
    return campaignState(this.bestStars, LEVEL_DEFS);
  }

  /** 本关调性：内置关按章节，随机关/每日/创作关按 id 稳定散列 */
  get musicalKey(): MusicalKey {
    return keyForLevel(this.level);
  }

  /** 本关音阶（约两个八度）：收集音效与拟合音都跟着调性走 */
  get collectScale(): number[] {
    return scaleNotes(this.musicalKey);
  }

  /** 指定关卡四个目标的达成状态（全部来自持久化进度） */
  goalStateOf(id: string): GoalState {
    return {
      stars: this.bestStars[id] ?? 0,
      perfect: !!this.perfectLevels[id],
      exact: !!this.exactLevels[id],
      expert: !!this.expertClears[id],
    };
  }

  /** 本关四个目标的达成状态（目标清单用） */
  get levelGoalState(): GoalState {
    return this.level
      ? this.goalStateOf(this.level.id)
      : { stars: 0, perfect: false, exact: false, expert: false };
  }

  /** 指定章节的朱印收集状态（集满则该章盖"章节印"） */
  chapterSealsOf(chapterId: string): ChapterSealState {
    const ids = LEVEL_DEFS.filter((d) => (d.chapter ?? 'basics') === chapterId).map((d) => d.id);
    return chapterSealState(ids, (id) => this.goalStateOf(id));
  }

  /** 全局朱印进度：全部内置关卡的印章数 + 已集齐的章节印数（标题页/结局/统计共用） */
  get sealSummary(): { done: number; total: number; chapters: number; chaptersTotal: number } {
    let done = 0;
    for (const d of LEVEL_DEFS) done += sealsDone(this.goalStateOf(d.id));
    let chapters = 0;
    for (const ch of CHAPTERS) if (this.chapterSealsOf(ch.id).sealed) chapters++;
    return {
      done,
      total: LEVEL_DEFS.length * 4,
      chapters,
      chaptersTotal: CHAPTERS.length,
    };
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
  /** 朋友分享来的解法是否已载入（提示条展示用） */
  remoteChallenge = $state(false);

  /**
   * 载入好友分享的解法参数。
   * 返回是否成功；成功时置 remoteChallenge 供 UI 提示。
   */
  applyArmsCode(code: string): boolean {
    const arms = decodeArms(code);
    if (!arms) return false;
    this.cancelAutoSolve();
    this.pushArmHistory(true);
    this.arms = arms;
    this.remoteChallenge = true;
    return true;
  }

  /** 终止自动拟合（用户主动操作 / 切关 / 退出沙盒时调用，防止插值覆盖新状态） */
  cancelAutoSolve(): void {
    this.autoSolve = false;
    this.autoFrom = null;
    this.autoTo = null;
  }

  /**
   * 一键套用精确分解参数（卡关求助用：提示解锁后由玩家主动点）。
   * 与"回放解法"不同，这个直接在编辑态落地参数，让卡住的玩家能立刻继续。
   * 返回套用了多少根指针（0 = 没有关卡）。
   */
  applyExactSolution(): number {
    if (!this.level) return 0;
    const sol = solveFromSpectrum(this.level.spectrum, this.level.armLimit);
    this.cancelAutoSolve();
    this.pushArmHistory(true); // 可撤销
    this.arms = sol.map((a) => ({ ...a }));
    this.trimArmsToLimit();
    return sol.filter((a) => a.on).length;
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
  /** 切换专家模式（隐藏轮廓与预览，硬核挑战） */
  toggleExpert(): void {
    this.expertMode = !this.expertMode;
  }

  /** 当前关是否已在专家模式下全清 */
  get isExpertClear(): boolean {
    return !!this.level && !!this.expertClears[this.level.id];
  }

  /** 当前关是否已达成精确解认证 */
  get isExact(): boolean {
    return !!this.level && !!this.exactLevels[this.level.id];
  }

  /**
   * 首关手把手引导是否显示：从未完成过引导、当前是圆关、且圆关还没拿过星。
   * 入门容易——第一次打开就知道第一步该做什么。
   */
  get showFirstGuide(): boolean {
    if (this.flags.guideDone) return false;
    if (this.sandbox) return false;
    if (this.level?.id !== 'circle') return false;
    return (this.bestStars['circle'] ?? 0) === 0;
  }

  /** 引导第 1 步是否已达成（半径调到 120 附近——默认 130 需玩家主动贴近目标） */
  get guideRReady(): boolean {
    const a = this.arms[0];
    return !!a && a.on && a.r >= 115 && a.r <= 125;
  }

  /** 当前关是否已达成完美全清 */
  get isPerfect(): boolean {
    return !!this.level && !!this.perfectLevels[this.level.id];
  }

  /**
   * 是否解锁"精确参数提示"：同一关连续 2 次 0 星后浮现。
   * 入门容易——但提示是主动求助出来的，不破坏自己发现的乐趣。
   */
  get hintUnlocked(): boolean {
    if (!this.level) return false;
    return (this.failCounts[this.level.id] ?? 0) >= 2;
  }

  /** 本关精确分解参数文本（卡关求助用，如「① 112 / 4×顺 / 0°」） */
  exactSolutionText(): string {
    if (!this.level) return '';
    const sol = solveFromSpectrum(this.level.spectrum, this.level.armLimit);
    return sol
      .map((a, i) => (a.on ? { a, i } : null))
      .filter((x): x is { a: Arm; i: number } => x !== null)
      .map(({ a, i }) => {
        const raw = Math.round((a.phase * 180) / Math.PI) % 360;
        const deg = raw < 0 ? raw + 360 : raw;
        const dir = a.freq < 0 ? '逆' : '顺';
        return CIRCLED[i] + ' ' + a.r + ' / ' + Math.abs(a.freq) + '×' + dir + ' / ' + deg + '°';
      })
      .join('　');
  }

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

  /** 成就判定上下文（进度 + 各章朱印是否集齐），构造与重判共用一份 */
  private achievementContext(): AchievementContext {
    const chapterSeals: Record<string, boolean> = {};
    for (const ch of CHAPTERS) chapterSeals[ch.id] = this.chapterSealsOf(ch.id).sealed;
    return {
      bestStars: this.bestStars,
      bestScores: this.bestScores,
      bestClears: this.bestClears,
      flags: this.flags,
      levelCount: LEVEL_DEFS.length,
      perfect: this.perfectLevels,
      exact: this.exactLevels,
      expert: this.expertClears,
      chapterSeals,
      chapterCount: CHAPTERS.length,
    };
  }

  /** 重新判定成就，新解锁的依次弹出提示 */
  checkAchievements(): void {
    const now = Date.now();
    for (const id of evalAchievements(this.achievementContext())) {
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
    this.lastRunExpert = this.expertMode;
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

  /** 背景音乐开关（持久化） */
  setMusic(on: boolean): void {
    this.musicOn = on;
    try {
      localStorage.setItem(MUSIC_KEY, on ? '1' : '0');
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
    // 结算前的印章状态：用来算"本局新盖了哪几枚"、以及本章是否刚集齐
    const sealsBefore = new Set(
      levelGoals(this.levelGoalState)
        .filter((g) => g.done)
        .map((g) => g.id),
    );
    const chapterId = this.level?.chapter ?? '';
    const chapterSealedBefore = chapterId !== '' && this.chapterSealsOf(chapterId).sealed;
    // 完美全清（100%）：三星之上的顶端追求，首次达成给特殊演出
    this.newPerfect = false;
    if (this.total > 0 && this.collectedCount === this.total && !this.perfectLevels[id]) {
      this.perfectLevels = { ...this.perfectLevels, [id]: true };
      this.newPerfect = true;
      try {
        localStorage.setItem(PERFECT_KEY, JSON.stringify(this.perfectLevels));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    // 专家全清（无轮廓预览下全清）：硬核技巧认证
    this.newExpertClear = false;
    if (
      this.lastRunExpert &&
      this.total > 0 &&
      this.collectedCount === this.total &&
      !this.expertClears[id]
    ) {
      this.expertClears = { ...this.expertClears, [id]: true };
      this.newExpertClear = true;
      try {
        localStorage.setItem(EXPERT_KEY, JSON.stringify(this.expertClears));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    // 精确解认证（精通新维度：方法正确，而不只是结果达标）
    this.newExact = false;
    if (this.level && !this.exactLevels[id]) {
      const fit = fitScore(this.level.spectrum, this.arms);
      if (fit >= EXACT_FIT) {
        this.exactLevels = { ...this.exactLevels, [id]: true };
        this.newExact = true;
        try {
          localStorage.setItem(EXACT_KEY, JSON.stringify(this.exactLevels));
        } catch {
          /* 存储不可用则忽略 */
        }
      }
    }
    // 首关引导：圆关跑完一局即视为"已学会"，不再打扰
    if (id === 'circle') this.markFlag('guideDone');
    // 卡关计数：0 星累加，拿到星即清零（渐进式求助提示的依据）
    const nextFails =
      st === 0
        ? { ...this.failCounts, [id]: (this.failCounts[id] ?? 0) + 1 }
        : { ...this.failCounts };
    if (st > 0) delete nextFails[id];
    this.failCounts = nextFails;
    try {
      localStorage.setItem(FAIL_KEY, JSON.stringify(this.failCounts));
    } catch {
      /* 存储不可用则忽略 */
    }
    const starsBeforeThisRun = this.bestStars;
    if (st > (this.bestStars[id] ?? 0)) {
      this.bestStars = { ...this.bestStars, [id]: st };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(this.bestStars));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
    // 本局新盖的朱印：与"本关目标"面板同一套判定，结算时一枚枚盖下来
    this.newSeals = levelGoals(this.levelGoalState)
      .filter((g) => g.done && !sealsBefore.has(g.id))
      .map((g) => g.id);
    // 章节印：本局的最后一枚印正好把本章四印集齐 → 盖章节大印
    this.newChapterSeal =
      chapterId !== '' && !chapterSealedBefore && this.chapterSealsOf(chapterId).sealed
        ? chapterId
        : null;

    // 通关演出：本局让战役状态发生了跨级（未通关 → 通关 → 精通）才触发，
    // 之后重复游玩不会反复弹（before === after）
    this.finale = null;
    const before = campaignState(starsBeforeThisRun, LEVEL_DEFS);
    const after = campaignState(this.bestStars, LEVEL_DEFS);
    if (after !== before) this.finale = after === 'mastered' ? 'mastered' : 'cleared';

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

    // 竞速结果快照：必须赶在覆盖上届节奏之前算，否则就成了自己跟自己比
    this.lastGhostDelta = this.ghostComparable ? this.ghostDelta : null;

    // 上届那局的解法参数与节奏入档（"载入上届解法" + "上届节奏"竞速用）
    // 两者必须同源：同一条金色虚线轨迹，配上同一局的时间线
    if (this.score > 0) {
      this.armsSaves = { ...this.armsSaves, [id]: this.arms.map((a) => ({ ...a })) };
      try {
        localStorage.setItem(ARMS_SAVE_KEY, JSON.stringify(this.armsSaves));
      } catch {
        /* 存储不可用则忽略 */
      }
      if (this.collectTimes.length > 0) {
        this.paceSaves = { ...this.paceSaves, [id]: [...this.collectTimes] };
        try {
          localStorage.setItem(PACE_KEY, JSON.stringify(this.paceSaves));
        } catch {
          /* 存储不可用则忽略 */
        }
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
    // 每日挑战连胜：今天首次完成即累加（昨天完成过则 +1，否则重新从 1 开始）
    if (id.startsWith('daily-')) this.bumpDailyStreak();
    this.checkAchievements();
  }

  /** 每日挑战连胜结算：同一天只记一次 */
  private bumpDailyStreak(): void {
    const today = todayKey();
    if (this.dailyStreak.last === today) {
      this.streakJustBumped = 0;
      return;
    }
    const streak = this.dailyStreak.last === yesterdayKey() ? this.dailyStreak.streak + 1 : 1;
    this.dailyStreak = { streak, last: today };
    this.streakJustBumped = streak;
    if (streak >= 7) this.markFlag('streak7');
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(this.dailyStreak));
    } catch {
      /* 存储不可用则忽略 */
    }
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
    this.rememberLevel(this.level.id);
  }

  /** 某天是否打过每日挑战（任意难度有得分即算） */
  dailyDoneOn(date: string): boolean {
    const prefix = 'daily-' + date + '-';
    return Object.entries(this.dailyBest).some(([k, v]) => k.startsWith(prefix) && v > 0);
  }

  /**
   * 今日最佳得分（同一天的各难度取最高）。
   * 注意每日关卡的 id 是 daily-<日期>-<难度>，不能只按日期前缀取键。
   */
  get todayBest(): number {
    const prefix = 'daily-' + todayKey() + '-';
    let best = 0;
    for (const [k, v] of Object.entries(this.dailyBest)) {
      if (k.startsWith(prefix) && v > best) best = v;
    }
    return best;
  }

  /** 最近 7 天的每日挑战完成情况（旧 → 新，最后一项是今天） */
  get dailyWeek(): { date: string; label: string; done: boolean; today: boolean }[] {
    const today = todayKey();
    const labels = ['日', '一', '二', '三', '四', '五', '六'];
    return lastNDays(7).map((date) => ({
      date,
      label: labels[new Date(date + 'T00:00:00').getDay()],
      done: this.dailyDoneOn(date),
      today: date === today,
    }));
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

  /* ---------- 上届节奏（幽灵竞速） ---------- */

  /** 上届节奏：每个点的收集时刻（未存过则 undefined） */
  get savedPace(): Pace | undefined {
    const id = this.level?.id;
    return id ? this.paceSaves[id] : undefined;
  }

  /** 当前指针组是否与上届解法一致（一致则轨迹必然同步，无需竞速显示） */
  get sameArmsAsSaved(): boolean {
    const id = this.level?.id;
    const saved = id ? this.armsSaves[id] : undefined;
    if (!saved) return false;
    return armSignature(saved) === armSignature(this.arms);
  }

  /** 是否处于可与上届竞速的状态：非编辑态 + 有上届节奏 + 参数与上届不同 */
  get ghostComparable(): boolean {
    return this.phase !== 'edit' && !!this.savedPace?.length && !this.sameArmsAsSaved;
  }

  /** 是否绘制上届解法的幽灵轨迹（有解法存档且当前参数不同；老存档无节奏也照画） */
  get ghostPathVisible(): boolean {
    return this.phase !== 'edit' && this.hasSavedArms() && !this.sameArmsAsSaved;
  }

  /** 当前时刻上届已收集的点数 */
  get ghostProgress(): number {
    return ghostProgressAt(this.savedPace, this.t);
  }

  /** 当前领先（+）/落后（−）上届的点数 */
  get ghostDelta(): number {
    return paceDelta(this.savedPace, this.t, this.collectedCount);
  }

  /** 上届在当前时刻的进度比例（0~1，画布进度条刻度用） */
  get ghostRatio(): number {
    return paceRatio(this.savedPace, this.t, this.total);
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
        this.collectTimes.push(this.t);
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
    // 星级阈值实时反馈：越过 35% / 65% / 90% 时点亮（Stage 画布上的星条 + 一声提示）
    if (!this.sandbox && this.total > 0) {
      const tier = starsFor(this.collectedCount / this.total);
      if (tier > this.starReached) {
        this.starReached = tier;
        this.starReachedAt = performance.now();
      }
    }
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
