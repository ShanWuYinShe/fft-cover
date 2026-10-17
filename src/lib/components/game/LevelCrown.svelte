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

<div class="stage-crown-bezel">
  <div class="crown-level-badge">
    <span class="crown-eyebrow font-celestial">{curChapterName}</span>
    <h1 class="crown-title font-celestial">
      {#if engine.endless}
        周天无尽 · 第 {engine.endlessWave} 宿
      {:else}
        {engine.level?.name ?? '自由星轨'}
      {/if}
    </h1>
  </div>

  {#if !engine.sandbox && engine.level}
    <div class="crown-star-sockets" title="本关星级进度（收集 35% / 65% / 90%）">
      <div
        class="star-gem-socket"
        class:lit={curStars >= 1}
        class:active={engine.starReached >= 1}
      >
        <span class="gem-star">★</span>
      </div>
      <div
        class="star-gem-socket"
        class:lit={curStars >= 2}
        class:active={engine.starReached >= 2}
      >
        <span class="gem-star">★</span>
      </div>
      <div
        class="star-gem-socket"
        class:lit={curStars >= 3}
        class:active={engine.starReached >= 3}
      >
        <span class="gem-star">★</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .stage-crown-bezel {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4);
    background: linear-gradient(
      90deg,
      rgba(245, 184, 65, 0.08) 0%,
      rgba(16, 23, 40, 0.95) 25%,
      rgba(16, 23, 40, 0.95) 75%,
      rgba(245, 184, 65, 0.08) 100%
    );
    border: 1px solid rgba(245, 184, 65, 0.3);
    border-radius: var(--radius-lg);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
  }

  .crown-level-badge {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .crown-eyebrow {
    font-size: var(--fs-xs);
    color: var(--gold-bright);
    letter-spacing: 2px;
    font-weight: 600;
  }

  .crown-title {
    margin: 0;
    font-size: 21px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2px;
    text-shadow: 0 0 14px rgba(245, 184, 65, 0.35);
  }

  .crown-star-sockets {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .star-gem-socket {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, #101626 40%, #060911 100%);
    border: 1.5px solid rgba(245, 184, 65, 0.25);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.8),
      0 2px 6px rgba(0, 0, 0, 0.4);
    position: relative;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .star-gem-socket .gem-star {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.12);
    line-height: 1;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .star-gem-socket.lit {
    border-color: #ffd700;
    background: radial-gradient(circle, #453008 0%, #1c1303 100%);
    box-shadow:
      0 0 14px rgba(245, 184, 65, 0.65),
      inset 0 1px 2px rgba(255, 255, 255, 0.7);
  }
  .star-gem-socket.lit .gem-star {
    color: #ffd700;
    text-shadow: 0 0 10px #ffd700;
    transform: scale(1.18);
  }

  .star-gem-socket.active {
    animation: star-burst 0.5s ease-out;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .stage-crown-bezel {
      padding: 6px 12px;
    }
    .crown-title {
      font-size: 16px;
    }
    .star-gem-socket {
      width: 26px;
      height: 26px;
    }
    .star-gem-socket .gem-star {
      font-size: 13px;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .stage-crown-bezel {
      display: none;
    }
  }
</style>
