import { getAudioContext } from './audio';
import { armsToVoices, ROOT_HZ, type Voice } from './harmony';
import type { Arm } from './types';

/**
 * 和声背景音乐：玩家的指针参数实时合成为一条垫音。
 *
 * 与音效（audio.ts 的一次性 beep）分开：这里是常驻的振荡器组，
 * 参数变化用 setTargetAtTime 平滑过渡（不产生爆音）。
 *
 * 音频图：
 *   指针声部 osc → gain → pan ─┐
 *   垫音（根音 + 五度 + 呼吸 LFO）┴→ bus → lowpass → compressor → master → 输出
 *
 * 浏览器自动播放策略要求用户手势后才能出声，故由 App 在首次
 * pointerdown/keydown 时调用 startMusic()。
 */

/** 声部节点链（实时播放与离线渲染自测共用同一构建函数） */
export interface VoiceChain {
  osc: OscillatorNode;
  gain: GainNode;
  pan: StereoPannerNode | null;
  /** 淡出并停声 */
  dispose(at: number): void;
}

/** 在给定音频上下文上构建一条声部链。gain 从 0 起，由调用方淡入。 */
export function buildVoiceChain(ac: BaseAudioContext, dest: AudioNode, voice: Voice): VoiceChain {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = voice.freq;
  osc.detune.value = voice.detune;
  const gain = ac.createGain();
  gain.gain.value = 0; // 从静音起，避免开关瞬间的爆音
  osc.connect(gain);
  // Safari 老版本无 StereoPanner：退化为单声道
  const maybePan = ac as BaseAudioContext & { createStereoPanner?: () => StereoPannerNode };
  let pan: StereoPannerNode | null = null;
  if (typeof maybePan.createStereoPanner === 'function') {
    pan = maybePan.createStereoPanner();
    pan.pan.value = voice.pan;
    gain.connect(pan);
    pan.connect(dest);
  } else {
    gain.connect(dest);
  }
  osc.start();
  return {
    osc,
    gain,
    pan,
    dispose(at: number): void {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setTargetAtTime(0, at, 0.25);
      osc.stop(at + 1.5);
    },
  };
}

/** 垫音音量（相对值，之后再乘动态强度） */
const DRONE_LEVEL = 0.55;
/** 声部与垫音的总线音量上限 */
const MASTER_LEVEL = 0.42;

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let master: GainNode | null = null;
let droneLevel: GainNode | null = null;
let chains = new Map<number, VoiceChain>();
/** 上一次落地的参数签名：未变化则完全跳过，避免每帧重设音频参数 */
let lastSig = '';

/** 构建总线（低通 + 压缩 + 总音量 + 垫音），只做一次 */
function buildBus(ac: AudioContext): void {
  bus = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1700;
  lp.Q.value = 0.6;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 24;
  comp.ratio.value = 4;
  comp.attack.value = 0.01;
  comp.release.value = 0.3;
  master = ac.createGain();
  master.gain.value = 0;
  bus.connect(lp);
  lp.connect(comp);
  comp.connect(master);
  master.connect(ac.destination);

  // 垫音：根音 + 纯五度，8 秒周期的极慢呼吸
  // 呼吸起伏放在开关节点之前：droneLevel = 0 时才是真的静音
  droneLevel = ac.createGain();
  droneLevel.gain.value = 0;
  droneLevel.connect(bus);
  const breath = ac.createGain();
  breath.gain.value = 1;
  breath.connect(droneLevel);
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 0.35;
  lfo.connect(lfoDepth);
  lfoDepth.connect(breath.gain);
  lfo.start();
  for (const f of [ROOT_HZ, ROOT_HZ * 1.5]) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.value = DRONE_LEVEL;
    o.connect(g);
    g.connect(breath);
    o.start();
  }
}

/**
 * 建立音频图并起播（需在用户手势回调内调用）。
 * 音频不可用时静默失败，不影响游戏。
 */
export function startMusic(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    if (!bus || ctx !== ac) {
      ctx = ac;
      buildBus(ac);
      lastSig = '';
    }
    if (ac.state === 'suspended') void ac.resume();
  } catch {
    /* 音频不可用则忽略 */
  }
}

/** 页面切到后台时挂起音频（省电、不吵），回到前台恢复 */
export function setMusicSuspended(suspended: boolean): void {
  if (!ctx) return;
  try {
    if (suspended) void ctx.suspend();
    else void ctx.resume();
  } catch {
    /* 忽略 */
  }
}

/** 释放全部声部（关音乐/静音时调用，避免空转耗电） */
function releaseVoices(at: number): void {
  for (const chain of chains.values()) chain.dispose(at);
  chains.clear();
}

/**
 * 按当前指针参数刷新音乐。每帧调用也安全：参数签名未变化时直接返回。
 * @param arms 指针组
 * @param intensity 动态强度 0~1（见 harmony.musicIntensity）
 * @param on 音乐开关
 * @param volume 全局音量 0~1（与音效共用）
 */
export function updateMusic(arms: Arm[], intensity: number, on: boolean, volume: number): void {
  const ac = ctx;
  if (!ac || !bus || !master || !droneLevel) return; // 尚未获得用户手势
  const audible = on && volume > 0;
  const voices = audible ? armsToVoices(arms) : [];
  const sig = audible ? JSON.stringify([intensity, volume, voices]) : 'muted';
  if (sig === lastSig) return;
  lastSig = sig;

  const now = ac.currentTime;
  const fade = audible ? 0.6 : 0.3;
  master.gain.setTargetAtTime(audible ? MASTER_LEVEL * intensity * volume : 0, now, fade);
  droneLevel.gain.setTargetAtTime(audible ? 0.5 * (0.4 + 0.6 * intensity) : 0, now, 0.9);

  if (!audible) {
    releaseVoices(now);
    return;
  }

  const wanted = new Set(voices.map((v) => v.index));
  for (const [i, chain] of chains) {
    if (!wanted.has(i)) {
      chain.dispose(now);
      chains.delete(i);
    }
  }
  for (const v of voices) {
    const existing = chains.get(v.index);
    if (existing) {
      existing.osc.frequency.setTargetAtTime(v.freq, now, 0.08);
      existing.osc.detune.setTargetAtTime(v.detune, now, 0.15);
      existing.gain.gain.setTargetAtTime(v.gain * 0.75, now, 0.35);
      if (existing.pan) existing.pan.pan.setTargetAtTime(v.pan, now, 0.3);
    } else {
      const chain = buildVoiceChain(ac, bus, v);
      // 新声部：柔和进入（1.2s 起来，避免"咔"的一声）
      chain.gain.gain.setTargetAtTime(v.gain * 0.75, now + 0.02, 0.4);
      chains.set(v.index, chain);
    }
  }
}

/** 仅供测试/调试：当前是否已有音频图 */
export function isMusicReady(): boolean {
  return ctx !== null && bus !== null;
}
