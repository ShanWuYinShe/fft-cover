import type { Arm, SpectrumEntry } from './types';
import { STAR_LEVELS } from './constants';

/** 按收集比例定星级（≥90% 三星、≥65% 二星、≥35% 一星） */
export function starsFor(p: number): number {
  return p >= STAR_LEVELS[0] ? 3 : p >= STAR_LEVELS[1] ? 2 : p >= STAR_LEVELS[2] ? 1 : 0;
}

/** 连击中第 combo 击收集的点得分：100 × (1 + combo) */
export function scoreForPoint(combo: number): number {
  return 100 * (1 + combo);
}

/** 指针组的等效频谱：同频率指针向量化叠加（k ≠ 0） */
export function armSpectrum(arms: Arm[]): Map<number, { re: number; im: number }> {
  const map = new Map<number, { re: number; im: number }>();
  for (const a of arms) {
    if (!a.on) continue;
    const cur = map.get(a.freq) ?? { re: 0, im: 0 };
    cur.re += a.r * Math.cos(a.phase);
    cur.im += a.r * Math.sin(a.phase);
    map.set(a.freq, cur);
  }
  return map;
}

export interface SpectrumGap {
  k: number;
  /** 需要修正的模（画布像素） */
  mag: number;
  /** 1 = 该频率能量不足，-1 = 过量 */
  sign: 1 | -1;
}

/**
 * 偏差诊断：对比目标频谱与玩家当前频谱，返回差距最大的前 2 个频率分量。
 * 跳过 k=0（直流项，指针链无法表达）与已贴合项（差 < 4px）。
 */
export function spectrumGaps(target: SpectrumEntry[], arms: Arm[], top = 2): SpectrumGap[] {
  const cur = armSpectrum(arms);
  const gaps: SpectrumGap[] = [];
  for (const t of target) {
    if (t.k === 0) continue;
    const c = cur.get(t.k) ?? { re: 0, im: 0 };
    const tr = t.mag * Math.cos(t.phase);
    const ti = t.mag * Math.sin(t.phase);
    const mag = Math.hypot(tr - c.re, ti - c.im);
    if (mag < 4) continue;
    gaps.push({ k: t.k, mag, sign: mag * mag * 2 > t.mag * t.mag ? -1 : 1 });
  }
  for (const [k, c] of cur) {
    if (target.some((t) => t.k === k)) continue;
    const mag = Math.hypot(c.re, c.im);
    if (mag >= 4) gaps.push({ k, mag, sign: -1 });
  }
  gaps.sort((a, b) => b.mag - a.mag);
  return gaps.slice(0, top);
}

/**
 * 拟合度：目标频谱与玩家频谱的相对误差（0~1，1 = 完全贴合）。
 * k=0 直流项与玩家多余分量均计入偏差。
 */
export function fitScore(target: SpectrumEntry[], arms: Arm[]): number {
  const cur = armSpectrum(arms);
  let num = 0;
  let den = 0;
  for (const t of target) {
    if (t.k === 0) continue;
    const c = cur.get(t.k) ?? { re: 0, im: 0 };
    const tr = t.mag * Math.cos(t.phase);
    const ti = t.mag * Math.sin(t.phase);
    num += (tr - c.re) ** 2 + (ti - c.im) ** 2;
    den += tr * tr + ti * ti;
  }
  for (const [k, c] of cur) {
    if (k === 0 || target.some((t) => t.k === k)) continue;
    num += c.re ** 2 + c.im ** 2;
  }
  if (den === 0) return num === 0 ? 1 : 0;
  return Math.max(0, 1 - Math.sqrt(num / den));
}

/**
 * 从目标频谱直接解出指针参数（DFT 系数即答案）：
 * 按模排序取前 limit 根，相位归一到 [0, 2π)。
 * 返回固定 10 槽位的指针数组（未用槽位关闭、半径 0）。
 */
export function solveFromSpectrum(spectrum: SpectrumEntry[], limit: number, slots = 10): Arm[] {
  const sorted = spectrum
    .filter((s) => s.k !== 0)
    .sort((a, b) => b.mag - a.mag)
    .slice(0, limit);
  const out: Arm[] = Array.from({ length: slots }, () => ({ on: false, r: 0, freq: 1, phase: 0 }));
  sorted.forEach((s, i) => {
    let phase = s.phase;
    if (phase < 0) phase += Math.PI * 2;
    out[i] = { on: true, r: Math.round(s.mag), freq: s.k, phase };
  });
  return out;
}

/** 成就分组（面板按组展示，一眼看清自己还差什么） */
export interface AchievementGroup {
  id: string;
  name: string;
}

export const ACHV_GROUPS: AchievementGroup[] = [
  { id: 'start', name: '初识' },
  { id: 'mastery', name: '精通' },
  { id: 'collect', name: '收藏' },
  { id: 'challenge', name: '挑战' },
];

/** 成就定义 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** 所属分组（ACHV_GROUPS 的 id） */
  group: string;
  /**
   * 可量化成就的进度算法（声明在定义旁，与 evalAchievements 的判定同源）。
   * 不给就是不可量化（成就面板不显示进度条）。
   */
  progress?: (ctx: AchievementContext) => AchievementProgress;
}

/** 全部成就 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-star', name: '初露锋芒', desc: '获得第一颗星', group: 'start' },
  { id: 'first-clear', name: '首次全清', desc: '收集齐任意一关的全部点', group: 'start' },
  { id: 'sandboxer', name: '自由爵士', desc: '体验一次沙盒模式', group: 'start' },
  { id: 'drag-master', name: '机械臂大师', desc: '用画布拖拽调过指针', group: 'start' },
  { id: 'auto-try', name: '数学魔法', desc: '体验过自动拟合演示', group: 'start' },
  { id: 'composer', name: '造物主', desc: '用谐波合成器创作过关卡', group: 'start' },
  {
    id: 'combo-king',
    name: '连击之王',
    desc: '单局得分达到 30000',
    group: 'mastery',
    progress: (c) => ({
      have: Object.values(c.bestScores).reduce((a, b) => Math.max(a, b), 0),
      need: 30000,
      unit: 'points',
    }),
  },
  {
    id: 'half-stars',
    name: '半程大师',
    desc: '总星数达到满分一半',
    group: 'mastery',
    progress: (c) => ({
      have: builtInStarStats(c).sum,
      need: Math.ceil(builtInStarStats(c).count * 1.5),
      unit: 'stars',
    }),
  },
  {
    id: 'all-three',
    name: '谐波大师',
    desc: '全部内置关卡三星',
    group: 'mastery',
    progress: (c) => ({
      have: builtInStarStats(c).threeStar,
      need: builtInStarStats(c).count,
      unit: 'levels',
    }),
  },
  {
    id: 'all-perfect',
    name: '完美主义',
    desc: '全部内置关卡完美全清（100%）',
    group: 'mastery',
    progress: (c) => ({
      have: builtInCountOf(c, c.perfect),
      need: builtInStarStats(c).count,
      unit: 'levels',
    }),
  },
  {
    id: 'exact-award',
    name: '精确分解',
    desc: '全部内置关卡达成精确解认证（拟合度 ≥99%）',
    group: 'mastery',
    progress: (c) => ({
      have: builtInCountOf(c, c.exact),
      need: builtInStarStats(c).count,
      unit: 'levels',
    }),
  },
  {
    id: 'expert-all',
    name: '盲眼大师',
    desc: '专家模式（无轮廓预览）下全清全部内置关卡',
    group: 'mastery',
    progress: (c) => ({
      have: builtInCountOf(c, c.expert),
      need: builtInStarStats(c).count,
      unit: 'levels',
    }),
  },
  {
    id: 'chapter-seal',
    name: '一方之印',
    desc: '集齐任意一章的全部朱印（章节印）',
    group: 'collect',
    progress: (c) => ({ have: sealedCount(c), need: 1, unit: 'seals' }),
  },
  {
    id: 'all-chapter-seals',
    name: '印满山河',
    desc: '全部章节印集齐',
    group: 'collect',
    progress: (c) => ({ have: sealedCount(c), need: c.chapterCount ?? 5, unit: 'seals' }),
  },
  {
    id: 'craft-master',
    name: '巧变三器',
    desc: '第六章「巧变」三关全部三星',
    group: 'mastery',
  },
  { id: 'daily-player', name: '每日一练', desc: '每日挑战中拿到得分', group: 'challenge' },
  {
    id: 'streak-7',
    name: '日拱一卒',
    desc: '每日挑战连续完成 7 天',
    group: 'challenge',
    progress: (c) => ({ have: c.dailyStreak ?? 0, need: 7, unit: 'days' }),
  },
  {
    id: 'streak-30',
    name: '月月有余',
    desc: '每日挑战连续完成 30 天',
    group: 'challenge',
    progress: (c) => ({ have: c.dailyStreak ?? 0, need: 30, unit: 'days' }),
  },
  { id: 'weekly-clear', name: '周而复始', desc: '完成本周挑战（全清收集）', group: 'challenge' },
  { id: 'inviter', name: '牵线搭桥', desc: '使用过随机关邀请码', group: 'challenge' },
  { id: 'speed-demon', name: '光速谐波', desc: '任意一关 8 秒内全清', group: 'challenge' },
];

/** 成就判定上下文（全部来自引擎的持久化数据） */
export interface AchievementContext {
  bestStars: Record<string, number>;
  bestScores: Record<string, number>;
  bestClears: Record<string, number>;
  flags: Record<string, boolean>;
  /** 内置关卡总数（总星数满分 = 关卡数 × 3） */
  levelCount: number;
  /** 完美全清（100% 收集）的关卡集合 */
  perfect?: Record<string, true>;
  /** 达成精确解认证的关卡集合 */
  exact?: Record<string, true>;
  /** 专家模式全清的关卡集合 */
  expert?: Record<string, true>;
  /** 各章是否已集齐全部朱印（章节印），key = 章节 id */
  chapterSeals?: Record<string, boolean>;
  /** 章节总数（判断"全部章节印"用） */
  chapterCount?: number;
  /**
   * 内置关卡 id 集合。"全部内置关卡…"这类成就只看这些关卡——
   * 随机关/每日关/创作关的成绩也存在同一张表里，不过滤就会被它们冒充进度。
   */
  builtInIds?: string[];
  /** 各章总星数（key = 章节 id），用于"某一章全三星"类成就 */
  chapterStars?: Record<string, number>;
  /** 每日挑战当前连胜天数（streak 类成就的进度来源） */
  dailyStreak?: number;
  /** 当前 ISO 周键（如 2026-W41），判断"本周挑战"类成就用 */
  weekKey?: string;
}

/** 可量化成就的进度（have/need 同单位） */
export interface AchievementProgress {
  have: number;
  need: number;
  /** 进度单位（星 / 关 / 印 / 天 / 分） */
  unit: string;
}

// ---- 成就进度的共享口径（builtInIds 过滤等），定义旁的 progress 都用它 ----

/** 内置关星的统计：总数 / 星数和 / 三星关数（口径与 evalAchievements 一致） */
function builtInStarStats(ctx: AchievementContext): {
  count: number;
  sum: number;
  threeStar: number;
} {
  const builtIn = new Set(ctx.builtInIds ?? []);
  const stars = Object.entries(ctx.bestStars)
    .filter(([k]) => builtIn.size === 0 || builtIn.has(k))
    .map(([, v]) => v);
  return {
    count: builtIn.size || ctx.levelCount,
    sum: stars.reduce((a, b) => a + b, 0),
    threeStar: stars.filter((s) => s >= 3).length,
  };
}

/** 集合里属于内置关的条数（完美 / 精确 / 专家共用） */
function builtInCountOf(ctx: AchievementContext, m?: Record<string, unknown>): number {
  if (!m) return 0;
  const builtIn = new Set(ctx.builtInIds ?? []);
  return Object.keys(m).filter((k) => builtIn.size === 0 || builtIn.has(k)).length;
}

/** 已集齐的章节印数 */
function sealedCount(ctx: AchievementContext): number {
  return Object.values(ctx.chapterSeals ?? {}).filter(Boolean).length;
}

/**
 * 某个可量化成就的当前进度（未达成的拿来展示"还差多少"）。
 * 算法声明在各成就定义的 progress 字段上——判定与进度同源，新成就只写一处。
 * 不可量化的成就返回 null。
 */
export function achievementProgress(
  id: string,
  ctx: AchievementContext,
): AchievementProgress | null {
  return ACHIEVEMENTS.find((a) => a.id === id)?.progress?.(ctx) ?? null;
}

/** 按上下文返回全部已达成成就的 id */
export function evalAchievements(ctx: AchievementContext): string[] {
  const unlocked: string[] = [];
  const stars = Object.values(ctx.bestStars);
  const any = (v: Record<string, number>, pred: (n: number) => boolean) =>
    Object.values(v).some(pred);
  if (stars.some((s) => s >= 1)) unlocked.push('first-star');
  if (any(ctx.bestClears, () => true)) unlocked.push('first-clear');
  if (any(ctx.bestScores, (s) => s >= 30000)) unlocked.push('combo-king');
  // "全部内置关卡…"类成就：只看内置关（随机关/每日关的成绩同表存放，必须过滤）
  const builtIn = new Set(ctx.builtInIds ?? []);
  const isBuiltIn = (id: string): boolean => builtIn.size === 0 || builtIn.has(id);
  const builtInStars = Object.entries(ctx.bestStars)
    .filter(([id]) => isBuiltIn(id))
    .map(([, v]) => v);
  const builtInCount = builtIn.size || ctx.levelCount;
  const builtInStarSum = builtInStars.reduce((a, b) => a + b, 0);
  if (builtInStars.length >= builtInCount && builtInStarSum >= builtInCount * 3) {
    unlocked.push('all-three');
  }
  if (any(ctx.bestClears, (t) => t <= 8)) unlocked.push('speed-demon');
  if (ctx.flags.sandboxUsed) unlocked.push('sandboxer');
  if (ctx.flags.inviteLoaded) unlocked.push('inviter');
  if (ctx.flags.dragUsed) unlocked.push('drag-master');
  if (ctx.flags.dailyWon) unlocked.push('daily-player');
  if (ctx.flags.streak7) unlocked.push('streak-7');
  if (ctx.flags.streak30) unlocked.push('streak-30');
  // 周而复始：**本周**的每周挑战被 100% 全清（全清记录按关卡 id 存）
  if (ctx.weekKey && (ctx.perfect ?? {})[`weekly-${ctx.weekKey}-hard`]) {
    unlocked.push('weekly-clear');
  }
  if (ctx.flags.autoTry) unlocked.push('auto-try');
  if (ctx.flags.composerPlayed) unlocked.push('composer');
  if (builtInStarSum >= builtInCount * 1.5) unlocked.push('half-stars');
  // 巧变三器：第六章三关全部三星（3 关 × 3 星 = 9）
  if ((ctx.chapterStars?.craft ?? 0) >= 9) unlocked.push('craft-master');
  // 完美主义：全部内置关卡都达成 100% 全清（顶端追求）
  const perfectCount = Object.keys(ctx.perfect ?? {}).filter(isBuiltIn).length;
  if (perfectCount >= builtInCount) unlocked.push('all-perfect');
  // 精确分解：全部内置关卡都达成精确解认证
  const exactCount = Object.keys(ctx.exact ?? {}).filter(isBuiltIn).length;
  if (exactCount >= builtInCount) unlocked.push('exact-award');
  // 盲眼大师：全部内置关卡在专家模式下全清
  const expertCount = Object.keys(ctx.expert ?? {}).filter(isBuiltIn).length;
  if (expertCount >= builtInCount) unlocked.push('expert-all');
  // 章节印：集齐任意一章 / 全部章节
  const sealedCount = Object.values(ctx.chapterSeals ?? {}).filter(Boolean).length;
  if (sealedCount >= 1) unlocked.push('chapter-seal');
  if (sealedCount >= (ctx.chapterCount ?? 5)) unlocked.push('all-chapter-seals');
  return unlocked;
}
