import { ARMS_MAX } from './constants';
import { todayKey, weekKey } from './dates';
import {
  buildPoints,
  buildCurve,
  densifyPoly,
  dftSpectrum,
  normalizeShape,
  resample,
} from './math';
import type { Level, LevelDef, Vec } from './types';

const C = Math.cos;
const S = Math.sin;

/**
 * 战役章节：把内置关卡组织成一条有节奏的通关路线。
 * 每章一个主题（对应一类傅立叶结构），章内关卡线性解锁、章间递进。
 */
export interface ChapterDef {
  id: string;
  name: string;
  tagline: string;
  /** 章节入场卡上的"本章要点"（一句话说清这一章教什么） */
  intro: string;
  /** 章节印单字：本章全部朱印集齐后，章头盖上这一方大印 */
  seal: string;
}

/**
 * 内置章节（顺序即解锁顺序）。
 * 章名取中国古典意象，数学含义放在 tagline 里——一章一境，一句一理。
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'basics',
    name: '第一章 · 一画',
    tagline: '易有太极，是生两仪——一根指针就是一个旋转向量',
    intro: '一根指针画一个圆。这一章只需要理解一件事：指针转一圈，指尖就画出一条曲线。',
    seal: '画',
  },
  {
    id: 'petals',
    name: '第二章 · 花信',
    tagline: '花信有风，开合有时——反着转的那一根，才是花瓣的关键',
    intro:
      '本章要点：<b>负频率</b>。把某根指针切到 ⟲ 反转，它就和顺转的那根叠出花瓣——花瓣的数目由两根的频率差决定。',
    seal: '信',
  },
  {
    id: 'pairs',
    name: '第三章 · 阴阳',
    tagline: '一阴一阳之谓道——正频与负频总是成对出现',
    intro:
      '本章要点：<b>频率对</b>。同一频率的正反两根相位差 90°，合起来才是一条闭合的实曲线——这就是"阴阳"。',
    seal: '阳',
  },
  {
    id: 'summit',
    name: '第四章 · 万象',
    tagline: '万象森罗，皆可展开——高次谐波，以及故意不让你拟合的曲线',
    intro:
      '本章要点：<b>高次谐波与截断</b>。频率越高，半径越小；10 根指针装不下无限高的频率，于是要学会"逼近"。',
    seal: '象',
  },
  {
    id: 'china',
    name: '第五章 · 器象',
    tagline: '五音既全，器物成形——盘长结、菱花镜、阴阳鱼',
    intro:
      '本章要点：<b>谐波的不同写法</b>。两根能编结、五根能开菱花、八根能游出阴阳鱼——器物不过是谐波换了一种排法。',
    seal: '器',
  },
  {
    id: 'craft',
    name: '第六章 · 巧变',
    tagline: '同是那几根指针，换个配比与相位，便是另一件器物',
    intro:
      '本章要点：<b>配比与相位</b>。频率清单不变，只改振幅比例与相位，形状就换了模样——风车靠相位拧出四叶、双旋靠配比定两瓣胖瘦、云纹靠正反成对叠出云头。',
    seal: '巧',
  },
  {
    id: 'dacheng',
    name: '第七章 · 大成',
    tagline: '集大成也——正负、高低、纵横，诸法合璧',
    intro:
      '本章要点：<b>诸法合璧</b>。三项式半径 r = a + b·cos2θ + c·cos4θ + … 展开成 x/y 后会差出成套的频率——灯笼五根、团花七根、古钟七根，把前六章的功夫合起来用。',
    seal: '成',
  },
];

/**
 * 阴阳鱼轮廓：右半外圆 + 一条穿过圆心、在两极与外圆相切的解析 S 曲线
 *   x(u) = (R/2)·sin(2πu)，y(u) = R·cos(πu)，u ∈ [0, 1]
 *
 * 经典太极用"两个半圆"拼 S，切线虽连续但曲率跳变，傅立叶系数衰减慢；
 * 这里换成解析 S，10 根指针以内即可 100% 贴合（实测 8 根偏差 < 5px）。
 */
function taijiFn(t: number): Vec {
  const R = 200;
  if (t < Math.PI) {
    const a = -Math.PI / 2 + t; // 顶点 (0,-R) 顺时针沿右半圆到底点 (0,R)
    return { x: R * C(a), y: R * S(a) };
  }
  const u = (t - Math.PI) / Math.PI; // 0 → 底点，1 → 顶点
  return { x: (R / 2) * S(2 * Math.PI * u), y: R * C(Math.PI * u) };
}

/**
 * 内置关卡（难度递进）。
 * armLimit 为本关指针上限——每关都存在按傅立叶精确分解可达成的高分路径。
 * hint 给出目标曲线的谐波分解线索（含负频率项）。
 */
export const LEVEL_DEFS: LevelDef[] = [
  {
    id: 'circle',
    chapter: 'basics',
    name: '圆',
    hint: '一根 1× 指针就能画圆（半径约 120，相位随意）——单一频率项，这是傅立叶级数最简单的形式。',
    n: 24,
    armLimit: 1,
    fn: (t) => ({ x: 200 * C(t), y: 200 * S(t) }),
  },
  {
    id: 'ellipse',
    chapter: 'basics',
    name: '椭圆',
    hint: '精确分解含 <b>1× 与 −1×（⟲ 反转）</b>两根：一正一反两个旋转向量叠加，把圆压成椭圆。相位很重要！',
    n: 24,
    armLimit: 2,
    fn: (t) => ({ x: 200 * C(t), y: 105 * S(t) }),
  },
  {
    id: 'clover',
    chapter: 'petals',
    name: '三叶草',
    hint: 'r=cos3θ 的复数分解：e^{iθ}·cos3θ = ½e^{i4θ} + ½e^{−i2θ}——只要 <b>4× 与 −2× 两根</b>！负频率＝<b>反向旋转</b>：把 −2× 那根的方向按钮切到 <b>⟲（紫色）</b>即可。',
    n: 27,
    armLimit: 2,
    fn: (t) => {
      const r = 150 * C(3 * t);
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'flower5',
    chapter: 'petals',
    name: '梅花',
    hint: 'r=1+0.38cos5θ → e^{iθ} + 0.19e^{i6θ} + 0.19e^{−i4θ}：需要 <b>1×、6×、−4×（⟲ 反转）</b>三根。',
    n: 30,
    armLimit: 3,
    fn: (t) => {
      const r = 150 * (1 + 0.38 * C(5 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'gear8',
    chapter: 'petals',
    name: '八齿齿轮',
    hint: 'e^{iθ}(1+0.22cos8θ) = e^{iθ} + 0.11e^{i9θ} + 0.11e^{−i7θ}：<b>1× 主臂 + 9× 与 −7×（⟲ 反转）</b>小半径副臂。9× 转得飞快！',
    n: 30,
    armLimit: 3,
    fn: (t) => {
      const r = 160 * (1 + 0.22 * C(8 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'inf8',
    chapter: 'pairs',
    name: '无穷 ∞',
    hint: '别被"两根"骗了！x=cosθ/(1+sin²θ) 自含 <b>±1× 与 ±3×</b> 谐波，y 又需要 ±2×——<b>±1× 与 ±2× 四根</b>起步，3× 微调贴合交叉处。',
    n: 24,
    armLimit: 6,
    fn: (t) => {
      const d = 1 + S(t) * S(t);
      const a = 210;
      return { x: (a * C(t)) / d, y: (a * S(t) * C(t)) / d };
    },
  },
  {
    id: 'lissajous',
    chapter: 'pairs',
    name: '利萨茹 3:2',
    hint: 'x=cos3t、y=sin2t 的复数分解含 <b>±3× 与 ±2×</b> 四根——同频率的正反两根相位差 90°，这就是"频率对"。',
    n: 26,
    armLimit: 4,
    fn: (t) => ({ x: 210 * C(3 * t), y: 150 * S(2 * t) }),
  },
  {
    id: 'liss54',
    chapter: 'pairs',
    name: '利萨茹 5:4',
    hint: '频率对 <b>±5× 与 ±4×</b>——更密的结，四根指针缺一不可。最后一课：频率对的长度各不相同。',
    n: 30,
    armLimit: 4,
    fn: (t) => ({ x: 195 * C(5 * t), y: 165 * S(4 * t) }),
  },
  {
    id: 'rose9',
    chapter: 'summit',
    name: '九瓣花',
    hint: 'e^{iθ}(1+0.22cos9θ) = e^{iθ} + 0.11e^{i10θ} + 0.11e^{−i8θ}：<b>1×、10× 与 −8×（⟲ 反转）</b>三根即可完美——越高频的花，需要的谐波越高。',
    n: 30,
    armLimit: 3,
    fn: (t) => {
      const r = 160 * (1 + 0.22 * C(9 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'star5',
    chapter: 'summit',
    name: '五角星',
    hint: '尖角是无限高频率，5 根指针也难完全贴合——优先保证五条边中段，尽力收集！',
    n: 30,
    armLimit: 5,
    poly: (() => {
      const p: Vec[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 190 : 80;
        p.push({ x: r * C(a), y: r * S(a) });
      }
      p.push(p[0]);
      return p;
    })(),
  },
  {
    id: 'heart',
    chapter: 'summit',
    name: '心形',
    hint: '终极考验：心形的精确分解需要 <b>±1×、±2×、±3×、±4× 全部 8 根</b>（⟲ 反转组合一个不能少）——通关它，你就真正理解了傅立叶级数！',
    n: 30,
    armLimit: 8,
    fn: (t) => ({
      x: 16 * Math.pow(S(t), 3),
      y: 13 * C(t) - 5 * C(2 * t) - 2 * C(3 * t) - C(4 * t),
    }),
  },
  {
    id: 'ripple12',
    chapter: 'summit',
    name: '十二波纹',
    hint: '⚠️ 收官挑战：r=1+0.14cos12θ 的精确分解含 <b>13× 与 −11×</b>——都超出了 10× 上限，<b>无法完美拟合</b>。用 1× 撑起主体，再用 10× 尽量压出波纹，比比谁更接近！',
    n: 34,
    armLimit: 10,
    fn: (t) => {
      const r = 150 * (1 + 0.14 * C(12 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  // ---- 第五章 · 器象：三件中国器物，各教一件事 ----
  {
    id: 'knot',
    chapter: 'china',
    name: '盘长结',
    hint: '两根指针就能编出一个结：<b>2× 顺转</b>与 <b>1× 反转</b>（半径比约 2:1）。结的形状只由这两根的频率比决定——比例差一点，结就散架。',
    n: 28,
    armLimit: 2,
    fn: (t) => ({ x: S(t) + 2 * S(2 * t), y: C(t) - 2 * C(2 * t) }),
  },
  {
    id: 'mirror',
    chapter: 'china',
    name: '菱花镜',
    hint: '唐代菱花镜的八瓣镜缘：<b>6× 与 9×</b> 两级谐波叠在 1× 主圆上，展开后是 e^{i7θ}、e^{−i5θ}、e^{i10θ}、e^{−i8θ}——共 5 根指针。第二级只有 4%，却决定花瓣圆不圆。',
    n: 30,
    armLimit: 5,
    fn: (t) => {
      const r = 150 * (1 + 0.14 * C(6 * t) + 0.05 * C(9 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'taiji',
    chapter: 'china',
    name: '阴阳鱼',
    hint: '太极的阴阳鱼：右半外圆 + 一条过圆心、两极相切的 S 曲线。它需要 <b>1× 到 4× 的正反两根全部上阵（共 8 根）</b>——低频项撑起大圆，高次项雕出鱼尾的尖角，频率越高半径越小。',
    n: 30,
    armLimit: 8,
    fn: taijiFn,
  },

  // ---- 第六章 · 巧变：频率清单不变，改配比与相位就是另一个器物 ----
  {
    id: 'pinwheel',
    chapter: 'craft',
    name: '风车',
    hint: '半径随 4× 摆一圈（r = 1 + 0.42·sin 4t）：展开是 1×、5× 与一根 <b>−3×（⟲ 反转）</b>——四片叶子是被那根反转的指针"拧"出来的，去掉它叶子就正了。',
    n: 24,
    armLimit: 3,
    fn: (t) => {
      const m = 1 + 0.42 * S(4 * t);
      return { x: 200 * m * C(t), y: 200 * m * S(t) };
    },
  },
  {
    id: 'twin',
    chapter: 'craft',
    name: '双旋',
    hint: '两根同向（1×、3×）加一根反向（−1×）：<b>振幅配比</b>决定两瓣的胖瘦与腰的深浅——比例一变，豆荚就成了葫芦。',
    n: 24,
    armLimit: 3,
    fn: (t) => {
      const r = 1 + 0.34 * S(2 * t);
      return { x: 200 * r * C(t), y: 200 * r * S(t) };
    },
  },
  {
    id: 'wisp',
    chapter: 'craft',
    name: '云纹',
    hint: '云头是叠出来的：1× 撑主体，半径上的 4× 摆动展开成 +5× 与 −3× 两道云头，7× 摆动再展开成 +8× 与 −6× 收出小卷——<b>共 5 根</b>，正反成对才圆润。',
    n: 24,
    armLimit: 5,
    fn: (t) => {
      const r = 1 + 0.2 * C(4 * t) + 0.12 * C(7 * t);
      return { x: 200 * r * C(t), y: 200 * r * S(t) };
    },
  },

  // ---- 第七章 · 大成：三项式半径 r = a + b·cos2kθ，展开后成套的频率一起上 ----
  {
    id: 'lantern',
    chapter: 'dacheng',
    name: '灯笼',
    hint: 'r = 150 + 40cos2θ + 25cos4θ——半径的三项展开乘上 e^{iθ}，展开成 <b>1×、3×、5×</b> 三对频率，<b>5 根</b>正好收齐；纵向略拉，就是一盏圆灯笼。',
    n: 24,
    armLimit: 5,
    fn: (t) => {
      const r = 150 + 40 * C(2 * t) + 25 * C(4 * t);
      return { x: r * C(t), y: 1.08 * r * S(t) };
    },
  },
  {
    id: 'medallion',
    chapter: 'dacheng',
    name: '团花',
    hint: '三重团花 r = 110 + 55cos3θ + 35cos6θ——3× 与 6× 展开后补出 <b>2×、4×、5×、7×</b>，<b>7 根</b>齐发才能描出这朵对称团花纹。',
    n: 27,
    armLimit: 7,
    fn: (t) => {
      const r = 110 + 55 * C(3 * t) + 35 * C(6 * t);
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'bell',
    chapter: 'dacheng',
    name: '古钟',
    hint: 'r = 130 + 45cos2θ + 20cos4θ + 12cos6θ 再纵向拉伸——展开到 <b>7×</b> 共七根，钟口的塌腰与纵向的钟身，就是这个轮廓。',
    n: 30,
    armLimit: 7,
    fn: (t) => {
      const r = 130 + 45 * C(2 * t) + 20 * C(4 * t) + 12 * C(6 * t);
      return { x: r * C(t), y: 1.22 * r * S(t) };
    },
  },
];

/** 由静态定义构建运行时关卡：点集、参考曲线与指针上限 */
export function makeLevel(def: LevelDef): Level {
  const curve = def.poly ? normalizeShape(densifyPoly(def.poly)) : buildCurve(def.fn!);
  const pts = def.poly ? resample(curve, def.n) : buildPoints(def.fn!, def.n);
  return {
    id: def.id,
    name: def.name,
    hint: def.hint,
    chapter: def.chapter,
    pts,
    tol: 13,
    curve,
    spectrum: dftSpectrum(curve, 16).filter((s) => s.k !== 0),
    armLimit: def.armLimit ?? ARMS_MAX,
  };
}

export interface HarmonicCoeff {
  k: number;
  mag: number;
  phase: number;
}

/**
 * 谐波合成器：由系数（正频 e^{ikt} 分量）构建自定义关卡。
 * 系数即指针参数：mag → 半径、phase → 相位、k → 频率。
 */
export function levelFromCoeffs(coeffs: HarmonicCoeff[], name: string, id?: string): Level {
  const active = coeffs.filter((c) => c.mag > 0.5);
  const fn = (t: number): Vec => {
    let x = 0;
    let y = 0;
    for (const c of active) {
      x += c.mag * Math.cos(c.k * t + c.phase);
      y += c.mag * Math.sin(c.k * t + c.phase);
    }
    return { x, y };
  };
  const curve = buildCurve(fn);
  return {
    id:
      id ??
      'custom-' +
        coeffs
          .map(
            (c) =>
              Math.round(c.k) +
              '-' +
              Math.round(c.mag) +
              '-' +
              Math.round(((c.phase * 180) / Math.PI) % 360),
          )
          .join('_'),
    name,
    hint: '玩家创作的谐波合成关卡。开启「🔍 频谱对比」就能看到它的傅立叶系数——你能逆向拼出它吗？',
    pts: resample(curve, 26),
    tol: 13,
    curve,
    spectrum: dftSpectrum(curve, 16).filter((s) => s.k !== 0),
    armLimit: Math.max(1, active.length),
    random: true, // "非战役关"：不参与总星数与章节印
    custom: true, // 玩家创作：邀请码是系数串，分享链接走 #c=
  };
}

/** 系数串编码（邀请码）：k:mag:phase 用逗号连接，mag/phase 四舍五入 */
export function encodeCoeffs(coeffs: HarmonicCoeff[]): string {
  return coeffs
    .filter((c) => c.mag > 0.5)
    .map((c) => c.k + ':' + Math.round(c.mag) + ':' + Math.round(((c.phase * 180) / Math.PI) % 360))
    .join(',');
}

/** 系数串解码；格式非法返回 null */
export function decodeCoeffs(code: string): HarmonicCoeff[] | null {
  if (!code.includes(':')) return null;
  const out: HarmonicCoeff[] = [];
  for (const part of code.split(',')) {
    const seg = part.split(':');
    if (seg.length !== 3) return null;
    const k = Math.round(Number(seg[0]));
    const mag = Number(seg[1]);
    const phase = ((Number(seg[2]) * Math.PI) / 180) % (Math.PI * 2);
    if (
      !Number.isFinite(k) ||
      !Number.isFinite(mag) ||
      !Number.isFinite(phase) ||
      k === 0 ||
      k > 10 ||
      k < -10
    ) {
      return null;
    }
    out.push({ k, mag, phase });
  }
  return out.length > 0 ? out : null;
}

/**
 * 随机关卡的"可复现标识"：random-<seed>-<难度>。
 * 关卡自身的 id 仍是 random-<seed>（进度键不变），这份标识只用于
 * 续玩记忆与分享链接——**难度必须带上**，否则换难度复现的会是另一条曲线。
 */
export function randomSpec(seed: number, diff: RandomDifficulty = 'normal'): string {
  return 'random-' + Math.abs(Math.trunc(seed)) + '-' + diff;
}

/** 解析随机关卡标识；兼容早期只存 seed 的格式（按普通难度） */
export function parseRandomSpec(spec: string): { seed: number; diff: RandomDifficulty } | null {
  const m = /^random-(\d{1,12})(?:-(easy|normal|hard))?$/.exec(spec);
  if (!m) return null;
  const seed = Number(m[1]);
  if (!Number.isFinite(seed)) return null;
  return { seed, diff: (m[2] as RandomDifficulty | undefined) ?? 'normal' };
}

/** 每日挑战：seed 由日期+难度决定，同一天同难度的玩家面对同一关卡 */
export function makeDailyLevel(diff: RandomDifficulty = 'normal'): Level {
  const key = todayKey();
  const seed = Number(key.replace(/-/g, ''));
  const base = makeRandomLevel(seed, diff);
  const tag = diff === 'normal' ? '' : diff === 'easy' ? '·易' : '·难';
  return {
    ...base,
    id: 'daily-' + key + '-' + diff,
    name: '每日挑战 ' + key.slice(5) + tag,
    hint:
      diff === 'hard'
        ? '⚠️ 今日困难挑战：含有超出 10× 的分量，无法完美拟合——全球玩家同关，比比谁更接近！'
        : '今天同难度的玩家面对同一关卡（邀请码就是难度：easy / normal / hard，或简单 / 普通 / 困难）。刷新纪录，比比谁的分高！',
  };
}

/** 每周挑战：seed 由周键+难度决定，同一周同难度的玩家面对同一关卡 */
export function makeWeeklyLevel(diff: RandomDifficulty = 'hard'): Level {
  const key = weekKey();
  const seed = Number(key.replace(/[^0-9]/g, '')) * 7;
  const base = makeRandomLevel(seed, diff);
  const tag = diff === 'normal' ? '' : diff === 'easy' ? '·易' : '·难';
  return {
    ...base,
    id: 'weekly-' + key + '-' + diff,
    name: '每周挑战 ' + key.replace(/^\d{4}-/, '') + tag,
    hint: '⚠️ 本周挑战：**固定困难档**，一周里可以慢慢磨——全球玩家同关，比比谁的分高！',
  };
}

/** 可复现伪随机数（mulberry32） */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let s = Math.imul(a ^ (a >>> 15), 1 | a);
    s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

/** 随机关卡难度：easy/normal 可被少量指针完美拟合；hard 含超出 10× 的分量，不可完美拟合 */
export type RandomDifficulty = 'easy' | 'normal' | 'hard';

/**
 * 随机关卡（按难度）：
 * - easy：3 个 ≤6× 谐波，3 根内可完美拟合
 * - normal：3~4 个 ≤6× 谐波，4 根内可完美拟合
 * - hard：含 11~16× 的"不可表达"高频分量（指针频率上限 10×），
 *   或随机尖角多边形（尖角为无限高频率）——设计上无法完美拟合，尽量逼近
 */
export function makeRandomLevel(seed: number, diff: RandomDifficulty = 'normal'): Level {
  const rnd = mulberry32(seed);

  if (diff === 'hard') {
    // 两种困难形态随机
    if (rnd() < 0.5) {
      // a) 高频细节：低频主体 + 11~16× 不可表达分量
      const hiK = 11 + Math.floor(rnd() * 6); // 11..16
      const lowKs = [1, 2, 3, 4, 5, 6];
      for (let i = lowKs.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [lowKs[i], lowKs[j]] = [lowKs[j], lowKs[i]];
      }
      const chosen = lowKs.slice(0, 2 + Math.floor(rnd() * 2));
      if (!chosen.includes(1)) chosen.push(1);
      const coeffs = chosen.map((k) => ({
        k,
        a: k === 1 ? 140 + rnd() * 40 : 18 + rnd() * 35,
        p: rnd() * Math.PI * 2,
      }));
      const hiA = 8 + rnd() * 14;
      const hiP = rnd() * Math.PI * 2;
      const fn = (t: number): Vec => {
        let x = 0;
        let y = 0;
        for (const c of coeffs) {
          x += c.a * Math.cos(c.k * t + c.p);
          y += c.a * Math.sin(c.k * t + c.p);
        }
        x += hiA * Math.cos(hiK * t + hiP);
        y += hiA * Math.sin(hiK * t + hiP);
        return { x, y };
      };
      const curve = buildCurve(fn);
      return {
        id: 'random-' + seed,
        name: '随机·难 #' + (seed % 1000),
        hint:
          '⚠️ 困难关：含有 **超过 10×** 的高频细节（' +
          hiK +
          '×），指针无法表达——拟合度有上限，尽量逼近！',
        pts: resample(curve, 30),
        tol: 12,
        curve,
        spectrum: dftSpectrum(curve, 16).filter((s) => s.k !== 0),
        armLimit: 8,
        random: true,
      };
    }
    // b) 随机尖角多边形（顶点半径随机）
    const sides = 5 + Math.floor(rnd() * 4); // 5..8
    const poly: Vec[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const r = 100 + rnd() * 90;
      poly.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    poly.push(poly[0]);
    const dense: Vec[] = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i];
      const b = poly[i + 1];
      for (let k = 0; k < 40; k++) {
        dense.push({ x: a.x + ((b.x - a.x) * k) / 40, y: a.y + ((b.y - a.y) * k) / 40 });
      }
    }
    const curve = normalizeShape(dense);
    return {
      id: 'random-' + seed,
      name: '随机·难 #' + (seed % 1000),
      hint: '⚠️ 困难关：随机尖角多边形——尖角是无限高频率，10 根指针不可能完美拟合。别追求满分，比比谁更接近！',
      pts: resample(curve, 30),
      tol: 11,
      curve,
      spectrum: dftSpectrum(curve, 16).filter((s) => s.k !== 0),
      armLimit: 8,
      random: true,
    };
  }

  const ks = [1, 2, 3, 4, 5, 6];
  for (let i = ks.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ks[i], ks[j]] = [ks[j], ks[i]];
  }
  const count = diff === 'easy' ? 3 : 3 + Math.floor(rnd() * 2);
  const chosen = ks.slice(0, count);
  if (!chosen.includes(1)) chosen[0] = 1;
  chosen.sort((a, b) => a - b);
  const coeffs = chosen.map((k) => ({
    k,
    a: k === 1 ? 150 + rnd() * 40 : 15 + rnd() * 45,
    p: rnd() * Math.PI * 2,
  }));
  const fn = (t: number): Vec => {
    let x = 0;
    let y = 0;
    for (const c of coeffs) {
      x += c.a * Math.cos(c.k * t + c.p);
      y += c.a * Math.sin(c.k * t + c.p);
    }
    return { x, y };
  };
  const curve = buildCurve(fn);
  return {
    id: 'random-' + seed,
    name: '随机 #' + (seed % 1000) + (diff === 'easy' ? '·易' : ''),
    hint:
      diff === 'easy'
        ? '简单随机关：只用了 3 个 ≤6× 谐波——3 根指针就能完美拟合！'
        : '随机拼合的形状，只用了 ≤6× 的谐波——理论上 4 根指针就能完美拟合！',
    pts: resample(curve, 26),
    tol: 13,
    curve,
    spectrum: dftSpectrum(curve, 16).filter((s) => s.k !== 0),
    armLimit: diff === 'easy' ? 3 : 4,
    random: true,
  };
}
