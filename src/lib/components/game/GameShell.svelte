<script lang="ts">
  import TopBar from './TopBar.svelte';
  import MobileNav from './MobileNav.svelte';
  import StarmapDrawer from './StarmapDrawer.svelte';
  import GameArena from './GameArena.svelte';
  import ArmPanel from '../ArmPanel.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import { screenReader } from '../../stores/screenReader.svelte';

  const onArmCount = $derived(engine.arms.filter((a) => a.on).length);
</script>

<!-- 深曜苍穹背景光环 -->
<div class="celestial-deep-cosmos" aria-hidden="true">
  <div class="armillary-meridian-ring ring-1"></div>
  <div class="armillary-meridian-ring ring-2"></div>
</div>

<!-- 顶部座舱天穹 HUD -->
<TopBar />

<!-- 读屏实时播报 -->
<div class="sr-only" role="status" aria-live="polite">{screenReader.srLive}</div>

<!-- 游戏主舞台与操作台 -->
<main
  data-tab={uiState.mobileTab}
  class:panel-expanded={uiState.panelExpanded}
  class:panel-hidden={engine.phase === 'running'}
  class:starmap-open={uiState.starMapOpen}
>
  <!-- 画布核心竞技台 (包含天冠、画布视口、HUD、控制台、弹层) -->
  <GameArena />

  <!-- 侧边栏与操舵台中枢 -->
  <div class="sides" class:starmap-open={uiState.starMapOpen}>
    <aside class="side side-right arm-console-wing">
      <section class="sec-arms console-deck">
        <div class="console-deck-header">
          <div class="deck-title-wrap">
            <span class="deck-badge font-celestial">璇玑中枢</span>
            <h2 class="deck-title font-celestial">十方星宿律柱</h2>
          </div>
          <div
            class="deck-capacity-pips"
            title="本关最多启用 {engine.level?.armLimit ?? 10} 根指针"
          >
            {#each Array(engine.level?.armLimit ?? 10) as _, idx}
              <span class="cap-pip" class:filled={idx < onArmCount}>◆</span>
            {/each}
            <span class="cap-num font-tabular">{onArmCount}/{engine.level?.armLimit ?? 10}</span>
          </div>
        </div>
        {#if engine.autoSolve}
          <p class="fitting-tip">🪄 自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
        {/if}
        <ArmPanel />
      </section>
    </aside>
  </div>
</main>

<!-- 周天星图抽屉 -->
<StarmapDrawer />

<!-- 移动端底部切换条 -->
<MobileNav />

<style>
  .celestial-deep-cosmos {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    background:
      radial-gradient(
        ellipse 90% 80% at 50% 20%,
        rgba(13, 20, 36, 0.95) 0%,
        rgba(4, 6, 12, 1) 100%
      ),
      radial-gradient(circle at 80% 80%, rgba(245, 184, 65, 0.03) 0%, transparent 50%);
  }
  .armillary-meridian-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    border: 1px dashed rgba(245, 184, 65, 0.06);
    pointer-events: none;
  }
  .armillary-meridian-ring.ring-1 {
    width: 900px;
    height: 900px;
    margin-top: -450px;
    margin-left: -450px;
    animation: slow-celestial-spin 240s linear infinite;
    border-color: rgba(245, 184, 65, 0.05);
  }
  .armillary-meridian-ring.ring-2 {
    width: 1200px;
    height: 1200px;
    margin-top: -600px;
    margin-left: -600px;
    animation: slow-celestial-spin 360s linear infinite reverse;
    border: 1px solid rgba(0, 245, 212, 0.03);
  }
  @keyframes slow-celestial-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  main {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 24px;
    max-width: 1320px;
    margin: 10px auto 0;
    padding: 8px 16px 36px;
    width: 100%;
    transition:
      max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      padding 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sides {
    display: contents;
  }

  .arm-console-wing {
    flex: 0 1 400px;
    max-width: 440px;
    min-width: 290px;
  }
  .console-deck {
    background: linear-gradient(170deg, rgba(16, 23, 40, 0.98), rgba(8, 12, 22, 0.99));
    border: 1px solid rgba(245, 184, 65, 0.35);
    border-radius: 16px;
    padding: 14px 16px;
    box-shadow:
      0 16px 44px rgba(0, 0, 0, 0.7),
      inset 0 0 30px rgba(245, 184, 65, 0.05);
  }
  .console-deck-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(245, 184, 65, 0.18);
  }
  .deck-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .deck-badge {
    font-size: 10px;
    background: rgba(245, 184, 65, 0.15);
    color: var(--gold-bright);
    border: 1px solid rgba(245, 184, 65, 0.35);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
  }
  .deck-title {
    margin: 0;
    font-size: 17px;
    color: #fff;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .deck-capacity-pips {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .cap-pip {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.15);
    transition: all 0.2s ease;
  }
  .cap-pip.filled {
    color: var(--cyan);
    text-shadow: 0 0 8px var(--cyan);
  }
  .cap-num {
    font-size: 12px;
    color: var(--gold-bright);
    margin-left: 6px;
    font-weight: 700;
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

  @media (max-width: 1180px) {
    main {
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
    }
    .arm-console-wing {
      width: 100%;
      max-width: 680px;
    }
  }

  @media (max-width: 640px) {
    main {
      margin-top: 4px;
      padding: 0 8px 64px;
      gap: 8px;
    }
    .arm-console-wing {
      max-width: 100%;
    }
    main[data-tab='starmap'] .arm-console-wing {
      display: none;
    }
    main[data-tab='arms'] .arm-console-wing {
      display: block;
    }
    main.panel-hidden .arm-console-wing {
      display: none;
    }
  }
</style>
