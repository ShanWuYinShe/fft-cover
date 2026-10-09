import { describe, expect, it } from 'vitest';
import type { Arm } from './types';
import {
  buildArmsUrl,
  buildDailyUrl,
  buildRandomUrl,
  buildShareUrl,
  decodeArms,
  encodeArms,
  levelHashPart,
  parseInvite,
  pickChallengeArms,
  readArmsFromHash,
  readCustomFromHash,
  readDailyFromHash,
  readRandomFromHash,
} from './share';
import { decodeCoeffs, encodeCoeffs } from './levels';

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

  it('随机关卡链接往返一致，并保留难度', () => {
    const url = buildRandomUrl('https://game.chaoset.com/play', 987654, 'hard');
    expect(url).toBe('https://game.chaoset.com/play#r=random-987654-hard');
    expect(readRandomFromHash('#r=random-987654-hard')).toEqual({ seed: 987654, diff: 'hard' });
    // 不带难度时按普通难度
    expect(readRandomFromHash('#r=random-42')).toEqual({ seed: 42, diff: 'normal' });
    // 非法输入不抛错
    expect(readRandomFromHash('#r=random-abc')).toBeNull();
    expect(readRandomFromHash('#arms=v1-0:1:1:1')).toBeNull();
  });

  it('每日挑战链接只带难度（日期由打开那天决定）', () => {
    expect(buildDailyUrl('https://game.chaoset.com/', 'hard')).toBe(
      'https://game.chaoset.com/#d=hard',
    );
    expect(buildDailyUrl('https://game.chaoset.com/')).toBe('https://game.chaoset.com/#d=normal');
    expect(readDailyFromHash('#d=easy')).toBe('easy');
    expect(readDailyFromHash('#d=normal')).toBe('normal');
    // 非法难度 / 其它 hash 都返回 null，不抛错
    expect(readDailyFromHash('#d=impossible')).toBeNull();
    expect(readDailyFromHash('#r=random-1-normal')).toBeNull();
  });

  it('解法码与随机关链接可以共存于同一个 hash', () => {
    const hash = '#r=random-777-easy&arms=v1-0:120:1:0';
    expect(readRandomFromHash(hash)).toEqual({ seed: 777, diff: 'easy' });
    expect(readArmsFromHash(hash)).toBe('v1-0:120:1:0');
  });
});

describe('解法分享链接要带上关卡（否则好友对不上题）', () => {
  it('内置关不带关卡段', () => {
    expect(buildArmsUrl('https://x/y', 'v1-0:120:1:0', 'circle')).toBe(
      'https://x/y#arms=v1-0:120:1:0',
    );
    expect(levelHashPart('circle')).toBe('');
  });

  it('随机关：id 只有 seed，难度要另外传（否则会悄悄降级成 normal）', () => {
    expect(buildArmsUrl('https://x/y', 'v1-0:120:1:0', 'random-777', 'hard')).toBe(
      'https://x/y#r=random-777-hard&arms=v1-0:120:1:0',
    );
    expect(levelHashPart('random-777', 'easy')).toBe('r=random-777-easy');
  });

  it('随机关带邀请码与难度，好友打开是同一道题', () => {
    const url = buildArmsUrl('https://x/y', 'v1-0:120:1:0', 'random-777-hard');
    expect(url).toBe('https://x/y#r=random-777-hard&arms=v1-0:120:1:0');
    expect(readRandomFromHash(url.slice(url.indexOf('#')))).toEqual({ seed: 777, diff: 'hard' });
    expect(readArmsFromHash(url.slice(url.indexOf('#')))).toBe('v1-0:120:1:0');
  });

  it('每日关带难度（日期由打开那天决定）', () => {
    const url = buildArmsUrl('https://x/y', 'v1-0:120:1:0', 'daily-2026-10-07-easy');
    expect(url).toBe('https://x/y#d=easy&arms=v1-0:120:1:0');
    expect(readDailyFromHash(url.slice(url.indexOf('#')))).toBe('easy');
  });

  it('创作关带系数串，好友端能还原出同一关', () => {
    const coeffs = [
      { k: 1, mag: 80, phase: 0 },
      { k: 3, mag: 55, phase: 0 },
      { k: 5, mag: 28, phase: 0 },
    ];
    const code = encodeCoeffs(coeffs);
    const id = 'custom-' + code.replaceAll(',', '_').replaceAll(':', '-');
    const url = buildArmsUrl('https://x/y', 'v1-0:120:1:0', id);
    const hash = url.slice(url.indexOf('#'));
    expect(hash.startsWith('#c=')).toBe(true);
    expect(readArmsFromHash(hash)).toBe('v1-0:120:1:0');
    const back = decodeCoeffs(readCustomFromHash(hash)!);
    expect(back).not.toBeNull();
    expect(
      back!.map((c) => [c.k, Math.round(c.mag), Math.round((c.phase * 180) / Math.PI)]),
    ).toEqual(coeffs.map((c) => [c.k, c.mag, c.phase]));
  });

  it('邀请码解析：系数串 / 难度词 / 日期难度 / 种子', () => {
    expect(parseInvite('1:80:0,3:55:0')).toEqual({ kind: 'custom', code: '1:80:0,3:55:0' });
    expect(parseInvite('hard')).toEqual({ kind: 'daily', diff: 'hard' });
    expect(parseInvite('困难')).toEqual({ kind: 'daily', diff: 'hard' });
    expect(parseInvite('2026-10-07-easy')).toEqual({ kind: 'daily', diff: 'easy' });
    expect(parseInvite('777')).toEqual({ kind: 'seed', seed: 777 });
    expect(parseInvite('-42')).toEqual({ kind: 'seed', seed: 42 });
    expect(parseInvite('')).toBeNull();
    expect(parseInvite('0')).toBeNull();
    expect(parseInvite('乱写的')).toBeNull();
    expect(parseInvite('2026-10-07-unknown')).toBeNull();
  });

  it('认不出的关卡 id 不带关卡段（宁可退化成纯解法码）', () => {
    expect(levelHashPart('random-abc')).toBe('');
    expect(levelHashPart('custom-')).toBe('');
    expect(buildArmsUrl('https://x/y', 'v1-1:100:2:0', 'random-abc')).toBe(
      'https://x/y#arms=v1-1:100:2:0',
    );
  });
});
describe('pickChallengeArms（挑战好友发哪套参数）', () => {
  const arms: Arm[] = [{ on: true, r: 120, freq: 1, phase: 0 }];

  it('个人最佳强于本局（bestGap > 0）→ 发最佳并注明', () => {
    const out = pickChallengeArms({ arms }, 2, []);
    expect(out.isBest).toBe(true);
    expect(out.arms).toBe(arms);
  });

  it('本局已追平/超越，或尚无最佳 → 发本局参数（bestGap 契约：落后才非 null）', () => {
    expect(pickChallengeArms({ arms }, null, arms).isBest).toBe(false);
    expect(pickChallengeArms(undefined, 2, arms).isBest).toBe(false);
  });
});
