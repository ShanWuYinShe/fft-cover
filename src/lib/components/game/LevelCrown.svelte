<script lang="ts">
  import { CHAPTERS } from '../../game/levels';
  import { engine } from '../../game/engine.svelte';

  const curChapter = $derived(CHAPTERS.find((c) => c.id === engine.level?.chapter));
  const curChapterName = $derived(
    engine.endless
      ? '周天无尽 · 演武'
      : engine.sandbox
        ? '万象演道 · 沙盒'
        : (curChapter?.name ?? '周天星图'),
  );
  const curStars = $derived(engine.level?.id ? (engine.bestStars[engine.level.id] ?? 0) : 0);
</script>

<!-- 关卡缎带：白药丸 + 珊瑚字（浮在画布左上角） -->
<div class="stage-crown-bezel">
  <div class="crown-level-badge">
    <span class="crown-eyebrow">{curChapterName}</span>
    <h1 class="crown-title">
      {#if engine.endless}
        周天无尽 · 第 {engine.endlessWave} 宿
      {:else}
        {engine.level?.name ?? '自由星轨'}
      {/if}
    </h1>
  </div>

  {#if !engine.sandbox && engine.level}
    <div class="crown-star-sockets" title="本关星级进度（收集 35% / 65% / 90%）">
      <div class="star-gem-socket" class:lit={curStars >= 1} class:active={engine.starReached >= 1}>
        <span class="gem-star">★</span>
      </div>
      <div class="star-gem-socket" class:lit={curStars >= 2} class:active={engine.starReached >= 2}>
        <span class="gem-star">★</span>
      </div>
      <div class="star-gem-socket" class:lit={curStars >= 3} class:active={engine.starReached >= 3}>
        <span class="gem-star">★</span>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ============================================================
   * 关卡缎带 · 白药丸（第十四轮）
   * 白面 + 珊瑚字 + 底部 4px 硬投影；三个星位是浅蓝圆槽。
   * ============================================================ */
  .stage-crown-bezel {
    position: fixed;
    top: calc(var(--hud-h) + 8px);
    left: 12px;
    z-index: 18;
    width: auto;
    max-width: min(520px, calc(100vw - 24px));
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 5px 8px 5px 16px;
    box-sizing: border-box;
    background: #ffffff;
    border: 3px solid #ffffff;
    border-radius: var(--r-pill);
    box-shadow: var(--sh-1);
    pointer-events: none;
  }

  .crown-level-badge {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  /* 抬头小字：章节名 */
  .crown-eyebrow {
    font-family: var(--font-round);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--muted);
    white-space: nowrap;
  }

  /* 关卡名：珊瑚深字（白底 5.2:1） */
  .crown-title {
    margin: 0;
    font-family: var(--font-round);
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--coral-edge);
    white-space: nowrap;
  }

  .crown-star-sockets {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
    padding: 2px 4px;
    border-radius: var(--r-pill);
    background: var(--bg-chassis);
  }

  /* 星位 = 浅蓝圆槽；点亮后是珊瑚实心星（不发光） */
  .star-gem-socket {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-2);
    transition:
      background 240ms ease,
      transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .star-gem-socket .gem-star {
    font-size: 12px;
    line-height: 1;
    color: #6f96ab;
    transition:
      color 240ms ease,
      transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .star-gem-socket.lit {
    background: var(--bg-2);
    box-shadow: 0 2px 0 var(--mat-frame-line);
  }
  .star-gem-socket.lit .gem-star {
    color: var(--coral-text);
    transform: scale(1.12);
  }

  .star-gem-socket.active {
    animation: star-burst 0.5s ease-out;
  }
  @keyframes star-burst {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.18);
    }
    100% {
      transform: scale(1);
    }
  }

  /* ---------- 手机竖屏：压缩成一条窄药丸 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .stage-crown-bezel {
      padding: 4px 6px 4px 12px;
      gap: 8px;
    }
    .crown-level-badge {
      gap: 8px;
    }
    .crown-eyebrow {
      font-size: var(--fs-xs);
      letter-spacing: 0.5px;
    }
    .crown-title {
      font-size: 15px;
      letter-spacing: 0.5px;
    }
    .crown-star-sockets {
      gap: 2px;
      padding: 1px 3px;
    }
    .star-gem-socket {
      width: 20px;
      height: 20px;
    }
    .star-gem-socket .gem-star {
      font-size: 12px;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .crown-eyebrow {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .star-gem-socket,
    .star-gem-socket .gem-star,
    .star-gem-socket.active {
      animation: none;
      transition: none;
    }
    .star-gem-socket.lit .gem-star {
      transform: none;
    }
  }
  :global(.reduce-motion) .star-gem-socket,
  :global(.reduce-motion) .star-gem-socket .gem-star,
  :global(.reduce-motion) .star-gem-socket.active {
    animation: none;
    transition: none;
  }
  :global(.reduce-motion) .star-gem-socket.lit .gem-star {
    transform: none;
  }
</style>
