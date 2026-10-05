/** 指针数量上限 */
export const ARMS_MAX = 10;
/** 基础周期（秒）：频率 f 的指针每周期转 f 圈 */
export const T0 = 8;
/** 每次运行跑的基础周期数 */
export const RUN_CYCLES = 2;
/** 单次运行总时长（秒） */
export const RUN_DUR = T0 * RUN_CYCLES;
/** 画布逻辑尺寸（正方形） */
export const SIZE = 640;
/** 星级阈值：收集比例 >= 90% 三星、>= 65% 二星、>= 35% 一星（从高到低排列） */
export const STAR_LEVELS = [0.9, 0.65, 0.35] as const;
/** localStorage 最佳记录键名 */
export const BEST_KEY = 'fft-pointers-best-v1';
/** 指针序号字符 */
export const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'] as const;
/** 连击判定窗口（毫秒）：窗口内连续收集则连击 +1 */
export const COMBO_WINDOW = 1200;
/** 最佳得分 localStorage 键名 */
export const BEST_SCORE_KEY = 'fft-pointers-best-score-v1';
/** 音效开关 localStorage 键名 */
export const SOUND_KEY = 'fft-pointers-sound-v1';
/** 最快全清用时 localStorage 键名 */
export const CLEAR_KEY = 'fft-pointers-clear-v1';
/** 完美全清（100% 收集）记录：关卡 id → true */
export const PERFECT_KEY = 'fft-pointers-perfect-v1';
/** 各关连续失败次数（0 星），用于"卡关提示"渐进解锁 */
export const FAIL_KEY = 'fft-pointers-fails-v1';
/** 每日挑战连胜记录：{ streak: 连续天数, last: 最近完成的日期 } */
export const STREAK_KEY = 'fft-pointers-streak-v1';
/** 专家模式（隐藏目标轮廓与预览轨迹）下完美全清的关卡集合 */
export const EXPERT_KEY = 'fft-pointers-expert-v1';
/** 达成"精确解"（参数与精确傅立叶分解一致）的关卡集合 */
export const EXACT_KEY = 'fft-pointers-exact-v1';
/** 精确解认证的拟合度门槛 */
export const EXACT_FIT = 0.99;
/** 已解锁成就 localStorage 键名 */
export const ACHV_KEY = 'fft-pointers-achv-v1';
/** 行为标记 localStorage 键名（沙盒/邀请码/拖拽等"用过"类成就） */
export const FLAGS_KEY = 'fft-pointers-flags-v1';
/** 各关解法参数存档 localStorage 键名 */
export const ARMS_SAVE_KEY = 'fft-pointers-arms-save-v1';
/** 每日挑战最佳得分 localStorage 键名 */
export const DAILY_KEY = 'fft-pointers-daily-v1';
/** 每关历史成绩 localStorage 键名（用于趋势展示） */
export const HISTORY_KEY = 'fft-pointers-history-v1';
/** 每关保留的历史记录条数上限 */
export const HISTORY_MAX = 30;

/** 五声音阶频率（C 宫调式，两个八度）：收集音效按收集序号递进 */
export const PENTATONIC = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0, 1046.5,
];
