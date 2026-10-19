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
  <!-- 抽屉把手：底部抽屉用一根金属横杆提示“可推回” -->
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
    background: rgba(3, 5, 11, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 55;
    border: none;
    cursor: pointer;
    animation: fade-in 0.2s ease-out;
    padding: 0;
  }

  /* 侧舱 = 器物面板：青铜边 + 内侧暗线（右上角包角来自 .g-rivets::after） */
  .drawer-panel {
    position: fixed;
    z-index: 60;
    display: flex;
    flex-direction: column;
    background: var(--face-plate);
    box-shadow:
      inset 0 0 0 1px var(--edge-inner),
      0 4px 8px rgba(0, 0, 0, 0.5);
    transition:
      transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0.32s;
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
    border-right: 1px solid var(--edge-bronze);
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
    border-left: 1px solid var(--edge-bronze);
    transform: translateX(105%);
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
    border-top: 1px solid var(--edge-soft);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transform: translateY(105%);
  }
  .drawer-bottom.open {
    transform: none;
  }

  /* 底部抽屉的把手 */
  .drawer-grip {
    flex: none;
    align-self: center;
    width: 54px;
    height: 4px;
    margin: 7px 0 2px;
    border-radius: 2px;
    background: var(--metal-3);
  }

  /* 抽屉标题条：回纹发丝 + 左侧金牌块 + 铜线分隔 */
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 12px var(--space-3) 10px 16px;
    border-bottom: 1px solid var(--edge-bronze);
    background-color: rgba(0, 0, 0, 0.18);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  /* 标题条 = 黄铜铭牌（不再叠回纹；拉丝由 --plate-brass 自带） */
  .drawer-header.g-pattern-bar {
    background: var(--plate-brass);
  }
  .drawer-header::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 9px;
    bottom: 9px;
    width: 3px;
    border-radius: 1px;
    background: linear-gradient(180deg, var(--gold-bright), var(--bronze) 70%, var(--bronze-deep));
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.35);
  }

  .drawer-title {
    margin: 0;
    min-width: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 2px;
    line-height: 1.3;
  }

  /* 收起键：socket 键帽（形与四态走 .g-btn--icon） */
  .drawer-close {
    flex: none;
    color: var(--gold);
  }
  .drawer-close:hover {
    color: var(--gold-bright);
  }

  .drawer-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-3);
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
