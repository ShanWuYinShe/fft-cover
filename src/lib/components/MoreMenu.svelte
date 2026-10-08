<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { uiToggle } from '../game/audio';

  export interface MenuItem {
    label: string;
    title?: string;
    disabled?: boolean;
    onclick: () => void;
  }

  let { items = [], label = '⋯' }: { items?: MenuItem[]; label?: string } = $props();

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
    class="mm-btn"
    aria-label="更多操作"
    aria-expanded={open}
    title="更多操作"
    onclick={toggle}
  >
    {label}
  </button>
  {#if open}
    <div class="mm-pop" role="menu">
      {#each items as it (it.label)}
        <button
          type="button"
          role="menuitem"
          disabled={it.disabled}
          title={it.title}
          onclick={() => run(it)}
        >
          {it.label}
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
  .mm-btn {
    min-width: 44px;
    height: 44px;
    padding: 0 10px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(130, 150, 210, 0.28);
    background: rgba(24, 30, 56, 0.6);
    color: var(--muted);
    font: inherit;
    font-size: 15px;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  button.mm-btn:hover {
    color: var(--text);
    border-color: rgba(130, 150, 210, 0.55);
  }
  .mm-pop {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 30;
    min-width: 168px;
    display: flex;
    flex-direction: column;
    padding: 5px;
    border-radius: 12px;
    background: linear-gradient(168deg, rgba(28, 34, 62, 0.98), rgba(16, 20, 38, 0.99));
    border: 1px solid rgba(130, 150, 210, 0.3);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
    animation: mm-in 0.16s ease-out;
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
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-md);
    cursor: pointer;
    white-space: nowrap;
  }
  .mm-pop button:hover:not(:disabled) {
    background: rgba(79, 209, 197, 0.12);
  }
  .mm-pop button:disabled {
    color: var(--muted);
    opacity: 0.5;
    cursor: default;
  }
</style>
