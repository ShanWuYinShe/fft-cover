<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'gold',
    size = 'sm',
    chamfer = false,
    children,
  }: {
    variant?: 'gold' | 'cyan' | 'cinnabar' | 'purple' | 'muted';
    size?: 'sm' | 'md';
    chamfer?: boolean;
    children?: Snippet;
  } = $props();
</script>

<span
  class="badge badge-{variant} badge-{size}"
  class:chamfer
  class:g-chip={variant !== 'cinnabar'}
  class:g-seal={variant === 'cinnabar'}
>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  /* ============================================================
   * 徽章：白卡药丸（.g-chip）+ 糖果字色。
   * 金色/朱砂写死色全部换成 --coral / --danger 语义令牌。
   * ============================================================ */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .badge.chamfer {
    border-radius: var(--r-sm);
  }

  .badge-sm {
    min-height: var(--ctl-xs);
    font-size: var(--fs-xs);
    padding: 2px 8px;
  }

  .badge-md {
    min-height: var(--ctl-sm);
    font-size: var(--ctl-font-sm);
    padding: 3px 10px;
  }

  /* 变体只改字色（--coral / --mint / --grape），面仍是白卡 */
  .badge-gold {
    color: var(--coral-text);
  }

  .badge-cyan {
    color: var(--mint-edge);
  }

  .badge-purple {
    color: var(--grape-deep);
  }

  .badge-muted {
    color: var(--muted-2);
  }

  /* 朱印：字色/字距随印面；印面由 .g-seal 给（--danger 系） */
  .badge-cinnabar {
    letter-spacing: 1px;
  }
</style>
