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
    <div class="card">
      <!-- 逐行 80ms 错峰淡入（位移 ≤8px，只动 transform/opacity） -->
      <span class="eyebrow row-in" style="animation-delay: 0ms">— 入境 —</span>
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
        <button type="button" class="primary" onclick={onclose}>开 始 这 一 章</button>
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
    background: rgba(4, 6, 12, 0.86);
    backdrop-filter: blur(8px);
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
    width: min(94vw, 420px);
    max-height: calc(100dvh - 24px);
    display: flex;
  }

  /* 面板：平板 + 1px 描边，内部可滚，矮屏不裁 */
  .card {
    position: relative;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 18px 0;
    box-sizing: border-box;
    text-align: center;
    background: var(--metal);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    animation: ci-pop 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.3) transparent;
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

  /* 入境朱印：全卡唯一的朱砂色，作为章节标记 */
  .eyebrow {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: var(--fs-sm);
    letter-spacing: 4px;
    color: #fff1ed;
    padding: 3px 14px 3px 18px;
    border-radius: 4px;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    font-weight: 700;
  }

  h2 {
    margin: 2px 0 0;
    font-size: 26px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    letter-spacing: 5px;
    color: var(--gold-bright);
  }

  .tag {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.6;
  }

  /* 本章要点：左侧一条金线 + 正文，不再套凹槽 */
  .intro {
    margin: 2px 0 0;
    padding: 2px 0 2px 12px;
    width: 100%;
    box-sizing: border-box;
    border-left: 2px solid var(--edge);
    font-size: var(--fs-sm);
    color: var(--text);
    line-height: 1.8;
    text-align: left;
  }
  .intro :global(b) {
    color: var(--gold-bright);
    font-weight: 600;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: var(--fs-sm);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .meta .k {
    color: var(--cyan);
  }
  .meta .dot {
    color: var(--muted-2);
  }

  /* 主操作常驻：面板内滚时按钮不掉出首屏 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 4px -18px 0;
    padding: 12px 18px 16px;
    background: linear-gradient(
      180deg,
      rgba(11, 17, 30, 0) 0,
      rgba(11, 17, 30, 0.96) 16px,
      #0b111e
    );
  }

  /* 主操作：金色厚键 */
  button.primary {
    appearance: none;
    width: 100%;
    min-height: var(--ctl-lg);
    padding: 0 20px;
    border-radius: var(--ctl-radius-lg);
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 2px;
    color: #1a1002;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 3px 0 #7a4d05;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      background 0.12s ease;
  }
  button.primary:hover {
    background: var(--face-gold-hover);
  }
  button.primary:active {
    transform: translateY(2px);
  }

  /* 减弱动态效果：位移动画关闭（颜色/透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .card,
    .row-in {
      animation: none;
    }
  }
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .row-in {
    animation: none;
  }

  /* 矮屏：收紧留白 */
  @media (max-height: 480px) {
    .card {
      gap: 9px;
      padding: 16px 18px 0;
    }
    h2 {
      font-size: 21px;
      letter-spacing: 4px;
    }
    .foot {
      margin: 2px -18px 0;
      padding: 10px 18px 14px;
    }
    button.primary {
      min-height: 46px;
    }
  }
</style>
