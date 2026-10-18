<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { uiToggle } from '../game/audio';
  import Icon from './Icon.svelte';

  export interface MenuItem {
    label: string;
    /** 可选线性图标名(见 Icon.svelte);label 里的彩色 emoji 一律改走这里 */
    icon?: string;
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

<!-- 注意：.mm / .mm-btn / .mm-pop 三个类名是 ResultOverlay 的 :global() 钩子，不能改名 -->
<div class="mm" bind:this={root}>
  <button
    type="button"
    class="mm-btn"
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
    <div class="mm-pop g-corners" class:up bind:this={popEl} role="menu">
      <span class="g-corner tl" aria-hidden="true"></span>
      <span class="g-corner tr" aria-hidden="true"></span>
      <span class="g-corner bl" aria-hidden="true"></span>
      <span class="g-corner br" aria-hidden="true"></span>
      {#each items as it (it.label)}
        <button
          type="button"
          class="mm-item"
          role="menuitem"
          disabled={it.disabled}
          title={it.title}
          onclick={() => run(it)}
        >
          {#if it.icon}<span class="mi"><Icon name={it.icon} size={15} /></span>{/if}{it.label}
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

  /* 触发键：机箱上的一枚方形按键（与 .g-btn 同规格，≥40px 热区） */
  .mm-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 10px;
    border: 1px solid var(--edge);
    background: var(--face-metal);
    color: var(--muted);
    cursor: pointer;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 4px 0 rgba(0, 0, 0, 0.55),
      0 8px 18px rgba(0, 0, 0, 0.45);
    transition:
      transform 0.09s ease,
      box-shadow 0.12s ease,
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mm-btn:hover {
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

  .mm-btn:active {
    transform: translateY(3px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }

  /* 展开态：按键点亮 */
  .mm-btn[aria-expanded='true'] {
    border-color: var(--edge-hot);
    color: var(--gold-bright);
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 4px 0 rgba(0, 0, 0, 0.55),
      var(--sh-glow-hot);
  }

  .mm-btn:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 3px;
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
    background: var(--gold-bright);
    box-shadow: 0 0 6px rgba(245, 197, 66, 0.6);
    transition:
      transform 0.15s ease,
      background 0.15s ease;
  }
  .mm-dots i:nth-child(2) {
    background: var(--cyan);
    box-shadow: 0 0 6px rgba(45, 212, 191, 0.6);
  }
  .mm-btn:hover .mm-dots i {
    background: #ffffff;
    box-shadow: 0 0 8px var(--gold-bright);
    transform: scale(1.25);
  }

  /* 弹出菜单：金属面板 + 四角包边 */
  .mm-pop {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    min-width: 196px;
    max-width: min(300px, 86vw);
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px;
    background: linear-gradient(180deg, #101a2c 0%, #070d18 100%);
    border: 1px solid var(--edge);
    border-radius: 10px;
    box-shadow:
      var(--sh-game-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    animation: mm-in 0.16s ease-out;
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
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 菜单项：一行一枚金属小键，左侧有金色选中条 */
  .mm-pop .mm-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    text-align: left;
    border-radius: 8px;
    border: 1px solid transparent;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.24));
    color: var(--text);
    font: inherit;
    font-size: var(--fs-md);
    font-weight: 600;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }

  .mm-pop .mm-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 2px;
    height: 0;
    transform: translateY(-50%);
    background: var(--gold-bright);
    box-shadow: var(--sh-glow-hot);
    transition: height 0.12s ease;
  }

  .mm-pop .mm-item:hover:not(:disabled) {
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.16), rgba(245, 184, 65, 0.04));
    border-color: var(--edge);
    color: var(--gold-bright);
  }

  .mm-pop .mm-item:hover:not(:disabled)::before {
    height: 62%;
  }

  .mm-pop .mm-item:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: -2px;
  }

  .mm-pop .mi {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--edge-faint);
    color: var(--muted);
    transition:
      color 0.12s ease,
      border-color 0.12s ease;
  }

  .mm-pop .mm-item:hover:not(:disabled) .mi {
    color: var(--gold-bright);
    border-color: var(--edge);
  }

  .mm-pop .mm-item:disabled {
    color: var(--muted);
    opacity: 0.45;
    cursor: default;
    background: rgba(0, 0, 0, 0.18);
  }

  /* 移动端不再缩成小胶囊：仍是 ≥40px 的机箱按键 */
  @media (max-width: 640px) {
    .mm-btn {
      min-width: 40px;
      min-height: 40px;
      padding: 0 8px;
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
  }

  :global(.reduce-motion) .mm-pop,
  :global(.reduce-motion) .mm-btn,
  :global(.reduce-motion) .mm-pop .mm-item,
  :global(.reduce-motion) .mm-dots i {
    animation: none;
    transition: none;
  }
</style>
