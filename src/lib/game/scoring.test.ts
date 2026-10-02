import { describe, expect, it } from 'vitest';
import { scoreForPoint, starsFor } from './scoring';

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
