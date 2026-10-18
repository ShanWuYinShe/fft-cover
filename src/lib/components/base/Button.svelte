<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  // 注意：props API 由契约锁定（C/D 也在用），只改外观不改签名。
  let {
    variant = 'outline',
    size = 'md',
    icon,
    iconSize,
    title,
    disabled = false,
    active = false,
    class: customClass = '',
    ariaLabel,
    onclick,
    children,
  }: {
    variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    iconSize?: number;
    title?: string;
    disabled?: boolean;
    active?: boolean;
    class?: string;
    ariaLabel?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  const computedIconSize = $derived(iconSize ?? (size === 'sm' ? 13 : size === 'lg' ? 18 : 15));
</script>

<button
  type="button"
  class="btn btn-{variant} btn-{size} {customClass}"
  class:active
  {title}
  {disabled}
  aria-label={ariaLabel}
  {onclick}
>
  {#if icon}
    <span class="btn-icon">
      <Icon name={icon} size={computedIconSize} />
    </span>
  {/if}
  {#if children}
    <span class="btn-text">
      {@render children()}
    </span>
  {/if}
</button>

<style>
  /* ============================================================
   * 按键：保留「有厚度」的立体感（渐变面 + 上高光 + 硬投影 + 按下位移），
   * 但**取消外发光**——本轮发光只留给 primary 与 active 选中态。
   * ============================================================ */
  .btn {
    appearance: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    box-sizing: border-box;
    /* 默认档：桌面 30 / 触屏 42（档位只由 pointer: coarse 决定） */
    min-height: var(--ctl-md);
    padding: 0 12px;
    border-radius: var(--ctl-radius);
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    color: var(--text);
    font-family: inherit;
    font-size: var(--ctl-font);
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    text-decoration: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      box-shadow 0.12s ease,
      filter 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease,
      background 0.12s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 2px;
  }

  /* 按下：下沉 1px + 回弹缩放 0.97，阴影收紧（90ms，无外发光） */
  .btn:active:not(:disabled) {
    transform: translateY(1px) scale(0.97);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.6),
      0 1px 0 rgba(0, 0, 0, 0.45);
  }

  .btn:disabled {
    opacity: 0.42;
    cursor: not-allowed;
    pointer-events: none;
    filter: grayscale(0.4);
  }

  /* --- 尺寸 (Sizes)：全部走 --ctl-* 令牌 --- */
  .btn-sm {
    min-height: var(--ctl-sm);
    padding: 0 8px;
    font-size: var(--ctl-font-sm);
    letter-spacing: 0.5px;
    border-radius: var(--ctl-radius);
  }

  /* 触屏下 --ctl-sm 为 38px：用 ::after 外扩 1px 补到 40px 命中区（视觉不放大） */
  @media (pointer: coarse) {
    .btn-sm::after {
      content: '';
      position: absolute;
      inset: -1px;
    }
  }

  .btn-md {
    min-height: var(--ctl-md);
  }

  .btn-lg {
    min-height: var(--ctl-lg);
    padding: 0 22px;
    font-size: calc(var(--ctl-font) + 2px);
    letter-spacing: 1.5px;
    border-radius: var(--ctl-radius-lg);
  }

  /* --- 变体 (Variants) --- */
  /* 主操作：金面 + 唯一保留的金光 */
  .btn-primary {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    font-weight: 700;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -2px 0 rgba(140, 80, 0, 0.45),
      0 2px 0 #7a4d05,
      0 6px 16px rgba(245, 184, 65, 0.3);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--face-gold-hover);
    border-color: #fff2c4;
    color: #120a00;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -2px 0 rgba(140, 80, 0, 0.4),
      0 2px 0 #7a4d05,
      0 8px 20px rgba(245, 184, 65, 0.4);
  }

  /* 强调态（金描边 + 金字）：安静，只有选中时才发光 */
  .btn-gold {
    border-color: var(--edge-soft);
    color: var(--gold-bright);
  }
  .btn-gold:hover:not(:disabled) {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .btn-gold.active {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    color: var(--gold-bright);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 2px 0 rgba(0, 0, 0, 0.5),
      var(--sh-glow-hot);
  }

  /* 危险操作：朱砂面，不加光晕 */
  .btn-danger {
    background: var(--face-danger);
    border-color: #fca5a5;
    color: #ffffff;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -2px 0 rgba(80, 10, 10, 0.45),
      0 2px 0 #6b1010;
  }
  .btn-danger:hover:not(:disabled) {
    filter: brightness(1.08);
    border-color: #fecaca;
  }

  /* 常规金属面按键（默认） */
  .btn-outline:hover:not(:disabled) {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .btn-outline.active {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    color: var(--gold-bright);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 2px 0 rgba(0, 0, 0, 0.5),
      var(--sh-glow-hot);
  }

  /* 轻量按键：仍是金属片，只是不抢视觉 */
  .btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--muted);
    box-shadow: none;
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }
  .btn-ghost.active {
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* 减弱动态效果：只保留颜色/阴影的瞬时变化，不做位移与缩放 */
  @media (prefers-reduced-motion: reduce) {
    .btn {
      transition: none;
    }

    .btn:active:not(:disabled) {
      transform: none;
    }
  }

  :global(.reduce-motion) .btn {
    transition: none;
  }

  :global(.reduce-motion) .btn:active:not(:disabled) {
    transform: none;
  }
</style>
