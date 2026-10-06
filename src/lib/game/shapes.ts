import { LEVEL_DEFS, makeLevel } from './levels';

/**
 * 关卡轮廓的缩略点串（SVG polyline 用）：把参考曲线抽稀到 ~120 个点。
 * 构建一次后缓存——图鉴与结局面板都要画全部 15 关的轮廓。
 */
const cache = new Map<string, string>();

export function shapePoints(id: string, samples = 120): string {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const def = LEVEL_DEFS.find((d) => d.id === id);
  if (!def) return '';
  const curve = makeLevel(def).curve;
  const step = Math.max(1, Math.round(curve.length / samples));
  const pts = curve
    .filter((_, i) => i % step === 0)
    .map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1))
    .join(' ');
  cache.set(id, pts);
  return pts;
}
