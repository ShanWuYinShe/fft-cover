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
  <div class="card">
    <span class="eyebrow">— 入境 —</span>
    <h2>{chapter.name}</h2>
    <p class="tag">{chapter.tagline}</p>
    <p class="intro">{@html chapter.intro}</p>
    <div class="meta">
      <span class="k" title="本章调性：进章即转调">♪ {keyName}</span>
      <span class="dot">·</span>
      <span>{chapter.levels.length} 关</span>
      <span class="dot">·</span>
      <span>★ {chapter.stars}/{chapter.maxStars}</span>
    </div>
    <div class="foot">
      <button type="button" class="primary" onclick={onclose}>开始这一章</button>
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
    padding: 16px;
    background:
      radial-gradient(circle at 50% 40%, rgba(245, 197, 66, 0.08), transparent 60%),
      radial-gradient(circle at 50% 60%, rgba(45, 212, 191, 0.06), transparent 70%),
      rgba(5, 7, 13, 0.88);
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

  .card {
    position: relative;
    width: min(94vw, 420px);
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 28px 24px 0;
    text-align: center;
    background: linear-gradient(170deg, rgba(17, 24, 39, 0.98), rgba(9, 13, 22, 0.99));
    border: 1px solid rgba(245, 197, 66, 0.35);
    clip-path: polygon(
      0 14px,
      14px 0,
      calc(100% - 14px) 0,
      100% 14px,
      100% calc(100% - 14px),
      calc(100% - 14px) 100%,
      14px 100%,
      0 calc(100% - 14px)
    );
    box-shadow:
      0 26px 70px rgba(0, 0, 0, 0.75),
      0 0 50px rgba(245, 197, 66, 0.08) inset;
    animation: ci-pop 0.45s cubic-bezier(0.34, 1.44, 0.64, 1);
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
  }

  h2 {
    margin: 4px 0 0;
    font-size: 26px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    letter-spacing: 6px;
    background: linear-gradient(96deg, #fff7ed 0%, var(--gold-bright) 50%, #fed7aa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 0 20px rgba(245, 197, 66, 0.3);
  }

  .tag {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.6;
    letter-spacing: 1px;
  }

  .intro {
    margin: 4px 0 0;
    padding: 12px 14px;
    width: 100%;
    border-radius: var(--r-sm);
    background: rgba(45, 212, 191, 0.05);
    border: 1px dashed rgba(45, 212, 191, 0.35);
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
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: var(--fs-xs);
    color: var(--muted);
    padding: 4px 0;
  }
  .meta .k {
    color: var(--cyan);
    font-weight: 600;
  }
  .meta .dot {
    color: var(--muted-2);
  }

  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 4px -24px 0;
    padding: 12px 24px 20px;
    background: linear-gradient(
      180deg,
      rgba(9, 13, 22, 0) 0,
      rgba(9, 13, 22, 0.96) 16px,
      #090d16 100%
    );
  }

  button.primary {
    width: 100%;
    min-height: 44px;
    font-size: var(--fs-md);
    letter-spacing: 3px;
  }
</style>
