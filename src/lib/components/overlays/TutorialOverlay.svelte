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
      <!-- 「开始调参」而非「开始挑战」：这个按钮只关闭教学回到调参态
           （教学挂载时没接 onstart，不真正开跑）——标签要承诺它做得到的事 -->
      开始调参
    </button>
  </div>
</div>

<style>
  .tutorial-backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim-strong);
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.25s ease-out;
  }

  /* 三步卡：白卡厚边，内部每条步骤也是白卡面 */
  .tut-box::before {
    content: none;
  }

  .tut-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    max-width: 440px;
    box-sizing: border-box;
    padding: 22px 22px 18px;
    background: var(--mat-plate);
    border: 3px solid #ffffff;
    border-radius: var(--r-xl);
    box-shadow: var(--sh-3);
    animation: tut-pop 0.32s cubic-bezier(0.16, 1, 0.3, 1) backwards;
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
    font-size: 22px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: 1px;
    text-align: center;
  }

  /* 三步：每一步一张白卡 + 珊瑚序号圆牌 */
  .tut-list {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: tut-step;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--text);
  }

  .tut-list li {
    position: relative;
    counter-increment: tut-step;
    padding: 10px 12px 10px 44px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
    animation: tut-step-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .tut-list li::before {
    content: counter(tut-step);
    position: absolute;
    left: 12px;
    top: 50%;
    width: 22px;
    height: 22px;
    margin-top: -11px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--coral);
    color: #ffffff;
    font-size: 12px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
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

  /* 唯一的主操作：整行珊瑚按钮（尺寸/按压反馈来自全局 .g-btn） */
  .tut-box .tut-start-btn {
    width: 100%;
    min-height: var(--ctl-lg);
    margin-top: 2px;
    font-size: calc(var(--ctl-font) + 2px);
    letter-spacing: 1px;
    /* 主按钮最后落位 */
    animation: tut-step-in 240ms cubic-bezier(0.16, 1, 0.3, 1) 340ms backwards;
  }

  @media (max-width: 640px) {
    .tut-box {
      padding: 18px 18px 16px;
    }

    .tut-box h2 {
      font-size: 20px;
    }

    .tut-list li {
      font-size: 13.5px;
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
