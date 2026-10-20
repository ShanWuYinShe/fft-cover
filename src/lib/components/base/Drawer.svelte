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
  class="drawer-panel g-rivets drawer-{side}"
  class:open
  style="--drawer-width: {width}"
  aria-hidden={!open}
>
  <!-- 抽屉把手：底部抽屉用一根糖果条提示“可推回” -->
  {#if side === 'bottom'}
    <span class="drawer-grip" aria-hidden="true"></span>
  {/if}

  {#if title || showClose}
    <div class="drawer-header g-pattern-bar">
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
        <button
          type="button"
          class="drawer-close g-btn g-btn--icon"
          title="收起"
          aria-label="收起"
          onclick={onclose}
        >
          <Icon name="close" size={15} />
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
    background: var(--scrim);
    z-index: 55;
    border: none;
    cursor: pointer;
    animation: fade-in 0.2s ease-out;
    padding: 0;
  }

  /* 侧舱 = 白卡厚板：白面 + 3px 白边 + 大硬投影 */
  .drawer-panel {
    position: fixed;
    z-index: 60;
    display: flex;
    flex-direction: column;
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow: var(--sh-3);
    transition:
      transform 0.26s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0.26s;
    /* 收起时彻底不可见、不可聚焦（否则键盘仍能 Tab 进离屏抽屉） */
    visibility: hidden;
  }
  .drawer-panel.open {
    visibility: visible;
  }

  .drawer-left {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--drawer-width);
    border-radius: 0 var(--r-lg) var(--r-lg) 0;
    transform: translateX(-105%);
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
    border-radius: var(--r-lg) 0 0 var(--r-lg);
    transform: translateX(105%);
  }
  .drawer-right.open {
    transform: none;
  }

  .drawer-bottom {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: min(85dvh, calc(100dvh - 24px));
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    transform: translateY(105%);
  }
  .drawer-bottom.open {
    transform: none;
  }

  /* 底部抽屉的把手：薄荷糖果条 */
  .drawer-grip {
    flex: none;
    align-self: center;
    width: 54px;
    height: 5px;
    margin: 9px 0 3px;
    border-radius: var(--r-pill);
    background: var(--line-bright);
  }

  /* 抽屉标题条：白卡面 + 珊瑚铭牌条 + 浅蓝发丝线 */
  .drawer-header,
  .drawer-header.g-pattern-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 14px 14px 12px 24px;
    background: var(--mat-block);
    border-bottom: 2px solid var(--line);
    box-shadow: none;
    flex-shrink: 0;
  }

  .drawer-header::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 16px;
    bottom: 14px;
    width: 5px;
    border-radius: var(--r-pill);
    background: var(--coral);
  }

  .drawer-title {
    margin: 0;
    min-width: 0;
    font-family: var(--font-round);
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1.3;
    color: var(--text);
  }

  /* 收起键：白面圆键（形与四态走 .g-btn--icon） */
  .drawer-close {
    flex: none;
    color: var(--muted);
  }
  .drawer-close:hover {
    color: var(--coral-text);
  }

  .drawer-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3);
    background: var(--bg-chassis);
    scrollbar-width: thin;
    scrollbar-color: #b6dcf2 transparent;
  }

  /* 矮屏：收紧内边距 */
  @media (max-height: 480px) {
    .drawer-content {
      padding: 10px var(--space-3);
    }
    .drawer-header {
      padding: 9px 12px 8px 22px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer-panel,
    .drawer-backdrop {
      transition: none;
      animation: none;
    }
  }

  :global(.reduce-motion) .drawer-panel,
  :global(.reduce-motion) .drawer-backdrop {
    transition: none;
    animation: none;
  }
</style>
