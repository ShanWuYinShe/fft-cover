<script lang="ts">
  import Stage from '../Stage.svelte';
  import StageIntro from './StageIntro.svelte';
  import LevelCrown from './LevelCrown.svelte';
  import CanvasHUD from './CanvasHUD.svelte';
  import PauseOverlay from './PauseOverlay.svelte';
  import ResultOverlay from '../ResultOverlay.svelte';
  import EndlessResult from '../EndlessResult.svelte';
  import { engine } from '../../game/engine.svelte';
</script>

<section class="stage-wrap">
  <!-- 关卡天冠缎带 -->
  <LevelCrown />

  <!-- 浑天璇玑画布基座 -->
  <div
    class="canvas-box"
    class:shake={engine.phase === 'done' && engine.collectedCount === engine.total}
  >
    <!-- 核心渲染视口 -->
    <Stage />

    <!-- 顶部 HUD 叠层 -->
    <CanvasHUD />

    <!-- 暂停决策菜单 -->
    {#if engine.phase === 'paused' && !engine.sandbox}
      <PauseOverlay />
    {/if}

    <!-- 结算卡 -->
    {#if engine.phase === 'done' && !engine.resultDismissed}
      {#if engine.endless}
        <EndlessResult />
      {:else}
        <ResultOverlay />
      {/if}
    {/if}

    <!-- 关卡入场卡（1.4s 自动淡出） -->
    <StageIntro />
  </div>
</section>

<style>
  /* ============================================================
   * 舞台（第十四轮）：画布铺满整屏，HUD 浮在上面
   * 取消四角包边与暗角渐隐（明亮卡通不需要器物边框）
   * ============================================================ */
  .stage-wrap {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    gap: 0;
    box-sizing: border-box;
  }

  /* 画布基座 = 铺满主区域的天空底 */
  .canvas-box {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    overflow: hidden;
    border-radius: 0;
    box-shadow: none;
  }

  /* 通关震屏：小幅度、快衰减（浅底上不晃眼） */
  .canvas-box.shake {
    animation: stage-shake 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  @keyframes stage-shake {
    0%,
    100% {
      transform: translate3d(0, 0, 0);
    }
    18% {
      transform: translate3d(-4px, 2px, 0);
    }
    38% {
      transform: translate3d(3px, -2px, 0);
    }
    58% {
      transform: translate3d(-2px, 1px, 0);
    }
    78% {
      transform: translate3d(1px, -1px, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .canvas-box.shake {
      animation: none;
    }
  }
  :global(.reduce-motion) .canvas-box.shake {
    animation: none;
  }
</style>
