import { SIZE, T0 } from './constants';
import type { Arm, Vec } from './types';

/** 沿弧长均匀重采样为 n 个点 */
export function resample(pts: Vec[], n: number): Vec[] {
  const L = [0];
  for (let i = 1; i < pts.length; i++) {
    L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = L[L.length - 1];
  const out: Vec[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    while (j < L.length - 2 && L[j + 1] < target) j++;
    const seg = L[j + 1] - L[j] || 1;
    const u = (target - L[j]) / seg;
    out.push({
      x: pts[j].x + (pts[j + 1].x - pts[j].x) * u,
      y: pts[j].y + (pts[j + 1].y - pts[j].y) * u,
    });
  }
  return out;
}

/**
 * 密集采样参数化曲线 → 居中并限制在半径 240 内 → 平移到画布中心 → 按弧长均匀取 n 点。
 */
export function buildPoints(fn: (t: number) => Vec, n: number, samples = 2400): Vec[] {
  const raw: Vec[] = [];
  for (let i = 0; i < samples; i++) raw.push(fn((i / samples) * Math.PI * 2));
  return normalizeAndSample(raw, n);
}

/** 折线（首尾相接）走同样的归一化流程 */
export function buildPolyPoints(poly: Vec[], n: number): Vec[] {
  const dense: Vec[] = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    for (let k = 0; k < 60; k++) {
      dense.push({ x: a.x + ((b.x - a.x) * k) / 60, y: a.y + ((b.y - a.y) * k) / 60 });
    }
  }
  return normalizeAndSample(dense, n);
}

function normalizeAndSample(raw: Vec[], n: number): Vec[] {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = 240 / Math.max(maxX - minX, maxY - minY);
  const norm = raw.map((p) => ({
    x: (p.x - cx) * scale + SIZE / 2,
    y: (p.y - cy) * scale + SIZE / 2,
  }));
  return resample(norm, n);
}

/** 指针 k 在时刻 tt 的绝对角度（弧度）。freq 可为负 = 反转。 */
export function armAngle(a: Arm, tt: number): number {
  return ((Math.PI * 2 * a.freq) / T0) * tt + a.phase;
}

/**
 * 指针链：自画布中心起，第 k 根指针的起点是第 k-1 根的末端（首尾相连）。
 * 只统计启用的指针。返回关节序列，长度 = 启用数 + 1。
 */
export function chainAt(arms: Arm[], tt: number): Vec[] {
  const joints: Vec[] = [{ x: SIZE / 2, y: SIZE / 2 }];
  let x = SIZE / 2;
  let y = SIZE / 2;
  for (const a of arms) {
    if (!a.on) continue;
    const th = armAngle(a, tt);
    x += a.r * Math.cos(th);
    y += a.r * Math.sin(th);
    joints.push({ x, y });
  }
  return joints;
}

/** 指针链末端（尖端）位置 */
export function tipAt(arms: Arm[], tt: number): Vec {
  const j = chainAt(arms, tt);
  return j[j.length - 1];
}
