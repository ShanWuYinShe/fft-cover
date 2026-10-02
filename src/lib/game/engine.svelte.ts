import { BEST_KEY, RUN_DUR, STAR_LEVELS } from './constants';
import { LEVEL_DEFS, makeLevel, makeRandomLevel } from './levels';
import { tipAt } from './math';
import type { Arm, GamePhase, Level, LevelDef, Vec } from './types';

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

/** 按收集比例定星级 */
export function starsFor(p: number): number {
  return p >= STAR_LEVELS[0] ? 3 : p >= STAR_LEVELS[1] ? 2 : p >= STAR_LEVELS[2] ? 1 : 0;
}

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
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
  /** 音效开关 */
  soundOn = $state(true);
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

  get runLabel(): string {
    return this.phase === 'running' ? '⏸ 暂停' : '▶ 开始旋转';
  }

  loadLevel(def: LevelDef): void {
    this.level = makeLevel(def);
    this.resetRun();
  }

  loadRandom(): void {
    this.level = makeRandomLevel(Math.floor(Math.random() * 1e9));
    this.resetRun();
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
  }

  /** 从编辑/暂停态开始或继续 */
  startRun(): void {
    this.phase = 'running';
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

  /** 停止并结算星级（记录最佳） */
  stopRun(): void {
    if (this.phase !== 'running' && this.phase !== 'paused') return;
    this.phase = 'done';
    const ratio = this.total ? this.collectedCount / this.total : 0;
    const st = starsFor(ratio);
    const id = this.level?.id;
    if (id && st > (this.bestStars[id] ?? 0)) {
      this.bestStars = { ...this.bestStars, [id]: st };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(this.bestStars));
      } catch {
        /* 存储不可用则忽略 */
      }
    }
  }

  /** 修改第 i 根指针参数 */
  setArm(i: number, patch: Partial<Arm>): void {
    Object.assign(this.arms[i], patch);
  }

  /** 尖端处尝试收集，返回是否命中新点 */
  private collectAt(p: Vec): boolean {
    const pts = this.level?.pts;
    if (!pts) return false;
    const tolSq = (this.level?.tol ?? 13) ** 2;
    for (let i = 0; i < pts.length; i++) {
      if (this.collected.has(i)) continue;
      const dx = pts[i].x - p.x;
      const dy = pts[i].y - p.y;
      if (dx * dx + dy * dy < tolSq) {
        this.collected.add(i);
        this.collectAnim.set(i, performance.now());
        this.collectedCount++;
        this.combo++;
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
    this.t = Math.min(this.t + dt, RUN_DUR);
    let got = 0;
    const SUB = 6;
    for (let s = 1; s <= SUB; s++) {
      const st = prev + ((this.t - prev) * s) / SUB;
      const p = tipAt(this.arms, st);
      if (this.collectAt(p)) got++;
      this.trail.push({ x: p.x, y: p.y });
    }
    if (this.trail.length > 2400) this.trail.splice(0, this.trail.length - 2400);
    let finished = false;
    if (this.t >= RUN_DUR) {
      this.stopRun();
      finished = true;
    }
    return { got, finished };
  }
}

/** 全局单例 */
export const engine = new GameEngine();
