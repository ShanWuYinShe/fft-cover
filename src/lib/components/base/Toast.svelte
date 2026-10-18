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

  let itemEl: HTMLDivElement | undefined = $state();
  /** 退场中：先播反向动画，动画结束再通知父组件移除 */
  let closing = $state(false);
  let notified = false;

  /** 是否处于「减弱动态效果」：是则跳过退场动画直接移除 */
  function prefersReducedMotion(): boolean {
    const byClass = document.documentElement.classList.contains('reduce-motion');
    const byMedia =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return byClass || byMedia;
  }

  /** 关闭：退场动画比进场快 30%（240ms → 168ms），结束后再回调移除 */
  function requestClose(): void {
    if (notified) return;
    if (prefersReducedMotion()) {
      notified = true;
      onclose?.();
      return;
    }
    closing = true;
    const finish = (): void => {
      if (notified) return;
      notified = true;
      onclose?.();
    };
    itemEl?.addEventListener('animationend', finish, { once: true });
    // 兜底：动画被打断/跳过时也要移除，避免卡在退场态
    setTimeout(finish, 260);
  }
</script>

<!-- 降噪版提示条：一层描边 + 一个图标 + 文字（去掉状态灯与外发光）
     动效：滑入 -12px→0（240ms）+ 图标弹一下，退场反向且快 30% -->
<div class="toast-item toast-{variant}" class:closing bind:this={itemEl} role="status">
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
    <button type="button" class="toast-close" onclick={requestClose} aria-label="关闭提示">
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
    /* 桌面 30 / 触屏 42 */
    min-height: var(--ctl-md);
    padding: 5px 12px;
    border-radius: var(--ctl-radius);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    letter-spacing: 0.5px;
    background: #0d1626;
    border: 1px solid var(--edge-soft);
    color: var(--text);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    /* backwards：只在动画期间生效，结束后不留 transform */
    animation: toast-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* 退场：反向滑出，时长是进场的 70% */
  .toast-item.closing {
    animation: toast-out 168ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
  }

  @keyframes toast-out {
    from {
      opacity: 1;
      transform: none;
    }
    to {
      opacity: 0;
      transform: translateY(-12px);
    }
  }

  /* 图标弹一下：1 → 1.15 → 1（进场后 120ms 起） */
  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    animation: toast-icon-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 120ms backwards;
  }

  .toast-icon :global(svg) {
    width: var(--ctl-icon-sm);
    height: var(--ctl-icon-sm);
  }

  @keyframes toast-icon-pop {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.15);
    }
    100% {
      transform: scale(1);
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

  .toast-content {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* 视觉 --ctl-xs（桌面 22 / 触屏 32），热区靠 ::after 外扩 9px：
     22 + 18 = 40px（触屏 32 + 18 = 50px），点击目标始终不低于 40px */
  .toast-close {
    position: relative;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--ctl-xs);
    height: var(--ctl-xs);
    margin-left: 2px;
    border-radius: var(--ctl-radius);
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      transform 90ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-close::after {
    content: '';
    position: absolute;
    inset: -9px;
  }

  .toast-close:hover {
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }

  .toast-close:active {
    transform: scale(0.97);
  }

  .toast-close:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 2px;
  }

  /* ---------- 减弱动态效果：只留瞬时状态变化 ---------- */
  @media (prefers-reduced-motion: reduce) {
    .toast-item,
    .toast-icon {
      animation: none;
    }

    .toast-close {
      transition: none;
    }

    .toast-close:active {
      transform: none;
    }
  }

  :global(.reduce-motion) .toast-item,
  :global(.reduce-motion) .toast-icon {
    animation: none;
  }

  :global(.reduce-motion) .toast-close {
    transition: none;
  }

  :global(.reduce-motion) .toast-close:active {
    transform: none;
  }
</style>
