<script lang="ts">
  import Stage from '../Stage.svelte';
  import StageIntro from './StageIntro.svelte';
  import LevelCrown from './LevelCrown.svelte';
  import CanvasHUD from './CanvasHUD.svelte';
  import PauseOverlay from './PauseOverlay.svelte';
  import GuideOverlay from './GuideOverlay.svelte';
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

    <!-- 关卡入场卡（1.4s 自动淡出） -->
    <StageIntro />

    <!-- 目标引导与提示 -->
    <GuideOverlay />
  </div>
</section>

<style>
  /* 舞台：画布吃满机坞左侧的可用高度 */
  .stage-wrap {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
  }

  .canvas-box {
    position: relative;
    flex: 0 0 auto;
    /* 视口高 - 顶栏 - 指令栏 - 缎带与间隙 —— 剩下的都留给画布 */
    width: min(100%, calc(100dvh - var(--hud-h) - var(--cmd-h) - 60px));
    max-width: 100%;
    margin: 0 auto;
  }

  /* 4 隅古青铜角花 */
  .stage-bracket {
    position: absolute;
    width: 22px;
    height: 22px;
    pointer-events: none;
    z-index: 4;
  }
  .stage-bracket.tl {
    top: -3px;
    left: -3px;
    border-top: 2px solid var(--gold-bright);
    border-left: 2px solid var(--gold-bright);
  }
  .stage-bracket.tr {
    top: -3px;
    right: -3px;
    border-top: 2px solid var(--gold-bright);
    border-right: 2px solid var(--gold-bright);
  }
  .stage-bracket.bl {
    bottom: -3px;
    left: -3px;
    border-bottom: 2px solid var(--gold-bright);
    border-left: 2px solid var(--gold-bright);
  }
  .stage-bracket.br {
    bottom: -3px;
    right: -3px;
    border-bottom: 2px solid var(--gold-bright);
    border-right: 2px solid var(--gold-bright);
  }

  /* ---------- 手机竖屏：画布按视口高与宽取小，机坞面板留在下方 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .stage-wrap {
      flex: 0 0 auto;
      justify-content: flex-start;
      gap: 4px;
    }
    .canvas-box {
      width: min(94vw, 40dvh);
    }
    .stage-bracket {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 720px) {
    .canvas-box {
      width: min(92vw, 34dvh);
    }
  }

  /* ---------- 竖屏平板（641–900px）：画布按视口高占比收一收，给机坞留空间 ---------- */
  @media (min-width: 641px) and (max-width: 900px) and (orientation: portrait) {
    .stage-wrap {
      flex: 0 0 auto;
      justify-content: flex-start;
      width: 100%;
    }
    .canvas-box {
      width: min(100%, 56dvh);
    }
  }

  /* ---------- 手机横屏：画布占左侧 52vw ---------- */
  @media (max-width: 900px) and (orientation: landscape) {
    .stage-wrap {
      justify-content: center;
      gap: 4px;
      width: 100%;
    }
    .canvas-box {
      width: min(48vw, calc(100dvh - 130px));
    }
  }
</style>
