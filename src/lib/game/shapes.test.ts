import { describe, expect, it } from 'vitest';
import { LEVEL_DEFS } from './levels';
import { shapePoints } from './shapes';

describe('shapePoints', () => {
  it('每个内置关卡都能生成非空点串，且点都在画布范围内', () => {
    for (const def of LEVEL_DEFS) {
      const pts = shapePoints(def.id);
      expect(pts.length, def.id).toBeGreaterThan(20);
      const nums = pts.split(/[ ,]/).map(Number);
      expect(nums.every((n) => Number.isFinite(n) && n >= 0 && n <= 640)).toBe(true);
    }
  });

  it('未知关卡返回空串（不抛错）', () => {
    expect(shapePoints('nope')).toBe('');
  });
});
