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

  /* 整屏电影颗粒：盖在所有面板**上方**的一层静态后处理（fixed + z-index 40 + overlay）
     —— 这是「贴了图的游戏」最关键的一层，只此一处，不参与并发动画额度 */
  .game-screen::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    background-image: var(--tex-grain);
    opacity: 0.045;
    mix-blend-mode: overlay;
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
  /* 面 = 拉丝装甲板：斜向高光 + 拉丝 + 内沿暖亮线 + 内框发丝 + 外柔影 */
  .gs-dock {
    grid-area: dock;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--mat-plate);
    border-left: 1px solid var(--edge-bronze);
    box-shadow: var(--mat-plate-shadow);
  }
  /* 器物框：内缩 6px 的一道铜线（伪元素，不加 DOM） */
  .gs-dock::after {
    content: '';
    position: absolute;
    inset: 6px;
    z-index: 2;
    border: 1px solid var(--mat-frame-line);
    border-radius: 5px;
    box-shadow: inset 0 0 0 1px var(--edge-inner);
    pointer-events: none;
  }
  /* 雕花包角：全屏只此一枚（机坞右上角，镜像朝内） */
  .gs-dock::before {
    content: '';
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 3;
    width: 34px;
    height: 34px;
    background: var(--tex-corner) no-repeat center / 34px 34px;
    transform: scaleX(-1);
    opacity: 0.55;
    pointer-events: none;
  }

  /* 抬头 = 一块黄铜铭牌（原来是贴边的冷蓝标题条） */
  .dock-head {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 8px 10px 0;
    padding: 6px 10px;
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    border-radius: var(--r-sm);
    box-shadow: var(--plate-brass-shadow);
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
    font-size: 13px;
    color: var(--gold-bright);
    letter-spacing: 1.5px;
    font-weight: 700;
    white-space: nowrap;
    /* 柔和浮雕：深色下唇 + 暖色上唇（不用外发光） */
    text-shadow:
      0 1px 0 rgba(0, 0, 0, 0.6),
      0 1px 0 rgba(255, 224, 150, 0.12);
  }

  /* 计数在黄铜铭牌上：牌面比面板亮，用 --text 才够 4.5:1（--muted 实测仅 ≈3.9:1） */
  .dock-count {
    font-size: var(--ctl-font-sm);
    color: var(--text);
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

  /* 「画面偏窄」提示：与教学/专家提示同一族（铜牌，不用青色装饰） */
  .fitting-tip {
    font-size: 12px;
    color: var(--text);
    background: var(--note-bg);
    border: 1px solid var(--note-edge);
    border-radius: var(--r-sm);
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
      background: var(--mat-plate);
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
