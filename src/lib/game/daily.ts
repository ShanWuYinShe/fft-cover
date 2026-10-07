/**
 * 每日挑战的纯计算域：连胜、打卡日历、跨天统计。
 *
 * 全部函数只吃数据（dailyBest 记录 / 连胜记录），不碰 localStorage、不碰引擎——
 * 引擎持有 $state 并负责持久化，这里只管"算"。
 * 这样这些规则可以脱离引擎做快速单测（daily.test.ts），也方便复用。
 */
import type { HistoryEntry } from './types';
import { dayKey, lastNDays } from './dates';

/** 连胜记录形状（引擎持久化这个结构） */
export interface StreakRecord {
  streak: number;
  last: string;
}

/** 某前缀下（daily-<日期>- 或 weekly-<周键>-）的最高分 */
export function bestForPrefix(record: Record<string, number>, prefix: string): number {
  let best = 0;
  for (const [k, v] of Object.entries(record)) {
    if (k.startsWith(prefix) && v > best) best = v;
  }
  return best;
}

/** 某天是否打过每日挑战（任意难度有得分即算） */
export function playedOn(record: Record<string, number>, date: string): boolean {
  const prefix = 'daily-' + date + '-';
  return Object.entries(record).some(([k, v]) => k.startsWith(prefix) && v > 0);
}

/** 打过每日挑战的全部日期（任意难度有得分即算），升序去重。
 *  必须按 daily- 前缀过滤：本周挑战（weekly-…）同表存放，混进来会把"周键"当成日期，
 *  多算累计天数、污染最长连胜（2026-10 修的潜在 bug）。 */
export function playedDates(record: Record<string, number>): string[] {
  const set = new Set<string>();
  for (const [k, v] of Object.entries(record)) {
    if (v > 0 && k.startsWith('daily-')) {
      set.add(k.replace(/^daily-/, '').replace(/-(easy|normal|hard)$/, ''));
    }
  }
  return [...set].sort();
}

/** 从升序日期列表反推最长连续天数 */
export function longestRun(dates: string[]): number {
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of dates) {
    if (prev) {
      const gap =
        (new Date(d + 'T00:00:00').getTime() - new Date(prev + 'T00:00:00').getTime()) / 86_400_000;
      run = Math.abs(gap - 1) < 0.01 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/**
 * 连胜结算（纯函数）：同一天只记一次；昨天打过则 +1，否则重新从 1 开始。
 * 返回新记录，由引擎落库。
 */
export function settleStreak(record: StreakRecord, today: string, yesterday: string): StreakRecord {
  if (record.last === today) return record;
  const streak = record.last === yesterday ? record.streak + 1 : 1;
  return { streak, last: today };
}

/**
 * 打卡日历：最近 weeks 周（按周一对齐，最后一行包含今天）。
 * today 显式传入以便测试；future 标记还没到的格子。
 */
export function calendarRows(
  record: Record<string, number>,
  weeks = 5,
  today = dayKey(new Date()),
): { date: string; day: number; done: boolean; today: boolean; future: boolean }[][] {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = 周一
  d.setDate(d.getDate() - dow - (weeks - 1) * 7);
  const rows: { date: string; day: number; done: boolean; today: boolean; future: boolean }[][] =
    [];
  for (let w = 0; w < weeks; w++) {
    const row: { date: string; day: number; done: boolean; today: boolean; future: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = dayKey(d);
      row.push({
        date,
        day: d.getDate(),
        done: playedOn(record, date),
        today: date === today,
        future: date > today,
      });
      d.setDate(d.getDate() + 1);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * 每日关的走势聚合：每天的 id 都不同（daily-<日期>-<难度>），单看只有一条——
 * 按"同难度跨天"合并、按时间升序，取最近 n 条。结算页的走势图用。
 */
export function dailyTrend(
  history: Record<string, HistoryEntry[]>,
  diff: string,
  n = 10,
): HistoryEntry[] {
  const merged: HistoryEntry[] = [];
  for (const [k, list] of Object.entries(history)) {
    if (k.startsWith('daily-') && k.endsWith('-' + diff)) merged.push(...list);
  }
  merged.sort((a, b) => a.t - b.t);
  return merged.slice(-n);
}

/** 最近 7 天的每日挑战完成情况（旧 → 新，最后一项是今天） */
export function weekRows(
  record: Record<string, number>,
  today = dayKey(new Date()),
): { date: string; label: string; done: boolean; today: boolean }[] {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  return lastNDays(7).map((date) => ({
    date,
    label: labels[new Date(date + 'T00:00:00').getDay()],
    done: playedOn(record, date),
    today: date === today,
  }));
}
