import { getAudioContext } from './audio';
import {
  armsToVoices,
  DEFAULT_KEY,
  nextNoteDelay,
  scaleNotes,
  type MusicalKey,
  type Voice,
} from './harmony';
import type { Arm } from './types';

/**
 * 「探索未知」环境声。
 *
 * 刻意**不做**持续低鸣/长音垫：那种声音听久了就是嗡嗡嗡。
 * 这里给出的是一片有空旷混响的空间，声音是稀疏、偶发、慢慢涨落的：
 *
 * - 远方信号：每隔几秒从本关调性音阶里飘出一个长起长落的音（随机声像）
 * - 你的指针：启用中的指针是缓慢呼吸的声部（频率→谐波、半径→音量、相位→声像）
 * - 空气：极轻的带通噪声，像空间本身在流动
 *
 * 干声 + 混响 + 延迟三条支路汇入总线；静下来的时候几乎只剩空间感。
 * 声部链构建、总线构建、排程三个函数都与离线渲染自检共用。
 */

/** 单个"远方信号"的音量基数 */
const NOTE_GAIN = 0.05;
/**
 * 环境音的音高上限（Hz）。高频是"刺耳"的主要来源：
 * 一切都压在 900 Hz 以下，听感是温暖、遥远、留白，而不是尖锐的哨音。
 *
 * 注意这条上限卡的是**实际发声音高**（含编钟泛音 ×2、×2.76），
 * 不只是基频——playSwell 里对每个泛音分量都做了判断，所有调用方自动受保护。
 */
export const NOTE_MAX_HZ = 700;
/** 总线低通：一切都在 900 Hz 以下，刺耳段（1.5~4 kHz）根本进不来 */
const BUS_LOWPASS_HZ = 900;
/** 总线总音量上限 */
const MASTER_LEVEL = 0.4;

/** 单条声部链（实时播放与离线渲染自测共用同一构建函数） */
export interface VoiceChain {
  osc: OscillatorNode;
  gain: GainNode;
  breath: GainNode;
  lfo: OscillatorNode;
  pan: StereoPannerNode | null;
  /** 淡出并停声 */
  dispose(at: number): void;
}

/**
 * 构建一条声部链：osc → gain（包络）→ breath（极慢涨落）→ pan → dest。
 * gain 从 0 起，由调用方淡入；breath 让声部一直缓慢起伏，不会变成一条长音。
 */
export function buildVoiceChain(ac: BaseAudioContext, dest: AudioNode, voice: Voice): VoiceChain {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = voice.freq;
  osc.detune.value = voice.detune;
  const gain = ac.createGain();
  gain.gain.value = 0;
  const breath = ac.createGain();
  breath.gain.value = 1;
  // 每根指针一个不同的慢周期（11~33 秒）：声部明显涨落、时隐时现，
  // 而不是一条持续的长音（深度 0.7 → 音量在 0.3~1.7 倍之间起伏）
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.03 + (voice.index % 5) * 0.015;
  const depth = ac.createGain();
  depth.gain.value = 0.7;
  lfo.connect(depth);
  depth.connect(breath.gain);
  lfo.start();
  osc.connect(gain);
  gain.connect(breath);
  // Safari 老版本无 StereoPanner：退化为单声道
  const maybePan = ac as BaseAudioContext & { createStereoPanner?: () => StereoPannerNode };
  let pan: StereoPannerNode | null = null;
  if (typeof maybePan.createStereoPanner === 'function') {
    pan = maybePan.createStereoPanner();
    pan.pan.value = voice.pan;
    breath.connect(pan);
    pan.connect(dest);
  } else {
    breath.connect(dest);
  }
  osc.start();
  return {
    osc,
    gain,
    breath,
    lfo,
    pan,
    dispose(at: number): void {
      gain.gain.cancelScheduledValues(at);
      gain.gain.setTargetAtTime(0, at, 1.1); // 慢慢消散，不要"咔"的一声
      osc.stop(at + 6);
      lfo.stop(at + 6);
    },
  };
}

/** 混响脉冲响应：指数衰减噪声（空间感的来源） */
export function makeImpulse(ac: BaseAudioContext, seconds = 3.6, decay = 2.3): AudioBuffer {
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/** 环境声总线：干声 + 混响 + 延迟，压缩后输出 */
export interface AmbientBus {
  /** 所有声源接这里 */
  input: GainNode;
  /** 总音量（0 = 静音） */
  master: GainNode;
}

/**
 * 构建总线：input → 低通 → 压缩 → 总音量 → 输出，
 * 并联混响（Convolver，长尾）与延迟（带阻尼反馈的回声）。
 */
export function buildAmbientBus(ac: BaseAudioContext): AmbientBus {
  const input = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = BUS_LOWPASS_HZ;
  lp.Q.value = 0.5;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 26;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.02;
  comp.release.value = 0.4;
  const master = ac.createGain();
  master.gain.value = 0;
  input.connect(lp);
  lp.connect(comp);
  comp.connect(master);
  master.connect(ac.destination);

  // 混响支路：空旷空间（短一些、湿一些收着给——长尾会把稀疏的音糊成持续背景）
  const conv = ac.createConvolver();
  conv.buffer = makeImpulse(ac, 1.8, 3.2);
  const wet = ac.createGain();
  wet.gain.value = 0.4;
  input.connect(conv);
  conv.connect(wet);
  wet.connect(lp);

  // 延迟支路：单次回声即可（反馈会越叠越响，听感就是"嗡嗡"）
  const delay = ac.createDelay(1.5);
  delay.delayTime.value = 0.42;
  const damp = ac.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 900;
  const echo = ac.createGain();
  echo.gain.value = 0.26;
  input.connect(delay);
  delay.connect(damp);
  damp.connect(echo);
  echo.connect(lp);

  return { input, master };
}

/**
 * 编钟式泛音：钟的经典分音比（2.0 八度、2.76 近似小十度），
 * 但高次压得很轻——有"钟"的味，不扎耳朵。
 */
const BELL_PARTIALS: Array<[number, number]> = [
  [1, 1],
  [2, 0.22],
  [2.76, 0.08],
];

/**
 * 一个长起长落的音：探索环境的基本单位（慢起音、慢消散、可定位声像）。
 *
 * 导出仅供测试断言"实际发声音高 ≤ NOTE_MAX_HZ"这条设计约束。
 */
export function playSwell(
  ac: BaseAudioContext,
  dest: AudioNode,
  freq: number,
  gain: number,
  at: number,
  attack: number,
  release: number,
  pan: number,
  partials: Array<[number, number]> = [[1, 1]],
): void {
  const maybePan = ac as BaseAudioContext & { createStereoPanner?: () => StereoPannerNode };
  let out: AudioNode = dest;
  if (typeof maybePan.createStereoPanner === 'function') {
    const p = maybePan.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    out = p;
  }
  for (const [mult, pg] of partials) {
    // 上限要卡在**实际发声音高**上，而不只是基频：
    // 编钟泛音有 ×2 与 ×2.76，700 Hz 的基频会推出 1932 Hz 的刺耳音。
    // 超限的泛音直接跳过（低音仍保留钟的质感，高音不会扎耳朵）。
    if (freq * mult > NOTE_MAX_HZ) continue;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * pg, at + attack);
    g.gain.setTargetAtTime(0, at + attack, release / 3);
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + attack + release * 2.4 + 0.5);
  }
}

/** 排程游标 */
export interface AmbientState {
  /** 下一个音符的 AudioContext 时间 */
  nextAt: number;
}

/**
 * 在 [state.nextAt, until) 之间排入若干"远方信号"。
 * rnd 可注入（测试用），返回本次排入的音符数。
 */
export function scheduleAmbient(
  ac: BaseAudioContext,
  bus: AmbientBus,
  state: AmbientState,
  key: MusicalKey,
  intensity: number,
  rnd: () => number,
  until: number,
): number {
  // 只在 900 Hz 以下取音：这是"温暖/遥远"与"尖锐"的分界
  const pool = scaleNotes(key, 14).filter((f) => f <= NOTE_MAX_HZ);
  if (pool.length === 0) pool.push(key.root * 2);
  let count = 0;
  while (state.nextAt < until && count < 32) {
    const at = Math.max(state.nextAt, 0.02);
    const idx = Math.min(pool.length - 1, Math.floor(rnd() * pool.length));
    // 偶尔沉到低八度（更深、更远），不再往上飘——上方八度正是刺耳区
    const octave = rnd() < 0.3 ? 0.5 : 1;
    const freq = pool[idx] * octave;
    const gain = NOTE_GAIN * (0.55 + 0.45 * rnd()) * (0.6 + 0.4 * intensity);
    // 短一些、软一些：一条音的生命 ~5 秒，起落分明，不留长长的尾巴
    const attack = 0.6 + rnd() * 0.9;
    const release = 1.8 + rnd() * 1.6;
    const pan = (rnd() * 2 - 1) * 0.8;
    // 纯正弦单音：不再叠编钟泛音（高音会扎耳朵），像远处一声轻钟
    playSwell(ac, bus.input, freq, gain, at, attack, release, pan);
    state.nextAt = at + nextNoteDelay(rnd(), intensity);
    count++;
  }
  return count;
}

/* ---------- 实时播放 ---------- */

let ctx: AudioContext | null = null;
let bus: AmbientBus | null = null;
let chains = new Map<number, VoiceChain>();
/** 上一次落地的参数签名：未变化则完全跳过，避免每帧重设音频参数 */
let lastSig = '';
/** 排程用的当前调性与强度（updateMusic 时更新） */
let curKey: MusicalKey = DEFAULT_KEY;
let curIntensity = 0.55;
const schedState: AmbientState = { nextAt: 0 };
let schedTimer: ReturnType<typeof setTimeout> | null = null;

/** 排程循环：提前 2.5 秒把"远方信号"排进音频时钟 */
function pumpScheduler(): void {
  if (!ctx || !bus) return;
  scheduleAmbient(ctx, bus, schedState, curKey, curIntensity, Math.random, ctx.currentTime + 2.5);
}

function startScheduler(): void {
  if (schedTimer !== null || !ctx) return;
  schedState.nextAt = Math.max(schedState.nextAt, ctx.currentTime + 0.3);
  const tick = (): void => {
    pumpScheduler();
    schedTimer = setTimeout(tick, 900);
  };
  schedTimer = setTimeout(tick, 250);
}

function stopScheduler(): void {
  if (schedTimer !== null) {
    clearTimeout(schedTimer);
    schedTimer = null;
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
      bus = buildAmbientBus(ac);
      schedState.nextAt = 0;
      lastSig = '';
    }
    if (ac.state === 'suspended') void ac.resume();
    startScheduler();
  } catch {
    /* 音频不可用则忽略 */
  }
}

/** 页面切到后台时挂起音频（省电、不吵），回到前台恢复 */
export function setMusicSuspended(suspended: boolean): void {
  if (!ctx) return;
  try {
    if (suspended) {
      stopScheduler(); // 挂起时 currentTime 停走，继续排程会在同一时刻堆叠
      void ctx.suspend();
    } else {
      void ctx.resume();
      startScheduler();
    }
  } catch {
    /* 忽略 */
  }
}

/** 切关"抵达"音：一串极柔和的上行泛音，提示进入了新的音景 */
export function musicLevelArrival(key: MusicalKey): void {
  const ac = ctx;
  const target = bus;
  if (!ac || !target) return;
  const pool = scaleNotes(key, 7);
  const now = ac.currentTime + 0.05;
  [0, 2, 4].forEach((slot, i) => {
    playSwell(
      ac,
      target.input,
      pool[slot % pool.length],
      0.05 - i * 0.009,
      now + i * 0.42,
      0.5,
      4.5 + i,
      (i - 1) * 0.5,
      BELL_PARTIALS,
    );
  });
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
 * @param key 本关调性（章节决定；随机关按 id 稳定散列）
 * @param voiced 是否让指针发声：只有指针真的在转（运行/暂停/结算）时才唱，
 *   编辑思考时保持安静——"嗡嗡"的长音正是要避免的东西
 */
export function updateMusic(
  arms: Arm[],
  intensity: number,
  on: boolean,
  volume: number,
  key: MusicalKey = DEFAULT_KEY,
  voiced = true,
): void {
  const ac = ctx;
  if (!ac || !bus) return; // 尚未获得用户手势
  curKey = key;
  curIntensity = intensity;
  const audible = on && volume > 0;
  const voices = audible && voiced ? armsToVoices(arms, key.root) : [];
  const sig = audible ? JSON.stringify([intensity, volume, key.root, voiced, voices]) : 'muted';
  if (sig === lastSig) return;
  lastSig = sig;

  const now = ac.currentTime;
  bus.master.gain.setTargetAtTime(
    audible ? MASTER_LEVEL * intensity * volume : 0,
    now,
    audible ? 0.8 : 0.4,
  );

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
      existing.osc.frequency.setTargetAtTime(v.freq, now, 0.25);
      existing.osc.detune.setTargetAtTime(v.detune, now, 0.2);
      existing.gain.gain.setTargetAtTime(v.gain * 0.6, now, 1.4);
      if (existing.pan) existing.pan.pan.setTargetAtTime(v.pan, now, 0.6);
    } else {
      const chain = buildVoiceChain(ac, bus.input, v);
      // 新声部：2.4 秒缓缓浮现，像从远处出现
      chain.gain.gain.setTargetAtTime(v.gain * 0.6, now + 0.05, 2.4);
      chains.set(v.index, chain);
    }
  }
}

/** 仅供测试/调试：当前是否已有音频图 */
export function isMusicReady(): boolean {
  return ctx !== null && bus !== null;
}
