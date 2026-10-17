<script lang="ts">
  import Icon from './Icon.svelte';
  import CampaignMap from './starmap/CampaignMap.svelte';
  import DailySection from './starmap/DailySection.svelte';
  import ExtraSection from './starmap/ExtraSection.svelte';
  import { engine } from '../game/engine.svelte';
  import { LEVEL_DEFS } from '../game/levels';

  let { onselect }: { onselect?: () => void } = $props();

  /** 关卡提示钉住状态 */
  let hintPinned = $state(false);

  const campaignBadge = $derived(
    engine.campaign === 'mastered' ? '全三星' : engine.campaign === 'cleared' ? '已通关' : '',
  );
  const expertCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.expertClears[d.id] ? 1 : 0), 0),
  );
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );
</script>

<div class="level-picker">
  <!-- 标题与成就勋章头 -->
  <div class="picker-header">
    <h2 class="picker-title font-celestial">周天星图</h2>
    {#if campaignBadge || perfectCount > 0 || exactCount > 0}
      <div class="header-badges">
        {#if campaignBadge}
          <span class="h-badge font-celestial">{campaignBadge}</span>
        {/if}
        {#if perfectCount > 0}
          <span class="h-badge"><Icon name="crown" size={12} /> 完美 {perfectCount}</span>
        {/if}
        {#if exactCount > 0}
          <span class="h-badge"><Icon name="target" size={12} /> {exactCount}</span>
        {/if}
        {#if expertCount > 0}
          <span class="h-badge"><Icon name="gem" size={12} /> {expertCount}</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 无尽模式状态提示 -->
  {#if engine.endless}
    <div class="endless-banner">
      <div class="eb-row">
        <span class="eb-k">本局</span>
        <b class="eb-wave"><Icon name="infinity" size={13} /> 第 {engine.endlessWave} 波</b>
        <b class="eb-score font-tabular">{engine.endlessScore} 分</b>
      </div>
      <div class="eb-row eb-sub">
        <span>本波收集 {engine.collectedCount}/{engine.total}</span>
        {#if engine.endlessNeed > 0}
          <span class="eb-need">再过 {engine.endlessNeed} 点过关</span>
        {:else}
          <span class="eb-ok">已达标 ✓</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- 战役关卡地图 -->
  <CampaignMap {onselect} />

  <!-- 关卡玄机/提示折叠 -->
  {#if engine.level?.hint}
    <details class="level-hint-drawer" bind:open={hintPinned}>
      <summary class="lhd-summary">
        <span class="lhd-label font-celestial">✦ 本关破题玄机</span>
        <span class="lhd-caret">{hintPinned ? '▴' : '▾'}</span>
      </summary>
      <div class="lhd-body">
        <p class="lhd-text">{engine.level.hint}</p>
      </div>
    </details>
  {/if}

  <!-- 更多挑战折叠区 -->
  <details class="more-modes-drawer">
    <summary class="mm-summary">
      <span class="font-celestial">❖ 每日一练与无尽演武</span>
      <span class="mm-caret">▾</span>
    </summary>
    <div class="mm-body">
      <DailySection {onselect} />
      <ExtraSection {onselect} />
    </div>
  </details>
</div>

<style>
  .level-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .picker-title {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--gold-bright);
    letter-spacing: 2px;
  }

  .header-badges {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: var(--fs-xs);
  }
  .h-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(245, 184, 65, 0.12);
    border: 1px solid rgba(245, 184, 65, 0.3);
    color: var(--gold);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
  }

  .endless-banner {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(245, 184, 65, 0.35);
    background: rgba(245, 184, 65, 0.08);
  }
  .eb-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--fs-xs);
    color: var(--text);
  }
  .eb-k {
    color: var(--muted);
  }
  .eb-wave {
    color: var(--gold-bright);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .eb-score {
    color: var(--gold);
  }
  .eb-sub {
    color: var(--muted);
  }
  .eb-need {
    color: var(--gold);
  }
  .eb-ok {
    color: var(--cyan);
  }

  .level-hint-drawer {
    border: 1px solid rgba(0, 245, 212, 0.3);
    background: rgba(0, 245, 212, 0.05);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .lhd-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    font-size: var(--fs-xs);
    color: var(--cyan);
    user-select: none;
  }
  .lhd-summary::-webkit-details-marker {
    display: none;
  }
  .lhd-body {
    padding: 4px 12px 10px;
  }
  .lhd-text {
    margin: 0;
    font-size: var(--fs-xs);
    line-height: 1.6;
    color: var(--text);
  }

  .more-modes-drawer {
    border: 1px solid var(--line);
    background: rgba(16, 23, 38, 0.6);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .mm-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    font-size: var(--fs-xs);
    color: var(--gold);
    user-select: none;
  }
  .mm-summary::-webkit-details-marker {
    display: none;
  }
  .mm-body {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
