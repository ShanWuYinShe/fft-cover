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
   * 第五轮：徽章 = 器物。
   * - 普通徽章 → 玉牌（.g-chip：青碧面 + 内凹 + 4px 圆角）
   * - 危险/锁定 → 朱印（.g-seal：朱砂面 + 亮边 + -2° 旋转）
   * 组件只补尺寸档位与各变体的字色，形态交给公共件。
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
  }

  .badge.chamfer {
    clip-path: var(--chamfer-sm);
    border-radius: 0;
  }

  .badge-sm {
    /* 芯片最小档：桌面 22 / 触屏 32 */
    min-height: var(--ctl-xs);
    /* 铭牌标签字号下限 11px（第二轮字号收敛规则） */
    font-size: 11px;
    padding: 1px 6px;
  }

  .badge-md {
    min-height: var(--ctl-sm);
    font-size: var(--ctl-font-sm);
    padding: 2px 8px;
  }

  /* 玉牌上的变体只改字色/描边色，面仍是青碧（玉牌语义） */
  .badge-gold {
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.42);
  }

  .badge-purple {
    color: var(--purple);
    border-color: rgba(167, 139, 250, 0.45);
  }

  .badge-muted {
    color: var(--muted);
    border-color: var(--line-quiet);
  }

  /* 朱印：字色/字距随印面 */
  .badge-cinnabar {
    letter-spacing: 1.5px;
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
