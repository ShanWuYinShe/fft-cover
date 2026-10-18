<script lang="ts">
  import { engine } from '../../game/engine.svelte';

  let { onstart }: { onstart?: () => void } = $props();

  function onDismiss(): void {
    engine.markFlag('tutorialSeen');
    if (onstart) onstart();
  }
</script>

<!-- 注意：根节点必须保留 tutorial 类名（全局快捷键门控依赖它），
     tutorial-backdrop 为原有样式钩子，一并保留 -->
<div class="tutorial tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tut-title">
  <div class="tut-box g-corners">
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>
    <span class="tut-scan g-scanlines" aria-hidden="true"></span>

    <div class="tut-head">
      <span class="g-lamp g-lamp--cyan" aria-hidden="true"></span>
      <span class="g-label">新手引导</span>
    </div>

    <h2 class="font-celestial" id="tut-title">怎么玩？</h2>
    <span class="g-divider"></span>

    <ol class="tut-list">
      <li>在指针面板启用指针并调参——<b>金色虚线</b>是目标曲线，让<b>紫色轨迹</b>贴上去</li>
      <li>点「开始旋转」，指针尖端每扫过一个点就得分，连收有连击加成</li>
      <li>跑完结算星级；卡关就开「频谱对比」看目标的真实傅立叶系数</li>
    </ol>

    <button
      type="button"
      class="g-btn g-btn--primary g-btn--lg tut-start-btn font-celestial"
      onclick={onDismiss}
    >
      开始挑战
    </button>
  </div>
</div>

<style>
  .tutorial-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.25s ease-out;
  }

  /* 座舱铭牌面板：金属面 + 金发丝边 + 四角包边 */
  .tut-box {
    position: relative;
    width: 100%;
    max-width: 460px;
    box-sizing: border-box;
    padding: 16px 22px 20px;
    background: linear-gradient(180deg, rgba(13, 20, 34, 0.98) 0%, rgba(5, 8, 15, 0.99) 100%);
    border: 1px solid var(--edge);
    border-radius: 14px;
    box-shadow:
      var(--sh-game-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    animation: tut-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 面板顶部一条亮金发丝线 */
  .tut-box::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 18%,
      var(--edge-hot) 82%,
      transparent
    );
    opacity: 0.7;
    pointer-events: none;
  }

  @keyframes tut-pop {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .tut-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0.5;
  }

  .tut-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
  }

  .tut-box h2 {
    margin: 0;
    font-size: var(--fs-xl);
    color: var(--gold-bright);
    letter-spacing: 2px;
    text-align: center;
    text-shadow: 0 0 18px rgba(245, 184, 65, 0.35);
  }

  .tut-list {
    margin: 14px 0 18px;
    padding-left: 1.6em;
    color: var(--text);
    font-size: var(--fs-md);
    line-height: 1.75;
    list-style: decimal;
  }

  /* 序号做成金色刻印，保留原生编号语义（读屏仍播报第几条） */
  .tut-list li::marker {
    color: var(--gold);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .tut-list li {
    margin-bottom: var(--space-3);
    padding-left: 2px;
  }

  .tut-list b {
    color: var(--gold-bright);
  }

  /* 主按钮整行宽，金色厚键（尺寸/按压反馈来自全局 .g-btn） */
  .tut-box .tut-start-btn {
    width: 100%;
    letter-spacing: 6px;
  }

  @media (max-width: 640px) {
    .tut-box {
      padding: 14px 16px 16px;
    }

    .tut-box h2 {
      font-size: 18px;
    }

    .tut-list {
      padding-left: 1.4em;
      font-size: var(--fs-sm);
      line-height: 1.7;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tutorial-backdrop,
    .tut-box {
      animation: none;
    }
  }

  :global(.reduce-motion) .tut-box,
  :global(.reduce-motion) .tutorial-backdrop {
    animation: none;
  }
</style>
