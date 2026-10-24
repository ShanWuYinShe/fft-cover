/**
 * 浑天璇玑 · URL 分享链接与邀请码解析器
 */

import { engine } from '../game/engine.svelte';
import { decodeCoeffs, LEVEL_DEFS } from '../game/levels';
import {
  readArmsFromHash,
  readCustomFromHash,
  readDailyFromHash,
  readLevelFromHash,
  readRandomFromHash,
  readWeeklyFromHash,
} from '../game/share';
import { uiState } from './uiState.svelte';

export function applyHashShare(): void {
  const hash = location.hash;
  if (!hash) return;

  const shared = readRandomFromHash(hash);
  const sharedDaily = readDailyFromHash(hash);
  const sharedCustom = readCustomFromHash(hash);
  let sharedCustomLoaded = false;

  if (sharedCustom) {
    const coeffs = decodeCoeffs(sharedCustom);
    if (coeffs) {
      engine.loadCustomLevel(coeffs, '创作关卡');
      uiState.setShareNote('已载入好友分享的创作关卡');
      sharedCustomLoaded = true;
    }
  }

  if (shared) {
    engine.loadRandomSeed(shared.seed, shared.diff);
    uiState.setShareNote('已载入好友分享的随机关卡（邀请码 ' + shared.seed + '）');
  } else if (sharedDaily) {
    engine.setDifficulty(sharedDaily);
    engine.loadDaily();
    uiState.setShareNote('已载入好友分享的每日挑战（' + sharedDaily + '）');
  } else if (readWeeklyFromHash(hash)) {
    engine.loadWeekly();
    uiState.setShareNote('已载入好友分享的本周挑战');
  }

  // 战役内置关挑战（lv= 段）：先落到同一关，再套好友的解法参数——
  // 否则好友打开链接只会落在自己上次的关卡，跨关挑战对不上题
  const lvId = readLevelFromHash(hash);
  let lvName = '';
  if (lvId) {
    const def = LEVEL_DEFS.find((l) => l.id === lvId);
    if (def) {
      engine.loadLevel(def);
      lvName = def.name;
    }
  }

  const code = readArmsFromHash(hash);
  if (code && engine.applyArmsCode(code)) {
    uiState.setShareNote(
      (shared || sharedDaily || sharedCustomLoaded
        ? '已载入好友分享的关卡，'
        : lvName
          ? '已载入好友的挑战：《' + lvName + '》——'
          : '') + '好友向你发起解法挑战——参数已装好，点 ▶ 开始旋转试试全清！',
    );
    history.replaceState(null, '', location.pathname + location.search);
  } else if (shared || sharedDaily || sharedCustomLoaded) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

export function setupShareListener(): () => void {
  window.addEventListener('hashchange', applyHashShare);
  return () => {
    window.removeEventListener('hashchange', applyHashShare);
  };
}
