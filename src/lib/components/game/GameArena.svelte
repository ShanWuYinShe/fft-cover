<script lang="ts">
  import Stage from '../Stage.svelte';
  import LevelCrown from './LevelCrown.svelte';
  import CanvasHUD from './CanvasHUD.svelte';
  import PlayControls from './PlayControls.svelte';
  import PauseOverlay from './PauseOverlay.svelte';
  import GuideOverlay from './GuideOverlay.svelte';
  import ResultOverlay from '../ResultOverlay.svelte';
  import EndlessResult from '../EndlessResult.svelte';
  import { engine } from '../../game/engine.svelte';
</script>

<section class="stage-wrap">
  <!-- 关卡天冠顶饰 -->
  <LevelCrown />

  <!-- 浑天璇玑画布基座 -->
  <div
    class="canvas-box"
    class:shake={engine.phase === 'done' && engine.collectedCount === engine.total}
  >
    <span class="stage-bracket tl" aria-hidden="true"></span>
    <span class="stage-bracket tr" aria-hidden="true"></span>
    <span class="stage-bracket bl" aria-hidden="true"></span>
    <span class="stage-bracket br" aria-hidden="true"></span>

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

    <!-- 目标引导与提示 -->
    <GuideOverlay />
  </div>

  <!-- 运行主控制台 -->
  <PlayControls />
</section>

<style>
  .stage-wrap {
    flex: 1 1 760px;
    max-width: 820px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
    align-items: center;
    transition:
      max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      flex 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  }

  .canvas-box {
    position: relative;
    width: min(100%, 780px);
    margin: 0 auto;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 4 隅古青铜角花 */
  .stage-bracket {
    position: absolute;
    width: 20px;
    height: 20px;
    pointer-events: none;
    z-index: 4;
  }
  .stage-bracket.tl {
    top: -2px;
    left: -2px;
    border-top: 3px solid var(--gold-bright);
    border-left: 3px solid var(--gold-bright);
    box-shadow: -2px -2px 6px rgba(245, 184, 65, 0.4);
  }
  .stage-bracket.tr {
    top: -2px;
    right: -2px;
    border-top: 3px solid var(--gold-bright);
    border-right: 3px solid var(--gold-bright);
    box-shadow: 2px -2px 6px rgba(245, 184, 65, 0.4);
  }
  .stage-bracket.bl {
    bottom: -2px;
    left: -2px;
    border-bottom: 3px solid var(--gold-bright);
    border-left: 3px solid var(--gold-bright);
    box-shadow: -2px 2px 6px rgba(245, 184, 65, 0.4);
  }
  .stage-bracket.br {
    bottom: -2px;
    right: -2px;
    border-bottom: 3px solid var(--gold-bright);
    border-right: 3px solid var(--gold-bright);
    box-shadow: 2px 2px 6px rgba(245, 184, 65, 0.4);
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .stage-wrap {
      flex: 0 0 auto;
      width: 100%;
      gap: 6px;
    }
    .canvas-box {
      width: min(96vw, 54vh);
      margin: 0 auto;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .canvas-box {
      width: min(94vw, 48vh);
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 600px) {
    .canvas-box {
      width: min(94vw, 44vh);
    }
  }

  @media (max-width: 900px) and (orientation: landscape) {
    .stage-wrap {
      flex: 0 0 auto;
      justify-content: center;
      width: min(52vw, calc(100dvh - 92px));
      max-width: 52vw;
      min-width: 0;
      position: relative;
    }
    .canvas-box {
      width: min(52vw, calc(100dvh - 110px));
      margin: 0;
    }
  }
</style>
