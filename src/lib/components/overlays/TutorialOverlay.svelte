<script lang="ts">
  import { engine } from '../../game/engine.svelte';

  let { onstart }: { onstart?: () => void } = $props();

  function onDismiss(): void {
    engine.markFlag('tutorialSeen');
    if (onstart) onstart();
  }
</script>

<!-- 注意：根节点必须保留 tutorial 类名（全局快捷键门控依赖它），
     tutorial-backdrop 为原有样式钩子，一并保留。
     降噪版：一张平静的三步卡，只有一个金色主按钮，无包边/扫描线 -->
<div class="tutorial tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tut-title">
  <div class="tut-box g-chamfer g-rivets">
    <h2 id="tut-title">怎么玩？</h2>

    <ol class="tut-list">
      <li>调半径，让紫色轨迹贴上金色虚线</li>
      <li>点「开始旋转」，指针扫过点就能收</li>
      <li>收得越多，结算的星越多</li>
    </ol>

    <button type="button" class="g-btn g-btn--primary tut-start-btn" onclick={onDismiss}>
      开始挑战
    </button>
  </div>
</div>

<style>
  .tutorial-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.82);
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.25s ease-out;
  }

  /* 平静的面板：一层描边 + 一点留白，不堆装饰 */
  .tut-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 400px;
    box-sizing: border-box;
    padding: 18px 20px 16px;
    /* 切角铜边 + 面来自 .g-chamfer，四角铆钉来自 .g-rivets */
    /* 入场：0.96 → 1 缩放 + 淡入（320ms），结束后不留 transform */
    animation: tut-pop 320ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes tut-pop {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .tut-box h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 1px;
    text-align: center;
  }

  /* 三步：一行一步，匿名序号用金色数字（读屏仍播报第几条） */
  .tut-list {
    margin: 0;
    padding-left: 1.5em;
    color: var(--text);
    font-size: var(--ctl-font);
    line-height: 1.55;
    list-style: decimal;
  }

  /* 三步逐条淡入：60ms 错峰 */
  .tut-list li {
    margin-bottom: 4px;
    animation: tut-step-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .tut-list li:nth-child(1) {
    animation-delay: 140ms;
  }

  .tut-list li:nth-child(2) {
    animation-delay: 200ms;
  }

  .tut-list li:nth-child(3) {
    animation-delay: 260ms;
  }

  @keyframes tut-step-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .tut-list li:last-child {
    margin-bottom: 0;
  }

  .tut-list li::marker {
    color: var(--gold);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* 唯一的主操作：整行金色按钮（尺寸/按压反馈来自全局 .g-btn） */
  .tut-box .tut-start-btn {
    width: 100%;
    /* 主操作档：桌面 40 / 触屏 46 */
    min-height: var(--ctl-lg);
    margin-top: 2px;
    font-size: calc(var(--ctl-font) + 2px);
    letter-spacing: 1.5px;
    /* 主按钮最后落位 */
    animation: tut-step-in 240ms cubic-bezier(0.16, 1, 0.3, 1) 340ms backwards;
  }

  @media (max-width: 640px) {
    .tut-box {
      padding: 18px 18px 16px;
    }

    .tut-box h2 {
      font-size: 17px;
    }

    .tut-list {
      font-size: var(--ctl-font-sm);
      line-height: 1.55;
    }
  }

  /* 减弱动态效果：位移/缩放全关，元素直接落在最终态 */
  @media (prefers-reduced-motion: reduce) {
    .tutorial-backdrop,
    .tut-box,
    .tut-list li,
    .tut-box .tut-start-btn {
      animation: none;
    }
  }

  :global(.reduce-motion) .tut-box,
  :global(.reduce-motion) .tutorial-backdrop,
  :global(.reduce-motion) .tut-list li,
  :global(.reduce-motion) .tut-box .tut-start-btn {
    animation: none;
  }
</style>
