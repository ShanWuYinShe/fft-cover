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
