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
  <!-- 入境铭牌：金属面板 + 四角包边 + 缎带标题（包边在滚动容器外，避免被裁） -->
  <div class="card-wrap">
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>
    <div class="card">
      <span class="g-scanlines card-scan" aria-hidden="true"></span>

      <span class="eyebrow">— 入境 —</span>
      <h2>{chapter.name}</h2>
      <p class="tag">{chapter.tagline}</p>
      <span class="g-divider card-div" aria-hidden="true"></span>
      <p class="intro">{@html chapter.intro}</p>
      <div class="meta">
        <span class="k" title="本章调性：进章即转调">♪ {keyName}</span>
        <span class="dot">·</span>
        <span>{chapter.levels.length} 关</span>
        <span class="dot">·</span>
        <span>★ {chapter.stars}/{chapter.maxStars}</span>
      </div>
      <div class="foot">
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
    background:
      radial-gradient(circle at 50% 40%, rgba(245, 184, 65, 0.1), transparent 60%),
      radial-gradient(circle at 50% 60%, rgba(0, 245, 212, 0.06), transparent 70%),
      rgba(4, 6, 12, 0.88);
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

  /* 外框：承载四角包边，不参与滚动 */
  .card-wrap {
    position: relative;
    width: min(94vw, 420px);
    max-height: calc(100dvh - 24px);
    display: flex;
  }

  /* 座舱铭牌面板：内滚，矮屏也不裁 */
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
    padding: 26px 22px 0;
    box-sizing: border-box;
    text-align: center;
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 45%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: var(--radius-md);
    box-shadow:
      var(--sh-game-lg),
      var(--bevel-top),
      inset 0 0 60px rgba(245, 184, 65, 0.05);
    animation: ci-pop 0.45s cubic-bezier(0.34, 1.44, 0.64, 1);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
  }
  /* 顶部亮金发丝线 */
  .card::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 15%,
      var(--edge-hot) 85%,
      transparent
    );
    opacity: 0.75;
    pointer-events: none;
  }
  @keyframes ci-pop {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .card-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0.7;
  }

  /* 入境朱印：古朴庄重 */
  .eyebrow {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: var(--fs-xs);
    letter-spacing: 5px;
    color: #fff1ed;
    padding: 3px 14px 3px 18px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    box-shadow: 0 4px 12px rgba(192, 57, 43, 0.4);
    font-weight: 700;
    position: relative;
  }

  h2 {
    position: relative;
    margin: 4px 0 0;
    font-size: 26px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    letter-spacing: 6px;
    background: linear-gradient(96deg, #fff7ed 0%, var(--gold-bright) 50%, #fed7aa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 20px rgba(245, 184, 65, 0.3);
  }

  .tag {
    position: relative;
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.6;
    letter-spacing: 1px;
  }

  .card-div {
    position: relative;
    width: 100%;
    margin: 0;
  }

  /* 章节简介：嵌进面板的青色凹槽 */
  .intro {
    position: relative;
    margin: 0;
    padding: 12px 14px;
    width: 100%;
    box-sizing: border-box;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, rgba(4, 12, 14, 0.92), rgba(6, 10, 14, 0.9));
    border: 1px solid rgba(0, 245, 212, 0.28);
    box-shadow: var(--bevel-inset);
    font-size: var(--fs-sm);
    color: var(--text);
    line-height: 1.85;
    text-align: left;
  }
  .intro :global(b) {
    color: var(--gold-bright);
    font-weight: 600;
  }

  .meta {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: var(--fs-xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    padding: 2px 0;
  }
  .meta .k {
    color: var(--cyan);
    font-weight: 700;
    letter-spacing: 1px;
  }
  .meta .dot {
    color: var(--muted-2);
  }

  /* 动作常驻：面板内滚时按钮不掉出首屏 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 4px -22px 0;
    padding: 12px 22px 18px;
    background: linear-gradient(180deg, rgba(9, 13, 22, 0) 0, rgba(9, 13, 22, 0.96) 16px, #090d16);
  }

  /* 主按钮：金色厚键（与 .g-btn--primary .g-btn--lg 同规格） */
  button.primary {
    appearance: none;
    position: relative;
    width: 100%;
    min-height: 52px;
    padding: 0 24px;
    border-radius: 12px;
    cursor: pointer;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: 4px;
    color: #1a1002;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 4px 0 #7a4d05,
      0 10px 26px rgba(245, 184, 65, 0.35);
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  button.primary:hover {
    background: var(--face-gold-hover);
  }
  button.primary:active {
    transform: translateY(3px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  /* 矮屏：收紧留白 */
  @media (max-height: 480px) {
    .card {
      gap: 8px;
      padding: 16px 18px 0;
    }
    h2 {
      font-size: 21px;
      letter-spacing: 4px;
    }
    .intro {
      padding: 9px 11px;
      line-height: 1.65;
    }
    .foot {
      margin: 2px -18px 0;
      padding: 9px 18px 14px;
    }
    button.primary {
      min-height: 46px;
    }
  }
</style>
