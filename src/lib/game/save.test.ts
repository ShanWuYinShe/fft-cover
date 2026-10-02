import { describe, expect, it, beforeEach } from 'vitest';
import { BEST_KEY, ACHV_KEY, BEST_SCORE_KEY } from './constants';
import { clearSave, exportSave, importSave, SAVE_PREFIX } from './save';

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
});
