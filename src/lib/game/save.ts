import {
  ACHV_KEY,
  ARMS_SAVE_KEY,
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  COMPOSER_FILTER_KEY,
  DAILY_KEY,
  DRAFT_KEY,
  EXACT_KEY,
  EXPERT_KEY,
  FAIL_KEY,
  FLAGS_KEY,
  HISTORY_KEY,
  LAST_LEVEL_KEY,
  LAST_CUSTOM_KEY,
  DIFF_KEY,
  MUSIC_KEY,
  PACE_KEY,
  PERFECT_KEY,
  SOUND_KEY,
  STREAK_KEY,
  VOLUME_KEY,
} from './constants';

/**
 * 存档：把全部本地进度（星级/最佳分/最快全清/成就/每日/解法/设置）
 * 打包成一段可复制的文本，便于备份、换设备恢复。
 *
 * 格式：`FFTP1:` + base64(JSON)，兼容中文与任意 Unicode。
 */
export const SAVE_PREFIX = 'FFTP1:';

/**
 * 进度类键：参与存档，也会被"清空进度"清掉。
 * 新增持久化数据时务必同步登记，否则备份/恢复会丢、清空也清不干净。
 */
export const SAVE_KEYS = [
  BEST_KEY,
  BEST_SCORE_KEY,
  CLEAR_KEY,
  PERFECT_KEY,
  EXACT_KEY,
  EXPERT_KEY,
  STREAK_KEY,
  ACHV_KEY,
  FLAGS_KEY,
  DAILY_KEY,
  ARMS_SAVE_KEY,
  PACE_KEY,
  HISTORY_KEY,
  LAST_LEVEL_KEY,
  LAST_CUSTOM_KEY,
  FAIL_KEY,
  DRAFT_KEY,
] as const;

/** 偏好类键：参与存档，但"清空进度"时保留（音量/音效/音乐/难度不该被清） */
export const PREF_KEYS = [SOUND_KEY, MUSIC_KEY, VOLUME_KEY, DIFF_KEY, COMPOSER_FILTER_KEY] as const;

const ALL_KEYS = [...SAVE_KEYS, ...PREF_KEYS];

/**
 * 从 localStorage 安全读一个 JSON 值：键不存在、存储不可用、脏数据都回落 fallback。
 * 各引擎字段的 load* 辅助都走这一条路径，避免同样的 try/parse 复制十几份。
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * writeJson：readJson 的镜像——存储不可用就静默放弃（游戏进度不该因存储挂掉）。
 * 各引擎字段的写回都走这一条路径。
 */
export function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储不可用则忽略 */
  }
}

/**
 * 校验并解析「最近游玩的创作关」存档（LAST_CUSTOM_KEY）。
 * 结构必须完整：id 与期望一致、name 为字符串、coeffs 非空且每项为数值三元组。
 * 任何不符都返回 null（宁可回落第一关，也不能拿脏数据建关卡）。
 */
export function parseCustomSave(
  raw: string | null,
  id: string,
): { name: string; coeffs: { k: number; mag: number; phase: number }[] } | null {
  try {
    const parsed = JSON.parse(raw ?? 'null') as {
      id?: unknown;
      name?: unknown;
      coeffs?: unknown;
    } | null;
    if (!parsed || parsed.id !== id) return null;
    if (typeof parsed.name !== 'string' || !Array.isArray(parsed.coeffs)) return null;
    const coeffs: { k: number; mag: number; phase: number }[] = [];
    for (const c of parsed.coeffs as Array<{ k?: unknown; mag?: unknown; phase?: unknown }>) {
      if (typeof c?.k !== 'number' || typeof c?.mag !== 'number' || typeof c?.phase !== 'number')
        return null;
      coeffs.push({ k: c.k, mag: c.mag, phase: c.phase });
    }
    if (coeffs.length === 0) return null;
    return { name: parsed.name, coeffs };
  } catch {
    return null;
  }
}

/**
 * 续玩域的存储读写：LAST_LEVEL_KEY / LAST_CUSTOM_KEY 的存取，
 * 引擎只调这些函数，不直接碰这两个键。
 */
export function readLastLevelId(): string {
  try {
    return localStorage.getItem('fft-pointers-last-level-v1') ?? '';
  } catch {
    return '';
  }
}

export function writeLastLevelId(id: string): void {
  try {
    localStorage.setItem('fft-pointers-last-level-v1', id);
  } catch {
    /* 存储不可用则忽略 */
  }
}

export function readLastCustomRaw(): string | null {
  try {
    return localStorage.getItem('fft-pointers-last-custom-v1');
  } catch {
    return null;
  }
}

export function writeLastCustom(
  id: string,
  name: string,
  coeffs: { k: number; mag: number; phase: number }[],
): void {
  try {
    localStorage.setItem('fft-pointers-last-custom-v1', JSON.stringify({ id, name, coeffs }));
  } catch {
    /* 存储不可用则忽略 */
  }
}

export function clearLastCustom(): void {
  try {
    localStorage.removeItem('fft-pointers-last-custom-v1');
  } catch {
    /* 存储不可用则忽略 */
  }
}

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

/** 清空全部游戏进度（存档、成就、星级、卡关次数、草稿等），保留音量等偏好 */
export function clearSave(store: Storage = localStorage): void {
  for (const k of SAVE_KEYS) {
    try {
      store.removeItem(k);
    } catch {
      /* 忽略 */
    }
  }
}
