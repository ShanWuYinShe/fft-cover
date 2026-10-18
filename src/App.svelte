<script lang="ts">
  import { onMount } from 'svelte';
  import GameShell from './lib/components/game/GameShell.svelte';
  import TitleScreen from './lib/components/TitleScreen.svelte';
  import AchievementsModal from './lib/components/AchievementsModal.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import FinaleOverlay from './lib/components/FinaleOverlay.svelte';
  import ChapterIntroOverlay from './lib/components/ChapterIntroOverlay.svelte';
  import TutorialOverlay from './lib/components/overlays/TutorialOverlay.svelte';
  import ToastHost from './lib/components/overlays/ToastHost.svelte';

  import { LEVEL_DEFS } from './lib/game/levels';
  import { chapterProgress } from './lib/game/campaign';
  import { engine } from './lib/game/engine.svelte';
  import { achvSound, uiChime } from './lib/game/audio';
  import { haptic } from './lib/game/haptics';
  import { musicLevelArrival } from './lib/game/music';
  import { readArmsFromHash, readRandomFromHash, readDailyFromHash } from './lib/game/share';

  import { uiState } from './lib/stores/uiState.svelte';
  import { audioController } from './lib/stores/audioController.svelte';
  import { screenReader } from './lib/stores/screenReader.svelte';
  import { handleKeydown } from './lib/stores/keyboardHandler';
  import { applyHashShare, setupShareListener } from './lib/stores/shareHandler';

  /** 减少动画：优先尊重系统的"减弱动态效果"，其次看设置里的开关 */
  $effect(() => {
    document.documentElement.classList.toggle('reduce-motion', !!engine.flags.reduceMotion);
  });

  /** 结算或通关时自动收起移动端展开的面板，确保结算卡拥有完整画布展示空间 */
  $effect(() => {
    if (engine.phase === 'done' && uiState.panelExpanded) {
      uiState.panelExpanded = false;
    }
  });

  /** 关卡切换时移动端自动切到调参面板 */
  let activeLevelId = $state(engine.level?.id);
  $effect(() => {
    if (engine.level?.id && engine.level.id !== activeLevelId) {
      activeLevelId = engine.level.id;
      uiState.mobileTab = 'arms';
    }
  });

  /** 读屏播报状态更新防抖同步 */
  $effect(() => {
    screenReader.update();
  });

  /** 章节入场卡：第一次进入某一章时介绍这一章教什么 */
  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));
  const currentChapter = $derived(
    chapters.find((c) => c.levels.some((l) => l.id === engine.level?.id)) ?? null,
  );

  $effect(() => {
    const ch = currentChapter;
    if (!ch || ch.id === 'basics' || !ch.unlocked) return;
    if (engine.flags['chapterIntro:' + ch.id]) return;
    if (uiState.showTitle || !engine.flags['tutorialSeen']) return;
    if (uiState.chapterIntro?.id === ch.id) return;
    uiState.chapterIntro = ch;
  });

  /** 音乐与音效生命周期同步 */
  let arrivedLevelId = '';
  $effect(() => {
    const id = engine.level?.id ?? '';
    if (id !== arrivedLevelId) {
      arrivedLevelId = id;
      if (id) musicLevelArrival(engine.musicalKey);
    }
    audioController.syncMusic();
  });

  /** 通关演出触感 */
  $effect(() => {
    if (engine.finale) haptic([24, 70, 24, 70, 48], engine.soundOn);
  });

  /** 成就解锁音效与触感（3 秒后自动清除） */
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!engine.toast) return;
    achvSound(engine.soundOn);
    haptic([14, 40, 14], engine.soundOn);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => engine.clearToast(), 3000);
  });

  /**
   * 功能弹层（成就/设置/星图/暂停）展开时的一声编钟——只认 false→true 沿，
   * 弹层之间切换（一个关一个开）不会双响。演出层（标题/章节入场/通关/教程/结算）
   * 不在清单里：它们有自己的音效编排，磬声只给「进入一个功能面板」的瞬间。
   */
  let prevPanelUp = false;
  $effect(() => {
    const up =
      uiState.showAchv || uiState.showSettings || uiState.starMapOpen || engine.phase === 'paused';
    if (up && !prevPanelUp) uiChime(engine.soundOn);
    prevPanelUp = up;
  });

  /** 从图鉴/成就跳转直接进关 */
  function playFromDex(id: string): void {
    const def = LEVEL_DEFS.find((d) => d.id === id);
    if (!def) return;
    engine.loadLevel(def);
    uiState.showAchv = false;
  }

  // 新手引导是否已看
  const tutorialSeen = $derived(!!engine.flags['tutorialSeen']);

  /** 除教程外的浮层（标题/成就/设置/星图/章节入场/通关演出） */
  const otherOverlayUp = $derived(
    uiState.showTitle ||
      uiState.showAchv ||
      uiState.showSettings ||
      uiState.starMapOpen ||
      !!uiState.chapterIntro ||
      !!engine.finale,
  );

  /**
   * 新手教程只在「没有别的浮层」时出现：
   * 从标题页直接点「星图 / 成就 / 设置」时，目标浮层优先，教程不抢镜。
   */
  const tutorialUp = $derived(!tutorialSeen && !otherOverlayUp);

  /** 任一浮层开着时，把游戏骨架整块 inert：焦点不会跑到背景 HUD 上 */
  const overlayUp = $derived(otherOverlayUp || tutorialUp);

  onMount(() => {
    // 挂载全局调试桥梁
    (window as any).__ENGINE = engine;
    (window as any).__OPEN_SETTINGS = () => (uiState.showSettings = true);
    (window as any).__OPEN_ACHV = () => (uiState.showAchv = true);
    (window as any).__OPEN_TITLE = () => (uiState.showTitle = true);

    // 减弱动态效果初始检测
    if (
      engine.flags.reduceMotion === undefined &&
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      engine.setFlag('reduceMotion', true);
    }

    // 首次进入判断是否展示标题页
    const sharedLevel = readRandomFromHash(location.hash) ?? readDailyFromHash(location.hash);
    if (!engine.flags.seenTitle && !readArmsFromHash(location.hash) && !sharedLevel) {
      uiState.showTitle = true;
      engine.markFlag('seenTitle');
    }

    applyHashShare();
    engine.resumeEndlessRun();

    // 旋转或缩放同步移动端面板展开状态
    const panelMq = window.matchMedia('(max-width: 640px) and (orientation: portrait)');
    const syncPanel = (): void => {
      if (!panelMq.matches) uiState.panelExpanded = false;
    };
    syncPanel();
    panelMq.addEventListener('change', syncPanel);

    // 监听 PWA 更新就绪
    const onUpdate = () => (uiState.updateReady = true);
    window.addEventListener('pwa-update', onUpdate);

    // 安装分享与音频监听
    const cleanupShare = setupShareListener();
    const cleanupAudio = audioController.setupListeners();

    return () => {
      panelMq.removeEventListener('change', syncPanel);
      window.removeEventListener('pwa-update', onUpdate);
      cleanupShare();
      cleanupAudio();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- 游戏主骨架（有浮层时整块 inert：背景不可点、不可 Tab 到） -->
<div class="game-layer" inert={overlayUp}>
  <GameShell />
</div>

<!-- 浮层通知托管 -->
<ToastHost />

<!-- 模态弹窗与流程浮层 -->
{#if uiState.showTitle}
  <TitleScreen onstart={() => (uiState.showTitle = false)} />
{/if}

{#if uiState.showAchv}
  <AchievementsModal onclose={() => (uiState.showAchv = false)} onplay={playFromDex} />
{/if}

{#if uiState.showSettings}
  <SettingsModal
    onclose={() => (uiState.showSettings = false)}
    volume={audioController.volume}
    onCycleVolume={() => audioController.cycleVolume()}
  />
{/if}

{#if tutorialUp}
  <TutorialOverlay />
{/if}

{#if uiState.chapterIntro}
  <ChapterIntroOverlay
    chapter={uiState.chapterIntro}
    onclose={() => uiState.dismissChapterIntro()}
  />
{/if}

{#if engine.finale}
  <FinaleOverlay />
{/if}
