<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let {
    open = false,
    side = 'left',
    title,
    width = 'min(440px, 94vw)',
    showClose = true,
    onclose,
    children,
  }: {
    open: boolean;
    side?: 'left' | 'right' | 'bottom';
    title?: string | Snippet;
    width?: string;
    showClose?: boolean;
    onclose?: () => void;
    children?: Snippet;
  } = $props();

  function onKeydown(e: KeyboardEvent): void {
    if (open && e.key === 'Escape' && onclose) {
      e.stopPropagation();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <button type="button" class="drawer-backdrop" aria-label="收起抽屉" onclick={onclose}></button>
{/if}

<aside
  class="drawer-panel drawer-{side}"
  class:open
  style="--drawer-width: {width}"
  aria-hidden={!open}
>
  <!-- 抽屉把手：底部抽屉用一根金属横杆提示“可推回” -->
  {#if side === 'bottom'}
    <span class="drawer-grip" aria-hidden="true"></span>
  {/if}

  {#if title || showClose}
    <div class="drawer-header">
      {#if title}
        <h2 class="drawer-title font-celestial">
          {#if typeof title === 'function'}
            {@render title()}
          {:else}
            {title}
          {/if}
        </h2>
      {/if}
      {#if showClose && onclose}
        <button type="button" class="drawer-close" title="收起" aria-label="收起" onclick={onclose}>
          <Icon name="close" size={16} />
        </button>
      {/if}
    </div>
  {/if}

  <div class="drawer-content">
    {#if children}
      {@render children()}
    {/if}
  </div>
</aside>

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 5, 11, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 55;
    border: none;
    cursor: pointer;
    animation: fade-in 0.2s ease-out;
    padding: 0;
  }

  /* 机箱侧舱：金属面 + 边缘亮金导轨 */
  .drawer-panel {
    position: fixed;
    z-index: 60;
    display: flex;
    flex-direction: column;
    background: linear-gradient(170deg, var(--metal-2) 0%, var(--metal) 55%, #070c16 100%);
    box-shadow: var(--sh-game-lg);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }
  /* 面板内侧的扫描线与暗角：让抽屉像一块插进机箱的舱体 */
  .drawer-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.025) 0px,
      rgba(255, 255, 255, 0.025) 1px,
      transparent 1px,
      transparent 3px
    );
  }

  .drawer-left {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--drawer-width);
    border-right: 1px solid var(--edge);
    transform: translateX(-105%);
  }
  .drawer-left::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent,
      var(--edge-hot) 20%,
      var(--edge-hot) 80%,
      transparent
    );
    opacity: 0.55;
    pointer-events: none;
  }
  .drawer-left.open {
    /* 打开态不保留 transform：否则会给抽屉内的 position:fixed 弹窗
       （如谐波合成器 ComposerModal）制造包含块，弹窗会被压在抽屉里 */
    transform: none;
  }

  .drawer-right {
    top: 0;
    bottom: 0;
    right: 0;
    width: var(--drawer-width);
    border-left: 1px solid var(--edge);
    transform: translateX(105%);
  }
  .drawer-right::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent,
      var(--edge-hot) 20%,
      var(--edge-hot) 80%,
      transparent
    );
    opacity: 0.55;
    pointer-events: none;
  }
  .drawer-right.open {
    transform: none;
  }

  .drawer-bottom {
    left: 0;
    right: 0;
    bottom: 0;
    /* 矮屏也必须留出顶部余量，并保证内容区可滚 */
    max-height: min(85dvh, calc(100dvh - 24px));
    border-top: 1px solid var(--edge);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transform: translateY(105%);
  }
  .drawer-bottom.open {
    transform: none;
  }

  /* 底部抽屉的金属把手 */
  .drawer-grip {
    flex: none;
    align-self: center;
    width: 54px;
    height: 4px;
    margin: 7px 0 2px;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--metal-3), #080d18);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      0 0 8px rgba(245, 184, 65, 0.15);
  }

  /* 抽屉铭牌：小号拉开字距 + 金色发丝下沿 */
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 12px var(--space-4);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.1), rgba(245, 184, 65, 0.015));
    border-bottom: 1px solid var(--edge-soft);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .drawer-title {
    margin: 0;
    min-width: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 2px;
    line-height: 1.3;
  }

  .drawer-close {
    appearance: none;
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-md);
    color: var(--muted);
    border-radius: 10px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .drawer-close:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .drawer-close:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-top);
  }

  .drawer-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-4);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
    position: relative;
    z-index: 1;
  }

  /* 矮屏：收紧内边距 */
  @media (max-height: 480px) {
    .drawer-content {
      padding: 10px var(--space-3);
    }
    .drawer-header {
      padding: 8px var(--space-3);
    }
  }
</style>
