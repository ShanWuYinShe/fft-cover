import { describe, expect, it } from 'vitest';
import { todayKey } from './levels';
import {
  bestForPrefix,
  calendarRows,
  longestRun,
  playedDates,
  playedOn,
  settleStreak,
  weekRows,
} from './daily';

const rec = {
  'daily-2026-10-01-hard': 300,
  'daily-2026-10-01-easy': 100, // 同一天另一档：天数只算一次
  'daily-2026-10-02-hard': 0, // 0 分不算"打过"
  'daily-2026-10-03-normal': 250,
  'weekly-2026-W41-hard': 400,
};

describe('daily.ts：每日挑战纯计算域', () => {
  it('bestForPrefix：只取前缀内最高分', () => {
    expect(bestForPrefix(rec, 'daily-2026-10-01-')).toBe(300);
    expect(bestForPrefix(rec, 'daily-2026-10-02-')).toBe(0);
    expect(bestForPrefix(rec, 'weekly-2026-W41-')).toBe(400);
    expect(bestForPrefix(rec, 'daily-2099-01-01-')).toBe(0);
  });

  it('playedOn：任意难度有得分即算打过，0 分不算', () => {
    expect(playedOn(rec, '2026-10-01')).toBe(true);
    expect(playedOn(rec, '2026-10-02')).toBe(false);
    expect(playedOn(rec, '2026-10-03')).toBe(true);
  });

  it('playedDates：跨难度去重、升序、排除 0 分', () => {
    expect(playedDates(rec)).toEqual(['2026-10-01', '2026-10-03']);
  });

  it('longestRun：连续累计，断档重新从 1 开始', () => {
    expect(longestRun(['2026-10-01'])).toBe(1);
    expect(longestRun(['2026-10-01', '2026-10-02', '2026-10-03'])).toBe(3);
    expect(longestRun(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'])).toBe(2);
    expect(longestRun([])).toBe(0);
  });

  it('settleStreak：同一天幂等、昨天连续 +1、断档归 1', () => {
    const r0 = { streak: 5, last: '2026-10-06' };
    // 同一天重复结算：不变
    expect(settleStreak({ streak: 3, last: '2026-10-07' }, '2026-10-07', '2026-10-06')).toEqual({
      streak: 3,
      last: '2026-10-07',
    });
    // 昨天打过：+1
    expect(settleStreak(r0, '2026-10-07', '2026-10-06')).toEqual({ streak: 6, last: '2026-10-07' });
    // 断档：归 1
    expect(settleStreak(r0, '2026-10-09', '2026-10-08')).toEqual({ streak: 1, last: '2026-10-09' });
  });

  it('calendarRows / weekRows：形状正确，today 标记落在今天', () => {
    const today = todayKey(); // 用真实"今天"，避免测试跨午夜时写死日期失配
    const rows = calendarRows(rec, 5, today);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveLength(7);
    const flat = rows.flat();
    expect(flat.filter((c) => c.today)).toHaveLength(1);
    expect(flat.find((c) => c.today)!.date).toBe(today);
    // 打过打卡记录的格子被标记 done
    expect(flat.find((c) => c.date === '2026-10-01')!.done).toBe(true);
    expect(flat.find((c) => c.date === '2026-10-02')!.done).toBe(false);
    // 未来格子
    expect(flat.filter((c) => c.future).every((c) => c.date > today)).toBe(true);

    const week = weekRows(rec, today);
    expect(week).toHaveLength(7);
    expect(week[6].today).toBe(true);
  });
});
