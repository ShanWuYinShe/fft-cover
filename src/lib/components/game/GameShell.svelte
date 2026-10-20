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

<!-- 全屏座舱：画布铺满整屏，HUD / 指令栏 / 机坞都浮在它上面 -->
<div
  class="game-screen"
  data-tab={uiState.mobileTab}
  class:panel-expanded={uiState.panelExpanded}
  class:panel-hidden={engine.phase === 'running'}
  class:starmap-open={uiState.starMapOpen}
  class:dock-open={uiState.dockOpen}
>
  <!-- 顶部座舱天穹 HUD（浮层，背景渐隐让画布透出） -->
  <div class="gs-hud">
    <TopBar />
  </div>

  <!-- 读屏实时播报 -->
  <div class="sr-only" role="status" aria-live="polite">{screenReader.srLive}</div>

  <!-- 画布核心竞技台：占满整屏 -->
  <main class="gs-stage">
    <GameArena />
  </main>

  <!-- 调参台开关（机坞收起时唯一入口，浮在指令栏右侧） -->
  <button
    type="button"
    class="dock-toggle"
    aria-label={uiState.dockOpen ? '收起调参台' : '展开调参台'}
    aria-expanded={uiState.dockOpen}
    onclick={() => uiState.toggleDock()}
  >
    <span class="dock-toggle-ico" aria-hidden="true">{uiState.dockOpen ? '✕' : '⚙'}</span>
    <span class="dock-toggle-text">调参</span>
  </button>

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
   * 第十四轮「糖果星域」：画布铺满整屏，HUD / 机坞 / 指令栏全是浮层
   * 视觉：白卡 + 3px 白边 + 硬投影；不用黑阴影、不用玻璃拟态
   * ============================================================ */
  .game-screen {
    position: fixed;
    inset: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'stage';
    background: transparent;
  }

  /* 整屏颗粒：第十四轮取消（浅底上噪点会让画面发灰） */

  /* 顶栏浮层 */
  .gs-hud {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: var(--hud-h);
    min-width: 0;
    min-height: 0;
    pointer-events: none;
    padding: 0 var(--hud-pad-x) 0 var(--hud-pad-x-end);
  }
  .gs-hud > :global(*) {
    pointer-events: auto;
  }

  /* 舞台：占满整屏 */
  .gs-stage {
    grid-area: stage;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    padding: 0;
  }

  /* 指令栏：贴底居中的白药丸浮条 */
  .gs-cmd {
    position: fixed;
    left: 50%;
    bottom: var(--cmd-pad-b);
    transform: translateX(-50%);
    z-index: 22;
    min-width: 0;
    width: auto;
    max-width: calc(100vw - 24px);
  }

  .gs-nav {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 21;
    min-width: 0;
    min-height: 0;
  }

  /* ---------- 调参台开关：珊瑚厚实体药丸 ---------- */
  .dock-toggle {
    position: fixed;
    right: max(16px, var(--safe-r));
    bottom: calc(var(--cmd-h) + var(--cmd-pad-b) + 8px);
    z-index: 23;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--ctl-lg);
    padding: 0 20px;
    border-radius: var(--r-pill);
    background: var(--coral-edge);
    border: 3px solid #ffffff;
    box-shadow:
      0 5px 0 var(--coral-edge),
      0 14px 26px rgba(190, 70, 30, 0.28);
    color: #ffffff;
    font-family: var(--font-round);
    font-size: var(--ctl-font);
    font-weight: 900;
    letter-spacing: 1px;
    cursor: pointer;
    transition:
      transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background 120ms ease;
  }
  .dock-toggle::before {
    content: '';
    position: absolute;
    inset: 2px 2px 5px;
    border-radius: var(--r-pill);
    background: var(--face-gold-plate);
    z-index: -1;
  }
  .dock-toggle:hover {
    background: #a83814;
  }
  .dock-toggle:active {
    transform: translateY(3px);
  }
  .dock-toggle:focus-visible {
    outline: 3px solid #ffffff;
    outline-offset: 3px;
    box-shadow: 0 0 0 7px var(--coral);
  }
  .dock-toggle-ico {
    display: inline-flex;
    font-size: 18px;
    line-height: 1;
  }

  /* ---------- 右侧机坞：白卡滑入面板 ---------- */
  .gs-dock {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 24;
    width: min(var(--dock-w), 92vw);
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--mat-plate);
    border-left: 4px solid #ffffff;
    box-shadow:
      -8px 0 0 #d6ecf9,
      -26px 0 48px rgba(56, 116, 150, 0.22);
    transform: translateX(calc(100% + 16px));
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }
  .game-screen.dock-open .gs-dock {
    transform: translateX(0);
  }
  /* 器物内框与包角：第十四轮取消 */
  .gs-dock::after,
  .gs-dock::before {
    content: none;
  }

  /* 抬头 = 珊瑚药丸铭牌 */
  .dock-head {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 12px 14px 0;
    padding: 8px 18px;
    background: var(--plate-brass);
    border: 3px solid #ffffff;
    border-radius: var(--r-pill);
    box-shadow: var(--plate-brass-shadow);
  }
  .dock-head::before {
    content: none;
  }

  .dock-title {
    margin: 0;
    font-family: var(--font-round);
    font-size: var(--fs-lg);
    color: var(--coral-ink);
    letter-spacing: 1px;
    font-weight: 900;
    white-space: nowrap;
  }

  .dock-count {
    font-family: var(--font-round);
    font-size: var(--ctl-font-sm);
    color: var(--coral-ink);
    font-weight: 800;
    background: rgba(255, 255, 255, 0.42);
    padding: 3px 10px;
    border-radius: var(--r-pill);
    font-variant-numeric: tabular-nums;
  }

  .dock-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    padding: 12px 14px 16px;
    scrollbar-width: thin;
    scrollbar-color: #b6dcf2 transparent;
    -webkit-overflow-scrolling: touch;
  }

  /* 「自动拟合中」提示：薄荷浅底卡 */
  .fitting-tip {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--mint-ink);
    background: var(--note-bg);
    border: 2px solid var(--note-edge);
    border-radius: var(--r-sm);
    padding: 8px 12px;
    margin: 0 0 12px;
    line-height: 1.5;
  }

  /* ============================================================
   * 响应式：画布始终铺满，只调整浮层位置
   * ============================================================ */

  @media (max-width: 1180px) and (min-width: 901px) {
    .gs-dock {
      width: min(360px, 92vw);
    }
  }

  /* ---------- 手机竖屏：顶栏隐藏，底部导航浮层 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .gs-hud {
      display: none;
    }

    .gs-nav {
      display: block;
      height: calc(var(--tab-h) + var(--safe-b));
      padding-bottom: var(--safe-b);
      background: var(--mat-plate);
      border-top: 3px solid #ffffff;
      box-shadow: 0 -6px 0 #d6ecf9;
    }

    .gs-cmd {
      bottom: calc(var(--tab-h) + var(--safe-b) + 10px);
    }

    .gs-dock {
      width: 100vw;
      top: auto;
      height: min(66dvh, 560px);
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      border-left: none;
      border-top: 4px solid #ffffff;
      transform: translateY(calc(100% + 16px));
      padding-bottom: var(--safe-b);
    }
    .game-screen.dock-open .gs-dock {
      transform: translateY(0);
    }

    .dock-toggle {
      right: 14px;
      bottom: calc(var(--tab-h) + var(--safe-b) + var(--cmd-h) + 16px);
      min-height: var(--ctl-md);
      padding: 0 16px;
    }

    .dock-head {
      margin: 10px 12px 0;
      padding: 7px 14px;
    }
    .dock-title {
      font-size: var(--fs-md);
    }
    .dock-body {
      padding: 10px 12px 16px;
    }
  }

  /* ---------- 手机横屏 ---------- */
  @media (max-width: 900px) and (orientation: landscape) {
    .gs-hud {
      display: none;
    }

    .gs-cmd {
      bottom: max(8px, var(--safe-b));
    }

    .gs-dock {
      width: min(360px, 86vw);
    }

    .dock-toggle {
      right: max(10px, var(--safe-r));
      bottom: calc(var(--ctl-lg) + 18px);
      padding: 0 14px;
      min-height: var(--ctl-md);
    }
    .dock-toggle-text {
      display: none;
    }
  }

  /* 运行态：调参台自动收起，画面完全让给游戏 */
  .game-screen.panel-hidden .gs-dock {
    transform: translateX(calc(100% + 16px));
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen.panel-hidden .gs-dock {
      transform: translateY(calc(100% + 16px));
    }
  }

  /* 展开调参台时按钮让位到面板左侧 */
  .game-screen.dock-open .dock-toggle {
    right: calc(min(var(--dock-w), 92vw) + 18px);
  }
  @media (max-width: 1180px) and (min-width: 901px) {
    .game-screen.dock-open .dock-toggle {
      right: calc(min(360px, 92vw) + 18px);
    }
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen.dock-open .dock-toggle {
      right: 14px;
      bottom: calc(min(66dvh, 560px) + 14px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gs-dock,
    .dock-toggle {
      transition: none;
    }
  }
  :global(.reduce-motion) .gs-dock,
  :global(.reduce-motion) .dock-toggle {
    transition: none;
  }
</style>
