<script lang="ts">
  import { keyForChapter } from '../game/harmony';
  import type { ChapterProgress } from '../game/campaign';

  let { chapter, onclose }: { chapter: ChapterProgress; onclose: () => void } = $props();

  /** 本章调性：配乐与收集音会跟着切 */
  const keyName = $derived(keyForChapter(chapter.id).name);

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="ch-intro"
  role="dialog"
  aria-modal="true"
  aria-label={'进入' + chapter.name}
  tabindex="-1"
  onclick={(e) => {
    if (e.target === e.currentTarget) onclose();
  }}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') onclose();
  }}
>
  <!-- 入境卡：一块安静的面板（章节印 + 标题 + 一句导语 + 说明 + 主操作） -->
  <div class="card-wrap">
    <div class="card g-rivets">
      <!-- 逐行 80ms 错峰淡入（位移 ≤8px，只动 transform/opacity） -->
      <span class="eyebrow g-seal row-in" style="animation-delay: 0ms">入境</span>
      <h2 class="row-in" style="animation-delay: 80ms">{chapter.name}</h2>
      <p class="tag row-in" style="animation-delay: 160ms">{chapter.tagline}</p>
      <p class="intro row-in" style="animation-delay: 240ms">{@html chapter.intro}</p>
      <div class="meta row-in" style="animation-delay: 320ms">
        <span class="k" title="本章调性：进章即转调">♪ {keyName}</span>
        <span class="dot">·</span>
        <span>{chapter.levels.length} 关</span>
        <span class="dot">·</span>
        <span>★ {chapter.stars}/{chapter.maxStars}</span>
      </div>
      <div class="foot row-in" style="animation-delay: 400ms">
        <button type="button" class="primary g-btn g-btn--primary g-btn--lg" onclick={onclose}>
          开 始 这 一 章
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .ch-intro {
    position: fixed;
    inset: 0;
    z-index: 72;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: var(--scrim-strong);
    animation: ci-fade 0.35s ease-out;
  }

  @keyframes ci-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* 外框：只负责限高与滚动上限 */
  .card-wrap {
    position: relative;
    width: min(94vw, 440px);
    max-height: calc(100dvh - 24px);
    display: flex;
  }

  /* 入境卡：白卡 + 3px 白边 + 大圆角 + 硬投影 */
  .card {
    position: relative;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 22px 20px 0;
    box-sizing: border-box;
    text-align: center;
    background: var(--mat-plate);
    border: 3px solid #ffffff;
    border-radius: var(--r-xl);
    box-shadow: var(--sh-3);
    animation: ci-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    scrollbar-width: thin;
    scrollbar-color: #b6dcf2 transparent;
  }

  @keyframes ci-pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 逐行淡入：只动 transform + opacity（行内 80ms 错峰） */
  .row-in {
    animation: ci-row 0.32s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes ci-row {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 入境珊瑚印：全卡的主色标记 */
  .eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 4px 16px;
    border-radius: var(--r-pill);
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 3px;
    color: var(--coral-ink);
    background: var(--face-gold-plate);
    border: 2px solid #ffffff;
    box-shadow: 0 3px 0 var(--coral-edge);
  }

  h2 {
    margin: 2px 0 0;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: var(--text);
  }

  .tag {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    line-height: 1.6;
  }

  /* 本章要点：浅薄荷提示卡 */
  .intro {
    margin: 2px 0 0;
    padding: 10px 12px;
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r-sm);
    border: 2px solid var(--note-edge);
    background: var(--note-bg);
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.75;
    text-align: left;
  }

  .intro :global(b) {
    color: var(--coral-edge);
    font-weight: 800;
  }

  /* 元信息：白药丸 */
  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .meta > span {
    padding: 4px 10px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 2px solid var(--line);
  }

  .meta .k {
    color: var(--grape-deep);
  }

  .meta .dot {
    display: none;
  }

  /* 主操作常驻：面板内滚时按钮不掉出首屏 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 4px -20px 0;
    padding: 12px 20px 16px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0, #ffffff 18px);
  }

  /* 主操作：珊瑚厚键 */
  button.primary {
    width: 100%;
    min-height: var(--ctl-lg);
    padding: 0 20px;
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 800;
    letter-spacing: 1px;
    -webkit-tap-highlight-color: transparent;
  }

  /* 减弱动态效果：位移动画关闭（颜色/透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .ch-intro,
    .card,
    .row-in {
      animation: none;
    }
  }

  :global(.reduce-motion) .ch-intro,
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .row-in {
    animation: none;
  }

  /* 矮屏：收紧留白 */
  @media (max-height: 480px) {
    .card {
      gap: 10px;
      padding: 16px 18px 0;
    }
    h2 {
      font-size: 22px;
      letter-spacing: 1px;
    }
    .foot {
      margin: 2px -18px 0;
      padding: 10px 18px 14px;
    }
  }

  @media (max-width: 640px) {
    h2 {
      font-size: 23px;
    }
    .intro {
      font-size: 13px;
    }
  }
</style>
