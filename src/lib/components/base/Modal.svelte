<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../Icon.svelte';

  let {
    title,
    subtitle,
    icon,
    size = 'md',
    showClose = true,
    onclose,
    children,
    footer,
  }: {
    title?: string;
    subtitle?: string;
    icon?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
    showClose?: boolean;
    onclose?: () => void;
    children?: Snippet;
    footer?: Snippet;
  } = $props();

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget && onclose) {
      onclose();
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && onclose) {
      e.stopPropagation();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="modal-backdrop" onclick={onBackdropClick} role="presentation">
  <div class="modal-shell modal-{size}" role="dialog" aria-modal="true">
    {#if title || showClose}
      <header class="modal-header">
        <div class="modal-title-wrap">
          {#if icon}
            <span class="modal-icon">
              <Icon name={icon} size={18} />
            </span>
          {/if}
          <div class="modal-text">
            {#if title}
              <h2 class="modal-title font-celestial">{title}</h2>
            {/if}
            {#if subtitle}
              <p class="modal-subtitle">{subtitle}</p>
            {/if}
          </div>
        </div>
        {#if showClose && onclose}
          <button
            type="button"
            class="modal-close"
            onclick={onclose}
            aria-label="关闭窗口"
            title="关闭窗口"
          >
            ✕
          </button>
        {/if}
      </header>
    {/if}

    <div class="modal-body">
      {#if children}
        {@render children()}
      {/if}
    </div>

    {#if footer}
      <footer class="modal-footer">
        {@render footer()}
      </footer>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.2s ease-out;
  }

  .modal-shell {
    background: linear-gradient(175deg, rgba(16, 24, 42, 0.98), rgba(8, 12, 22, 0.99));
    border: 1px solid rgba(245, 184, 65, 0.35);
    border-radius: var(--radius-lg);
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.85),
      0 0 25px rgba(245, 184, 65, 0.1);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 40px);
    max-height: calc(100dvh - 40px);
    width: 100%;
    animation: modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
  }

  .modal-sm {
    max-width: 380px;
  }
  .modal-md {
    max-width: 520px;
  }
  .modal-lg {
    max-width: 760px;
  }
  .modal-full {
    max-width: 980px;
    height: calc(100dvh - 40px);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--line);
    background: rgba(245, 184, 65, 0.03);
    flex-shrink: 0;
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .modal-icon {
    color: var(--gold-bright);
    display: flex;
    align-items: center;
  }

  .modal-title {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 2px;
  }

  .modal-subtitle {
    margin: 2px 0 0;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .modal-close {
    appearance: none;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--muted);
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-sm);
    transition: all 0.15s ease;
  }
  .modal-close:hover {
    color: var(--gold-bright);
    border-color: var(--gold);
    background: rgba(245, 184, 65, 0.1);
  }

  .modal-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.3) transparent;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5);
    border-top: 1px solid var(--line);
    background: rgba(8, 12, 22, 0.95);
    flex-shrink: 0;
  }
</style>
