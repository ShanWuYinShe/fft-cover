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
/** 五声音阶频率（C 宫调式，两个八度）：收集音效按收集序号递进 */
export const PENTATONIC = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26, 783.99, 880.0, 1046.5,
];
