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
  </div>
</section>

<style>
  /* 舞台：铺满主区域（第九轮）——游戏主区域必须占满，HUD 浮在画布上 */
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

  /* 画布外的一层极淡金雾：让画布「浮」在星云里，而不是贴上去 */
  .stage-wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background: radial-gradient(50% 50% at 50% 50%, var(--gold-dim), transparent 70%);
  }

  /* 顶部/底部渐隐：让浮在上面的 HUD 与指令栏有落脚处，
     不至于直接压在星盘与目标点上（纯装饰，不拦事件） */
  .stage-wrap::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background:
      linear-gradient(180deg, rgba(6, 10, 18, 0.72) 0%, rgba(6, 10, 18, 0) 18%),
      linear-gradient(0deg, rgba(6, 10, 18, 0.68) 0%, rgba(6, 10, 18, 0) 16%);
  }

  /* 画布基座 = 铺满主区域的深井（不再是居中的正方形） */
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

  /* 4 隅古青铜角花 */
  /* 舞台四角：青铜角花 + 内侧云头钩（器物边框语言） */
  .stage-bracket {
    position: absolute;
    width: 20px;
    height: 20px;
    pointer-events: none;
    z-index: 4;
  }
  .stage-bracket::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--bronze-bright);
    border-color: var(--bronze-bright) transparent transparent var(--bronze-bright);
    border-radius: 50% 0 0 0;
    opacity: 0.85;
  }
  .stage-bracket.tl {
    top: -3px;
    left: -3px;
    border-top: 2px solid var(--edge-bronze-hot);
    border-left: 2px solid var(--edge-bronze-hot);
  }
  .stage-bracket.tl::after {
    top: 3px;
    left: 3px;
    transform: rotate(-45deg);
  }
  .stage-bracket.tr {
    top: -3px;
    right: -3px;
    border-top: 2px solid var(--edge-bronze-hot);
    border-right: 2px solid var(--edge-bronze-hot);
  }
  .stage-bracket.tr::after {
    top: 3px;
    right: 3px;
    transform: rotate(45deg) scaleX(-1);
  }
  .stage-bracket.bl {
    bottom: -3px;
    left: -3px;
    border-bottom: 2px solid var(--edge-bronze-hot);
    border-left: 2px solid var(--edge-bronze-hot);
  }
  .stage-bracket.bl::after {
    bottom: 3px;
    left: 3px;
    transform: rotate(-135deg);
  }
  .stage-bracket.br {
    bottom: -3px;
    right: -3px;
    border-bottom: 2px solid var(--edge-bronze-hot);
    border-right: 2px solid var(--edge-bronze-hot);
  }
  .stage-bracket.br::after {
    bottom: 3px;
    right: 3px;
    transform: rotate(135deg) scaleX(-1);
  }

  /* ---------- 手机竖屏：画布同样铺满主区域，只缩小角花 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .stage-bracket {
      width: 16px;
      height: 16px;
    }
  }

  /* 竖屏平板：铺满（原 56dvh 限制已移除） */

  /* 手机横屏：铺满（原 48vw 限制已移除） */
</style>
