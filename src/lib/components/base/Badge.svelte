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

<span class="badge badge-{variant} badge-{size}" class:chamfer>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    border-radius: var(--radius-sm);
    box-sizing: border-box;
  }

  .badge.chamfer {
    clip-path: var(--chamfer-sm);
    border-radius: 0;
  }

  .badge-sm {
    font-size: 10px;
    padding: 2px 6px;
  }

  .badge-md {
    font-size: var(--fs-xs);
    padding: 3px 8px;
  }

  .badge-gold {
    background: rgba(245, 184, 65, 0.15);
    color: var(--gold-bright);
    border: 1px solid rgba(245, 184, 65, 0.35);
  }

  .badge-cyan {
    background: rgba(0, 245, 212, 0.12);
    color: var(--cyan);
    border: 1px solid rgba(0, 245, 212, 0.35);
  }

  .badge-cinnabar {
    background: rgba(217, 43, 43, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(217, 43, 43, 0.45);
  }

  .badge-purple {
    background: rgba(167, 139, 250, 0.15);
    color: var(--purple);
    border: 1px solid rgba(167, 139, 250, 0.45);
  }

  .badge-muted {
    background: rgba(148, 163, 184, 0.12);
    color: var(--muted);
    border: 1px solid rgba(148, 163, 184, 0.25);
  }
</style>
