<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { levelGoals } from '../../game/goals';
  import { chapterProgress } from '../../game/campaign';
  import { uiState } from '../../stores/uiState.svelte';

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const maxStars = LEVEL_DEFS.length * 3;
  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);
  /** 星图开关状态：开时贴图出口高亮 */
  const smOpen = $derived(uiState.starMapOpen);

  /** 当前章节进度：顶栏中段的 HUD 读数（比全局星数更有“正在打哪一章”的游戏感） */
  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));
  const curChapter = $derived.by(() => {
    const id = engine.level?.chapter;
    const idx = chapters.findIndex((c) => c.id === id);
    return idx < 0 ? null : { ...chapters[idx], index: idx + 1 };
  });
</script>

<header class="game-hud-bar">
  <div class="hud-left">
    <button
      type="button"
      class="hud-starmap-btn"
      class:active={smOpen}
      title="打开/收起周天星图"
      onclick={() => uiState.toggleStarmap()}
    >
      <span class="starmap-ico"><Icon name="map" size={16} /></span>
      <span class="starmap-label font-celestial">周天星图</span>
      <span class="starmap-stars font-tabular">
        <span class="star-glyph">★</span>{totalStars}<i>/{maxStars}</i>
      </span>
      <span class="starmap-caret">{smOpen ? '◂' : '▾'}</span>
    </button>

    <span class="hud-sep" aria-hidden="true"></span>

    <div class="hud-readout" title={curChapter ? '本章星数进度' : '已收集总星数'}>
      <span class="g-label hud-readout-label"
        >{curChapter ? '第 ' + curChapter.index + ' 章' : '星辰'}</span
      >
      {#if curChapter}
        <span class="g-num hud-readout-num">{curChapter.stars}</span>
        <span class="hud-readout-sub font-tabular">/{curChapter.maxStars} ★</span>
      {:else}
        <span class="g-num hud-readout-num">{totalStars}</span>
      {/if}
    </div>
  </div>

  <div class="hud-center-brand">
    <button
      type="button"
      class="title-btn"
      title="查看游戏题序与浑天典仪"
      onclick={() => (uiState.showTitle = true)}
    >
      <span class="brand-flare" aria-hidden="true">✦</span>
      <span class="title-brand font-celestial">浑 天 璇 玑</span>
      <span class="brand-seal">傅立叶</span>
      <span class="brand-flare" aria-hidden="true">✦</span>
    </button>
  </div>

  <div class="hud-right-actions">
    {#if engine.level}
      <button
        type="button"
        class="hud-seal-badge"
        title="本关朱印成就（星·满·准·专）"
        onclick={() => (uiState.showAchv = true)}
      >
        <span class="seal-glyph">◈</span>
        <span class="seal-text">朱印</span>
        <span class="seal-num font-tabular">{sealDone}<i>/4</i></span>
      </button>
    {/if}
    <button
      type="button"
      class="hud-action-btn"
      title="成就与图鉴"
      aria-label="成就"
      onclick={() => (uiState.showAchv = true)}
    >
      <Icon name="trophy" size={17} />
    </button>
    <button
      type="button"
      class="hud-action-btn"
      title="设置"
      aria-label="设置"
      onclick={() => (uiState.showSettings = true)}
    >
      <Icon name="gear" size={17} />
    </button>
  </div>

  <!-- 底部亮金发丝线：把顶栏缝进座舱 -->
  <span class="hud-underline" aria-hidden="true"></span>
</header>

<style>
  /* ============================================================
   * 顶栏：整屏通栏的座舱天穹 HUD（不再是一枚漂浮胶囊）
   * ============================================================ */
  .game-hud-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 100%;
    width: 100%;
    padding: 0 14px 0 12px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(17, 26, 45, 0.98) 0%, rgba(7, 11, 20, 0.99) 100%);
    border-bottom: 1px solid var(--edge);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 10px 26px rgba(0, 0, 0, 0.6);
    z-index: 20;
  }

  .hud-underline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(245, 184, 65, 0.65) 12%,
      rgba(0, 245, 212, 0.5) 50%,
      rgba(245, 184, 65, 0.65) 88%,
      transparent
    );
    opacity: 0.75;
    pointer-events: none;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 0;
  }

  /* ---------- 星图出入口：机箱上的大按键 ---------- */
  .hud-starmap-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    background: var(--face-metal);
    border: 1px solid var(--edge);
    color: var(--text);
    font-size: 14px;
    font-weight: 700;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 6px 16px rgba(0, 0, 0, 0.45);
    transition:
      transform 0.09s ease,
      box-shadow 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .hud-starmap-btn:hover {
    background: var(--face-metal-hover);
    border-color: var(--edge-hot);
    color: var(--gold-bright);
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 0 18px rgba(245, 184, 65, 0.28);
  }
  .hud-starmap-btn:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-inset);
  }
  .hud-starmap-btn.active {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 #7a4d05;
  }

  .starmap-ico {
    color: var(--gold-bright);
    display: inline-flex;
  }
  .hud-starmap-btn.active .starmap-ico {
    color: #4a2c02;
  }
  .starmap-label {
    letter-spacing: 1.5px;
  }
  .starmap-stars {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 800;
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.12);
    border: 1px solid var(--edge-soft);
    padding: 2px 7px;
    border-radius: 5px;
  }
  .hud-starmap-btn.active .starmap-stars {
    background: rgba(0, 0, 0, 0.18);
    border-color: rgba(74, 44, 2, 0.4);
    color: #4a2c02;
  }
  .starmap-stars .star-glyph {
    font-size: 10px;
  }
  .starmap-stars i {
    font-style: normal;
    opacity: 0.6;
    font-weight: 600;
  }
  .starmap-caret {
    font-size: 10px;
    opacity: 0.7;
  }

  .hud-sep {
    width: 1px;
    height: 24px;
    background: linear-gradient(180deg, transparent, var(--edge-soft), transparent);
  }

  /* ---------- 星辰读数：大数字 HUD ---------- */
  .hud-readout {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hud-readout-label {
    letter-spacing: 2px;
  }
  .hud-readout-num {
    font-size: 22px;
  }
  .hud-readout-sub {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
  }

  /* ---------- 中央品牌 ---------- */
  .hud-center-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 1 auto;
  }
  .title-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  .title-btn:hover {
    border-color: var(--edge-soft);
    background: rgba(245, 184, 65, 0.06);
  }
  .brand-flare {
    color: rgba(245, 184, 65, 0.55);
    font-size: 11px;
  }
  .title-brand {
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 3px;
    text-shadow: 0 0 16px rgba(245, 184, 65, 0.35);
    white-space: nowrap;
  }
  .title-btn:hover .title-brand {
    color: var(--gold-bright);
    text-shadow: 0 0 22px rgba(245, 184, 65, 0.75);
  }

  .brand-seal {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border: 1px solid rgba(255, 255, 255, 0.28);
    padding: 2px 5px;
    border-radius: 3px;
    letter-spacing: 1px;
    line-height: 1.2;
    box-shadow: 0 2px 8px rgba(192, 57, 43, 0.5);
  }

  /* ---------- 右侧：朱印读数 + 图标键 ---------- */
  .hud-right-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 0;
    justify-content: flex-end;
  }

  .hud-seal-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    background: linear-gradient(180deg, rgba(120, 26, 26, 0.85), rgba(70, 14, 14, 0.9));
    border: 1px solid rgba(217, 43, 43, 0.6);
    color: #ffd7d7;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.12s ease;
  }
  .hud-seal-badge:hover {
    border-color: #fca5a5;
    color: #fff;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 0 16px rgba(217, 43, 43, 0.5);
  }
  .seal-glyph {
    color: #ff8585;
    font-size: 13px;
  }
  .seal-num {
    font-size: 15px;
    font-weight: 900;
    color: #fff;
  }
  .seal-num i {
    font-style: normal;
    font-size: 11px;
    opacity: 0.65;
    font-weight: 700;
  }

  .hud-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    background: var(--face-metal);
    border: 1px solid var(--edge-soft);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.12s ease;
  }
  .hud-action-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 0 16px rgba(245, 184, 65, 0.25);
  }
  .hud-action-btn:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-inset);
  }

  /* 中等宽度：收起次要读数，保证星图键与右侧图标不被挤压 */
  @media (max-width: 1120px) {
    .hud-readout,
    .hud-sep {
      display: none;
    }
    .brand-flare {
      display: none;
    }
  }
  @media (max-width: 900px) {
    .starmap-label {
      display: none;
    }
    .title-brand {
      font-size: 15px;
      letter-spacing: 2px;
    }
  }

  /* 手机（竖屏/横屏）走 CanvasHUD 内的紧凑 HUD，顶栏让位给画布 */
  @media (max-width: 640px) and (orientation: portrait) {
    .game-hud-bar {
      display: none;
    }
  }
  @media (max-width: 900px) and (orientation: landscape) {
    .game-hud-bar {
      display: none;
    }
  }
</style>
