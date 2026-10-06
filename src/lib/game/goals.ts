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

/** 本关的四个目标（顺序即推荐顺序：先三星，再逐项精通） */
export function levelGoals(state: GoalState): LevelGoal[] {
  return [
    {
      id: 'stars',
      icon: '⭐',
      seal: '星',
      name: '三星通关',
      how: '单局收集 ≥90%',
      done: state.stars >= 3,
    },
    {
      id: 'perfect',
      icon: '👑',
      seal: '满',
      name: '完美全清',
      how: '单局 100% 收集',
      done: state.perfect,
    },
    {
      id: 'exact',
      icon: '🎯',
      seal: '准',
      name: '精确解',
      how: '参数与傅立叶分解一致（拟合度 ≥99%）',
      done: state.exact,
    },
    {
      id: 'expert',
      icon: '💎',
      seal: '专',
      name: '专家全清',
      how: '开启专家模式后 100% 收集',
      done: state.expert,
    },
  ];
}

/** 已达成 / 总数 */
export function goalProgress(goals: LevelGoal[]): { done: number; total: number } {
  return { done: goals.filter((g) => g.done).length, total: goals.length };
}
