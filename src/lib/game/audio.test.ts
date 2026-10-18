import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  currentVolume,
  getVolume,
  initVolumeFromStorage,
  setVolume,
  uiClick,
  uiChime,
  woodfishSound,
} from './audio';
import { VOLUME_KEY } from './constants';

/** 内存 Storage（Node 环境没有 localStorage） */
function memStore(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('音量三态持久化', () => {
  let original: PropertyDescriptor | undefined;
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: memStore(),
      configurable: true,
      writable: true,
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('静音（0）能存下来，读回来仍是 0', () => {
    setVolume(0);
    // 回归：`Number(getItem(...)) || 1` 会把 0 变成 1，玩家静音后一刷新就恢复满音量
    expect(getVolume()).toBe(0);
  });

  it('半音量（0.5）与满音量（1）往返一致', () => {
    setVolume(0.5);
    expect(getVolume()).toBe(0.5);
    setVolume(1);
    expect(getVolume()).toBe(1);
  });

  it('没有存过时默认满音量', () => {
    expect(getVolume()).toBe(1);
  });

  it('存档里是脏数据时回落到满音量，而不是 NaN', () => {
    localStorage.setItem(VOLUME_KEY, 'abc');
    const v = getVolume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBe(1);
  });

  it('模块音量会跟随存档初始化：静音的玩家刷新后仍然静音', () => {
    // 模拟"上次会话把音量调成静音"
    localStorage.setItem(VOLUME_KEY, '0');
    expect(initVolumeFromStorage()).toBe(0);
    expect(currentVolume()).toBe(0);
    // 半音量同理
    localStorage.setItem(VOLUME_KEY, '0.5');
    expect(initVolumeFromStorage()).toBe(0.5);
    expect(currentVolume()).toBe(0.5);
  });

  it('没存过时初始化到满音量', () => {
    expect(initVolumeFromStorage()).toBe(1);
    expect(currentVolume()).toBe(1);
  });
});

describe('UI 器物音在音频不可用时不抛错', () => {
  // Node 测试环境没有 window/AudioContext，getAudioContext 必须静默返回 null——
  // 音频不可用绝不能影响游戏逻辑（uiChime 还要保证不开定时器就直接返回）
  it('按键笃声 / 面板编钟 / 连击木鱼在无音频环境里调用安全', () => {
    expect(() => uiClick(true)).not.toThrow();
    expect(() => uiChime(true)).not.toThrow();
    expect(() => woodfishSound(true)).not.toThrow();
  });

  it('音效关闭（on=false）时直接早退', () => {
    expect(() => uiClick(false)).not.toThrow();
    expect(() => uiChime(false)).not.toThrow();
    expect(() => woodfishSound(false)).not.toThrow();
  });
});
