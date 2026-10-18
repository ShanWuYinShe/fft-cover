<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { uiToggle } from '../game/audio';
  import Icon from './Icon.svelte';

  export interface MenuItem {
    label: string;
    /** 可选线性图标名(见 Icon.svelte);label 里的彩色 emoji 一律改走这里 */
    icon?: string;
    /** 可选快捷键提示（键帽列表右端的小键），如 '空格' 'S' 'R' */
    hint?: string;
    title?: string;
    disabled?: boolean;
    onclick: () => void;
  }

  let {
    items = [],
    label = '⋯',
    direction = 'down',
  }: { items?: MenuItem[]; label?: string; direction?: 'down' | 'up' } = $props();

  let open = $state(false);
  let root: HTMLDivElement | undefined = $state();
  let popEl: HTMLDivElement | undefined = $state();

  /** 实际弹出方向：优先听 direction，某一侧真的放不下时自动翻到另一侧
   *  （初值在 toggle() 打开时按 direction 设定，避免在 $state 初始化里捕获 prop） */
  let up = $state(false);
  /** 视口尺寸变化的计数器，用于触发重新测量 */
  let viewportMark = $state(0);

  function toggle(): void {
    open = !open;
    if (open) up = direction === 'up';
    uiToggle(engine.soundOn);
  }

  function run(it: MenuItem): void {
    open = false;
    it.onclick();
  }

  function onDocClick(e: MouseEvent): void {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }

  /**
   * 弹出方向自适应：底部指令栏里的 ⋯ 若向下弹会整个跑出视口
   * （实测 1440×900 溢出 430px），这里按实际可用高度翻向另一侧。
   */
  $effect(() => {
    void viewportMark;
    if (!open || !popEl || !root) return;
    const gap = 8;
    const trigger = root.getBoundingClientRect();
    const panelH = popEl.getBoundingClientRect().height;
    const spaceAbove = trigger.top;
    const spaceBelow = innerHeight - trigger.bottom;
    const fitsUp = spaceAbove >= panelH + gap;
    const fitsDown = spaceBelow >= panelH + gap;
    if (direction === 'up' && !fitsUp && fitsDown) up = false;
    else if (direction === 'down' && !fitsDown && fitsUp) up = true;
  });

  onMount(() => {
    document.addEventListener('click', onDocClick);
    const onResize = (): void => {
      viewportMark++;
    };
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('click', onDocClick);
      window.removeEventListener('resize', onResize);
    };
  });
</script>

<!-- 注意：.mm / .mm-btn / .mm-pop 三个类名是 ResultOverlay 的 :global() 钩子，不能改名。
     降噪版：无四角包边、无外发光；菜单项统一 44px、图标 + 文字两层结构。 -->
<div class="mm" bind:this={root}>
  <button
    type="button"
    class="mm-btn g-btn g-btn--icon"
    aria-label="更多操作"
    aria-haspopup="menu"
    aria-expanded={open}
    title="更多操作"
    onclick={toggle}
  >
    {#if label === '⋯'}
      <span class="mm-dots" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
    {:else}
      {label}
    {/if}
  </button>
  {#if open}
    <div class="mm-pop g-chamfer g-rivets" class:up bind:this={popEl} role="menu">
      {#each items as it (it.label)}
        <button
          type="button"
          class="mm-item"
          role="menuitem"
          disabled={it.disabled}
          title={it.title}
          onclick={() => run(it)}
        >
          {#if it.icon}<span class="mi g-socket"><Icon name={it.icon} size={14} /></span>{/if}
          <span class="mm-label">{it.label}</span>
          {#if it.hint}<span class="mm-hint" aria-hidden="true">{it.hint}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .mm {
    position: relative;
    display: inline-flex;
  }

  /* 触发键：键帽（外形/四态来自公共件 .g-btn--icon），这里只补「展开态」 */
  .mm-btn {
    box-sizing: border-box;
    color: var(--muted);
  }

  /* 展开态 = 键槽点亮（铜边变金 + 面提亮），与公共件选中语义一致 */
  .mm-btn[aria-expanded='true'] {
    background: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  .mm-btn[aria-expanded='true']::before {
    background: var(--face-plate-hot);
  }

  /* 三点省略号：用三根金属条画，不用 Unicode 字符 */
  .mm-dots {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .mm-dots i {
    display: block;
    width: 4px;
    height: 4px;
    border-radius: 1px;
    background: var(--muted);
    transition: background 0.15s ease;
  }
  .mm-btn:hover .mm-dots i,
  .mm-btn[aria-expanded='true'] .mm-dots i {
    background: var(--gold-bright);
  }

  /* 弹出菜单：一层描边 + 安静的投影 */
  .mm-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    min-width: 180px;
    max-width: min(300px, 86vw);
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 5px;
    animation: mm-in 180ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
  }
  .mm-pop.up {
    top: auto;
    bottom: calc(100% + 8px);
  }
  @keyframes mm-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* 键帽行：左 socket 图标槽 + 中部标签 + 右端快捷键键帽 */
  .mm-pop .mm-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    /* 桌面 34 / 触屏 44（触屏仍满足 ≥40 命中区） */
    min-height: 34px;
    padding: 3px 8px;
    text-align: left;
    border-radius: 3px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--ctl-font);
    font-weight: 600;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background 0.12s ease,
      color 0.12s ease;
    /* 菜单项逐条落位：40ms 错峰 */
    animation: mm-item-in 200ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .mm-pop .mm-item:nth-child(1) {
    animation-delay: 30ms;
  }
  .mm-pop .mm-item:nth-child(2) {
    animation-delay: 70ms;
  }
  .mm-pop .mm-item:nth-child(3) {
    animation-delay: 110ms;
  }
  .mm-pop .mm-item:nth-child(4) {
    animation-delay: 150ms;
  }
  .mm-pop .mm-item:nth-child(5) {
    animation-delay: 190ms;
  }
  .mm-pop .mm-item:nth-child(n + 6) {
    animation-delay: 230ms;
  }

  @keyframes mm-item-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .mm-pop .mm-item:hover:not(:disabled) {
    background: rgba(245, 184, 65, 0.1);
    color: var(--gold-bright);
  }

  .mm-pop .mm-item:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: -2px;
  }

  /* 图标尺寸随控件收（令牌驱动，触屏自动放大）；图标嵌在 .g-socket 键槽里 */
  .mm-pop .mi :global(svg) {
    width: var(--ctl-icon-sm);
    height: var(--ctl-icon-sm);
  }

  .mm-pop .mi {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 20px;
    color: var(--muted);
    transition: color 0.12s ease;
  }

  /* 标签占满中段：没有 hint 时右侧只是按键自己的空白，不会留占位元素 */
  .mm-pop .mm-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 快捷键键帽：仅当调用方传 hint 时才渲染（{#if it.hint}） */
  .mm-pop .mm-hint {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 0 4px;
    border-radius: 3px;
    background: linear-gradient(180deg, #0a1120, #060b14);
    box-shadow:
      inset 0 1px 3px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(201, 162, 74, 0.32);
    color: var(--muted);
    font-size: 10px;
    letter-spacing: 0.5px;
  }

  .mm-pop .mm-item:hover:not(:disabled) .mi {
    color: var(--gold-bright);
  }

  .mm-pop .mm-item:disabled {
    color: var(--muted);
    opacity: 0.5;
    cursor: default;
  }

  /* 触屏档位由 pointer: coarse 令牌决定，菜单项补到 44px */
  @media (pointer: coarse) {
    .mm-pop .mm-item {
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mm-pop,
    .mm-btn,
    .mm-pop .mm-item,
    .mm-dots i {
      animation: none;
      transition: none;
    }

    .mm-btn:active {
      transform: none;
    }
  }

  :global(.reduce-motion) .mm-pop,
  :global(.reduce-motion) .mm-btn,
  :global(.reduce-motion) .mm-pop .mm-item,
  :global(.reduce-motion) .mm-dots i {
    animation: none;
    transition: none;
  }

  :global(.reduce-motion) .mm-btn:active {
    transform: none;
  }
</style>
