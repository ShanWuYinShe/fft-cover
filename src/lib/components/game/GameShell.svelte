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
  /** 暂停/结算演出中：画布外 HUD（顶栏/指令栏/调参入口/底部导航）退到幕后，
   *  且 inert 拦键盘（条件与拦截共用 uiState.overlayDim 单一事实源）。
   *  画布内的暂停卡与结算卡自带 --scrim，不受影响；此前只有画布区域被
   *  遮罩盖住，红色「结束并结算」比卡片主按钮还抢眼——层级倒挂实测。 */
  const overlayDim = $derived(uiState.overlayDim);
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
  class:overlay-dim={overlayDim}
>
  <!-- 顶部座舱天穹 HUD（浮层，背景渐隐让画布透出）。
      暂停/结算时一并 inert：overlay-dim 的 pointer-events 只挡鼠标，
      Tab 仍会聚焦进压暗的背景（实测 40 个焦点逃逸），Enter 误触
      「结束并结算」会直接结束本局——inert 才把键盘一并拦住 -->
  <div class="gs-hud" inert={overlayDim}>
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
    inert={overlayDim}
    onclick={() => uiState.toggleDock()}
  >
    <span class="dock-toggle-ico" aria-hidden="true">{uiState.dockOpen ? '✕' : '⚙'}</span>
    <span class="dock-toggle-text">调参</span>
  </button>

  <!-- 右侧机坞：指针调参台 -->
  <aside class="gs-dock" aria-label="指针调参台" inert={overlayDim}>
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
  <div class="gs-cmd" inert={overlayDim}>
    <PlayControls />
  </div>

  <!-- 移动端底部切换条 -->
  <div class="gs-nav" inert={overlayDim}>
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

  /* ---------- 暂停/结算演出：画布外 HUD 退到幕后 ----------
   * 只压暗画布外的固定浮层；画布内的暂停卡/结算卡有自己的 --scrim。
   * pointer-events 一并收掉：这两态下背景按钮不该响应（防误触）。 */
  .gs-hud,
  .gs-cmd,
  .gs-nav,
  .gs-dock,
  .dock-toggle {
    transition:
      opacity 240ms ease,
      filter 240ms ease;
  }
  .game-screen.overlay-dim .gs-hud,
  .game-screen.overlay-dim .gs-cmd,
  .game-screen.overlay-dim .gs-nav,
  .game-screen.overlay-dim .gs-dock,
  .game-screen.overlay-dim .dock-toggle {
    opacity: 0.32;
    filter: saturate(0.7);
    pointer-events: none;
  }

  /* ---------- 调参台开关：白药丸键（二级控件，珊瑚实体留给主操作） ---------- */
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
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 4px 0 #d6ecf9,
      0 10px 20px rgba(56, 116, 150, 0.14);
    color: var(--text);
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
    content: none;
  }
  .dock-toggle:hover {
    background: #ffffff;
  }
  .dock-toggle:active {
    transform: translateY(2px);
  }
  .dock-toggle:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }
  .dock-toggle-ico {
    display: inline-flex;
    font-size: 18px;
    line-height: 1;
    /* 白卡上留一点珊瑚识别度（图标珊瑚、文字中性） */
    color: var(--coral-text);
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
      /* 手机竖屏：时间条底沿到 cmd+22+16=38px，按钮上移到它之上，
         否则 44px 高的按钮与 16px 的时间条同基准叠在一起（2026-10-31 实测） */
      bottom: calc(var(--tab-h) + var(--safe-b) + var(--cmd-h) + 52px);
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
  /* 手机横屏：展开时让位到真实抽屉左缘（360px）。无条件让位规则用的
     --dock-w=400 在横屏会悬空 58px、压住时间条（2026-10-31 实测按钮落
     x=377，抽屉左缘 484）——放在无条件规则之后按序覆盖（竖屏同模式） */
  @media (max-width: 900px) and (orientation: landscape) {
    .game-screen.dock-open .dock-toggle {
      right: calc(min(360px, 86vw) + 12px);
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
