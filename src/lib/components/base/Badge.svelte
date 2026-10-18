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
  /* ============================================================
   * 金属芯片：不做半透明圆角胶囊（那是最刺眼的「网页标签」），
   * 改成有厚度的小铁片——深金属渐变 + 发丝描边 + 上高光。
   * 颜色只改文字/描边/微光，芯片本体始终是机箱金属。
   * ============================================================ */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.5px;
    white-space: nowrap;
    border-radius: 6px;
    background: linear-gradient(180deg, #18243c 0%, #0d1524 60%, #080e19 100%);
    border: 1px solid var(--edge-soft);
    color: var(--muted);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }

  .badge.chamfer {
    clip-path: var(--chamfer-sm);
    border-radius: 0;
  }

  .badge-sm {
    min-height: 18px;
    font-size: 10px;
    padding: 3px 7px;
  }

  .badge-md {
    min-height: 22px;
    font-size: var(--fs-xs);
    padding: 4px 9px;
  }

  .badge-gold {
    background:
      linear-gradient(180deg, rgba(245, 184, 65, 0.2), rgba(245, 184, 65, 0.06)),
      linear-gradient(180deg, #18243c 0%, #0d1524 60%, #080e19 100%);
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.42);
  }

  .badge-cyan {
    background:
      linear-gradient(180deg, rgba(0, 245, 212, 0.18), rgba(0, 245, 212, 0.05)),
      linear-gradient(180deg, #14283a 0%, #0b1a24 60%, #071319 100%);
    color: var(--cyan);
    border-color: rgba(0, 245, 212, 0.4);
  }

  .badge-cinnabar {
    background:
      linear-gradient(180deg, rgba(217, 43, 43, 0.22), rgba(217, 43, 43, 0.06)),
      linear-gradient(180deg, #2a1620 0%, #1a0d14 60%, #12080d 100%);
    color: #fca5a5;
    border-color: rgba(217, 43, 43, 0.45);
  }

  .badge-purple {
    background:
      linear-gradient(180deg, rgba(167, 139, 250, 0.2), rgba(167, 139, 250, 0.05)),
      linear-gradient(180deg, #1e1a35 0%, #131024 60%, #0c0a18 100%);
    color: var(--purple);
    border-color: rgba(167, 139, 250, 0.45);
  }

  .badge-muted {
    color: var(--muted);
    border-color: var(--line-quiet);
  }
</style>
