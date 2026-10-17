<script lang="ts">
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import Toast from '../base/Toast.svelte';

  function applyPwaUpdate(): void {
    void import('../../../main').then((m) => m.applyUpdate());
  }
</script>

<div class="toast-host" aria-live="polite">
  {#if engine.toast && !uiState.showTitle}
    <Toast icon="trophy" variant="gold">
      解锁成就：{engine.toast.name}
    </Toast>
  {/if}

  {#if uiState.shareNote && !uiState.showTitle}
    <Toast icon="link" variant="info" showClose onclose={() => (uiState.shareNote = null)}>
      {uiState.shareNote}
    </Toast>
  {/if}

  {#if uiState.updateReady && engine.phase !== 'running'}
    <div class="pwa-update-card">
      <span class="pwa-text">✨ 新版本已就绪</span>
      <div class="pwa-actions">
        <button type="button" class="pwa-btn pwa-refresh" onclick={applyPwaUpdate}>
          立即刷新
        </button>
        <button
          type="button"
          class="pwa-btn pwa-dismiss"
          onclick={() => (uiState.updateReady = false)}
        >
          稍后
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .toast-host {
    position: fixed;
    top: 68px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 150;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    pointer-events: none;
    max-width: 90vw;
  }
  .toast-host > :global(*) {
    pointer-events: auto;
  }

  .pwa-update-card {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: linear-gradient(180deg, rgba(16, 24, 42, 0.96), rgba(8, 12, 22, 0.98));
    border: 1px solid rgba(0, 245, 212, 0.45);
    border-radius: var(--radius-pill);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.6),
      0 0 16px rgba(0, 245, 212, 0.2);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: guide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pwa-text {
    font-size: var(--fs-sm);
    color: var(--cyan);
    font-weight: 600;
  }

  .pwa-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .pwa-btn {
    appearance: none;
    border: none;
    font-size: var(--fs-xs);
    font-weight: 600;
    padding: 3px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pwa-refresh {
    background: var(--cyan);
    color: #060911;
  }
  .pwa-refresh:hover {
    filter: brightness(1.15);
  }

  .pwa-dismiss {
    background: transparent;
    color: var(--muted);
  }
  .pwa-dismiss:hover {
    color: var(--text);
  }
</style>
