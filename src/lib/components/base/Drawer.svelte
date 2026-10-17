<script lang="ts">
  import type { Snippet } from 'svelte';

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
  <button
    type="button"
    class="drawer-backdrop"
    aria-label="收起抽屉"
    onclick={onclose}
  ></button>
{/if}

<aside
  class="drawer-panel drawer-{side}"
  class:open
  style="--drawer-width: {width}"
  aria-hidden={!open}
>
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
        <button
          type="button"
          class="drawer-close"
          title="收起"
          aria-label="收起"
          onclick={onclose}
        >
          ✕
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
    background: rgba(4, 6, 12, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 55;
    border: none;
    cursor: pointer;
    animation: fade-in 0.2s ease-out;
    padding: 0;
  }

  .drawer-panel {
    position: fixed;
    z-index: 60;
    background: linear-gradient(170deg, rgba(16, 23, 40, 0.98), rgba(8, 12, 22, 0.99));
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .drawer-left {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--drawer-width);
    border-right: 1px solid rgba(245, 184, 65, 0.4);
    transform: translateX(-105%);
  }
  .drawer-left.open {
    transform: translateX(0);
  }

  .drawer-right {
    top: 0;
    bottom: 0;
    right: 0;
    width: var(--drawer-width);
    border-left: 1px solid rgba(245, 184, 65, 0.4);
    transform: translateX(105%);
  }
  .drawer-right.open {
    transform: translateX(0);
  }

  .drawer-bottom {
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 85vh;
    border-top: 1px solid rgba(245, 184, 65, 0.4);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    transform: translateY(105%);
  }
  .drawer-bottom.open {
    transform: translateY(0);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--line);
    background: rgba(245, 184, 65, 0.04);
    flex-shrink: 0;
  }

  .drawer-title {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 2px;
  }

  .drawer-close {
    appearance: none;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--muted);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-sm);
    transition: all 0.15s ease;
  }
  .drawer-close:hover {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.1);
  }

  .drawer-content {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: var(--space-4);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.3) transparent;
  }
</style>
