<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

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

  const computedIconSize = $derived(
    iconSize ?? (size === 'sm' ? 13 : size === 'lg' ? 18 : 15),
  );
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
  .btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: inherit;
    font-weight: 600;
    line-height: 1;
    border-radius: var(--radius-md);
    cursor: pointer;
    white-space: nowrap;
    text-decoration: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* --- 尺寸 (Sizes) --- */
  .btn-sm {
    height: 28px;
    padding: 0 var(--space-2);
    font-size: var(--fs-xs);
  }

  .btn-md {
    height: 36px;
    padding: 0 var(--space-3);
    font-size: var(--fs-sm);
  }

  .btn-lg {
    height: 44px;
    padding: 0 var(--space-4);
    font-size: var(--fs-md);
  }

  /* --- 变体 (Variants) --- */
  .btn-primary {
    background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 100%);
    color: #060911;
    border: 1px solid var(--gold-bright);
    box-shadow: 0 2px 10px rgba(245, 184, 65, 0.4);
  }
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(245, 184, 65, 0.55);
  }

  .btn-gold {
    background: linear-gradient(180deg, #2e4369 0%, #172440 100%);
    border: 1px solid rgba(245, 184, 65, 0.45);
    color: var(--text);
  }
  .btn-gold:hover:not(:disabled),
  .btn-gold.active {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    box-shadow: 0 0 14px rgba(245, 184, 65, 0.35);
  }

  .btn-danger {
    background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
    color: #ffffff;
    border: 1px solid #ef4444;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
  }
  .btn-danger:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.55);
  }

  .btn-outline {
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid var(--line);
    color: var(--text);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }
  .btn-outline:hover:not(:disabled) {
    border-color: var(--line-bright);
    color: var(--gold-bright);
    transform: translateY(-1px);
  }

  .btn-ghost {
    background: transparent;
    border: 1px solid transparent;
    color: var(--muted);
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
