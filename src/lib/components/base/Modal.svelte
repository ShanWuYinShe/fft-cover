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

  // SR 进入对话框时播报其名称（aria-labelledby 指向标题）
  const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);

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
  <!-- 弹窗 = 白卡厚边：标题区 + 内容 + 页脚三段落 -->
  <div
    class="modal modal-shell g-rivets modal-{size}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? titleId : undefined}
    aria-label={title ? undefined : '对话框'}
  >
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>

    {#if title || showClose}
      <header class="modal-header g-pattern-bar">
        <div class="modal-title-wrap">
          {#if icon}
            <Icon name={icon} size={18} />
          {/if}
          <div class="modal-text">
            {#if title}
              <h2 id={titleId} class="modal-title font-celestial">{title}</h2>
            {/if}
            {#if subtitle}
              <p class="modal-subtitle">{subtitle}</p>
            {/if}
          </div>
        </div>
        {#if showClose && onclose}
          <button
            type="button"
            class="modal-close g-btn g-btn--icon"
            onclick={onclose}
            aria-label="关闭窗口"
            title="关闭窗口"
          >
            <Icon name="close" size={15} />
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
  /* ============================================================
   * 弹层：深蓝天鹅绒遮罩 + 白卡厚边（3px 白边 / --r-lg / --sh-3）
   * 标题 20px/900，正文 14px，副标题 13px；不再有玻璃模糊。
   * ============================================================ */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim-strong);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.2s ease-out;
  }

  .modal-shell {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100dvh - 32px);
    overflow: hidden;
    background: var(--mat-block);
    border: 3px solid #ffffff;
    border-radius: var(--r-lg);
    box-shadow: var(--sh-3);
    animation: modal-pop 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-sm {
    max-width: 400px;
  }
  .modal-md {
    max-width: 560px;
  }
  .modal-lg {
    max-width: 780px;
  }
  .modal-full {
    max-width: 980px;
    height: calc(100dvh - 32px);
  }

  /* 标题条：白卡面 + 左侧珊瑚铭牌条 + 浅蓝发丝底线 */
  .modal-header,
  .modal-header.g-pattern-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 15px 16px 13px 24px;
    background: var(--mat-block);
    border-bottom: 2px solid var(--line);
    box-shadow: none;
    flex-shrink: 0;
  }

  .modal-header::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 17px;
    bottom: 15px;
    width: 5px;
    border-radius: var(--r-pill);
    background: var(--coral);
  }

  .modal-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--coral-text);
  }

  .modal-text {
    min-width: 0;
  }

  .modal-text .modal-title {
    margin: 0;
    font-family: var(--font-round);
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1.25;
    color: var(--text);
  }

  /* 副标题：13px，安静地做补充说明 */
  .modal-subtitle {
    margin: 4px 0 0;
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.45;
    color: var(--muted);
  }

  /* 关闭键：白面圆键（形与四态来自 .g-btn--icon） */
  .modal-close {
    flex: none;
    color: var(--muted);
  }
  .modal-close:hover {
    color: var(--coral-text);
  }

  .modal-body {
    flex: 1 1 auto;
    /* flex 子项默认 min-height:auto 会撑破容器，导致内部滚不动 */
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px 18px 18px;
    scrollbar-width: thin;
    scrollbar-color: #b6dcf2 transparent;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: 12px 18px 14px;
    border-top: 2px solid var(--line);
    background: var(--bg-chassis);
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  /* 页脚里的裸按钮兜底：走统一控件高度 */
  .modal-footer :global(button) {
    min-height: var(--ctl-md);
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
      padding: 10px 14px 9px 22px;
    }
    .modal-body {
      padding: 12px 14px;
    }
    .modal-footer {
      padding: 9px 14px;
    }
  }

  @media (max-width: 640px) {
    .modal-backdrop {
      padding: 10px;
    }
    .modal-shell {
      max-height: calc(100dvh - 20px);
    }
    .modal-body {
      padding: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop,
    .modal-shell {
      animation: none;
    }
  }

  :global(.reduce-motion) .modal-backdrop,
  :global(.reduce-motion) .modal-shell {
    animation: none;
  }
</style>
