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
    <div class="pwa-update-card g-chamfer">
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

  /* PWA 更新卡：白卡 + 3px 白边 + 硬投影 */
  .pwa-update-card {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    max-width: min(92vw, 480px);
    padding: 8px 12px;
    background: var(--mat-block);
    border: 3px solid #ffffff;
    border-radius: var(--r-md);
    box-shadow: var(--sh-2);
    /* 与提示条同一套滑入节奏：-12px → 0，240ms */
    animation: pwa-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  /* 覆盖 .g-chamfer 的双层底：这里只要一张白卡 */
  .pwa-update-card::before {
    content: none;
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
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: var(--text);
    white-space: nowrap;
  }

  .pwa-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 卡片里的按键收紧尺寸，但热区仍走统一控件高度 */
  .pwa-actions .pwa-btn {
    min-height: var(--ctl-md);
    padding: 0 12px;
    font-size: var(--ctl-font-sm);
    letter-spacing: 0.5px;
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
