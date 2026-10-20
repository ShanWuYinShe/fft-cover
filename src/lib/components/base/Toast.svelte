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

<!-- 提示条：白卡厚边 + 图标槽 + 文字（糖果配色，无模糊/发光）
     动效：滑入 -12px→0（240ms）+ 图标弹一下，退场反向且快 30% -->
<div class="toast-item g-chamfer toast-{variant}" class:closing bind:this={itemEl} role="status">
  {#if icon}
    <span class="toast-icon g-socket" aria-hidden="true">
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
  /* 提示条：白卡 + 3px 白边 + 圆角 + 硬投影，文案 14px */
  .toast-item {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-sizing: border-box;
    min-height: var(--ctl-lg);
    padding: 9px 14px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.3px;
    line-height: 1.45;
    color: var(--text);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    border-radius: var(--r-md);
    box-shadow: var(--sh-2);
    /* backwards：只在动画期间生效，结束后不留 transform */
    animation: toast-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  /* 覆盖 .g-chamfer 的双层底：这里只要一张白卡 */
  .toast-item::before {
    content: none;
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

  /* 图标弹一下：1 → 1.08 → 1（进场后 120ms 起） */
  .toast-icon {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
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
      transform: scale(1.08);
    }
    100% {
      transform: scale(1);
    }
  }

  /* 变体只换图标槽的糖果底色，字色始终是深蓝（白底可读） */
  .toast-gold .toast-icon {
    background: var(--coral-dim);
    color: var(--coral-text);
  }

  .toast-info .toast-icon {
    background: var(--sky-dim);
    color: var(--sky-deep);
  }

  .toast-success .toast-icon {
    background: var(--mint-dim);
    color: var(--mint-edge);
  }

  .toast-content {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* 关闭键：可见 30px，热区靠 ::after 外扩 9px（≥48px 命中区） */
  .toast-close {
    position: relative;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: var(--ctl-sm);
    height: var(--ctl-sm);
    margin-left: 2px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      color 0.12s ease,
      background 0.12s ease,
      transform 90ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toast-close::after {
    content: '';
    position: absolute;
    inset: -9px;
  }

  .toast-close:hover {
    color: var(--coral-text);
    background: var(--line-2);
  }

  .toast-close:active {
    transform: scale(0.97);
  }

  .toast-close:focus-visible {
    outline: 3px solid var(--sky-deep);
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
