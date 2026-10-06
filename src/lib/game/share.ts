import { parseRandomSpec, randomSpec, type RandomDifficulty } from './levels';
import type { Arm } from './types';

/**
 * 解法分享码：把玩家调好的指针参数编码成短文本，拼进 URL 供好友挑战。
 *
 * 格式：`v1-<序号>:<半径>:<频率>:<相位度>` 多根用 `;` 分隔（只含启用的指针）。
 * 例：圆关精确解 → `v1-0:120:1:0`（12 字符）；三叶草 → `v1-1:112:4:0;0:112:-2:90`
 *
 * 选择纯文本而非 base64：更短（URL 友好）、可读、易调试、无编解码依赖。
 */
const VERSION = 'v1-';
/** 与 UI 滑块一致的上限 */
const R_MAX = 210;

/** 编码当前解法（只含启用的指针，无启用指针返回空串） */
export function encodeArms(arms: Arm[]): string {
  const parts: string[] = [];
  arms.forEach((a, i) => {
    if (!a.on) return;
    const deg = ((Math.round((a.phase * 180) / Math.PI) % 360) + 360) % 360;
    parts.push(i + ':' + Math.round(a.r) + ':' + a.freq + ':' + deg);
  });
  return parts.length ? VERSION + parts.join(';') : '';
}

/** 解码解法分享码；格式非法返回 null（不抛错，避免坏链接影响启动） */
export function decodeArms(code: string): Arm[] | null {
  if (!code.startsWith(VERSION)) return null;
  const body = code.slice(VERSION.length);
  if (!body) return null;
  const arms: Arm[] = Array.from({ length: 10 }, () => ({ on: false, r: 0, freq: 1, phase: 0 }));
  let any = false;
  for (const part of body.split(';')) {
    const [si, sr, sf, sd] = part.split(':');
    const i = Number(si);
    const r = Number(sr);
    const freq = Number(sf);
    const deg = Number(sd);
    if (!Number.isInteger(i) || i < 0 || i > 9) continue;
    if (!Number.isFinite(r) || !Number.isFinite(freq) || !Number.isFinite(deg)) continue;
    const mag = Math.max(1, Math.min(10, Math.abs(Math.round(freq))));
    arms[i] = {
      on: true,
      r: Math.max(0, Math.min(R_MAX, Math.round(r))),
      freq: (freq < 0 ? -1 : 1) * mag,
      phase: ((((deg % 360) + 360) % 360) * Math.PI) / 180,
    };
    any = true;
  }
  return any ? arms : null;
}

/** 生成分享链接（hash 传参，静态托管下不触发路由） */
export function buildShareUrl(base: string, code: string): string {
  const u = base.split('#')[0];
  return u + '#arms=' + code;
}

/** 从 URL hash 里取解法分享码（无则返回 null） */
export function readArmsFromHash(hash: string): string | null {
  const m = /(?:^#|&)arms=([^&]+)/.exec(hash);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * 随机关卡分享链接：把"邀请码 + 难度"拼进 hash，好友打开即面对同一条曲线。
 * 与解法码共用同一个 hash 通道，互不冲突（也可以同时带上）。
 */
export function buildRandomUrl(
  base: string,
  seed: number,
  diff: RandomDifficulty = 'normal',
): string {
  const u = base.split('#')[0];
  return u + '#r=' + randomSpec(seed, diff);
}

/** 从 URL hash 里取随机关卡标识（无则返回 null） */
export function readRandomFromHash(hash: string): { seed: number; diff: RandomDifficulty } | null {
  const m = /(?:^#|&)r=([^&]+)/.exec(hash);
  if (!m) return null;
  return parseRandomSpec(decodeURIComponent(m[1]));
}
