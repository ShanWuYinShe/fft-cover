<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let {
    icon,
    message,
    variant = 'gold',
    showClose = false,
    onclose,
    children,
  }: {
    icon?: string;
    message?: string;
    variant?: 'info' | 'success' | 'gold';
    showClose?: boolean;
    onclose?: () => void;
    children?: Snippet;
  } = $props();
</script>

<div class="toast-item toast-{variant}" role="status">
  {#if icon}
    <span class="toast-icon">
      <Icon name={icon} size={15} />
    </span>
  {/if}
  <span class="toast-content">
    {#if message}
      {message}
    {:else if children}
      {@render children()}
    {/if}
  </span>
  {#if showClose && onclose}
    <button type="button" class="toast-close" onclick={onclose} aria-label="关闭提示"> ✕ </button>
  {/if}
</div>

<style>
  .toast-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    font-size: var(--fs-sm);
    font-weight: 500;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    animation: guide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-gold {
    background: linear-gradient(180deg, rgba(20, 28, 48, 0.95), rgba(10, 16, 28, 0.98));
    border: 1px solid rgba(245, 184, 65, 0.45);
    color: var(--gold-bright);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 16px rgba(245, 184, 65, 0.2);
  }

  .toast-info {
    background: linear-gradient(180deg, rgba(16, 28, 44, 0.95), rgba(8, 16, 26, 0.98));
    border: 1px solid rgba(0, 245, 212, 0.4);
    color: var(--cyan);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 16px rgba(0, 245, 212, 0.15);
  }

  .toast-success {
    background: linear-gradient(180deg, rgba(16, 36, 28, 0.95), rgba(8, 20, 16, 0.98));
    border: 1px solid rgba(16, 185, 129, 0.45);
    color: #a7f3d0;
  }

  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .toast-close {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: var(--fs-xs);
    cursor: pointer;
    padding: 0 0 0 var(--space-2);
    line-height: 1;
  }
  .toast-close:hover {
    color: var(--text);
  }
</style>
