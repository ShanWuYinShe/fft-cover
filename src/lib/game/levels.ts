import { buildPoints, buildPolyPoints } from './math';
import type { Level, LevelDef, Vec } from './types';

const C = Math.cos;
const S = Math.sin;

/** 内置关卡（难度递进）。hint 中给出傅立叶分解线索。 */
export const LEVEL_DEFS: LevelDef[] = [
  {
    id: 'circle',
    name: '圆',
    hint: '一根指针就够了：启用 ①（频率 1×），把半径调到指针尖正好扫过圆周。',
    n: 24,
    fn: (t) => ({ x: 200 * C(t), y: 200 * S(t) }),
  },
  {
    id: 'ellipse',
    name: '椭圆',
    hint: '同频率同向指针只能合成一个圆。椭圆需要 <b>1× 与 -1×（反转）</b>两根指针：一正一反叠加把圆压扁。',
    n: 24,
    fn: (t) => ({ x: 200 * C(t), y: 105 * S(t) }),
  },
  {
    id: 'clover',
    name: '三叶草',
    hint: '曲线是 r=cos3θ：用 1× 作主臂，再叠加 <b>2× 和 4×</b> 指针把圆压出三个叶片（试着微调半径与相位）。',
    n: 27,
    fn: (t) => {
      const r = 150 * C(3 * t);
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'flower5',
    name: '五瓣花',
    hint: 'r=1+0.35cos5θ 的展开含 <b>1×、4×、6×</b> 三种频率。提示：4×、6× 的半径都不大。',
    n: 30,
    fn: (t) => {
      const r = 150 * (1 + 0.38 * C(5 * t));
      return { x: r * C(t), y: r * S(t) };
    },
  },
  {
    id: 'inf8',
    name: '无穷 ∞',
    hint: 'x 方向用 1×，y 方向的 sin2θ 需要 <b>2× 指针（相位约 270°）</b>。两根就够！',
    n: 24,
    fn: (t) => {
      const d = 1 + S(t) * S(t);
      const a = 210;
      return { x: (a * C(t)) / d, y: (a * S(t) * C(t)) / d };
    },
  },
  {
    id: 'star5',
    name: '五角星',
    hint: '尖角是无限高频率，10 根指针也难完全贴合——尽力收集，别追求完美！',
    n: 30,
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
    hint: '心形以 <b>2×</b> 谐波为主：启用 1×~4× 多根指针，耐心调半径和相位。这是终极考验！',
    n: 30,
    fn: (t) => ({
      x: 16 * Math.pow(S(t), 3),
      y: 13 * C(t) - 5 * C(2 * t) - 2 * C(3 * t) - C(4 * t),
    }),
  },
];

/** 由静态定义构建运行时关卡（点集为画布坐标） */
export function makeLevel(def: LevelDef): Level {
  const pts = def.poly ? buildPolyPoints(def.poly, def.n) : buildPoints(def.fn!, def.n);
  return { id: def.id, name: def.name, hint: def.hint, pts, tol: 13 };
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
 * 保证理论上 ≤4 根指针即可完美拟合。
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
  return {
    id: 'random-' + seed,
    name: '随机 #' + (seed % 1000),
    hint: '随机拼合的形状，只用了 ≤6× 的 4 个谐波——理论上一根 1× + 三根高次指针就能完美拟合！',
    pts: buildPoints(fn, 26),
    tol: 13,
    random: true,
  };
}
