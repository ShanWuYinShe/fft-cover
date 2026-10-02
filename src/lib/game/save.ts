import {
  ACHV_KEY,
  ARMS_SAVE_KEY,
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  DAILY_KEY,
  FLAGS_KEY,
  HISTORY_KEY,
  SOUND_KEY,
} from './constants';

/**
 * 存档：把全部本地进度（星级/最佳分/最快全清/成就/每日/解法/设置）
 * 打包成一段可复制的文本，便于备份、换设备恢复。
 *
 * 格式：`FFTP1:` + base64(JSON)，兼容中文与任意 Unicode。
 */
export const SAVE_PREFIX = 'FFTP1:';

/** 参与存档的 localStorage 键（顺序稳定，便于 diff） */
export const SAVE_KEYS = [
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  ACHV_KEY,
  FLAGS_KEY,
  DAILY_KEY,
  ARMS_SAVE_KEY,
  HISTORY_KEY,
  SOUND_KEY,
] as const;

/** 音量的键在 audio.ts 里使用（避免循环依赖，这里硬编码同一字符串） */
const VOLUME_KEY = 'fft-pointers-volume-v1';
const ALL_KEYS = [...SAVE_KEYS, VOLUME_KEY];

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): string {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** 导出存档文本（无记录时也返回合法存档） */
export function exportSave(store: Storage = localStorage): string {
  const data: Record<string, string> = {};
  for (const k of ALL_KEYS) {
    const v = store.getItem(k);
    if (v !== null) data[k] = v;
  }
  return SAVE_PREFIX + toBase64(JSON.stringify(data));
}

export interface ImportResult {
  ok: boolean;
  /** 成功时：恢复的记录条数；失败时：原因 */
  detail: string;
}

/**
 * 导入存档。默认覆盖已有记录（同名键），不影响未包含的键。
 * 解析失败时不写入任何内容（先整体校验再落盘）。
 */
export function importSave(text: string, store: Storage = localStorage): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, detail: '存档内容为空' };
  if (!trimmed.startsWith(SAVE_PREFIX)) {
    return { ok: false, detail: '格式不正确：应以 ' + SAVE_PREFIX + ' 开头' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64(trimmed.slice(SAVE_PREFIX.length)));
  } catch {
    return { ok: false, detail: '存档解析失败：内容可能被截断或修改' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, detail: '存档结构不正确' };
  }
  const data = parsed as Record<string, unknown>;
  const entries: [string, string][] = [];
  for (const k of ALL_KEYS) {
    const v = data[k];
    if (typeof v === 'string') entries.push([k, v]);
  }
  if (entries.length === 0) return { ok: false, detail: '存档里没有可恢复的记录' };
  for (const [k, v] of entries) {
    try {
      store.setItem(k, v);
    } catch {
      return { ok: false, detail: '写入本地存储失败（可能空间不足）' };
    }
  }
  return { ok: true, detail: '已恢复 ' + entries.length + ' 项记录' };
}

/** 清空全部游戏进度（存档、成就、星级等），保留音量等偏好 */
export function clearSave(store: Storage = localStorage): void {
  for (const k of ALL_KEYS) {
    try {
      store.removeItem(k);
    } catch {
      /* 忽略 */
    }
  }
}
