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
