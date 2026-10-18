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
  <!-- 弹窗 = 一块安静的面板：只有标题区 + 内容 + 页脚三段落，四角包边只此一处 -->
  <div class="modal modal-shell modal-{size}" role="dialog" aria-modal="true">
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>

    {#if title || showClose}
      <header class="modal-header">
        <div class="modal-title-wrap">
          {#if icon}
            <Icon name={icon} size={18} />
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
            <Icon name="close" size={16} />
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
    /* 全屏压暗即足够把注意力锁在弹窗上，不再加金色氛围光 */
    background: rgba(3, 5, 11, 0.8);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    animation: fade-in 0.2s ease-out;
  }

  .modal-shell {
    position: relative;
    /* 一块平板：单色金属面 + 1px 暗金描边，不做渐变堆料与外发光 */
    background: var(--metal);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    /* 矮屏（手机横屏 844×390 等）：整体不超视口，内部滚动 */
    max-height: calc(100dvh - 24px);
    width: 100%;
    animation: modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
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
    height: calc(100dvh - 24px);
  }

  /* 标题区：一条底线分隔，不再铺底色 */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 14px var(--space-5) 12px;
    border-bottom: 1px solid var(--edge-faint);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--gold-bright);
  }

  .modal-text {
    min-width: 0;
  }

  .modal-title {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 2px;
    line-height: 1.25;
  }

  /* 副标题：小铭牌（≥12px），安静地做补充说明 */
  .modal-subtitle {
    margin: 3px 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  /* 关闭键：44×44 热区，静息无描边、悬停才显形 */
  .modal-close {
    appearance: none;
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--muted);
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    transition:
      color 0.12s ease,
      background 0.12s ease;
  }
  .modal-close:hover {
    color: var(--gold-bright);
    background: rgba(255, 255, 255, 0.06);
  }

  .modal-body {
    flex: 1 1 auto;
    /* flex 子项默认 min-height:auto 会撑破容器，导致内部滚不动 */
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-4) var(--space-5);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.3) transparent;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: 12px var(--space-5) 14px;
    border-top: 1px solid var(--edge-faint);
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  /* 页脚里的裸按钮兜底：至少 44px 热区（外观仍由调用方/Button 决定） */
  .modal-footer :global(button) {
    min-height: 44px;
  }

  /* 矮屏：收紧留白，让内容区尽可能高 */
  @media (max-height: 480px) {
    .modal-backdrop {
      padding: 6px;
    }
    .modal-shell {
      max-height: calc(100dvh - 12px);
    }
    .modal-header {
      padding: 9px var(--space-4);
    }
    .modal-body {
      padding: 10px var(--space-4);
    }
    .modal-footer {
      padding: 8px var(--space-4);
    }
  }

  @media (max-width: 640px) {
    .modal-backdrop {
      padding: var(--space-2);
    }
    .modal-shell {
      max-height: calc(100dvh - 16px);
    }
  }
</style>
