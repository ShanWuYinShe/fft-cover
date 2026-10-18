<script lang="ts">
  import TopBar from './TopBar.svelte';
  import MobileNav from './MobileNav.svelte';
  import StarmapDrawer from './StarmapDrawer.svelte';
  import GameArena from './GameArena.svelte';
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

  <!-- 右侧璇玑中枢机坞 -->
  <aside class="gs-dock" aria-label="璇玑中枢 · 指针控制台">
    <div class="dock-head">
      <div class="dock-title-wrap">
        <span class="dock-badge g-label">璇玑中枢</span>
        <h2 class="dock-title font-celestial">十方星宿律柱</h2>
      </div>
      <div class="dock-capacity" title="本关最多启用 {armLimit} 根指针">
        <span class="cap-pips" aria-hidden="true">
          {#each Array(armLimit) as _, idx}
            <span class="cap-pip" class:filled={idx < onArmCount}>◆</span>
          {/each}
        </span>
        <span class="cap-num font-tabular">{onArmCount}/{armLimit}</span>
      </div>

      <!-- 移动端展开态：把面板收回去看画布 -->
      {#if uiState.panelExpanded}
        <button
          type="button"
          class="dock-collapse"
          title="收起面板，回到画布"
          aria-label="收起面板"
          onclick={() => uiState.togglePanelExpanded()}
        >
          <span>收起</span>
          <span class="collapse-ico">▴</span>
        </button>
      {/if}
    </div>

    <div class="dock-body">
      {#if engine.autoSolve}
        <p class="fitting-tip">自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
      {/if}
      <ArmPanel />
    </div>

    <div class="dock-foot" aria-hidden="true">
      <span
        class="g-lamp {engine.phase === 'edit'
          ? 'g-lamp--cyan'
          : engine.phase === 'running'
            ? 'g-lamp--red'
            : ''}"
      ></span>
      <span class="foot-text">{engine.phase === 'running' ? '演算中' : '待机 · 可调参'}</span>
      <span class="foot-line"></span>
      <span class="foot-glyph font-celestial">璇玑</span>
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
    border-left: 1px solid var(--edge);
    box-shadow:
      inset 1px 0 0 rgba(255, 255, 255, 0.05),
      -14px 0 34px rgba(0, 0, 0, 0.55);
  }
  /* 机坞左沿的金色发丝高光 */
  .gs-dock::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(245, 184, 65, 0.55) 12%,
      rgba(0, 245, 212, 0.35) 55%,
      rgba(245, 184, 65, 0.5) 88%,
      transparent
    );
    opacity: 0.7;
    pointer-events: none;
  }

  .dock-head {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.09), rgba(245, 184, 65, 0.015));
    border-bottom: 1px solid var(--edge-soft);
    box-shadow: var(--bevel-top);
  }

  .dock-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dock-badge {
    background: rgba(245, 184, 65, 0.14);
    border: 1px solid var(--edge-soft);
    color: var(--gold-bright);
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 1px;
    flex: 0 0 auto;
  }

  .dock-title {
    margin: 0;
    font-size: 16px;
    color: #fff;
    letter-spacing: 2px;
    font-weight: 700;
    text-shadow: 0 0 14px rgba(245, 184, 65, 0.35);
    white-space: nowrap;
  }

  .dock-capacity {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
  }
  .cap-pips {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .cap-pip {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.16);
    transition: all 0.2s ease;
  }
  .cap-pip.filled {
    color: var(--cyan);
    text-shadow: 0 0 8px var(--cyan);
  }
  .cap-num {
    font-size: 12px;
    color: var(--gold-bright);
    font-weight: 700;
  }

  /* 移动端展开态的收起键（桌面不显示） */
  .dock-collapse {
    display: none;
  }

  .dock-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding: 10px 12px 12px;
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
    -webkit-overflow-scrolling: touch;
  }

  .dock-foot {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-top: 1px solid var(--edge-faint);
    background: rgba(4, 7, 13, 0.85);
  }
  .foot-text {
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .foot-line {
    flex: 1 1 auto;
    height: 1px;
    background: linear-gradient(90deg, var(--edge-soft), transparent);
  }
  .foot-glyph {
    font-size: 10px;
    letter-spacing: 3px;
    color: rgba(245, 184, 65, 0.45);
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
      border-top: 1px solid var(--edge);
      box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.5);
    }
    .gs-dock::before {
      display: none;
    }
  }

  /* ---------- 手机竖屏：舞台 → 机坞面板 → 指令栏 → 底部导航 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen {
      grid-template-columns: minmax(0, 1fr);
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
      border-top: 1px solid var(--edge-soft);
      background: linear-gradient(180deg, rgba(10, 15, 27, 0.92), rgba(5, 8, 15, 0.98));
    }

    .gs-dock {
      border-left: none;
      border-top: 1px solid var(--edge);
      box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.5);
    }
    .gs-dock::before {
      display: none;
    }

    /* 展开态：机坞面板吃掉整个舞台，专心调参 */
    .game-screen.panel-expanded .gs-stage {
      display: none;
    }

    .dock-head {
      padding: 6px 12px;
    }
    .dock-title {
      font-size: 14px;
      letter-spacing: 1.5px;
    }

    /* 展开态才需要「收起」键：否则没有回到画布的出口 */
    .game-screen.panel-expanded .dock-capacity {
      display: none;
    }
    .game-screen.panel-expanded .dock-collapse {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 40px;
      padding: 0 12px;
      border-radius: 8px;
      background: var(--face-metal);
      border: 1px solid var(--edge);
      color: var(--gold-bright);
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow:
        var(--bevel-top),
        0 2px 0 rgba(0, 0, 0, 0.5);
    }
    .game-screen.panel-expanded .dock-collapse:active {
      transform: translateY(2px);
      box-shadow: var(--bevel-inset);
    }
    .collapse-ico {
      font-size: 10px;
    }
    .dock-body {
      padding: 8px 10px 12px;
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

    .dock-foot {
      display: none;
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
