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
      radial-gradient(circle at 50% 42%, rgba(47, 158, 127, 0.12), transparent 62%),
      rgba(5, 7, 14, 0.84);
    backdrop-filter: blur(5px);
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
    width: min(94vw, 420px);
    /* dvh 而非 vh：移动端 vh 含地址栏 */
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    /* 底部内距交给常驻动作栏（.foot）自带：sticky 底栏才能与滚动区下沿齐平 */
    padding: 24px 22px 0;
    text-align: center;
    border-radius: 20px;
    background: linear-gradient(170deg, rgba(24, 34, 58, 0.98), rgba(11, 16, 30, 0.99));
    border: 1px solid rgba(47, 158, 127, 0.4);
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.62),
      0 0 48px rgba(47, 158, 127, 0.08) inset;
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

  /* 入境小印：与全局朱印一致 */
  .eyebrow {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: var(--fs-sm);
    letter-spacing: 4px;
    color: #e9a99f;
    padding: 2px 10px;
    border: 1px solid rgba(192, 57, 43, 0.5);
    border-radius: 4px;
    background: rgba(192, 57, 43, 0.12);
  }

  h2 {
    margin: 2px 0 0;
    font-size: 24px;
    letter-spacing: 5px;
    background: linear-gradient(96deg, #8ff2e6, var(--cyan) 55%, #c4b5fd);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .tag {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.7;
  }

  .intro {
    margin: 2px 0 0;
    padding: 10px 12px;
    width: 100%;
    border-radius: var(--r-sm);
    background: rgba(47, 158, 127, 0.09);
    border: 1px dashed rgba(47, 158, 127, 0.42);
    font-size: var(--fs-sm);
    color: var(--text);
    line-height: 1.85;
    text-align: left;
  }
  .intro :global(b) {
    color: #7fe3c4;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .meta .k {
    color: #c4b5fd;
  }
  .meta .dot {
    color: var(--muted-2);
  }

  /* 动作常驻：矮屏（手机横屏）内容一滚，主按钮不能掉到首屏之外 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 0 -22px;
    padding: 10px 22px 20px;
    background: linear-gradient(
      180deg,
      rgba(11, 16, 30, 0) 0,
      rgba(11, 16, 30, 0.96) 16px,
      #0b101e 100%
    );
  }

  button.primary {
    width: 100%;
    min-height: 44px;
    font-size: var(--fs-md);
    letter-spacing: 2px;
  }
</style>
