import { PENTATONIC } from './constants';

let audioCtx: AudioContext | null = null;
/** 全局音量（0/0.5/1 三态），由 App 切换并持久化 */
let volume = 1;

export function setVolume(v: number): void {
  volume = v;
  try {
    localStorage.setItem('fft-pointers-volume-v1', String(v));
  } catch {
    /* 忽略 */
  }
}

export function getVolume(): number {
  try {
    return Number(localStorage.getItem('fft-pointers-volume-v1') ?? '1') || 1;
  } catch {
    return 1;
  }
}

function vol(): number {
  return volume;
}

/**
 * 取得（必要时创建）全局唯一的 AudioContext。
 * 音效与背景音乐共用同一个上下文，避免多实例互相抢占。
 * 音频不可用时返回 null（不抛错，不影响游戏）。
 */
export function getAudioContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = audioCtx ?? new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/** 播放一声短音。on=false 时静默；音频不可用时静默失败。 */
export function beep(
  freq: number,
  dur = 0.1,
  type: OscillatorType = 'sine',
  gain = 0.15,
  on = true,
): void {
  if (!on) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain * vol(), ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {
    /* 音频不可用则忽略 */
  }
}

/**
 * 拨弦音（古筝／琵琶意象）：极快起音 + 指数衰减 + 三个泛音。
 * 泛音按 1 : 0.3 : 0.12 递弱、并整体低通，既像"弦"又不刺耳。
 */
export function pluck(freq: number, on: boolean, dur = 0.55, gain = 0.13): void {
  if (!on) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    // 一次拨弦共用一个低通，压掉高次泛音的毛刺
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    lp.Q.value = 0.4;
    lp.connect(ac.destination);
    const partials: Array<[number, number]> = [
      [1, 1],
      [2, 0.3],
      [3, 0.12],
    ];
    for (const [mult, pg] of partials) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const g = ac.createGain();
      const peak = Math.max(0.0002, gain * pg * vol());
      const decay = dur * (mult === 1 ? 1 : 0.55); // 高次泛音衰减更快
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      o.connect(g);
      g.connect(lp);
      o.start(t0);
      o.stop(t0 + decay + 0.05);
    }
  } catch {
    /* 音频不可用则忽略 */
  }
}

/**
 * 收集音效：按本关音阶随收集序号递进，用古筝式拨弦（比纯正弦更有"弦"味）。
 * count 为已收集总数（从 1 开始）；scale 为本关调性音阶（默认 C 宫五声）。
 */
export function collectSound(count: number, on: boolean, scale: number[] = PENTATONIC): void {
  const f = scale[(count - 1) % scale.length];
  pluck(f, on, 0.6, 0.13);
  pluck(f / 2, on, 0.85, 0.05); // 低八度当"共鸣箱"
}

/**
 * 自动拟合进度音：每跨过 20% 进度播放一个上行五声音阶音符，
 * 呼应"傅立叶逐项逼近"的过程。step 0..4。
 */
export function solveTick(
  step: number,
  on: boolean,
  scale = [261.63, 329.63, 392.0, 523.25, 659.26],
): void {
  beep(scale[Math.min(step, scale.length - 1)], 0.18, 'triangle', 0.09, on);
}

/** 自动拟合完成音：高八度 C6 短音收尾 */
export function solveDone(on: boolean): void {
  beep(1046.5, 0.3, 'triangle', 0.12, on);
}

/** 成就解锁音：快速上行三连音 */
export function achvSound(on: boolean): void {
  if (!on) return;
  [523.25, 659.26, 783.99].forEach((f, i) => {
    setTimeout(() => beep(f, 0.12, 'triangle', 0.1, true), i * 70);
  });
}

/** 完美收集琶音：C 大三和弦上行（C4-E4-G4-C5） */
export function perfectArpeggio(on: boolean): void {
  if (!on) return;
  [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
    setTimeout(() => beep(f, 0.25, 'triangle', 0.12, true), i * 90);
  });
}

/** 普通结束音效：上行双音 */
export function finishChord(on: boolean): void {
  beep(660, 0.12, 'triangle', 0.12, on);
  setTimeout(() => beep(880, 0.2, 'triangle', 0.12, on), 110);
}

/**
 * 盖章音：低沉的"咚"（印面落纸）+ 一声轻铃（印泥边）。
 * 结算时一枚朱印盖一次——奖励音要短、要闷，不能盖过收尾和弦。
 */
export function sealSound(on: boolean): void {
  if (!on) return;
  beep(150, 0.18, 'sine', 0.14, true);
  setTimeout(() => beep(784, 0.26, 'triangle', 0.05, true), 40);
}

/* ---------- UI 音效（业界标准：交互反馈音，音量远低于游戏音） ---------- */

/** UI 按钮点击：短促轻音 */
export function uiClick(on = true): void {
  beep(660, 0.05, 'triangle', 0.05, on);
}

/** UI 切换（方向/toggle/快进）：双音下行 */
export function uiToggle(on = true): void {
  beep(520, 0.05, 'triangle', 0.05, on);
  setTimeout(() => beep(390, 0.06, 'triangle', 0.045, on), 45);
}

/** UI 返回/取消：单音更低 */
export function uiBack(on = true): void {
  beep(330, 0.07, 'triangle', 0.05, on);
}
