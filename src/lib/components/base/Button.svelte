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

  /** 变体 → 公共件类名：outline / gold 用默认「铜板键」，其余直接吃公共件形态 */
  const sharedVariant = $derived(
    variant === 'outline' || variant === 'gold' ? '' : `g-btn--${variant}`,
  );
  /** 尺寸：lg 走公共件的大切角档 */
  const sharedSize = $derived(size === 'lg' ? 'g-btn--lg' : '');
</script>

<!-- 形态一律来自 game-ui.css 公共件（铜板键 / 牌匾 / 朱砂 / 玉牌 / 暗面），
     组件只补尺寸档位与 outline·gold 的强调差异；四态（静/悬/按/选）不覆盖公共件 -->
<button
  type="button"
  class="btn btn-{variant} btn-{size} g-btn {sharedVariant} {sharedSize} {customClass}"
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
   * 第五轮：外观全部交给公共件（切角铜边 + 面 + 四态），
   * 这里只保留尺寸档位、outline/gold 的强调差异、触屏按下缩放。
   * 不写 background / box-shadow / border —— 避免盖掉公共件的状态。
   * ============================================================ */

  /* --- 尺寸档位（--ctl-* 令牌） --- */
  .btn-sm {
    min-height: var(--ctl-sm);
    padding: 0 8px;
    font-size: var(--ctl-font-sm);
    letter-spacing: 0.5px;
  }

  .btn-md {
    min-height: var(--ctl-md);
  }

  /* 触屏下 --ctl-sm 为 38px：用 ::after 外扩 1px 补到 40px 命中区（视觉不放大） */
  @media (pointer: coarse) {
    .btn-sm::after {
      content: '';
      position: absolute;
      inset: -1px;
    }
  }

  /* --- 强调差异：gold = 金字强调；outline = 默认铜板键（无需额外规则） --- */
  .btn-gold {
    color: var(--gold-bright);
  }

  .btn-gold.active {
    color: var(--gold-bright);
  }

  /* --- 触屏才有整块按下缩放（桌面「按下」的面下沉由公共件表达） --- */
  @media (pointer: coarse) {
    .btn:active:not(:disabled) {
      transform: scale(0.97);
    }
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* 减弱动态效果：不留缩放 */
  @media (prefers-reduced-motion: reduce) {
    .btn:active:not(:disabled) {
      transform: none;
    }
  }

  :global(.reduce-motion) .btn:active:not(:disabled) {
    transform: none;
  }
</style>
