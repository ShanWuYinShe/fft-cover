import type { Arm, GamePhase } from './types';

/**
 * 音乐化映射：把"指针参数"翻译成"声部参数"。
 *
 * 傅立叶级数本来就是声音的语言——本模块让玩家的每一根指针
 * 都成为一个真实的声部，参数与听感的对应关系都可解释：
 *
 * - 频率 |k| → 第 k 次谐波（1× = 根音、2× = 八度、3× = 五度…）
 * - 半径 r  → 声部音量（分量越大，听得越响）
 * - 相位 φ  → 声像 sin(φ)（左右位置）
 * - 旋转方向 → ±音分失谐（正反两根之间产生缓慢拍音）
 *
 * 根音由**关卡所属章节**决定（见下方 CHAPTER_KEYS）：切关即转调，
 * 于是每一章有自己的和声色彩，而声部之间的相对关系仍然是谐波关系。
 */

/** 音乐根音 C3（130.81 Hz）：第 k 根指针恰好落在第 k 次谐波上 */
export const ROOT_HZ = 130.81;

/* ---------- 调性：每个章节有自己的根音与音阶 ---------- */

/** 一个调性：根音 + 音阶半音表（相对根音，升序、以 0 开头） */
export interface MusicalKey {
  id: string;
  /** 显示名（关卡面板与调试用） */
  name: string;
  /** 根音（Hz）——第 k 根指针落在它的第 k 次谐波上 */
  root: number;
  /** 音阶（半音，一个八度内） */
  steps: number[];
}

/**
 * 章节调性：全部采用**中国五声调式**（宫商角徵羽），一章一调，
 * 切章时整条配乐一起转调（环境音、指针声部、收集音阶全部跟随）。
 *
 * 五声调式天然没有半音与导音，听感温润——这也是"不刺耳"的底子。
 * 前五章各取一调（宫商角徵羽至此齐全）；再往后换宫音再取一调，根音仍各不相同。
 */
export const CHAPTER_KEYS: Record<string, MusicalKey> = {
  basics: { id: 'basics', name: 'C 宫五声', root: 130.81, steps: [0, 2, 4, 7, 9] },
  petals: { id: 'petals', name: 'A 羽五声', root: 110.0, steps: [0, 3, 5, 7, 10] },
  pairs: { id: 'pairs', name: 'D 商五声', root: 146.83, steps: [0, 2, 5, 7, 10] },
  summit: { id: 'summit', name: 'E 角五声', root: 164.81, steps: [0, 3, 5, 8, 10] },
  china: { id: 'china', name: 'G 徵五声', root: 196.0, steps: [0, 2, 5, 7, 9] },
  // 五声调式只有五种，第六章起换宫音再取一调：F 商（降 E 宫五声的第二级为主音）
  craft: { id: 'craft', name: 'F 商五声', root: 174.61, steps: [0, 2, 5, 7, 10] },
};

/** 默认调性：无章节的关卡（随机关 / 每日 / 创作关）回落到这里 */
export const DEFAULT_KEY: MusicalKey = CHAPTER_KEYS.basics;

/** 章节 id → 调性；未知章节回落默认调性 */
export function keyForChapter(chapter?: string): MusicalKey {
  return (chapter && CHAPTER_KEYS[chapter]) || DEFAULT_KEY;
}

/**
 * 关卡 → 调性：内置关按章节；随机关/每日挑战/创作关没有章节，
 * 就按关卡 id 稳定散列挑一个——同一邀请码每次进来听到的都是同一个调。
 */
export function keyForLevel(
  level: { id: string; chapter?: string } | null | undefined,
): MusicalKey {
  if (!level) return DEFAULT_KEY;
  if (level.chapter) return keyForChapter(level.chapter);
  const ids = Object.keys(CHAPTER_KEYS);
  let h = 0;
  for (let i = 0; i < level.id.length; i++) h = (h * 31 + level.id.charCodeAt(i)) >>> 0;
  return CHAPTER_KEYS[ids[h % ids.length]];
}

/**
 * 由调性生成音阶音高（默认约两个八度，供收集音效逐点递进）。
 * 默认调性（C 宫五声）的结果与旧的 PENTATONIC 常量一致。
 */
export function scaleNotes(key: MusicalKey = DEFAULT_KEY, count = 11): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const octave = Math.floor(i / key.steps.length);
    const step = key.steps[i % key.steps.length];
    out.push(key.root * 2 * Math.pow(2, (step + octave * 12) / 12));
  }
  return out;
}

/** ±k 频率对的失谐量（音分）：一升一降才听得出"拍" */
export const DETUNE_CENTS = 7;

/** 可听见的谐波次数上限（防止极端参数把音高推到刺耳区） */
export const MAX_HARMONIC = 16;

/**
 * 高次谐波的音量衰减：第 k 次谐波乘以 1 / (1 + ROLLOFF × (k-1))。
 * 越高的泛音越轻——这既是物理共鸣器的自然行为，
 * 也是"不刺耳"的关键：2~3 kHz 的纯音叠起来最容易扎耳朵。
 */
export const HARMONIC_ROLLOFF = 0.3;

/** 第 k 次谐波的音量系数（k=1 为 1.0，单调下降） */
export function harmonicRolloff(k: number): number {
  return 1 / (1 + HARMONIC_ROLLOFF * Math.max(0, k - 1));
}

/** 一个声部：由一根指针映射而来 */
export interface Voice {
  /** 指针序号（0..），实时混音按此索引复用同一组振荡器 */
  index: number;
  /** 发声频率（Hz） */
  freq: number;
  /** 声部音量（0~1） */
  gain: number;
  /** 立体声位置 -1（左）~ 1（右） */
  pan: number;
  /** 失谐（音分）：正频 +、负频 − */
  detune: number;
}

/** 单根指针 → 声部；未启用或半径为 0 的指针不发声（返回 null） */
export function armToVoice(arm: Arm, index: number, root = ROOT_HZ): Voice | null {
  if (!arm.on || arm.r <= 0) return null;
  const k = Math.min(MAX_HARMONIC, Math.max(1, Math.abs(arm.freq)));
  return {
    index,
    freq: root * k,
    gain: (0.04 + 0.2 * Math.min(1, arm.r / 170)) * harmonicRolloff(k),
    pan: Math.max(-1, Math.min(1, Math.sin(arm.phase))),
    detune: arm.freq < 0 ? -DETUNE_CENTS : DETUNE_CENTS,
  };
}

/** 指针组 → 声部表（按指针序号升序，未启用的位不占声部） */
export function armsToVoices(arms: Arm[], root = ROOT_HZ): Voice[] {
  const out: Voice[] = [];
  for (let i = 0; i < arms.length; i++) {
    const v = armToVoice(arms[i], i, root);
    if (v) out.push(v);
  }
  return out;
}

/**
 * 探索环境音的下一个音符间隔（秒）。
 * 越"在玩"越密（运行/结算），编辑思考时更稀疏——留白本身就是氛围的一部分。
 */
export function nextNoteDelay(rnd: number, intensity: number): number {
  const i = Math.max(0, Math.min(1, intensity));
  const base = 11 - 5 * i; // 编辑态 ≈11s、运行态 ≈6s——留出真正的安静
  return base * (0.7 + 0.8 * Math.max(0, Math.min(1, rnd)));
}

/**
 * 动态强度（0~1）：音乐跟着游戏节奏走。
 * 编辑/暂停时退到背景（留出思考空间），旋转与结算时更饱满。
 */
export function musicIntensity(phase: GamePhase, sandbox: boolean): number {
  if (sandbox) return 0.8;
  switch (phase) {
    case 'running':
      return 1;
    case 'paused':
      return 0.45;
    case 'done':
      return 0.7;
    default:
      return 0.55;
  }
}
