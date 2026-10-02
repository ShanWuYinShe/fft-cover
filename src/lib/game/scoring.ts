import { STAR_LEVELS } from './constants';

/** 按收集比例定星级（≥90% 三星、≥65% 二星、≥35% 一星） */
export function starsFor(p: number): number {
  return p >= STAR_LEVELS[0] ? 3 : p >= STAR_LEVELS[1] ? 2 : p >= STAR_LEVELS[2] ? 1 : 0;
}

/** 连击中第 combo 击收集的点得分：100 × (1 + combo) */
export function scoreForPoint(combo: number): number {
  return 100 * (1 + combo);
}
