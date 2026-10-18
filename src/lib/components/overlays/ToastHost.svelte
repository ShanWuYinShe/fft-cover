<script lang="ts">
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import Toast from '../base/Toast.svelte';

  function applyPwaUpdate(): void {
    void import('../../../main').then((m) => m.applyUpdate());
  }
</script>

<!-- 浮层通知托管：提示条与 PWA 更新卡都贴顶栏下沿，不遮挡主操作（降噪：卡片不再堆标签与包边） -->
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
      <span class="pwa-text">新版本已就绪</span>
      <div class="pwa-actions">
        <button type="button" class="g-btn g-btn--cyan pwa-btn" onclick={applyPwaUpdate}>
          立即刷新
        </button>
        <button
          type="button"
          class="g-btn g-btn--ghost pwa-btn"
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
    top: calc(var(--hud-h) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 150;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    pointer-events: none;
    max-width: 94vw;
  }
  .toast-host > :global(*) {
    pointer-events: auto;
  }

  /* PWA 更新卡：一行说明 + 两个按钮，不套铭牌/灯/包边 */
  .pwa-update-card {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    max-width: min(92vw, 460px);
    padding: 8px 12px;
    background: #0d1626;
    border: 1px solid var(--edge-soft);
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    /* 与提示条同一套滑入节奏：-12px → 0，240ms */
    animation: pwa-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes pwa-in {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .pwa-text {
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text);
    white-space: nowrap;
  }

  .pwa-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 卡片里的按键收紧尺寸，但热区仍 ≥40px（.g-btn 已经是 40px 下限） */
  .pwa-actions .pwa-btn {
    min-height: 40px;
    padding: 0 14px;
    font-size: var(--fs-sm);
    letter-spacing: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    .pwa-update-card {
      animation: none;
    }
  }

  :global(.reduce-motion) .pwa-update-card {
    animation: none;
  }
</style>
