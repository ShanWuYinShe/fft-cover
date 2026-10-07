import { describe, expect, it } from 'vitest';
import { dayKey, daysLeftInWeek, lastNDays, todayKey, weekKey, yesterdayKey } from './dates';

describe('dayKey', () => {
  it('本地时区格式 YYYY-MM-DD，个位月/日补零', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 10, 28))).toBe('2026-11-28');
  });
});

describe('todayKey / yesterdayKey', () => {
  it('格式都是 YYYY-MM-DD（午夜瞬间也不炸）', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterdayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('lastNDays', () => {
  it('返回 n 个键、从旧到新、无重复（跨夏令时也不漏/重）', () => {
    const keys = lastNDays(7);
    expect(keys).toHaveLength(7);
    expect(new Set(keys).size).toBe(7);
    expect([...keys].sort()).toEqual(keys); // 升序
  });
});

describe('weekKey', () => {
  it('ISO 周键：同一周的不同日期得到同一个键', () => {
    // 2026-10-05（周一）~ 2026-10-11（周日）同一周
    const keys = ['2026-10-05', '2026-10-07', '2026-10-11'].map((s) =>
      weekKey(new Date(s + 'T12:00:00')),
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('2026-W41');
  });

  it('ISO 周一为一周之始：周日属于前一周', () => {
    // 2026-10-11 是周日，2026-10-12 是周一——键应不同
    expect(weekKey(new Date('2026-10-11T12:00:00'))).not.toBe(
      weekKey(new Date('2026-10-12T12:00:00')),
    );
  });
});

describe('daysLeftInWeek', () => {
  it('周一还剩 7 天、周日还剩 1 天（含今天）', () => {
    expect(daysLeftInWeek(new Date('2026-10-05T12:00:00'))).toBe(7); // 周一
    expect(daysLeftInWeek(new Date('2026-10-08T12:00:00'))).toBe(4); // 周四
    expect(daysLeftInWeek(new Date('2026-10-11T12:00:00'))).toBe(1); // 周日
  });
});
