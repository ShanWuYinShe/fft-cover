import { PENTATONIC, VOLUME_KEY } from './constants';

let audioCtx: AudioContext | null = null;
/**
 * 全局音量（0/0.5/1 三态），由 App 切换并持久化。
 * 初值必须由 initVolumeFromStorage() 从存档里恢复——否则每次刷新都会
 * 从满音量起步，静音的玩家会突然听到声音（模块级变量不会自己读存档）。
 */
let volume = 1;

export function setVolume(v: number): void {
  volume = v;
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {
    /* 忽略 */
  }
}

/** 当前生效的音量（测试与诊断用；0 是合法值） */
export function currentVolume(): number {
  return volume;
}

/** 从存档恢复音量到模块状态；返回恢复后的值（App 启动时调用一次） */
export function initVolumeFromStorage(): number {
  volume = getVolume();
  return volume;
}

/** 合法音量档位：满 / 半 / 静音 */
const VOLUME_STEPS = [1, 0.5, 0];

/**
 * 读取持久化音量。
 *
 * 注意别写成 `Number(x) || 1`——那会把"静音"（0）当成假值回落到满音量，
 * 玩家静音后一刷新就恢复满音量（0 在这里是合法值，不是缺失）。
 * 只接受三档合法值，其余（没存过 / 脏数据）一律回落到满音量。
 */
export function getVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 1;
    const v = Number(raw);
    return VOLUME_STEPS.includes(v) ? v : 1;
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
 * 拨弦音（古筝／琵琶意象）：极快起音 + 指数衰减 + 三个泛音 + **上滑音装饰**。
 * 泛音按 1 : 0.3 : 0.12 递弱、并整体低通，既像"弦"又不刺耳；
 * 滑音是古筝"按滑"的韵味所在：基频从低约 60 音分处 50ms 内滑正，很轻。
 */
export function pluck(freq: number, on: boolean, dur = 0.55, gain = 0.13): void {
  if (!on) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    // 一次拨弦共用一个低通：1.6 kHz 以下才不扎耳朵（×2 泛音在限内，×3 去掉）
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    lp.Q.value = 0.4;
    lp.connect(ac.destination);
    const partials: Array<[number, number]> = [
      [1, 1],
      [2, 0.22],
    ];
    for (const [mult, pg] of partials) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      if (mult === 1) {
        // 上滑音：只滑基频（泛音跟着基频的滑动感走，不必单独滑）
        o.frequency.setValueAtTime(freq * 0.965, t0);
        o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.05);
      }
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
 * 木鱼「笃」的共享画法：短促正弦、音高瞬间下落——中国打击乐的核心质感。
 * 连击里程碑（woodfishSound，880→620）亮而重；UI 按键（uiClick，600→450）
 * 低而轻，同族不混淆。
 */
function knock(fStart: number, fEnd: number, dur: number, gain: number, on: boolean): void {
  if (!on) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sine';
    // 木腔的"笃"：音高瞬间下落，比固定音高更像敲木头
    o.frequency.setValueAtTime(fStart, t0);
    o.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur * 0.65);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain * vol(), t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* 音频不可用则忽略 */
  }
}

/**
 * 木鱼声（中国打击乐）：短促的"笃"——快速下落的音高 + 极短衰减。
 * 用于连击里程碑（每满 5 连）这样的轻量点缀，不盖过收集音。
 */
export function woodfishSound(on: boolean): void {
  knock(880, 620, 0.07, 0.09, on);
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

/**
 * 全清演奏：**古筝刮奏**（glissando）——按本关调性音阶快速上行一行
 * （默认 C 宫五声两个八度取前 8 音），每音错开 45ms，拨弦收尾。
 * 比大三和弦更"中国风"：五声刮奏是古筝最标志性的语汇。
 */
export function perfectArpeggio(on: boolean, scale: number[] = PENTATONIC.slice(0, 8)): void {
  if (!on) return;
  scale.forEach((f, i) => {
    setTimeout(() => pluck(f, true, 0.5, 0.09), i * 45);
  });
}

/** 普通结束音效：上行双音 */
export function finishChord(on: boolean): void {
  beep(660, 0.12, 'triangle', 0.12, on);
  setTimeout(() => beep(880, 0.2, 'triangle', 0.12, on), 110);
}

/**
 * 升星提示音：越过高星阈值时的一声清亮铃音，音高随档位升高。
 * 短促、不连击（一局最多三次），音量低于收集音。
 */
export function starSound(tier: number, on: boolean): void {
  if (!on) return;
  const freq = [0, 659.25, 783.99, 880][Math.min(Math.max(tier, 1), 3)];
  beep(freq, 0.24, 'triangle', 0.075, true);
  if (tier >= 3) setTimeout(() => beep(1046.5, 0.28, 'sine', 0.04, true), 95);
}

/** 章节印：本章四印集齐时的一声重章 + 两声轻铃（比单枚印更隆重） */
export function chapterSealSound(on: boolean): void {
  if (!on) return;
  beep(110, 0.3, 'sine', 0.16, true);
  setTimeout(() => beep(784, 0.24, 'triangle', 0.06, true), 60);
  setTimeout(() => beep(1046.5, 0.3, 'triangle', 0.05, true), 260);
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

/**
 * 终局倒计时滴答：木鱼轻叩，音高随剩余秒数升高（3→2→1），
 * 与 UI 按键同一器物音色（knock），更短促、不抢收集音——
 * 一局的最后 3 秒是张力顶点，每秒一击把「时间在流逝」敲进耳朵。
 */
export function tickSound(sec: number, on: boolean): void {
  const f = sec >= 3 ? 620 : sec === 2 ? 760 : 900;
  knock(f, f * 0.72, 0.07, 0.06, on);
}

/**
 * 时间到：下行双音「收秤」。全清有上行琶音、手动结束有收束和弦，
 * 「没跑完就到点」也该有自己的听觉身份——短促下行，不带庆祝感。
 */
export function timeUpSound(on: boolean): void {
  if (!on) return;
  beep(494, 0.16, 'sine', 0.12, true);
  setTimeout(() => beep(330, 0.3, 'sine', 0.12, true), 140);
}

/* ---------- UI 音效（器物化：交互反馈用木鱼轻叩与编钟，音量远低于游戏音） ---------- */

/**
 * UI 按键：一声低而轻的木鱼「笃」（600 → 450 Hz，60 ms）。
 * 所有按钮经全局点击监听（audioController）统一触发，音色即器物质感。
 */
export function uiClick(on = true): void {
  knock(600, 450, 0.06, 0.05, on);
}

/**
 * UI 面板展开：一声编钟「磬」。分音比与配乐的 BELL_PARTIALS 同配方
 * （×2 八度、×2.76 近似小十度），高次压得极轻且短促，不扎耳；
 * 基频 523.25（C5，宫音区）。比按键音晚 70 ms 起振，形成「笃 → 磬」的应答感。
 * 用于功能弹层（成就/设置/星图/合成器/暂停/更多菜单）展开的一瞬；
 * 关闭不加音——关闭键自带的笃声已覆盖。
 */
export function uiChime(on = true): void {
  if (!on) return;
  try {
    const ac = getAudioContext();
    if (!ac) return;
    // [倍率, 相对增益, 衰减秒]——倍率与增益同 music.ts 的 BELL_PARTIALS
    const partials: Array<[number, number, number]> = [
      [1, 1, 0.5],
      [2, 0.22, 0.32],
      [2.76, 0.08, 0.18],
    ];
    setTimeout(() => {
      try {
        const t0 = ac.currentTime;
        for (const [mult, pg, dur] of partials) {
          const o = ac.createOscillator();
          o.type = 'sine';
          o.frequency.value = 523.25 * mult;
          const g = ac.createGain();
          const peak = Math.max(0.0002, 0.045 * pg * vol());
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          o.connect(g);
          g.connect(ac.destination);
          o.start(t0);
          o.stop(t0 + dur + 0.05);
        }
      } catch {
        /* 音频不可用则忽略 */
      }
    }, 70);
  } catch {
    /* 音频不可用则忽略 */
  }
}
