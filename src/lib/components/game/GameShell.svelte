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
   * 全屏座舱：整屏 grid，页面本身不滚动
   * 桌面 ┌── 顶栏 ──┐ / ├ 舞台 │ 机坞 ┤ / └── 指令栏 ──┘
   * 手机  舞台（含画布）→ 机坞面板（内部滚动）→ 指令栏 → 底部导航
   * ============================================================ */
  /* 全屏舞台（第九轮）：游戏主区域占满整屏，HUD / 指令栏 / 机坞都是浮层。
     原来「顶栏 + 舞台 + 机坞 + 指令栏」四区把主区域切成一块正方形，
     正常游戏不会那样——画布必须是背景，UI 浮在上面。 */
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

  /* ---------- 浮层体系（第九轮）----------
     舞台铺满整屏，其余三块都浮在画布之上：
       HUD    贴顶，顶部渐隐让画布透出来
       指令栏  贴底居中，胶囊浮条
       机坞    右侧滑入面板（默认收起），点「调参」展开
     pointer-events 只在需要的地方打开，画布始终可交互。 */

  /* 顶栏：贴顶，背景渐隐（画布从下面透出来） */
  .gs-hud {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    min-width: 0;
    min-height: 0;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(6, 10, 18, 0.78) 0%, rgba(6, 10, 18, 0) 100%);
  }
  /* 顶栏内部控件恢复可点（背景层本身不拦画布） */
  .gs-hud > :global(*) {
    pointer-events: auto;
  }

  /* 舞台：占满整屏（唯一占 grid 的区） */
  .gs-stage {
    grid-area: stage;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    padding: 0;
  }

  /* 指令栏：贴底居中的胶囊浮条 */
  .gs-cmd {
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    z-index: 22;
    min-width: 0;
    width: auto;
    max-width: calc(100vw - 24px);
  }

  /* 移动端底部导航：贴底浮层 */
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

  /* ---------- 调参台开关：机坞收起时唯一入口 ---------- */
  .dock-toggle {
    position: fixed;
    right: 14px;
    bottom: calc(var(--cmd-h) + 22px);
    z-index: 23;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: var(--ctl-md);
    padding: 0 16px;
    border-radius: 999px;
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    box-shadow: var(--plate-brass-shadow);
    color: var(--gold-bright);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition:
      transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 160ms ease;
  }
  .dock-toggle:hover {
    box-shadow: var(--plate-brass-shadow), var(--sh-glow-hot);
  }
  .dock-toggle:active {
    transform: scale(0.96);
  }
  .dock-toggle:focus-visible {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
  }
  .dock-toggle-ico {
    display: inline-flex;
    font-size: 14px;
    line-height: 1;
  }

  /* ---------- 右侧机坞：滑入式浮层（默认收起，不占主区域） ---------- */
  /* 面 = 拉丝装甲板：斜向高光 + 拉丝 + 内沿暖亮线 + 内框发丝 + 外柔影 */
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
    border-left: 1px solid var(--edge-bronze);
    box-shadow: -16px 0 44px rgba(0, 0, 0, 0.55);
    /* 收起：整体移出屏幕右侧；展开由 .dock-open 打开 */
    transform: translateX(calc(100% + 12px));
    transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }
  .game-screen.dock-open .gs-dock {
    transform: translateX(0);
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
  /* ============================================================
   * 响应式：画布始终铺满，只调整浮层的位置与尺寸
   * （第九轮重写：原来的六套 grid 都在给画布分一块地，现在画布是背景）
   * ============================================================ */

  /* 中等宽度：机坞窄一档（它已是浮层，不影响画布） */
  @media (max-width: 1180px) and (min-width: 901px) {
    .gs-dock {
      width: min(340px, 92vw);
    }
  }

  /* ---------- 手机竖屏：顶栏隐藏（HUD 芯片已在画布上），底部导航浮层 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .gs-hud {
      display: none;
    }

    /* 画布铺满整屏（指令栏与导航都是浮层，压在画布上） */
    .gs-stage {
      padding: 0;
    }

    .gs-nav {
      display: block;
      height: var(--tab-h);
      background: var(--mat-plate);
      border-top: 1px solid var(--edge-bronze);
    }

    .gs-cmd {
      bottom: calc(var(--tab-h) + 8px);
    }

    .gs-dock {
      width: min(100vw, 460px);
      top: auto;
      height: min(62dvh, 520px);
      border-radius: var(--r-md) var(--r-md) 0 0;
      border-left: none;
      border-top: 1px solid var(--edge-bronze);
      transform: translateY(calc(100% + 12px));
    }
    .game-screen.dock-open .gs-dock {
      transform: translateY(0);
    }
    .gs-dock::before,
    .gs-dock::after {
      display: none;
    }

    /* 调参按钮避让底部导航 */
    .dock-toggle {
      right: 12px;
      bottom: calc(var(--cmd-h) + var(--tab-h) + 14px);
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
  }

  /* ---------- 手机横屏：画布铺满，浮层更紧凑 ---------- */
  @media (max-width: 900px) and (orientation: landscape) {
    .gs-hud {
      display: none;
    }

    .gs-stage {
      padding: 0;
    }

    .gs-cmd {
      bottom: 6px;
    }

    .gs-dock {
      width: min(340px, 88vw);
    }

    .dock-toggle {
      right: 10px;
      bottom: calc(var(--cmd-h) + 12px);
      padding: 0 12px;
    }
    .dock-toggle-text {
      display: none;
    }

    .dock-head {
      padding: 6px 10px;
    }
    .dock-title {
      font-size: 13px;
    }
  }

  /* 运行态：调参台自动收起，把画面完全让给游戏 */
  .game-screen.panel-hidden .gs-dock {
    transform: translateX(calc(100% + 12px));
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen.panel-hidden .gs-dock {
      transform: translateY(calc(100% + 12px));
    }
  }

  /* 展开调参台时，按钮变「收起」并让位到面板左侧之外 */
  .game-screen.dock-open .dock-toggle {
    right: calc(min(var(--dock-w), 92vw) + 14px);
  }
  @media (max-width: 1180px) and (min-width: 901px) {
    .game-screen.dock-open .dock-toggle {
      right: calc(min(340px, 92vw) + 14px);
    }
  }
  @media (max-width: 640px) and (orientation: portrait) {
    .game-screen.dock-open .dock-toggle {
      right: 12px;
      bottom: calc(min(62dvh, 520px) + 14px);
    }
  }
</style>
