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
</script>

<!-- 画布内 HUD：四角贴边读数，中间留给星域 -->
<div class="hud">
  <div class="hud-tl">
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
      <span class="collect-label">收集</span>
      <span class="collect-value">
        {#key engine.collectedCount}
          <b class="hud-pulse font-tabular">{engine.collectedCount}</b>
        {/key}
        <i class="collect-total font-tabular">/{engine.total}</i>
      </span>
      <span class="collect-bar" aria-hidden="true"></span>
      {#if ghostLabel}
        <i class="ghost-tick" style="left: {engine.ghostRatio * 100}%"></i>
      {/if}
    </div>

    <div class="hud-tr-row">
      {#if engine.level && !engine.endless}
        <button
          type="button"
          class="hud-goal"
          title={'本关目标：星 · 满 · 准 · 专（已完成 ' + sealDone + '/4）——点开成就查看'}
          onclick={() => (uiState.showAchv = true)}
        >
          本关目标 <b class="font-tabular">{sealDone}</b>/4
        </button>
      {/if}

      <button
        type="button"
        class="hud-settings-btn"
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
  /* 画布 HUD：浮在铺满的画布上。
     顶部要避开顶栏（--hud-h）与左上角缎带，否则读数会被压在下面。 */
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: calc(var(--hud-h) + 8px) 12px 12px;
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

  /* ---------- 右上：收集读数是这里唯一的大数字 ---------- */
  .hud-tr {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  /* 收集读数 = 画布上唯一的大数字，装在一块小铜牌里 */
  .collect-readout {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    min-width: 108px;
    padding: 6px 12px 9px;
    border-radius: var(--r-sm);
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    box-shadow: var(--plate-brass-shadow);
    overflow: hidden;
  }
  .collect-label {
    font-size: 11px;
    letter-spacing: 3px;
    color: var(--muted);
  }
  .collect-value {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
  }
  .collect-value b {
    font-size: 30px;
    font-weight: 900;
    line-height: 1;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    display: inline-block;
    animation: collect-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  /* 每次收集数字弹一下（key 块重建时重播），让「收到东西了」有手感 */
  @keyframes collect-pop {
    0% {
      transform: scale(1.32);
      color: #ffe7a3;
    }
    100% {
      transform: scale(1);
      color: var(--text);
    }
  }
  :global(.reduce-motion) .collect-value b {
    animation: none;
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
    transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ghost-tick {
    position: absolute;
    bottom: 0;
    width: 2px;
    height: 8px;
    margin-left: -1px;
    background: var(--gold);
  }

  .ghost-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--groove-shadow);
    font-size: 12px;
    color: var(--gold);
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

  /* 本关目标：小铜牌（与机坞铭牌同一种面），读数不抢收集数字 */
  .hud-goal {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: var(--ctl-sm);
    padding: 0 8px;
    border-radius: var(--r-sm);
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    box-shadow: var(--plate-brass-shadow);
    color: var(--text);
    font-size: var(--ctl-font-sm);
    transition:
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .hud-goal b {
    color: var(--gold-bright);
    font-weight: 800;
  }
  .hud-goal:hover {
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  /* 设置键：凹槽小方键（原冷蓝胶囊 + 切角已取消） */
  .hud-settings-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ctl-sm);
    height: var(--ctl-sm);
    border-radius: var(--ctl-radius);
    background: var(--groove-bg);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--groove-shadow);
    color: var(--muted);
  }
  .hud-settings-btn:hover {
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  /* ---------- 触屏：所有可点件 ≥40px ---------- */

  @media (max-width: 640px) and (orientation: portrait) {
    .hud {
      padding: 6px 8px;
    }
    /* 竖屏画布小：收集读数改成单行「收集 0/24」，把压住画布的高度从 ~75px 收到 ~34px */
    .collect-readout {
      flex-direction: row;
      align-items: baseline;
      gap: 5px;
      min-width: 0;
      padding: 3px 10px 7px;
    }
    .collect-label {
      letter-spacing: 1px;
    }
    .hud-goal {
      font-size: 11px;
    }
    .collect-value b {
      font-size: 24px;
    }
    .hud-goal {
      font-size: 11px;
      padding: 0 8px;
    }
  }

  /* 矮屏：收起次要读数，给画布让路 */
  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .hud-goal {
      display: none;
    }
  }
  @media (orientation: landscape) and (max-height: 700px) {
    .hud-goal {
      display: none;
    }
  }
</style>
