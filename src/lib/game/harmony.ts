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
 */

/** 音乐根音 C3（130.81 Hz）：第 k 根指针恰好落在第 k 次谐波上 */
export const ROOT_HZ = 130.81;

/** ±k 频率对的失谐量（音分）：一升一降才听得出"拍" */
export const DETUNE_CENTS = 7;

/** 可听见的谐波次数上限（防止极端参数把音高推到刺耳区） */
export const MAX_HARMONIC = 16;

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
export function armToVoice(arm: Arm, index: number): Voice | null {
  if (!arm.on || arm.r <= 0) return null;
  const k = Math.min(MAX_HARMONIC, Math.max(1, Math.abs(arm.freq)));
  return {
    index,
    freq: ROOT_HZ * k,
    gain: 0.04 + 0.2 * Math.min(1, arm.r / 170),
    pan: Math.max(-1, Math.min(1, Math.sin(arm.phase))),
    detune: arm.freq < 0 ? -DETUNE_CENTS : DETUNE_CENTS,
  };
}

/** 指针组 → 声部表（按指针序号升序，未启用的位不占声部） */
export function armsToVoices(arms: Arm[]): Voice[] {
  const out: Voice[] = [];
  for (let i = 0; i < arms.length; i++) {
    const v = armToVoice(arms[i], i);
    if (v) out.push(v);
  }
  return out;
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
