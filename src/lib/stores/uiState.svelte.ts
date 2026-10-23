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
  /**
   * 引导期自动展开被用户手动收起后，本次会话不再自动展开。
   * 只在 toggleDock（用户手势）置真——程序化 closeDock 不算用户意愿。
   */
  dockAutoDismissed = $state(false);
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
    if (!this.dockOpen) this.dockAutoDismissed = true;
    haptic(10, engine.soundOn);
  }

  /**
   * 引导期自动展开调参台（第十六轮）。
   * 新手前两关（圆/椭圆）的分步引导条钉在机坞里，而桌面端机坞默认收起——
   * 引导文字存在却看不见（实测 2026-10-24）。教学关掉后的第一眼里，
   * 让工具连同引导一起出现在眼前，顺便教会「调参的工具住在这里」。
   * 仅桌面 ≥901px（窄屏机坞是常驻底部面板，无此问题）；用户手动收起后
   * 本次会话不再自动展开。
   */
  autoExpandForGuide(): void {
    if (this.dockAutoDismissed || this.dockOpen) return;
    if (window.matchMedia('(max-width: 900px)').matches) return;
    if (engine.phase !== 'edit') return;
    if (!(engine.showFirstGuide || engine.showEllipseGuide)) return;
    this.dockOpen = true;
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
