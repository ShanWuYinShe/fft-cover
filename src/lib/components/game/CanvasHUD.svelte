<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { levelGoals } from '../../game/goals';
  import { uiState } from '../../stores/uiState.svelte';

  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);

  /** 幽灵竞速差值文案：领先/落后上届多少点 */
  const ghostLabel = $derived.by(() => {
    if (!engine.ghostComparable) return '';
    if (engine.phase !== 'running' && engine.phase !== 'paused') return '';
    const d = engine.ghostDelta;
    const vs = engine.raceIsBest ? '最佳' : '上届';
    return d > 0 ? '👻 +' + d + ' 领先' + vs : d < 0 ? '👻 ' + d + ' 落后' + vs : '👻 持平';
  });

  function onLevelClick(): void {
    if (window.innerWidth <= 640) {
      uiState.mobileTab = uiState.mobileTab === 'levels' ? 'arms' : 'levels';
      uiState.panelExpanded = true;
    } else {
      uiState.toggleStarmap();
    }
  }
</script>

<!-- 画布内 HUD：贴角读数，不遮挡中央星域 -->
<div class="hud">
  <div class="hud-tl">
    <button type="button" class="hud-lvl-badge" title="切换关卡或打开星图" onclick={onLevelClick}>
      <span class="lvl-ico">
        {#if engine.endless}
          <Icon name="infinity" size={14} />
        {:else}
          <Icon name="grid" size={14} />
        {/if}
      </span>
      <span class="lvl-title">
        {#if engine.endless}
          第 {engine.endlessWave} 波 · 累计 {engine.endlessScore} 分
        {:else}
          {engine.level?.name ?? '自由'}{#if engine.sandbox}&nbsp;<Icon
              name="flask"
              size={12}
            />{/if}
        {/if}
      </span>
      <span class="lvl-caret">▾</span>
    </button>

    {#if ghostLabel}
      <span
        class="ghost-chip font-tabular"
        class:ahead={engine.ghostDelta > 0}
        class:behind={engine.ghostDelta < 0}
        title="与{engine.raceIsBest ? '个人最佳' : '上届'}同一时刻的收集数对比"
      >
        {ghostLabel}
      </span>
    {/if}
  </div>

  <div class="hud-tr">
    <div
      class="collect-readout"
      style="--progress: {engine.total ? (engine.collectedCount / engine.total) * 100 : 0}%"
      title="本局已收集 / 目标总数"
    >
      <span class="g-label collect-label">收集</span>
      <span class="collect-value">
        {#key engine.collectedCount}
          <b class="g-num hud-pulse font-tabular">{engine.collectedCount}</b>
        {/key}
        <i class="collect-total font-tabular">/{engine.total}</i>
      </span>
      <span class="collect-bar" aria-hidden="true"></span>
      {#if ghostLabel}
        <i class="ghost-tick" style="left: {engine.ghostRatio * 100}%"></i>
      {/if}
    </div>

    <div class="hud-tr-row">
      {#if engine.level}
        <button
          type="button"
          class="hud-seal font-celestial"
          title={'本关朱印 ' + sealDone + '/4（星 满 准 专）——点开图鉴与成就'}
          onclick={() => (uiState.showAchv = true)}
        >
          <span class="seal-mark">印</span>
          <b class="font-tabular">{sealDone}</b><i>/4</i>
        </button>
      {/if}

      <button
        type="button"
        class="hud-settings-btn mobile-only-btn"
        title="设置"
        aria-label="设置"
        onclick={() => (uiState.showSettings = true)}
      >
        <Icon name="gear" size={15} />
      </button>
    </div>
  </div>
</div>

<style>
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 10px 12px;
    z-index: 8;
  }
  .hud > * {
    pointer-events: auto;
  }

  .hud-tl {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    max-width: 60%;
  }

  .hud-lvl-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 12px;
    border-radius: 9px;
    background: linear-gradient(180deg, rgba(16, 24, 41, 0.94), rgba(6, 10, 19, 0.96));
    border: 1px solid var(--edge-soft);
    color: var(--gold-bright);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    box-shadow:
      var(--bevel-top),
      0 4px 14px rgba(0, 0, 0, 0.5);
    transition: all 0.12s ease;
  }
  .hud-lvl-badge:hover {
    border-color: var(--edge);
    color: #fff;
    box-shadow:
      var(--bevel-top),
      0 6px 18px rgba(245, 184, 65, 0.25);
  }

  .lvl-ico {
    display: flex;
    align-items: center;
    color: var(--gold);
  }
  .lvl-title {
    color: var(--text);
    white-space: nowrap;
  }
  .lvl-caret {
    font-size: 9px;
    color: var(--gold);
  }

  /* ---------- 右上：大号收集读数 ---------- */
  .hud-tr {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .collect-readout {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    min-width: 116px;
    padding: 6px 12px 9px;
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(16, 24, 41, 0.94), rgba(6, 10, 19, 0.96));
    border: 1px solid var(--edge-soft);
    box-shadow:
      var(--bevel-top),
      0 4px 14px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  .collect-label {
    font-size: 10px;
    letter-spacing: 4px;
    color: var(--gold);
  }
  .collect-value {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
  }
  .collect-value b {
    font-size: 30px;
  }
  .collect-total {
    font-style: normal;
    font-size: 14px;
    font-weight: 700;
    color: var(--muted);
  }
  .collect-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    width: var(--progress, 0%);
    background: linear-gradient(90deg, #10b981 0%, #00f5d4 50%, #f5b841 100%);
    box-shadow: 0 0 8px rgba(0, 245, 212, 0.7);
    transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ghost-tick {
    position: absolute;
    bottom: 0;
    width: 2px;
    height: 8px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--gold);
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.8);
  }

  .ghost-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(8, 12, 22, 0.9);
    border: 1px solid var(--edge-soft);
    font-size: 12px;
    color: var(--gold);
    letter-spacing: 0.5px;
  }
  .ghost-chip.ahead {
    border-color: rgba(0, 245, 212, 0.55);
    color: var(--cyan);
  }
  .ghost-chip.behind {
    border-color: rgba(248, 113, 113, 0.55);
    color: #f87171;
  }

  .hud-tr-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .hud-seal {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 10px;
    border-radius: 9px;
    border: 1px solid rgba(217, 43, 43, 0.55);
    background: linear-gradient(180deg, rgba(120, 26, 26, 0.8), rgba(60, 12, 12, 0.88));
    color: #ffd7d7;
    font-size: 12px;
    letter-spacing: 1px;
    box-shadow:
      var(--bevel-top),
      0 3px 10px rgba(0, 0, 0, 0.4);
    transition: all 0.12s ease;
  }
  .seal-mark {
    font-size: 11px;
    color: #ff8585;
  }
  .hud-seal b {
    font-size: 15px;
    font-weight: 900;
    color: #fff;
  }
  .hud-seal i {
    font-style: normal;
    font-size: 11px;
    opacity: 0.65;
  }
  .hud-seal:hover {
    color: #ffffff;
    border-color: rgba(217, 43, 43, 0.85);
    box-shadow:
      var(--bevel-top),
      0 0 14px rgba(217, 43, 43, 0.45);
  }

  .mobile-only-btn {
    display: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .hud {
      padding: 6px 8px;
    }
    /* 触屏下限 40px：画布内 HUD 的三枚可点件都要够高 */
    .hud-lvl-badge {
      height: 40px;
      padding: 0 10px;
      font-size: 11px;
    }
    .hud-lvl-badge .lvl-title {
      font-size: 11px;
    }
    .collect-readout {
      min-width: 96px;
      padding: 4px 9px 7px;
    }
    .collect-label {
      font-size: 9px;
      letter-spacing: 3px;
    }
    .collect-value b {
      font-size: 24px;
    }
    .collect-total {
      font-size: 12px;
    }
    .mobile-only-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(8, 12, 22, 0.9);
      border: 1px solid var(--edge-soft);
      border-radius: 8px;
      color: var(--muted);
      box-shadow:
        var(--bevel-top),
        0 2px 6px rgba(0, 0, 0, 0.35);
    }
    .hud-seal {
      height: 40px;
      padding: 0 10px;
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .hud-seal {
      display: none;
    }
  }

  /* 触屏（含横屏手机）：画布内可点件一律 ≥40px 热区 */
  @media (pointer: coarse) {
    .hud-lvl-badge {
      height: 40px;
    }
    .hud-seal {
      height: 40px;
      padding: 0 10px;
    }
    .mobile-only-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(8, 12, 22, 0.9);
      border: 1px solid var(--edge-soft);
      border-radius: 8px;
      color: var(--muted);
      box-shadow:
        var(--bevel-top),
        0 2px 6px rgba(0, 0, 0, 0.35);
    }
  }

  /* 矮横屏：画布很小，收起朱印读数，给画布让路 */
  @media (orientation: landscape) and (max-height: 700px) {
    .hud-seal {
      display: none;
    }
  }
</style>
