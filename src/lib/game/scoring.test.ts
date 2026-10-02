import { describe, expect, it } from 'vitest';
import { evalAchievements, scoreForPoint, starsFor } from './scoring';

describe('starsFor', () => {
  it('按 90%/65%/35% 阈值定星级', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.9)).toBe(3);
    expect(starsFor(0.89)).toBe(2);
    expect(starsFor(0.65)).toBe(2);
    expect(starsFor(0.64)).toBe(1);
    expect(starsFor(0.35)).toBe(1);
    expect(starsFor(0.34)).toBe(0);
    expect(starsFor(0)).toBe(0);
  });
});

describe('scoreForPoint', () => {
  it('连击得分 = 100 × (1 + combo)', () => {
    expect(scoreForPoint(0)).toBe(100);
    expect(scoreForPoint(1)).toBe(200);
    expect(scoreForPoint(9)).toBe(1000);
  });
});
describe('evalAchievements', () => {
  const base = { bestStars: {}, bestScores: {}, bestClears: {}, flags: {}, levelCount: 9 };
  it('空数据无成就', () => {
    expect(evalAchievements(base)).toEqual([]);
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
