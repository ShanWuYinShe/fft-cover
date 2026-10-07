import { describe, expect, it } from 'vitest';
import { buildCurve, topHarmonics } from './math';

/**
 * 合成器是单侧旋转向量（每行 mag·e^{i(kt+φ)}），无法表示实值曲线的
 * 共轭对称谱——topHarmonics 导出的是"主频率指纹"（正频 top N），
 * 作为再创作起点。画布预览即所得。
 */
describe('topHarmonics：合成器逆向导入（主频率指纹）', () => {
  it('提取 1≤k≤10 的正频谐波；圆的主频率是 1×，峰值缩放到 120', () => {
    const circle = buildCurve((t) => ({ x: 200 * Math.cos(t), y: 200 * Math.sin(t) }));
    const top = topHarmonics(circle, 10, 120);
    expect(top).toHaveLength(1);
    expect(top[0].k).toBe(1);
    expect(top[0].mag).toBe(120);
  });

  it('心形取前 4 个主频率（1×/2×/3×/4×），降序、峰值缩放', () => {
    const heart = buildCurve((t) => ({
      x: 16 * Math.sin(t) ** 3,
      y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    }));
    const top = topHarmonics(heart, 10, 120);
    expect(top.length).toBeGreaterThanOrEqual(4);
    expect(top.every((h) => h.k >= 1 && h.k <= 10)).toBe(true);
    expect(Math.max(...top.map((h) => h.mag))).toBe(120);
    // 幅值降序（排序后截取）
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].mag).toBeGreaterThanOrEqual(top[i].mag);
    }
  });

  it('count 裁剪生效', () => {
    const curve = buildCurve((t) => ({
      x: 120 * Math.cos(t) + 80 * Math.cos(2 * t) + 60 * Math.cos(3 * t) + 40 * Math.cos(5 * t),
      y: 120 * Math.sin(t) + 80 * Math.sin(2 * t) + 60 * Math.sin(3 * t) + 40 * Math.sin(5 * t),
    }));
    expect(topHarmonics(curve, 2, 120)).toHaveLength(2);
  });

  it('DFT 数值残差（幅值四舍五入后为 0）被丢弃', () => {
    const circle = buildCurve((t) => ({ x: 200 * Math.cos(t), y: 200 * Math.sin(t) }));
    expect(topHarmonics(circle, 10, 120).every((h) => h.mag > 0)).toBe(true);
  });
});
