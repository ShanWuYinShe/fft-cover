import { describe, expect, it, beforeEach } from 'vitest';
import * as C from './constants';
import {
  BEST_KEY,
  ACHV_KEY,
  BEST_SCORE_KEY,
  DRAFT_KEY,
  FAIL_KEY,
  HISTORY_KEY,
  MUSIC_KEY,
  PACE_KEY,
  VOLUME_KEY,
} from './constants';
import {
  clearSave,
  exportSave,
  importSave,
  readJson,
  PREF_KEYS,
  SAVE_KEYS,
  SAVE_PREFIX,
} from './save';

/** 内存 Storage 实现，避免依赖 jsdom */
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

describe('readJson：引擎存档字段的统一安全读取', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memStore(),
      configurable: true,
      writable: true,
    });
  });

  it('正常 JSON 读取；键缺失回落 fallback', () => {
    localStorage.setItem('k1', JSON.stringify({ a: 1 }));
    expect(readJson('k1', {})).toEqual({ a: 1 });
    expect(readJson('missing', { d: 7 })).toEqual({ d: 7 });
  });

  it('脏数据（坏 JSON）回落 fallback，不抛错', () => {
    localStorage.setItem('bad', '{broken');
    expect(readJson('bad', { safe: true })).toEqual({ safe: true });
  });

  it('存储不可用（localStorage 抛错）回落 fallback', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(readJson('anything', 42)).toBe(42);
  });
});

describe('存档导出/导入', () => {
  let store: Storage;
  beforeEach(() => {
    store = memStore();
  });

  it('导出带前缀，且为空时也合法', () => {
    const text = exportSave(store);
    expect(text.startsWith(SAVE_PREFIX)).toBe(true);
    expect(text.length).toBeGreaterThan(SAVE_PREFIX.length);
  });

  it('导出→导入 往返一致', () => {
    store.setItem(BEST_KEY, JSON.stringify({ circle: 3, ellipse: 2 }));
    store.setItem(BEST_SCORE_KEY, JSON.stringify({ circle: 30000 }));
    store.setItem(ACHV_KEY, JSON.stringify({ 'first-star': 1 }));
    const text = exportSave(store);

    const fresh = memStore();
    const res = importSave(text, fresh);
    expect(res.ok).toBe(true);
    expect(fresh.getItem(BEST_KEY)).toBe(JSON.stringify({ circle: 3, ellipse: 2 }));
    expect(fresh.getItem(BEST_SCORE_KEY)).toBe(JSON.stringify({ circle: 30000 }));
    expect(fresh.getItem(ACHV_KEY)).toBe(JSON.stringify({ 'first-star': 1 }));
  });

  it('中文与 Unicode 往返正确', () => {
    store.setItem(BEST_KEY, JSON.stringify({ '随机·难 #653': 3 }));
    const text = exportSave(store);
    const fresh = memStore();
    importSave(text, fresh);
    expect(fresh.getItem(BEST_KEY)).toBe(JSON.stringify({ '随机·难 #653': 3 }));
  });

  it('拒绝无前缀/被截断的内容，且不写入任何记录', () => {
    const bad1 = importSave('hello world', store);
    expect(bad1.ok).toBe(false);
    expect(bad1.detail).toContain('格式不正确');

    store.setItem(BEST_KEY, JSON.stringify({ circle: 3 }));
    const text = exportSave(store);
    const fresh = memStore();
    const bad2 = importSave(text.slice(0, text.length - 6), fresh);
    expect(bad2.ok).toBe(false);
    expect(fresh.getItem(BEST_KEY)).toBeNull();
  });

  it('空存档导入被拒绝', () => {
    const res = importSave('   ', store);
    expect(res.ok).toBe(false);
  });

  it('clearSave 清空进度键', () => {
    store.setItem(BEST_KEY, '{}');
    store.setItem(ACHV_KEY, '{}');
    clearSave(store);
    expect(store.getItem(BEST_KEY)).toBeNull();
    expect(store.getItem(ACHV_KEY)).toBeNull();
  });

  it('卡关次数 / 节奏记录 / 合成器草稿 / 音乐开关也在存档里（别漏了新数据）', () => {
    store.setItem(FAIL_KEY, JSON.stringify({ heart: 2 }));
    store.setItem(PACE_KEY, JSON.stringify({ circle: [1, 2, 3] }));
    store.setItem(DRAFT_KEY, JSON.stringify([{ k: 1, mag: 100, phase: 0 }]));
    store.setItem(MUSIC_KEY, '0');
    const text = exportSave(store);

    const fresh = memStore();
    expect(importSave(text, fresh).ok).toBe(true);
    expect(fresh.getItem(FAIL_KEY)).toBe(JSON.stringify({ heart: 2 }));
    expect(fresh.getItem(PACE_KEY)).toBe(JSON.stringify({ circle: [1, 2, 3] }));
    expect(fresh.getItem(DRAFT_KEY)).toBe(JSON.stringify([{ k: 1, mag: 100, phase: 0 }]));
    expect(fresh.getItem(MUSIC_KEY)).toBe('0');
  });

  it('clearSave 清进度但保留偏好（音量 / 音效 / 音乐）', () => {
    store.setItem(FAIL_KEY, JSON.stringify({ heart: 2 }));
    store.setItem(PACE_KEY, '{}');
    store.setItem(DRAFT_KEY, '[]');
    store.setItem(HISTORY_KEY, '{}');
    store.setItem(VOLUME_KEY, '0.5');
    store.setItem(MUSIC_KEY, '1');
    clearSave(store);
    // 进度类：清掉
    for (const k of [FAIL_KEY, PACE_KEY, DRAFT_KEY, HISTORY_KEY, BEST_KEY]) {
      expect(store.getItem(k), k).toBeNull();
    }
    // 偏好类：留着
    expect(store.getItem(VOLUME_KEY)).toBe('0.5');
    expect(store.getItem(MUSIC_KEY)).toBe('1');
  });

  it('constants 里声明的每个存储键都登记进了存档表（新增数据别忘登记）', () => {
    const declared = Object.entries(C)
      .filter(([name, v]) => name.endsWith('_KEY') && typeof v === 'string')
      .map(([, v]) => v as string);
    const registered = new Set<string>([...SAVE_KEYS, ...PREF_KEYS]);
    const missing = declared.filter((k) => !registered.has(k));
    expect(missing, '未登记的存储键：' + missing.join(', ')).toEqual([]);
  });
});
