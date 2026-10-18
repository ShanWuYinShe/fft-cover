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

<!-- 座舱铭牌式提示条：金属面 + 状态灯 + 金色发丝边（替代毛玻璃圆角胶囊） -->
<div class="toast-item toast-{variant}" role="status">
  <span class="toast-lamp g-lamp" aria-hidden="true"></span>
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
    min-height: 44px;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 0.5px;
    background: linear-gradient(180deg, #131d31 0%, #080e1a 100%);
    border: 1px solid var(--edge);
    color: var(--text);
    box-shadow:
      var(--sh-game),
      inset 0 1px 0 rgba(255, 255, 255, 0.07);
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

  .toast-gold {
    border-color: rgba(245, 184, 65, 0.5);
    color: var(--gold-bright);
    box-shadow:
      var(--sh-game),
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 0 18px rgba(245, 184, 65, 0.2);
  }

  .toast-info {
    border-color: rgba(0, 245, 212, 0.45);
    color: var(--cyan);
    box-shadow:
      var(--sh-game),
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 0 18px rgba(0, 245, 212, 0.18);
  }

  .toast-success {
    border-color: rgba(16, 185, 129, 0.5);
    color: #a7f3d0;
    box-shadow:
      var(--sh-game),
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 0 18px rgba(16, 185, 129, 0.18);
  }

  /* 状态灯随变体变色（基础态是金色 .g-lamp） */
  .toast-info .toast-lamp {
    background: var(--cyan);
    box-shadow:
      0 0 8px rgba(0, 245, 212, 0.9),
      inset 0 0 2px #fff;
  }

  .toast-success .toast-lamp {
    background: var(--jade);
    box-shadow:
      0 0 8px rgba(16, 185, 129, 0.9),
      inset 0 0 2px #fff;
  }

  .toast-lamp {
    flex: 0 0 auto;
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
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    cursor: pointer;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }

  .toast-close::after {
    content: '';
    position: absolute;
    inset: -6px;
  }

  .toast-close:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(245, 184, 65, 0.12);
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
