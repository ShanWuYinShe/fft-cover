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

<!-- 降噪版提示条：一层描边 + 一个图标 + 文字（去掉状态灯与外发光） -->
<div class="toast-item toast-{variant}" role="status">
  {#if icon}
    <span class="toast-icon" aria-hidden="true">
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
    <button type="button" class="toast-close" onclick={onclose} aria-label="关闭提示">
      <Icon name="close" size={14} />
    </button>
  {/if}
</div>

<style>
  .toast-item {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-sizing: border-box;
    min-height: 40px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 0.5px;
    background: #0d1626;
    border: 1px solid var(--edge-soft);
    color: var(--text);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    animation: toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* 变体只改描边与文字颜色，不加光晕 */
  .toast-gold {
    border-color: rgba(245, 184, 65, 0.45);
    color: var(--gold-bright);
  }

  .toast-info {
    border-color: rgba(0, 245, 212, 0.4);
    color: var(--cyan);
  }

  .toast-success {
    border-color: rgba(16, 185, 129, 0.45);
    color: #a7f3d0;
  }

  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .toast-content {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* 视觉 30px，热区靠 ::after 外扩到 40×40（绝对定位以 padding box 为基准，
     28px + 上下左右各 6px = 40px），保证点击目标不低于 40px 下限 */
  .toast-close {
    position: relative;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 30px;
    height: 30px;
    margin-left: 2px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      color 0.12s ease,
      border-color 0.12s ease;
  }

  .toast-close::after {
    content: '';
    position: absolute;
    inset: -6px;
  }

  .toast-close:hover {
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }

  .toast-close:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-item {
      animation: none;
    }
  }

  :global(.reduce-motion) .toast-item {
    animation: none;
  }
</style>
