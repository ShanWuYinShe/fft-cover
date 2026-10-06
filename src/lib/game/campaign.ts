import { CHAPTERS, type ChapterDef } from './levels';
import type { LevelDef } from './types';

/**
 * 战役进度：把关卡列表当作一条通关路线来组织。
 * 关卡面板的章节进度与"通关演出"都从这里取数，避免规则散落。
 */

/** 战役状态：未通关 / 已通关（内置关卡全部 ≥1★）/ 精通（全部 3★） */
export type CampaignState = 'none' | 'cleared' | 'mastered';

/** 每章的通关进度 */
export interface ChapterProgress extends ChapterDef {
  /** 本章关卡（按定义顺序） */
  levels: LevelDef[];
  /** 本章已获得星数 */
  stars: number;
  /** 本章满星数 */
  maxStars: number;
  /** 本章第一关是否已解锁 */
  unlocked: boolean;
  /** 本章全部关卡都拿到星 */
  cleared: boolean;
}

/** 线性解锁规则：前一关至少 1★ 才能进入（第一关恒可进入） */
export function isLevelLocked(
  defs: LevelDef[],
  id: string,
  bestStars: Record<string, number>,
): boolean {
  const i = defs.findIndex((d) => d.id === id);
  return i > 0 && (bestStars[defs[i - 1].id] ?? 0) < 1;
}

/** 战役状态：全部关卡 ≥1★ 为通关，全部 3★ 为精通 */
export function campaignState(bestStars: Record<string, number>, defs: LevelDef[]): CampaignState {
  if (defs.length === 0) return 'none';
  let cleared = true;
  let mastered = true;
  for (const d of defs) {
    const st = bestStars[d.id] ?? 0;
    if (st < 1) {
      cleared = false;
      mastered = false;
      break;
    }
    if (st < 3) mastered = false;
  }
  return mastered ? 'mastered' : cleared ? 'cleared' : 'none';
}

/**
 * 按章节汇总进度：以 CHAPTERS 为顺序基准，关卡里出现的未知章节追加在后，
 * 空章节自动略过——任何关卡都不会因为分组写错而从界面上消失。
 */
export function chapterProgress(
  defs: LevelDef[],
  bestStars: Record<string, number>,
): ChapterProgress[] {
  const fallback = CHAPTERS[0].id;
  const groupOf = (d: LevelDef): string => d.chapter ?? fallback;
  const ids = CHAPTERS.map((c) => c.id);
  for (const d of defs) {
    const g = groupOf(d);
    if (!ids.includes(g)) ids.push(g);
  }
  return ids
    .map((id) => {
      const meta: ChapterDef = CHAPTERS.find((c) => c.id === id) ?? {
        id,
        name: id,
        tagline: '',
        intro: '',
      };
      const levels = defs.filter((d) => groupOf(d) === id);
      const first = levels[0];
      return {
        ...meta,
        levels,
        stars: levels.reduce((s, d) => s + Math.min(3, bestStars[d.id] ?? 0), 0),
        maxStars: levels.length * 3,
        unlocked: !first || !isLevelLocked(defs, first.id, bestStars),
        cleared: levels.length > 0 && levels.every((d) => (bestStars[d.id] ?? 0) >= 1),
      };
    })
    .filter((c) => c.levels.length > 0);
}
