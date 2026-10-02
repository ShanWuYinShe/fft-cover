import { ARMS_MAX } from './constants';
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
 * 内置关卡（难度递进）。
 * armLimit 为本关指针上限——每关都存在按傅立叶精确分解可达成的高分路径。
 * hint 给出目标曲线的谐波分解线索（含负频率项）。
 */
export const LEVEL_DEFS: LevelDef[] = [
  {
    id: 'circle',
    name: '圆',
    hint: '一根 1× 指针就能画圆（半径约 120，相位随意）——单一频率项，这是傅立叶级数最简单的形式。',
    n: 24,
    armLimit: 1,
    fn: (t) => ({ x: 200 * C(t), y: 200 * S(t) }),
  },
  {
    id: 'ellipse',
    name: '椭圆',
    hint: '精确分解含 <b>1× 与 −1×（反转）</b>两根：一正一反两个旋转向量叠加，把圆压成椭圆。相位很重要！',
    n: 24,
    armLimit: 2,
    fn: (t) => ({ x: 200 * C(t), y: 105 * S(t) }),
  },
  {
    id: 'clover',
    name: '三叶草',
    hint: 'r=cos3θ 的复数分解：e^{iθ}·cos3θ = ½e^{i4θ} + ½e^{−i2θ}——只要 <b>4× 与 −2×（反转）</b>两根！',
    n: 27,
    armLimit: 2,
    fn: (t) => {
      const r = 150 * C(3 * t);
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'flower5',
    name: '五瓣花',
    hint: 'r=1+0.38cos5θ → e^{iθ} + 0.19e^{i6θ} + 0.19e^{−i4θ}：需要 <b>1×、6×、−4×（反转）</b>三根。',
    n: 30,
    armLimit: 3,
    fn: (t) => {
      const r = 150 * (1 + 0.38 * C(5 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'gear8',
    name: '八齿齿轮',
    hint: 'e^{iθ}(1+0.22cos8θ) = e^{iθ} + 0.11e^{i9θ} + 0.11e^{−i7θ}：<b>1× 主臂 + 9× 与 −7×（反转）</b>小半径副臂。9× 转得飞快！',
    n: 30,
    armLimit: 3,
    fn: (t) => {
      const r = 160 * (1 + 0.22 * C(8 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'inf8',
    name: '无穷 ∞',
    hint: 'x 方向用 1×，y 方向的 sin2θ 需要 <b>2× 指针（相位约 270°）</b>。两根就够！',
    n: 24,
    armLimit: 2,
    fn: (t) => {
      const d = 1 + S(t) * S(t);
      const a = 210;
      return { x: (a * C(t)) / d, y: (a * S(t) * C(t)) / d };
    },
  },
  {
    id: 'lissajous',
    name: '利萨茹 3:2',
    hint: 'x=cos3t、y=sin2t 的复数分解含 <b>±3× 与 ±2×</b> 四根——同频率的正反两根相位差 90°，这就是"频率对"。',
    n: 26,
    armLimit: 4,
    fn: (t) => ({ x: 210 * C(3 * t), y: 150 * S(2 * t) }),
  },
  {
    id: 'liss54',
    name: '利萨茹 5:4',
    hint: '频率对 <b>±5× 与 ±4×</b>——更密的结，四根指针缺一不可。最后一课：频率对的长度各不相同。',
    n: 30,
    armLimit: 4,
    fn: (t) => ({ x: 195 * C(5 * t), y: 165 * S(4 * t) }),
  },
  {
    id: 'star5',
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
    name: '心形',
    hint: '终极考验：心形的精确分解需要 <b>±1×、±2×、±3×、±4× 全部 8 根</b>（反转组合一个不能少）——通关它，你就真正理解了傅立叶级数！',
    n: 30,
    armLimit: 8,
    fn: (t) => ({
      x: 16 * Math.pow(S(t), 3),
      y: 13 * C(t) - 5 * C(2 * t) - 2 * C(3 * t) - C(4 * t),
    }),
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
    pts,
    tol: 13,
    curve,
    spectrum: dftSpectrum(curve).filter((s) => s.k !== 0),
    armLimit: def.armLimit ?? ARMS_MAX,
  };
}

/** 今日日期串（本地时区，YYYY-MM-DD） */
export function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/** 每日挑战：seed 由日期决定，全球玩家同一天面对同一关卡 */
export function makeDailyLevel(): Level {
  const key = todayKey();
  const seed = Number(key.replace(/-/g, ''));
  const base = makeRandomLevel(seed);
  return {
    ...base,
    id: 'daily-' + key,
    name: '每日挑战 ' + key.slice(5),
    hint: '今天全球玩家面对同一关卡（邀请码即日期）。刷新纪录，比比谁的分高！',
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

/**
 * 随机关卡：随机取 ≤6× 的 3~4 个谐波（必含 1×）生成平滑闭曲线。
 * 理论上 4 根指针即可完美拟合。
 */
export function makeRandomLevel(seed: number): Level {
  const rnd = mulberry32(seed);
  const ks = [1, 2, 3, 4, 5, 6];
  for (let i = ks.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ks[i], ks[j]] = [ks[j], ks[i]];
  }
  const chosen = ks.slice(0, 3 + Math.floor(rnd() * 2));
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
    name: '随机 #' + (seed % 1000),
    hint: '随机拼合的形状，只用了 ≤6× 的 4 个谐波——理论上 4 根指针就能完美拟合！',
    pts: resample(curve, 26),
    tol: 13,
    curve,
    spectrum: dftSpectrum(curve).filter((s) => s.k !== 0),
    armLimit: 4,
    random: true,
  };
}
