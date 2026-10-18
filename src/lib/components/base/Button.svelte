<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  // 注意：props API 由 DIRECTION 第 9 节锁定（C/D 也在用），只改外观不改签名。
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
   * 座舱按键：双色渐变面 + 上高光 + 底部硬投影 + 按下位移 3px
   * 对齐 game-ui.css 的 .g-btn 规格（组件内不能直接套用全局类，
   * 因为调用方会传自定义 class，这里保持自成一体的 scoped 样式）。
   * ============================================================ */
  .btn {
    appearance: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    box-sizing: border-box;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--edge);
    background: var(--face-metal);
    color: var(--text);
    font-family: inherit;
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: 1px;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    text-decoration: none;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 4px 0 rgba(0, 0, 0, 0.55),
      0 8px 18px rgba(0, 0, 0, 0.45);
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

  /* 按下：整键下沉 3px，换成内凹阴影（与 .g-btn 一致） */
  .btn:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }

  .btn:disabled {
    opacity: 0.42;
    cursor: not-allowed;
    pointer-events: none;
    filter: grayscale(0.4);
  }

  /* --- 尺寸 (Sizes)：全部 ≥40px 触控热区 --- */
  .btn-sm {
    min-height: 40px;
    padding: 0 10px;
    font-size: var(--fs-sm);
    letter-spacing: 0.5px;
    border-radius: 8px;
  }

  .btn-md {
    min-height: 44px;
  }

  .btn-lg {
    min-height: 52px;
    padding: 0 28px;
    font-size: var(--fs-lg);
    letter-spacing: 3px;
    border-radius: 12px;
  }

  /* --- 变体 (Variants) --- */
  /* 主操作：金面 + 金硬投影，是最显眼的一枚键 */
  .btn-primary {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 4px 0 #7a4d05,
      0 10px 26px rgba(245, 184, 65, 0.35);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--face-gold-hover);
    border-color: #fff2c4;
    color: #120a00;
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 4px 0 #7a4d05,
      0 12px 34px rgba(255, 209, 102, 0.5),
      0 0 26px rgba(245, 184, 65, 0.5);
  }

  /* 强调态（金描边 + 金字），用于已选中/已启用的开关型按钮 */
  .btn-gold {
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .btn-gold:hover:not(:disabled),
  .btn-gold.active {
    background: var(--face-metal-hover);
    border-color: var(--edge-hot);
    color: var(--gold-bright);
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 4px 0 rgba(0, 0, 0, 0.55),
      var(--sh-glow-hot);
  }

  /* 危险操作：朱砂面 */
  .btn-danger {
    background: var(--face-danger);
    border-color: #fca5a5;
    color: #ffffff;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(80, 10, 10, 0.55),
      0 4px 0 #6b1010,
      0 10px 24px rgba(220, 38, 38, 0.35);
  }
  .btn-danger:hover:not(:disabled),
  .btn-danger.active {
    filter: brightness(1.08);
    border-color: #fecaca;
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(80, 10, 10, 0.5),
      0 4px 0 #6b1010,
      0 12px 30px rgba(220, 38, 38, 0.5),
      0 0 22px rgba(220, 38, 38, 0.35);
  }

  /* 常规金属面按键（默认） */
  .btn-outline {
    border-color: var(--edge-soft);
    color: var(--text);
  }
  .btn-outline:hover:not(:disabled),
  .btn-outline.active {
    background: var(--face-metal-hover);
    border-color: var(--edge-hot);
    color: var(--gold-bright);
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 4px 0 rgba(0, 0, 0, 0.55),
      0 8px 22px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(245, 184, 65, 0.22);
  }

  /* 轻量按键：仍是有厚度的金属片，只是不抢视觉 */
  .btn-ghost {
    background: rgba(10, 16, 28, 0.6);
    border-color: var(--edge-faint);
    color: var(--muted);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.45);
  }
  .btn-ghost:hover:not(:disabled),
  .btn-ghost.active {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(14, 22, 38, 0.75);
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .btn {
      transition: none;
    }
  }

  :global(.reduce-motion) .btn {
    transition: none;
  }
</style>
