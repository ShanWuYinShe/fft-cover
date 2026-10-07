import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHV_GROUPS,
  achievementProgress,
  evalAchievements,
  type AchievementContext,
} from './achievements';
import { LEVEL_DEFS } from './levels';

describe('成就定义自洽', () => {
  it('成就 id 不重复，且都有名字与说明', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(0);
      expect(a.desc.length, a.id).toBeGreaterThan(0);
    }
  });
  it('每个成就都归入已知分组，且每组都非空（面板分组展示）', () => {
    const ids = ACHV_GROUPS.map((g) => g.id);
    for (const a of ACHIEVEMENTS) expect(ids).toContain(a.group);
    for (const g of ACHV_GROUPS) {
      expect(ACHIEVEMENTS.some((a) => a.group === g.id)).toBe(true);
    }
    // 成就 id 不重复
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('achievementProgress', () => {
  it('成就进度：口径与判定一致（含 builtInIds 过滤）', () => {
    const ctx: AchievementContext = {
      bestStars: { circle: 3, heart: 2, 'random-1': 3 },
      bestScores: { circle: 42000 },
      bestClears: {},
      flags: {},
      levelCount: 21,
      perfect: { circle: true },
      exact: {},
      expert: {},
      chapterSeals: { basics: true },
      chapterStars: { dacheng: 6 },
      chapterCount: 6,
      builtInIds: LEVEL_DEFS.map((d) => d.id),
      dailyStreak: 12,
    };
    // 连击之王：任意一关最高分 42000 / 30000（随机关也算，口径与判定一致）
    expect(achievementProgress('combo-king', ctx)).toEqual({
      have: 42000,
      need: 30000,
      unit: 'points',
    });
    // 全部三星：内置关里三星的只有 circle → 1 / 21（随机关不计）
    expect(achievementProgress('all-three', ctx)).toEqual({ have: 1, need: 21, unit: 'levels' });
    // 半程大师：内置总星数 5 / 32（21 × 1.5 向上取整）
    expect(achievementProgress('half-stars', ctx)).toEqual({ have: 5, need: 32, unit: 'stars' });
    // 完美：只有 circle → 1 / 21
    expect(achievementProgress('all-perfect', ctx)).toEqual({ have: 1, need: 21, unit: 'levels' });
    // 章节印：已有 1 方 → 1 / 6
    expect(achievementProgress('all-chapter-seals', ctx)).toEqual({
      have: 1,
      need: 6,
      unit: 'seals',
    });
    // 连胜：12 / 30
    expect(achievementProgress('streak-30', ctx)).toEqual({ have: 12, need: 30, unit: 'days' });
    // 章节精通：大成章已有 6 星 → 6 / 9（两关三星 + 一关零星）
    expect(achievementProgress('dacheng-master', ctx)).toEqual({
      have: 6,
      need: 9,
      unit: 'stars',
    });
    // 巧变三器：fixture 里 craft 章没星 → 0 / 9
    expect(achievementProgress('craft-master', ctx)).toEqual({ have: 0, need: 9, unit: 'stars' });
    // 不可量化的成就返回 null
    expect(achievementProgress('first-star', ctx)).toBeNull();
  });
});

describe('evalAchievements', () => {
  const base = { bestStars: {}, bestScores: {}, bestClears: {}, flags: {}, levelCount: 9 };
  it('空数据无成就', () => {
    expect(evalAchievements(base)).toEqual([]);
  });
  it('章节印成就：集齐任意一章 / 全部章节', () => {
    expect(evalAchievements({ ...base, chapterSeals: { basics: false } })).not.toContain(
      'chapter-seal',
    );
    expect(evalAchievements({ ...base, chapterSeals: { basics: true } })).toContain('chapter-seal');
    expect(evalAchievements({ ...base, chapterSeals: { basics: true } })).not.toContain(
      'all-chapter-seals',
    );
    const all = { basics: true, petals: true, pairs: true, summit: true, china: true };
    expect(evalAchievements({ ...base, chapterSeals: all, chapterCount: 5 })).toContain(
      'all-chapter-seals',
    );
  });

  it('周而复始：**本周**的每周挑战全清才解锁，上周的不算', () => {
    const weeklyId = (week: string) => 'weekly-' + week + '-hard';
    // 本周（2026-W41）全清，但 perfect 里是**上周**的记录 → 不解锁
    const lastWeekOnly = evalAchievements({
      ...base,
      weekKey: '2026-W41',
      perfect: { [weeklyId('2026-W40')]: true },
    });
    expect(lastWeekOnly).not.toContain('weekly-clear');
    // 本周全清 → 解锁
    const thisWeek = evalAchievements({
      ...base,
      weekKey: '2026-W41',
      perfect: { [weeklyId('2026-W41')]: true },
    });
    expect(thisWeek).toContain('weekly-clear');
    // 没有 weekKey（老调用方）→ 不解锁（宁可晚给，不能乱给）
    const noKey = evalAchievements({
      ...base,
      perfect: { [weeklyId('2026-W41')]: true },
    });
    expect(noKey).not.toContain('weekly-clear');
  });

  it('首星/首清/连击/竞速按数据判定', () => {
    expect(evalAchievements({ ...base, bestStars: { circle: 1 } })).toContain('first-star');
    expect(evalAchievements({ ...base, bestClears: { circle: 7.5 } })).toContain('first-clear');
    expect(evalAchievements({ ...base, bestScores: { circle: 30000 } })).toContain('combo-king');
    expect(evalAchievements({ ...base, bestScores: { circle: 29999 } })).not.toContain(
      'combo-king',
    );
    expect(evalAchievements({ ...base, bestClears: { circle: 8 } })).toContain('speed-demon');
    expect(evalAchievements({ ...base, bestClears: { circle: 8.1 } })).not.toContain('speed-demon');
  });
  it('行为标记类成就', () => {
    expect(evalAchievements({ ...base, flags: { sandboxUsed: true } })).toContain('sandboxer');
    expect(evalAchievements({ ...base, flags: { inviteLoaded: true } })).toContain('inviter');
    expect(evalAchievements({ ...base, flags: { dragUsed: true } })).toContain('drag-master');
  });
  it('全关三星判定谐波大师', () => {
    const nine = { bestStars: {}, bestScores: {}, bestClears: {}, flags: {}, levelCount: 9 };
    const partial = { ...nine, bestStars: { circle: 3, ellipse: 3 } };
    expect(evalAchievements(partial)).not.toContain('all-three');
    const full: Record<string, number> = {};
    for (let i = 0; i < 9; i++) full['lv' + i] = 3;
    expect(evalAchievements({ ...nine, bestStars: full })).toContain('all-three');
  });
});
