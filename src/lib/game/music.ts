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
 * 「探索未知 · 正向明快」环境声。
 *
 * 刻意**不做**任何持续音：持续正弦叠加（哪怕是和声）听久了就是嗡嗡的低鸣——
 * "指针化为声部"最容易被误读成常鸣垫音，所以指针声部
 * **只以一阵阵柔和的风铃脉冲出现**，安静下来时几乎只剩空间感。
 *
 * - 远方信号：每隔几秒飘出一串**上行五声琶音**（2~3 音，正向情绪的动机）
 * - 你的指针：按各自节拍敲出风铃脉冲（频率→音高、半径→音量、相位→声像）
 * - 空间：短混响 + 单次回声，收着给——长尾会把稀疏的音糊成持续背景
 *
 * 干声 + 混响 + 延迟三条支路汇入总线；一切实际发声都压在 700 Hz 以下。
 * 总线构建、排程函数都与离线渲染自检共用。
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
const MASTER_LEVEL = 0.34;

/** 指针风铃脉冲：快起（敲击感）+ 中速消散（余韵），绝不是长音 */
const CHIME_ATTACK_MAX = 0.14;
const CHIME_RELEASE_BASE = 1.1;

/**
 * 把声部频率降到 NOTE_MAX_HZ 以下：超限就降八度（÷2），保住谐波类关系——
 * 比起把音"掐掉"，降八度既不刺耳又保留"这是第 k 次谐波"的听感对应。
 * 导出仅供测试断言。
 */
export function calmFreq(freq: number): number {
  let f = freq;
  while (f > NOTE_MAX_HZ) f /= 2;
  return f;
}

/** 混响脉冲响应：指数衰减噪声（空间感的来源） */
export function makeImpulse(ac: BaseAudioContext, seconds = 1.4, decay = 3.4): AudioBuffer {
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
 * 并联混响（短尾）与延迟（单次回声，无反馈）。
 * 两条支路都收得很轻：混响/回声糊在稀疏的音后面，就是"嗡嗡"的底。
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

  // 混响支路：短尾轻湿——空间感够用，不会把稀疏的音拖成持续背景
  const conv = ac.createConvolver();
  conv.buffer = makeImpulse(ac, 1.4, 3.4);
  const wet = ac.createGain();
  wet.gain.value = 0.3;
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
  echo.gain.value = 0.15;
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
 * 中国风旋律动机：相对起点的**音阶索引**模式（不是固定频率），
 * 在任意调性上都成立。级进回绕 + 折回——像笛箫的短句，
 * 而不是机械上行音阶。尾音拖腔（release ×1.7）是"韵味"所在。
 */
const MOTIFS: number[][] = [
  [0, 1, 2], // 三音上行
  [0, 1, 2, 1], // 上行折回
  [0, 2, 1, 0], // 环绕回落
  [0, 1, 2, 3], // 四音上行
  [0, 2, 3, 2], // 跳进后折回
];

/**
 * 在 [state.nextAt, until) 之间排入若干条**五声乐句**（远方信号）。
 * 每条乐句是一个中国风动机（级进回绕 + 尾音拖腔），带编钟泛音
 * （低音带钟味；超 700 Hz 的泛音被 playSwell 自动跳过，高音永远干净）。
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
  // 每条乐句最多 5 音：条件按"加上本句仍 ≤32"卡，保证返回值不越上限
  while (state.nextAt < until && count + 5 <= 32) {
    const at = Math.max(state.nextAt, 0.02);
    const idx = Math.min(pool.length - 1, Math.floor(rnd() * (pool.length * 0.6)));
    // 偶尔沉到低八度（更深、更远），不再往上飘——上方八度正是刺耳区
    const octave = rnd() < 0.3 ? 0.5 : 1;
    const motif = MOTIFS[Math.floor(rnd() * MOTIFS.length)];
    const pan = (rnd() * 2 - 1) * 0.8;
    const gain = NOTE_GAIN * (0.55 + 0.45 * rnd()) * (0.6 + 0.4 * intensity);
    const attack = 0.3 + rnd() * 0.4;
    const release = 1.3 + rnd() * 1.0;
    for (let j = 0; j < motif.length; j++) {
      const note = pool[Math.max(0, Math.min(idx + motif[j], pool.length - 1))] * octave;
      // 尾音拖腔（release ×1.7）+ 编钟泛音：低音有钟味，高音自动只剩基频
      const tail = j === motif.length - 1 ? 1.7 : 1;
      playSwell(
        ac,
        bus.input,
        note,
        gain * (1 - j * 0.12),
        at + j * 0.5,
        attack,
        release * tail,
        pan,
        BELL_PARTIALS,
      );
    }
    // 组间留白：乐句之间必须有大段的安静——稠密与嗡鸣只有一步之遥
    const span = motif.length * 0.5;
    state.nextAt = at + span + 0.4 + 1.5 * (0.7 + 0.8 * rnd()) + nextNoteDelay(rnd(), intensity);
    count += motif.length;
  }
  return count;
}

/**
 * 指针风铃脉冲：每根启用的指针按自己的节拍敲一下——
 * 频率→音高（超限降八度）、半径→音量、相位→声像。
 * 各指针的节拍错开（序号错相 + 随机抖动），叠起来是跳动的音符织体，
 * 而不是一堵持续的长音墙。
 * 返回本次排入的脉冲数（测试用）。
 */
export function scheduleVoiceChimes(
  ac: BaseAudioContext,
  bus: AmbientBus,
  cursors: Map<number, number>,
  voices: Voice[],
  rnd: () => number,
  until: number,
): number {
  let count = 0;
  for (const v of voices) {
    let next = cursors.get(v.index) ?? 0.02;
    while (next < until && count < 48) {
      const at = Math.max(next, 0.02);
      playSwell(
        ac,
        bus.input,
        calmFreq(v.freq),
        v.gain * 0.9,
        at,
        0.04 + rnd() * CHIME_ATTACK_MAX,
        CHIME_RELEASE_BASE + rnd() * 0.8,
        v.pan,
      );
      // 每根指针 1.6~3.6 秒敲一下：有节律，但绝不连成持续音
      next = at + 1.6 + (v.index % 4) * 0.35 + rnd() * 0.9;
      count++;
    }
    cursors.set(v.index, next);
  }
  return count;
}

/* ---------- 实时播放 ---------- */

let ctx: AudioContext | null = null;
let bus: AmbientBus | null = null;
/** 当前指针声部快照：排程器按它敲风铃脉冲（不再有任何持续振荡器） */
let curVoices: Voice[] = [];
/** 每根指针的下一次脉冲时刻 */
const voiceCursors = new Map<number, number>();
/** 上一次落地的参数签名：未变化则完全跳过，避免每帧重设音频参数 */
let lastSig = '';
/** 排程用的当前调性与强度（updateMusic 时更新） */
let curKey: MusicalKey = DEFAULT_KEY;
let curIntensity = 0.55;
const schedState: AmbientState = { nextAt: 0 };
let schedTimer: ReturnType<typeof setTimeout> | null = null;

/** 排程循环：提前 2.5 秒把"远方信号"与"指针脉冲"排进音频时钟 */
function pumpScheduler(): void {
  if (!ctx || !bus) return;
  const until = ctx.currentTime + 2.5;
  scheduleAmbient(ctx, bus, schedState, curKey, curIntensity, Math.random, until);
  if (curVoices.length > 0) {
    scheduleVoiceChimes(ctx, bus, voiceCursors, curVoices, Math.random, until);
  }
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
      voiceCursors.clear();
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

/**
 * 按当前指针参数刷新音乐。每帧调用也安全：参数签名未变化时直接返回。
 *
 * 这里**只更新快照与总线响度**——不建任何持续振荡器。
 * 指针真正出声由排程器的风铃脉冲负责（scheduleVoiceChimes）：
 * 常鸣长音（哪怕是好听的长音）听久了就是"嗡嗡"，从根上不给它机会。
 *
 * @param arms 指针组
 * @param intensity 动态强度 0~1（见 harmony.musicIntensity）
 * @param on 音乐开关
 * @param volume 全局音量 0~1（与音效共用）
 * @param key 本关调性（章节决定；随机关按 id 稳定散列）
 * @param voiced 是否让指针发声：只有指针真的在转（运行/暂停/结算）时才敲脉冲，
 *   编辑思考时保持安静
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
  curVoices = audible && voiced ? armsToVoices(arms, key.root) : [];
  if (!audible || curVoices.length === 0) voiceCursors.clear();
  const sig = audible ? JSON.stringify([intensity, volume, key.root, voiced, curVoices]) : 'muted';
  if (sig === lastSig) return;
  lastSig = sig;

  bus.master.gain.setTargetAtTime(
    audible ? MASTER_LEVEL * intensity * volume : 0,
    ac.currentTime,
    audible ? 0.8 : 0.4,
  );
}

/** 仅供测试/调试：当前是否已有音频图 */
export function isMusicReady(): boolean {
  return ctx !== null && bus !== null;
}

/** 仅供测试：注入假的音频图，让 updateMusic 的快照逻辑能在 Node 里驱动 */
export function __setAudioGraphForTests(ac: BaseAudioContext, graph: AmbientBus): void {
  ctx = ac as AudioContext;
  bus = graph;
  curVoices = [];
  voiceCursors.clear();
  schedState.nextAt = 0;
  lastSig = '';
}
