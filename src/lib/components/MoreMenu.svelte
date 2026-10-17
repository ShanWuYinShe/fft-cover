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

  function toggle(): void {
    open = !open;
    uiToggle(engine.soundOn);
  }

  function run(it: MenuItem): void {
    open = false;
    it.onclick();
  }

  function onDocClick(e: MouseEvent): void {
    if (open && root && !root.contains(e.target as Node)) open = false;
  }

  onMount(() => {
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  });
</script>

<div class="mm" bind:this={root}>
  <button
    type="button"
    class="quiet-btn mm-btn"
    aria-label="更多操作"
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
    <div class="mm-pop" class:up={direction === 'up'} role="menu">
      {#each items as it (it.label)}
        <button
          type="button"
          role="menuitem"
          disabled={it.disabled}
          title={it.title}
          onclick={() => run(it)}
        >
          {#if it.icon}<span class="mi"><Icon name={it.icon} size={14} /></span>{/if}{it.label}
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
  /* 基础语言来自全局 .quiet-btn；这里只留菜单自身的尺寸 */
  .mm-btn {
    min-width: 44px;
    height: 44px;
    padding: 0 10px;
    font-size: 15px;
  }
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

  .mm-pop {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    min-width: 172px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    background: linear-gradient(168deg, rgba(17, 24, 39, 0.98), rgba(9, 13, 22, 0.99));
    border: 1px solid rgba(245, 197, 66, 0.35);
    border-radius: 8px;
    box-shadow:
      0 18px 44px rgba(0, 0, 0, 0.75),
      0 0 20px rgba(245, 197, 66, 0.06) inset;
    animation: mm-in 0.16s ease-out;
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
  }
  .mm-pop.up {
    top: auto;
    bottom: calc(100% + 6px);
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
  .mm-pop button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-md);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .mm-pop .mi {
    display: inline-flex;
    color: var(--muted);
    transition: color 0.15s ease;
  }
  .mm-pop button:hover:not(:disabled) .mi {
    color: var(--gold-bright);
  }
  .mm-pop button:hover:not(:disabled) {
    background: rgba(245, 197, 66, 0.08);
    color: var(--gold-bright);
  }
  .mm-pop button:disabled {
    color: var(--muted);
    opacity: 0.5;
    cursor: default;
  }
</style>
