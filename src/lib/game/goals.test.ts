import { describe, expect, it } from 'vitest';
import { chapterSealState, goalById, goalProgress, levelGoals, sealsDone } from './goals';

const state = (patch: Partial<Parameters<typeof levelGoals>[0]> = {}) => ({
  stars: 0,
  perfect: false,
  exact: false,
  expert: false,
  ...patch,
});

describe('levelGoals', () => {
  it('新档一关都没达成', () => {
    const goals = levelGoals(state());
    expect(goals).toHaveLength(4);
    expect(goals.every((g) => !g.done)).toBe(true);
    expect(goals.map((g) => g.id)).toEqual(['stars', 'perfect', 'exact', 'expert']);
    expect(goalProgress(goals)).toEqual({ done: 0, total: 4 });
  });

  it('每一项对应各自的持久化进度', () => {
    expect(levelGoals(state({ stars: 2 }))[0].done).toBe(false);
    expect(levelGoals(state({ stars: 3 }))[0].done).toBe(true);
    expect(levelGoals(state({ perfect: true }))[1].done).toBe(true);
    expect(levelGoals(state({ exact: true }))[2].done).toBe(true);
    expect(levelGoals(state({ expert: true }))[3].done).toBe(true);
  });

  it('全达成时进度为 4/4', () => {
    const goals = levelGoals(state({ stars: 3, perfect: true, exact: true, expert: true }));
    expect(goalProgress(goals)).toEqual({ done: 4, total: 4 });
  });

  it('每个目标都有图标、印章单字、名称与达成条件（面板要展示）', () => {
    for (const g of levelGoals(state())) {
      expect(g.icon.length).toBeGreaterThan(0);
      expect(g.seal).toHaveLength(1);
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.how.length).toBeGreaterThan(0);
    }
    // 四个印章互不相同，摆在面板上才好区分
    expect(new Set(levelGoals(state()).map((g) => g.seal)).size).toBe(4);
  });

  it('星级超过 3（脏数据）也只算达成', () => {
    expect(goalProgress(levelGoals(state({ stars: 9 }))).done).toBe(1);
  });

  it('章节印：一章四印集满才 sealed', () => {
    const full = () => ({ stars: 3, perfect: true, exact: true, expert: true });
    expect(chapterSealState(['a', 'b'], full)).toEqual({ done: 8, total: 8, sealed: true });
    const half = () => ({ stars: 3, perfect: true, exact: false, expert: false });
    expect(chapterSealState(['a', 'b'], half)).toEqual({ done: 4, total: 8, sealed: false });
    expect(sealsDone(half())).toBe(2);
    // 空章节（没有关卡）不算集齐
    expect(chapterSealState([], full).sealed).toBe(false);
  });

  it('goalById 与 levelGoals 用同一份定义（结算盖印按 id 取字形）', () => {
    for (const g of levelGoals(state())) {
      const def = goalById(g.id);
      expect(def.seal).toBe(g.seal);
      expect(def.name).toBe(g.name);
      expect(def.icon).toBe(g.icon);
    }
  });
});
