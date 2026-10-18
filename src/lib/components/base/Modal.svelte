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
  <!-- 座舱弹窗：金属面板 + 四角青铜包边 + 扫描线；滚动交给 .modal-body -->
  <div class="modal modal-shell modal-{size}" role="dialog" aria-modal="true">
    <span class="g-scanlines modal-scan" aria-hidden="true"></span>
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>

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
    /* 座舱遮罩：中心压暗 + 金色氛围，把注意力锁在弹窗上 */
    background:
      radial-gradient(circle at 50% 42%, rgba(245, 184, 65, 0.07), transparent 58%),
      rgba(3, 5, 11, 0.82);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    animation: fade-in 0.2s ease-out;
  }

  .modal-shell {
    position: relative;
    /* 装甲板：深蓝黑金属面 + 顶部亮金发丝线 */
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 42%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: var(--radius-md);
    box-shadow:
      var(--sh-game-lg),
      var(--bevel-top),
      inset 0 0 40px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    /* 矮屏（手机横屏 844×390 等）：整体不超视口，内部滚动 */
    max-height: calc(100dvh - 24px);
    width: 100%;
    animation: modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 顶部亮金发丝线：装甲板的高光边 */
  .modal-shell::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 16%,
      var(--edge-hot) 84%,
      transparent
    );
    opacity: 0.75;
    pointer-events: none;
  }

  .modal-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0.7;
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

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 12px var(--space-5) 10px;
    /* 铭牌区：比面板略亮一条，底部金色发丝分隔 */
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.09), rgba(245, 184, 65, 0.015));
    border-bottom: 1px solid var(--edge-soft);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .modal-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: none;
    color: var(--gold-bright);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.2), rgba(245, 184, 65, 0.05));
    border: 1px solid var(--edge);
    border-radius: 7px;
    box-shadow:
      var(--bevel-top),
      0 0 12px rgba(245, 184, 65, 0.18);
  }

  .modal-text {
    min-width: 0;
  }

  .modal-title {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    letter-spacing: 3px;
    line-height: 1.25;
    text-shadow: 0 0 16px rgba(245, 184, 65, 0.35);
  }

  /* 副标题当铭牌读：小号、拉开字距 */
  .modal-subtitle {
    margin: 2px 0 0;
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 2px;
    color: var(--muted);
  }

  .modal-close {
    appearance: none;
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-md);
    color: var(--muted);
    border-radius: 10px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .modal-close:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .modal-close:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-top);
  }

  .modal-body {
    flex: 1 1 auto;
    /* flex 子项默认 min-height:auto 会撑破容器，导致内部滚不动 */
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-4) var(--space-5);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: 10px var(--space-5);
    border-top: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, rgba(5, 8, 15, 0.92), rgba(3, 5, 10, 0.98));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
      padding: 8px var(--space-4);
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
