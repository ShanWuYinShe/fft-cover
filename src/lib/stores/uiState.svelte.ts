/**
 * 浑天璇玑 · UI 交互与视图状态控制器
 * 拆解 App.svelte 中纯视图交互的响应式变量
 */

import { engine } from '../game/engine.svelte';
import { haptic } from '../game/haptics';
import type { ChapterProgress } from '../game/campaign';

class UIState {
  showAchv = $state(false);
  showSettings = $state(false);
  showTitle = $state(false);
  starMapOpen = $state(false);
  mobileTab = $state<'levels' | 'arms' | 'score'>('arms');
  panelExpanded = $state(false);
  /**
   * 右侧调参台（机坞）展开态。第九轮起机坞是滑入式浮层、默认收起，
   * 让游戏主区域（画布）占满整屏——正常游戏都是画布打底、HUD 浮在上面。
   */
  dockOpen = $state(false);
  updateReady = $state(false);
  shareNote = $state<string | null>(null);
  chapterIntro = $state<ChapterProgress | null>(null);

  /** 切换移动端主标签页 */
  onTab(t: 'levels' | 'arms'): void {
    if (t === 'levels') {
      this.starMapOpen = true;
    } else {
      this.starMapOpen = false;
    }
    if (this.mobileTab === t) {
      this.panelExpanded = !this.panelExpanded;
    } else {
      this.mobileTab = t;
      this.panelExpanded = false;
    }
    haptic(10, engine.soundOn);
  }

  /** 打开星图抽屉 */
  openStarmap(): void {
    this.starMapOpen = true;
    haptic(10, engine.soundOn);
  }

  /** 关闭星图抽屉 */
  closeStarmap(): void {
    this.starMapOpen = false;
  }

  /** 切换星图抽屉 */
  toggleStarmap(): void {
    this.starMapOpen = !this.starMapOpen;
    if (this.mobileTab === 'arms' && this.starMapOpen) {
      this.mobileTab = 'levels';
    }
    haptic(10, engine.soundOn);
  }

  /** 切换面板全屏展开态 */
  togglePanelExpanded(): void {
    this.panelExpanded = !this.panelExpanded;
    haptic(10, engine.soundOn);
  }

  /** 切换调参台（右侧机坞）展开态 */
  toggleDock(): void {
    this.dockOpen = !this.dockOpen;
    haptic(10, engine.soundOn);
  }

  /** 关闭调参台 */
  closeDock(): void {
    this.dockOpen = false;
  }

  /** 设置分享通知文本，数秒后自动淡出 */
  setShareNote(note: string, timeout = 5200): void {
    this.shareNote = note;
    setTimeout(() => {
      if (this.shareNote === note) {
        this.shareNote = null;
      }
    }, timeout);
  }

  /** 关闭章节入场卡片并写入已阅标记 */
  dismissChapterIntro(): void {
    if (this.chapterIntro) {
      engine.markFlag('chapterIntro:' + this.chapterIntro.id);
    }
    this.chapterIntro = null;
  }
}

export const uiState = new UIState();
