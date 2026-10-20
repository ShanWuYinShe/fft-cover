<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { uiChime } from '../game/audio';
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
    if (open) {
      up = direction === 'up';
      // 展开一声编钟（触发键本身的笃声由全局点击监听负责）；收起不加音
      uiChime(engine.soundOn);
    }
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
     糖果版：白卡弹出层 + 硬投影；菜单项图标 + 文字两层结构。 -->
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

  /* 触发键：白面圆键（外形/四态来自公共件 .g-btn--icon），这里只补「展开态」 */
  .mm-btn {
    box-sizing: border-box;
    color: var(--muted);
  }

  .mm-btn[aria-expanded='true'] {
    color: var(--coral-text);
  }

  .mm-btn[aria-expanded='true']::before {
    background: var(--coral-dim);
  }

  /* 三点省略号：三个糖果圆点，不用 Unicode 字符 */
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
    border-radius: 50%;
    background: var(--muted);
    transition: background 0.15s ease;
  }

  .mm-btn:hover .mm-dots i,
  .mm-btn[aria-expanded='true'] .mm-dots i {
    background: var(--coral-deep);
  }

  /* 弹出菜单：白卡 + 3px 白边 + 硬投影 */
  .mm-pop::before {
    content: none;
  }

  .mm-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    min-width: 200px;
    max-width: min(320px, 86vw);
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 7px;
    background: var(--mat-plate);
    border: 3px solid #ffffff;
    border-radius: var(--r-md);
    box-shadow: var(--sh-3);
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

  /* 菜单项行：图标槽 + 标签 + 右端快捷键 */
  .mm-pop .mm-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 40px;
    padding: 6px 10px;
    text-align: left;
    border-radius: var(--r-sm);
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.3px;
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
    background: var(--line-2);
    color: var(--coral-edge);
  }

  .mm-pop .mm-item:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: -2px;
  }

  /* 图标尺寸随控件收（令牌驱动，触屏自动放大） */
  .mm-pop .mi :global(svg) {
    width: var(--ctl-icon-sm);
    height: var(--ctl-icon-sm);
  }

  .mm-pop .mi {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--bg-bay-inset);
    color: var(--coral-text);
    transition: color 0.12s ease;
  }

  /* 标签占满中段：没有 hint 时右侧只是按键自己的空白，不会留占位元素 */
  .mm-pop .mm-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 快捷键键帽：白药丸小牌（仅当调用方传 hint 时才渲染） */
  .mm-pop .mm-hint {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--r-sm);
    background: var(--mat-block);
    border: 1px solid var(--line);
    box-shadow: 0 1px 0 var(--line);
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }

  .mm-pop .mm-item:hover:not(:disabled) .mi {
    color: var(--coral-text);
  }

  .mm-pop .mm-item:disabled {
    color: var(--muted-2);
    opacity: 0.6;
    cursor: default;
  }

  /* 触屏档位由 pointer: coarse 令牌决定，菜单项补到 46px */
  @media (pointer: coarse) {
    .mm-pop .mm-item {
      min-height: 46px;
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
