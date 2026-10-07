/**
 * 日期键工具（本地时区，YYYY-MM-DD）。
 *
 * 从 levels.ts 拆出来：日期运算与"关卡"无关，而每日挑战 / 每周挑战 / 打卡日历
 * 都依赖它——放在关卡模块里只会让两边都别扭。无任何依赖，可独立单测（dates.test.ts）。
 */

/** 日期键（本地时区，YYYY-MM-DD） */
export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/** 今日日期串（本地时区） */
export function todayKey(): string {
  return dayKey(new Date());
}

/** 昨天的日期键（本地时区），用于连胜判定 */
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/**
 * 最近 n 天的日期键（从旧到新，最后一项是今天）。
 * 用 setDate 做日期运算而不是减毫秒——跨夏令时也不会漏/重一天。
 */
export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    out.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * ISO 周键（如 2026-W41）：周一为一周之始；含 1 月 1 日的那周属于上一年，
 * 则归上一年第 52/53 周。本周挑战的 seed 与成绩键都用它。
 */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; // 周日=7
  t.setUTCDate(t.getUTCDate() + 4 - day); // 挪到本周的周四（ISO 周的代表日）
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
