/**
 * 每关的目标清单（关卡类游戏的 per-level objectives）。
 *
 * 完美全清 / 精确解 / 专家全清这些精通目标原本只出现在结算浮层与成就面板里，
 * 玩家不进结算就不知道它们存在。这里把"这一关还有什么可做"摆到台面上。
 */

/** 一关的目标达成状态（全部来自持久化进度） */
export interface GoalState {
  /** 本关历史最佳星级 0~3 */
  stars: number;
  /** 完美全清（100% 收集） */
  perfect: boolean;
  /** 精确解认证（参数与傅立叶分解一致） */
  exact: boolean;
  /** 专家模式（隐藏轮廓）全清 */
  expert: boolean;
}

/** 目标 id */
export type GoalId = 'stars' | 'perfect' | 'exact' | 'expert';

export interface LevelGoal {
  id: GoalId;
  icon: string;
  /** 印章单字：达成后盖朱砂印（篆刻样式，见 GoalPanel） */
  seal: string;
  name: string;
  /** 未达成时做什么 */
  how: string;
  done: boolean;
}

/** 目标定义（不含达成状态）——顺序即推荐顺序：先三星，再逐项精通 */
export type GoalDef = Omit<LevelGoal, 'done'>;

const DEFS: GoalDef[] = [
  { id: 'stars', icon: '⭐', seal: '星', name: '三星通关', how: '单局收集 ≥90%' },
  { id: 'perfect', icon: '👑', seal: '满', name: '完美全清', how: '单局 100% 收集' },
  {
    id: 'exact',
    icon: '🎯',
    seal: '准',
    name: '精确解',
    how: '参数与傅立叶分解一致（拟合度 ≥99%）',
  },
  { id: 'expert', icon: '💎', seal: '专', name: '专家全清', how: '开启专家模式后 100% 收集' },
];

/** 按 id 取目标定义（结算演出盖印时按 id 取字形） */
export function goalById(id: GoalId): GoalDef {
  return DEFS.find((d) => d.id === id) ?? DEFS[0];
}

/** 本关的四个目标 */
export function levelGoals(state: GoalState): LevelGoal[] {
  const done: Record<GoalId, boolean> = {
    stars: state.stars >= 3,
    perfect: state.perfect,
    exact: state.exact,
    expert: state.expert,
  };
  return DEFS.map((d) => ({ ...d, done: done[d.id] }));
}

/** 已达成 / 总数 */
export function goalProgress(goals: LevelGoal[]): { done: number; total: number } {
  return { done: goals.filter((g) => g.done).length, total: goals.length };
}

/** 一关已盖的朱印数（0~4） */
export function sealsDone(state: GoalState): number {
  return goalProgress(levelGoals(state)).done;
}

/** 一章的朱印收集状态：集满即盖"章节印" */
export interface ChapterSealState {
  done: number;
  total: number;
  /** 本章全部关卡的 4 枚印都集齐 */
  sealed: boolean;
}

/** 汇总一章的朱印进度（stateOf 给出各关的目标状态） */
export function chapterSealState(
  levelIds: string[],
  stateOf: (id: string) => GoalState,
): ChapterSealState {
  let done = 0;
  for (const id of levelIds) done += sealsDone(stateOf(id));
  const total = levelIds.length * 4;
  return { done, total, sealed: total > 0 && done === total };
}
