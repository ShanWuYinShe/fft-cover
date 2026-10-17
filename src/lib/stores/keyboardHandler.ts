/**
 * 浑天璇玑 · 全局键盘快捷键控制器
 */

import { engine } from '../game/engine.svelte';
import { beep, finishChord, perfectArpeggio } from '../game/audio';
import { isTypingTarget } from '../game/keys';

export function toggleRun(): void {
  engine.toggleRun();
  beep(engine.phase === 'running' ? 440 : 330, 0.06, 'square', 0.06, engine.soundOn);
}

export function stopRun(): void {
  engine.fastForward = false;
  const was = engine.phase;
  engine.stopRun();
  if (engine.phase === 'done' && (was === 'running' || was === 'paused')) {
    if (engine.collectedCount === engine.total) {
      perfectArpeggio(engine.soundOn, engine.collectScale.slice(0, 8));
    } else {
      finishChord(engine.soundOn);
    }
  }
}

export function handleKeydown(e: KeyboardEvent): void {
  // 输入框 / 多行文本 / 下拉框 / contenteditable 里都在打字，全局键让路
  if (isTypingTarget(e.target)) return;

  // 有弹层开着（成就/设置/合成器/标题/教程/通关/入境）时：全局键让路，防止后台误触
  if (
    document.querySelector('.modal, .modal-backdrop, .finale, .ch-intro, .title-screen, .tutorial')
  ) {
    return;
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) engine.redoArms();
    else engine.undoArms();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault();
    engine.redoArms();
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (engine.phase === 'done') {
      if (engine.endless) return;
      engine.resetRun();
      engine.startRun();
    } else {
      toggleRun();
    }
  } else if (e.key === 's' || e.key === 'S') {
    stopRun();
  } else if (e.key === 'r' || e.key === 'R') {
    engine.resetRun();
    beep(300, 0.06, 'square', 0.06, engine.soundOn);
  }
}
