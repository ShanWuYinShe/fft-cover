<script lang="ts">
  import TopBar from './TopBar.svelte';
  import MobileNav from './MobileNav.svelte';
  import StarmapDrawer from './StarmapDrawer.svelte';
  import GameArena from './GameArena.svelte';
  import GuideOverlay from './GuideOverlay.svelte';
  import PlayControls from './PlayControls.svelte';
  import AmbientField from './AmbientField.svelte';
  import ScreenFrame from './ScreenFrame.svelte';
  import ArmPanel from '../ArmPanel.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import { screenReader } from '../../stores/screenReader.svelte';

  const onArmCount = $derived(engine.arms.filter((a) => a.on).length);
  const armLimit = $derived(engine.level?.armLimit ?? 10);
</script>

<!-- 星空背景与环境演出 -->
<AmbientField />

<!-- 座舱外框（四角包边 + 视口发丝线） -->
<ScreenFrame />

<!-- 全屏座舱：顶栏 / 舞台 / 右侧机坞 / 底部指令栏 四区贴边 -->
<div
  class="game-screen"
  data-tab={uiState.mobileTab}
  class:panel-expanded={uiState.panelExpanded}
  class:panel-hidden={engine.phase === 'running'}
  class:starmap-open={uiState.starMapOpen}
>
  <!-- 顶部座舱天穹 HUD -->
  <div class="gs-hud">
    <TopBar />
  </div>

  <!-- 读屏实时播报 -->
  <div class="sr-only" role="status" aria-live="polite">{screenReader.srLive}</div>

  <!-- 画布核心竞技台 -->
  <main class="gs-stage">
    <GameArena />
  </main>

  <!-- 右侧机坞：指针调参台 -->
  <aside class="gs-dock" aria-label="指针调参台">
    <div class="dock-head">
      <h2 class="dock-title font-celestial">指针调参台</h2>
      <span class="dock-count font-tabular" title="本关启用的指针数 / 上限">
        指针 {onArmCount}/{armLimit}
      </span>
    </div>

    <!-- 任务引导条：挂在机坞顶端（不再压在画布上），只在编辑阶段出现 -->
    <GuideOverlay />

    <div class="dock-body">
      {#if engine.autoSolve}
        <p class="fitting-tip">自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
      {/if}
      <ArmPanel />
    </div>
  </aside>

  <!-- 底部指令栏 -->
  <div class="gs-cmd">
    <PlayControls />
  </div>

  <!-- 移动端底部切换条 -->
  <div class="gs-nav">
    <MobileNav />
  </div>
</div>

<!-- 周天星图抽屉 -->
<StarmapDrawer />

<style>
  /* ============================================================
   * 全屏座舱：整屏 grid，页面本身不滚动
   * 桌面 ┌── 顶栏 ──┐ / ├ 舞台 │ 机坞 ┤ / └── 指令栏 ──┘
   * 手机  舞台（含画布）→ 机坞面板（内部滚动）→ 指令栏 → 底部导航
   * ============================================================ */
  .game-screen {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--dock-w);
    grid-template-rows: var(--hud-h) minmax(0, 1fr) var(--cmd-h);
    grid-template-areas:
      'hud hud'
      'stage dock'
      'cmd cmd';
    background: transparent;
  }

  .gs-hud {
    grid-area: hud;
    min-width: 0;
    min-height: 0;
    z-index: 3;
  }

  .gs-stage {
    grid-area: stage;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    padding: 8px 12px 4px 14px;
  }

  .gs-cmd {
    grid-area: cmd;
    z-index: 3;
    min-width: 0;
  }

  /* 移动端底部导航槽（桌面不占位） */
  .gs-nav {
    display: none;
    grid-area: nav;
    min-width: 0;
    min-height: 0;
  }

  /* ---------- 右侧机坞：贴边立柱，内部滚动 ---------- */
  .gs-dock {
    grid-area: dock;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(12, 18, 32, 0.96) 0%, rgba(6, 10, 19, 0.99) 100%);
    border-left: 1px solid var(--edge-bronze);
    box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.6);
  }

  .dock-head {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    /* 标题条：回纹发丝带 + 左侧金色铭牌块（器物语言） */
    background-color: rgba(9, 14, 25, 0.9);
    background-image: var(--pattern-hui);
    background-repeat: repeat-x;
    background-position: 0 center;
    border-bottom: 1px solid var(--edge-bronze);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.7);
  }
  .dock-head::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 60%;
    transform: translateY(-50%);
    background: linear-gradient(180deg, var(--gold-bright), var(--bronze));
  }

  .dock-title {
    margin: 0;
    font-size: 14px;
    color: var(--text);
    letter-spacing: 1px;
    font-weight: 700;
    white-space: nowrap;
  }

  .dock-count {
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    font-weight: 600;
  }

  .dock-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    /* 纵向弹性：面板矮于机坞时把调参台撑满，不留半屏死区 */
    display: flex;
    flex-direction: column;
    padding: 8px 10px 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
    -webkit-overflow-scrolling: touch;
  }

  .fitting-tip {
    font-size: 12px;
    color: var(--cyan);
    background: rgba(0, 245, 212, 0.08);
    border: 1px solid rgba(0, 245, 212, 0.25);
    border-radius: 6px;
    padding: 6px 10px;
    margin: 0 0 10px;
    line-height: 1.4;
  }

  /* ---------- 中等宽度：机坞收窄，避免舞台被压扁 ---------- */
  @media (max-width: 1180px) and (min-width: 901px) {
    .game-screen {
      grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);
    }
  }

  /* ---------- 竖屏平板（641–900px）：顶栏在上、舞台居中、机坞在下 ---------- */
  @media (min-width: 641px) and (max-width: 900px) and (orientation: portrait) {
    .game-screen {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: var(--hud-h) auto minmax(160px, 1fr) var(--cmd-h);
      grid-template-areas:
        'hud'
        'stage'
        'dock'
        'cmd';
    }
    .gs-stage {
      padding: 6px 12px 0;
    }
    .gs-dock {
      border-left: none;
      border-top: 1px solid var(--edge-soft);
    }
    .gs-dock::before {
      display: none;
    }
  }

  /* ---------- 手机竖屏：舞台 → 机坞面板 → 指令栏 → 底部导航 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen {
      grid-template-columns: minmax(0, 1fr);
      /* 舞台按内容取高（画布不被压扁），机坞吃掉剩余高度并内部滚动 */
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      grid-template-areas:
        'stage'
        'dock'
        'cmd'
        'nav';
    }

    .gs-hud {
      display: none;
    }

    .gs-stage {
      padding: 2px 4px 0;
    }

    .gs-nav {
      display: block;
      height: var(--tab-h);
      z-index: 3;
    }

    .gs-cmd {
      border-top: 1px solid var(--edge-bronze);
      background: linear-gradient(180deg, rgba(10, 15, 27, 0.92), rgba(5, 8, 15, 0.98));
    }

    /* 机坞吃掉剩余高度，内部滚动（高度由 grid 行决定，不再写 max-height） */
    .gs-dock {
      border-left: none;
      border-top: 1px solid var(--edge-soft);
    }
    .gs-dock::before {
      display: none;
    }

    .dock-head {
      padding: 6px 12px;
    }
    .dock-title {
      font-size: 14px;
      letter-spacing: 1.5px;
    }

    .dock-body {
      padding: 8px 10px 12px;
    }

    /* 展开态：面板独占整屏（否则画布会被压扁、引导条会压住面板控件） */
    .game-screen.panel-expanded {
      grid-template-rows: 0 minmax(0, 1fr) auto auto;
    }
    .game-screen.panel-expanded .gs-stage {
      display: none;
    }

    /* 运行中：机坞让位给画布（保留指令栏与底部导航操作） */
    .game-screen.panel-hidden {
      grid-template-rows: minmax(0, 1fr) 0 auto auto;
    }
    .game-screen.panel-hidden .gs-dock {
      display: none;
    }
    .game-screen.panel-hidden .gs-stage {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      justify-content: center;
    }
    /* 机坞收起后，画布吃掉空出来的高度（缎带仍贴顶，画布在剩余区域居中） */
    .game-screen.panel-hidden :global(.stage-wrap) {
      flex: 1 1 auto;
      justify-content: flex-start;
    }
    .game-screen.panel-hidden :global(.canvas-box) {
      width: min(94vw, 58dvh);
      margin-top: auto;
      margin-bottom: auto;
    }
  }

  /* ---------- 手机横屏：舞台在左、机坞在右，指令栏贴底 ---------- */
  @media (max-width: 900px) and (orientation: landscape) {
    .gs-hud {
      display: none;
    }
    .game-screen {
      grid-template-columns: minmax(0, 52vw) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto;
      grid-template-areas:
        'stage dock'
        'cmd cmd';
    }
    .gs-stage {
      padding: 4px 6px;
    }
    .dock-head {
      padding: 6px 10px;
    }
    .dock-title {
      font-size: 13px;
    }
    .game-screen.panel-hidden .gs-dock {
      display: none;
    }
    .game-screen.panel-hidden {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'stage'
        'cmd';
    }
  }
</style>
