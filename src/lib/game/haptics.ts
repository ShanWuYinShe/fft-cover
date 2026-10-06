/**
 * 触感反馈（移动端）：Android Chrome 等支持 navigator.vibrate，
 * iOS Safari 不支持——统一走这个封装，不支持时静默忽略。
 *
 * 用法克制：只在"升星 / 盖章 / 通关"这类真正的奖励时刻震一下，
 * 收集音那样的高频反馈不震（会烦）。
 */
export function haptic(pattern: number | number[], on = true): void {
  if (!on) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 不支持或用户禁用则忽略 */
  }
}
