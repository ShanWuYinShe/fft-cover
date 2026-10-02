import { ARMS_MAX, BEST_KEY, BEST_SCORE_KEY, COMBO_WINDOW, RUN_DUR, SOUND_KEY } from './constants';
import { LEVEL_DEFS, makeLevel, makeRandomLevel } from './levels';
import { tipAt } from './math';
import { scoreForPoint, starsFor } from './scoring';
import type { Arm, GamePhase, Level, LevelDef, Vec } from './types';

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
  private lastCollectAt = -Infinity;
  /** 音效开关（持久化） */
  soundOn = $state(loadSound());
  /** 沙盒模式：无限时长自由旋转，成绩不计入记录 */
  sandbox = $state(false);
  /** 刚结束的一局是否为沙盒（结算浮层展示用） */
  lastRunSandbox = $state(false);
  /** 各关卡历史最佳星级 */
  bestStars = $state<Record<string, number>>(loadBest());

  /** 已收集点索引（画布渲染用，无需响应式） */
  readonly collected = new Set<number>();
  /** 收集时刻（发光动画） */
  readonly collectAnim = new Map<number, number>();
  /** 运行尾迹 */
  trail: Vec[] = [];
  /** 连击数（音高用） */
  combo = 0;

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
    this.level = makeLevel(def);
    this.trimArmsToLimit();
    this.resetRun();
  }

  loadRandom(): void {
    this.loadRandomSeed(Math.floor(Math.random() * 1e9));
  }

  /** 按邀请码（seed）重建随机关卡：同码必同关卡 */
  loadRandomSeed(seed: number): void {
    this.sandbox = false;
    this.level = makeRandomLevel(seed);
    this.trimArmsToLimit();
    this.resetRun();
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
  }

  /** 结束沙盒：展示成果但不记录 */
  exitSandbox(): void {
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
    for (const a of this.arms) {
      if (!a.on) continue;
      a.r = Math.round(30 + Math.random() * 120);
      a.phase = (Math.round(Math.random() * 360) * Math.PI) / 180;
    }
  }

  /** 全部指针清零关闭 */
  clearArms(): void {
    for (const a of this.arms) {
      a.on = false;
      a.r = 60;
      a.phase = 0;
    }
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
  stopRun(): void {
    if (this.phase !== 'running' && this.phase !== 'paused') return;
    this.phase = 'done';
    this.resultDismissed = false;
    if (this.sandbox) {
      this.sandbox = false;
      return;
    }
    const ratio = this.total ? this.collectedCount / this.total : 0;
    const st = starsFor(ratio);
    const id = this.level?.id;
    if (!id) return;
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
  }

  /** 修改第 i 根指针参数（启用受本关上限约束） */
  setArm(i: number, patch: Partial<Arm>): void {
    if (patch.on === true && !this.arms[i].on && !this.canEnableMore()) return;
    Object.assign(this.arms[i], patch);
  }

  /** 是否还能再启用一根指针 */
  canEnableMore(): boolean {
    return this.arms.filter((a) => a.on).length < (this.level?.armLimit ?? ARMS_MAX);
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
    const prev = this.t;
    // 沙盒不设时长上限（封顶防浮点溢出），也不自动结算
    this.t = Math.min(this.t + dt, this.sandbox ? 100000 : RUN_DUR);
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
    return { got, finished };
  }
}

/** 全局单例 */
export const engine = new GameEngine();
