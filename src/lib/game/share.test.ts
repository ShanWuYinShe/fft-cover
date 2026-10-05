import { describe, expect, it } from 'vitest';
import { buildShareUrl, decodeArms, encodeArms, readArmsFromHash } from './share';
import type { Arm } from './types';

const arm = (on: boolean, r: number, freq: number, deg: number): Arm => ({
  on,
  r,
  freq,
  phase: (deg * Math.PI) / 180,
});

describe('解法分享码', () => {
  it('编解码往返一致（含负频率与相位）', () => {
    const arms = [arm(true, 120, 1, 0), arm(true, 112, -4, 90), arm(false, 0, 1, 0)];
    const code = encodeArms(arms);
    expect(code).toBe('v1-0:120:1:0;1:112:-4:90');
    const back = decodeArms(code);
    expect(back).not.toBeNull();
    expect(back![0]).toMatchObject({ on: true, r: 120, freq: 1 });
    expect(back![1]).toMatchObject({ on: true, r: 112, freq: -4 });
    expect(back![1].phase).toBeCloseTo(Math.PI / 2, 3);
    expect(back![2].on).toBe(false);
  });

  it('非法码返回 null（不抛错）', () => {
    expect(decodeArms('')).toBeNull();
    expect(decodeArms('v2-0:1:1:1')).toBeNull();
    expect(decodeArms('v1-')).toBeNull();
    expect(decodeArms('v1-garbage')).toBeNull();
    expect(decodeArms('v1-99:1:1:1')).toBeNull();
  });

  it('越界参数被裁剪到合法区间', () => {
    const back = decodeArms('v1-0:9999:99:4000');
    expect(back![0].r).toBe(210);
    expect(back![0].freq).toBe(10);
    expect(back![0].phase).toBeCloseTo(((4000 % 360) * Math.PI) / 180, 3);
  });

  it('URL 构造与解析', () => {
    const url = buildShareUrl('https://game.chaoset.com/', 'v1-0:120:1:0');
    expect(url).toBe('https://game.chaoset.com/#arms=v1-0:120:1:0');
    expect(readArmsFromHash('#arms=v1-0:120:1:0')).toBe('v1-0:120:1:0');
    expect(readArmsFromHash('#other=1')).toBeNull();
  });
});
