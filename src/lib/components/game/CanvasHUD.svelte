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

<div class="hud">
  <button type="button" class="hud-lvl-badge" title="切换关卡或打开星图" onclick={onLevelClick}>
    <span class="lvl-ico">
      {#if engine.endless}
        <Icon name="infinity" size={13} />
      {:else}
        ☰
      {/if}
    </span>
    <span class="lvl-title">
      {#if engine.endless}
        第 {engine.endlessWave} 波 · 累计 {engine.endlessScore} 分
      {:else}
        {engine.level?.name ?? '自由'}{#if engine.sandbox}&nbsp;<Icon name="flask" size={12} />{/if}
      {/if}
    </span>
    <span class="lvl-caret">▾</span>
  </button>

  <div class="hud-right">
    <span
      class="score"
      style="--progress: {engine.total ? (engine.collectedCount / engine.total) * 100 : 0}%"
    >
      收集
      {#key engine.collectedCount}
        <b class="hud-pulse font-tabular">{engine.collectedCount}</b>
      {/key}
      /{engine.total}
      {#if ghostLabel}
        <i class="ghost-tick" style="left: {engine.ghostRatio * 100}%"></i>
      {/if}
    </span>

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

    {#if engine.level}
      <button
        type="button"
        class="hud-seal font-celestial"
        title={'本关朱印 ' + sealDone + '/4（星 满 准 专）——点开图鉴与成就'}
        onclick={() => (uiState.showAchv = true)}
      >
        印 <b>{sealDone}</b>/4
      </button>
    {/if}

    <button
      type="button"
      class="hud-settings-btn mobile-only-btn"
      title="设置"
      aria-label="设置"
      onclick={() => (uiState.showSettings = true)}
    >
      <Icon name="gear" size={13} />
    </button>
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
    padding: 12px 14px;
    font-size: var(--fs-md);
    color: var(--muted);
    z-index: 8;
  }
  .hud > * {
    pointer-events: auto;
  }

  .hud-lvl-badge {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    background: rgba(8, 12, 22, 0.88);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(245, 184, 65, 0.26);
    color: var(--gold-bright);
    font-weight: 600;
    font-size: var(--fs-sm);
    letter-spacing: 0.5px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .hud-lvl-badge:hover {
    border-color: var(--gold);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(245, 184, 65, 0.25);
  }

  .lvl-ico {
    display: flex;
    align-items: center;
    color: var(--gold);
    font-size: 11px;
  }
  .lvl-title {
    color: var(--text);
  }
  .lvl-caret {
    font-size: 9px;
    color: var(--gold);
  }

  .hud-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }

  .score {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 5px 12px 7px;
    border-radius: 14px;
    background: rgba(16, 21, 42, 0.88);
    border: 1px solid var(--line);
    font-size: var(--fs-xs);
    letter-spacing: 0.5px;
    position: relative;
    overflow: hidden;
  }

  .score b {
    color: var(--text);
    font-size: 21px;
    font-weight: 800;
    line-height: 1;
    text-shadow: 0 0 14px rgba(232, 235, 245, 0.25);
  }

  .score::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
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
    height: 7px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--gold);
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.8);
  }

  .ghost-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: rgba(8, 12, 22, 0.9);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(245, 184, 65, 0.35);
    font-size: var(--fs-xs);
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

  .hud-seal {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    border: 1px solid rgba(217, 43, 43, 0.45);
    background: rgba(217, 43, 43, 0.12);
    color: #fca5a5;
    font-size: var(--fs-xs);
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .hud-seal b {
    color: #ff8585;
    font-weight: 700;
  }
  .hud-seal:hover {
    color: #ffffff;
    border-color: rgba(217, 43, 43, 0.75);
    background: rgba(217, 43, 43, 0.25);
    box-shadow: 0 0 12px rgba(217, 43, 43, 0.4);
  }

  .mobile-only-btn {
    display: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .hud-lvl-badge {
      padding: 3px 9px;
      font-size: 11px;
    }
    .hud-lvl-badge .lvl-title {
      font-size: 11px;
    }
    .mobile-only-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: rgba(8, 12, 22, 0.88);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(245, 184, 65, 0.25);
      border-radius: var(--radius-sm);
      color: var(--muted);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .mobile-only-btn:hover {
      color: var(--gold-bright);
      border-color: rgba(245, 184, 65, 0.5);
    }
  }

  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .hud-seal {
      display: none;
    }
  }
</style>
