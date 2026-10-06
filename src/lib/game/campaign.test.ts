import { describe, expect, it } from 'vitest';
import { CHAPTERS, LEVEL_DEFS } from './levels';
import { campaignState, chapterProgress, isLevelLocked } from './campaign';
import type { LevelDef } from './types';

const def = (id: string, chapter: string): LevelDef => ({
  id,
  name: id,
  hint: '',
  chapter,
  n: 3,
  fn: (t) => ({ x: Math.cos(t), y: Math.sin(t) }),
});

describe('内置关卡数据完整性', () => {
  it('每关都归属已知章节，且每章至少一关', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id));
    for (const d of LEVEL_DEFS) expect(ids.has(d.chapter)).toBe(true);
    for (const c of CHAPTERS) {
      expect(LEVEL_DEFS.some((d) => d.chapter === c.id)).toBe(true);
    }
  });

  it('关卡顺序不打断章节（同章关卡必须连续）', () => {
    const seen: string[] = [];
    for (const d of LEVEL_DEFS) {
      if (seen[seen.length - 1] !== d.chapter) seen.push(d.chapter);
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('isLevelLocked', () => {
  const defs = [def('a', 'x'), def('b', 'x'), def('c', 'x')];

  it('第一关恒可进入，其余看前一关是否有星', () => {
    expect(isLevelLocked(defs, 'a', {})).toBe(false);
    expect(isLevelLocked(defs, 'b', {})).toBe(true);
    expect(isLevelLocked(defs, 'b', { a: 1 })).toBe(false);
    expect(isLevelLocked(defs, 'c', { a: 1 })).toBe(true);
    expect(isLevelLocked(defs, 'c', { a: 1, b: 3 })).toBe(false);
  });

  it('未知关卡不锁定（找不到就当作可玩）', () => {
    expect(isLevelLocked(defs, 'zzz', {})).toBe(false);
  });
});

describe('campaignState', () => {
  const defs = [def('a', 'x'), def('b', 'x')];

  it('空关卡表 → none', () => {
    expect(campaignState({}, [])).toBe('none');
  });

  it('缺一关未拿星就是未通关', () => {
    expect(campaignState({}, defs)).toBe('none');
    expect(campaignState({ a: 3, b: 0 }, defs)).toBe('none');
    expect(campaignState({ a: 3 }, defs)).toBe('none');
  });

  it('全部 ≥1★ 通关，全部 3★ 精通', () => {
    expect(campaignState({ a: 1, b: 2 }, defs)).toBe('cleared');
    expect(campaignState({ a: 3, b: 3 }, defs)).toBe('mastered');
  });
});

describe('chapterProgress', () => {
  const defs = [def('a', 'c1'), def('b', 'c1'), def('c', 'c2')];
  const chapters = [
    CHAPTERS[0],
    { id: 'c1', name: '一章', tagline: '' },
    { id: 'c2', name: '二章', tagline: '' },
  ];

  it('按章节分组，星数与满星按章统计', () => {
    const list = chapterProgress(defs, { a: 3, b: 1, c: 2 });
    // CHAPTERS 里的其他章没有关卡 → 不出现
    expect(list.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(list[0].levels.map((d) => d.id)).toEqual(['a', 'b']);
    expect(list[0].stars).toBe(4);
    expect(list[0].maxStars).toBe(6);
    expect(list[1].stars).toBe(2);
    expect(list[1].maxStars).toBe(3);
  });

  it('章节解锁与"本章全通"标记跟随关卡星数', () => {
    const list = chapterProgress(defs, {});
    expect(list[0].unlocked).toBe(true);
    expect(list[0].cleared).toBe(false);
    expect(list[1].unlocked).toBe(false); // 前一关 b 还没星
    const list2 = chapterProgress(defs, { a: 1, b: 1, c: 0 });
    expect(list2[0].cleared).toBe(true);
    expect(list2[1].unlocked).toBe(true);
    expect(list2[1].cleared).toBe(false);
  });

  it('真实关卡表：四章、星数合计等于总星数', () => {
    const bestStars: Record<string, number> = {};
    LEVEL_DEFS.forEach((d, i) => (bestStars[d.id] = i % 4));
    const list = chapterProgress(LEVEL_DEFS, bestStars);
    expect(list.length).toBe(CHAPTERS.length);
    const sum = list.reduce((s, c) => s + c.stars, 0);
    const expectSum = LEVEL_DEFS.reduce((s, d) => s + (bestStars[d.id] ?? 0), 0);
    expect(sum).toBe(expectSum);
    expect(list.reduce((s, c) => s + c.maxStars, 0)).toBe(LEVEL_DEFS.length * 3);
    // chapters 常量与测试里的临时常量互不干扰
    expect(chapters.length).toBe(3);
  });
});
