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

<!-- 关卡缎带：章节 · 关卡名 · 星槽（贴在画布上方的一条青铜铭牌） -->
<div class="stage-crown-bezel">
  <span class="crown-cap left" aria-hidden="true"></span>
  <span class="crown-cap right" aria-hidden="true"></span>

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
   * 关卡缎带：一条横贯舞台顶部的铭牌，两端有菱形收口
   * ============================================================ */
  .stage-crown-bezel {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 14px;
    box-sizing: border-box;
    background: transparent;
    border-top: 1px solid transparent;
    border-bottom: 1px solid var(--edge-faint);
  }

  /* 两端的菱形收口：D 的定稿取消了（base.css:353 display:none），保留 DOM 与规则便于回退 */
  .crown-cap {
    display: none;
    position: absolute;
    top: 50%;
    width: 8px;
    height: 8px;
    transform: translateY(-50%) rotate(45deg);
    background: var(--metal-2);
    border: 1px solid var(--edge-soft);
  }
  .crown-cap.left {
    left: -4px;
  }
  .crown-cap.right {
    right: -4px;
  }

  .crown-level-badge {
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
  }

  /* 抬头小字：11px 次级暖灰（mockup 实测 11px/700/ls1.4/muted） */
  .crown-eyebrow {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1.4px;
    font-weight: 700;
    white-space: nowrap;
  }

  /* 关卡名：15px 金漆浮雕（mockup 实测 #ffd166 + 1px 暗描边 + 12px 暖光） */
  .crown-title {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--gold-bright);
    letter-spacing: 1px;
    text-shadow: var(--thumb-shadow);
    white-space: nowrap;
  }

  .crown-star-sockets {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  /* 星位 = 素环（mockup：background:none / 1px 铜边 / 无内影无外光），反馈只由星形自己给 */
  .star-gem-socket {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--plate-brass-line);
    box-shadow: none;
    position: relative;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .star-gem-socket .gem-star {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.12);
    line-height: 1;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* 点亮 = 星形变金 + 暖光 + 轻微放大（环保持素环，不再叠第二层发光） */
  .star-gem-socket.lit .gem-star {
    color: var(--gold-bright);
    text-shadow: var(--thumb-shadow);
    transform: scale(1.18);
  }

  .star-gem-socket.active {
    animation: star-burst 0.5s ease-out;
  }

  /* ---------- 手机竖屏：压缩成一条窄铭牌 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .stage-crown-bezel {
      padding: 4px 12px;
    }
    .crown-level-badge {
      gap: 8px;
    }
    .crown-eyebrow {
      font-size: 10px;
      letter-spacing: 1.5px;
    }
    .crown-title {
      font-size: 16px;
      letter-spacing: 1.5px;
    }
    .crown-star-sockets {
      gap: 5px;
    }
    .star-gem-socket {
      width: 22px;
      height: 22px;
    }
    .star-gem-socket .gem-star {
      font-size: 11px;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .crown-eyebrow {
      display: none;
    }
  }
</style>
