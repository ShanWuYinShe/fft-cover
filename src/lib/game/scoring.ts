import { STAR_LEVELS } from './constants';

/** 按收集比例定星级（≥90% 三星、≥65% 二星、≥35% 一星） */
export function starsFor(p: number): number {
  return p >= STAR_LEVELS[0] ? 3 : p >= STAR_LEVELS[1] ? 2 : p >= STAR_LEVELS[2] ? 1 : 0;
}

/** 连击中第 combo 击收集的点得分：100 × (1 + combo) */
export function scoreForPoint(combo: number): number {
  return 100 * (1 + combo);
}

/** 成就定义 */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

/** 全部成就 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-star', name: '初露锋芒', desc: '获得第一颗星' },
  { id: 'first-clear', name: '首次全清', desc: '收集齐任意一关的全部点' },
  { id: 'combo-king', name: '连击之王', desc: '单局得分达到 30000' },
  { id: 'all-three', name: '谐波大师', desc: '全部内置关卡三星' },
  { id: 'speed-demon', name: '光速谐波', desc: '任意一关 8 秒内全清' },
  { id: 'sandboxer', name: '自由爵士', desc: '体验一次沙盒模式' },
  { id: 'inviter', name: '牵线搭桥', desc: '使用过随机关邀请码' },
  { id: 'drag-master', name: '机械臂大师', desc: '用画布拖拽调过指针' },
];

/** 成就判定上下文（全部来自引擎的持久化数据） */
export interface AchievementContext {
  bestStars: Record<string, number>;
  bestScores: Record<string, number>;
  bestClears: Record<string, number>;
  flags: Record<string, boolean>;
  /** 内置关卡总数（总星数满分 = 关卡数 × 3） */
  levelCount: number;
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
  if (stars.length >= ctx.levelCount && stars.reduce((a, b) => a + b, 0) >= ctx.levelCount * 3) {
    unlocked.push('all-three');
  }
  if (any(ctx.bestClears, (t) => t <= 8)) unlocked.push('speed-demon');
  if (ctx.flags.sandboxUsed) unlocked.push('sandboxer');
  if (ctx.flags.inviteLoaded) unlocked.push('inviter');
  if (ctx.flags.dragUsed) unlocked.push('drag-master');
  return unlocked;
}
