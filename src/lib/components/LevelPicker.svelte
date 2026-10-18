<script lang="ts">
  import Icon from './Icon.svelte';
  import CampaignMap from './starmap/CampaignMap.svelte';
  import DailySection from './starmap/DailySection.svelte';
  import ExtraSection from './starmap/ExtraSection.svelte';
  import { engine } from '../game/engine.svelte';
  import { LEVEL_DEFS } from '../game/levels';
  import { uiState } from '../stores/uiState.svelte';

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

<div class="level-picker" class:open={uiState.starMapOpen}>
  <!-- 星图头：金属铭牌 + 成就勋章 -->
  <div class="picker-header">
    <h2 class="picker-title font-celestial">周天星图</h2>
    {#if campaignBadge || perfectCount > 0 || exactCount > 0}
      <div class="header-badges">
        {#if campaignBadge}
          <span class="h-badge h-badge--lit font-celestial">{campaignBadge}</span>
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
        <span class="eb-k g-label g-label--dim">本局</span>
        <b class="eb-wave"><Icon name="infinity" size={13} /> 第 {engine.endlessWave} 波</b>
        <b class="eb-score g-num g-num--gold font-tabular">{engine.endlessScore}</b>
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
        <span class="lhd-label font-celestial"><Icon name="bulb" size={12} /> 本关破题玄机</span>
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
      <span class="mm-label font-celestial"
        ><Icon name="layers" size={12} /> 每日一练与无尽演武</span
      >
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

  /* 抽屉打开时内容 60ms 错峰淡入（位移 ≤8px；最多 5 个元素） */
  .level-picker.open > * {
    animation: lp-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  .level-picker.open > *:nth-child(1) {
    animation-delay: 0ms;
  }
  .level-picker.open > *:nth-child(2) {
    animation-delay: 60ms;
  }
  .level-picker.open > *:nth-child(3) {
    animation-delay: 120ms;
  }
  .level-picker.open > *:nth-child(4) {
    animation-delay: 180ms;
  }
  .level-picker.open > *:nth-child(n + 5) {
    animation-delay: 240ms;
  }
  @keyframes lp-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 星图头：一行标题 + 勋章，下面一条分隔线（无底座） */
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding: 0 0 10px;
    border-bottom: 1px solid var(--edge-faint);
  }
  .picker-title {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--gold-bright);
    letter-spacing: 3px;
    white-space: nowrap;
    text-shadow: 0 0 14px rgba(245, 184, 65, 0.35);
  }

  .header-badges {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: var(--fs-sm);
  }
  /* 勋章：一行小字标记（不做芯片） */
  .h-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    white-space: nowrap;
    font-size: 12px;
  }
  .h-badge--lit {
    color: var(--gold-bright);
  }

  /* 无尽状态：紧凑三行读数（无底座） */
  .endless-banner {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;
    border-bottom: 1px solid var(--edge-faint);
  }
  .eb-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .eb-k {
    color: var(--muted);
    flex: none;
  }
  .eb-wave {
    color: var(--gold-bright);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .eb-score {
    font-size: 19px;
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

  /* 折叠区：一行小标题 + 分隔线（无边框盒子） */
  .level-hint-drawer {
    border-bottom: 1px solid var(--edge-faint);
  }
  .lhd-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    /* 摘要也是可点热区：给足 44px */
    min-height: 44px;
    padding: 0 2px;
    cursor: pointer;
    font-size: var(--fs-sm);
    color: var(--cyan);
    user-select: none;
  }
  .lhd-summary::-webkit-details-marker {
    display: none;
  }
  .lhd-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    letter-spacing: 2px;
  }
  .lhd-body {
    padding: 2px 0 12px;
  }
  .lhd-text {
    margin: 6px 0 0;
    font-size: var(--fs-sm);
    line-height: 1.7;
    color: var(--text);
  }

  .more-modes-drawer {
    border-bottom: 1px solid var(--edge-faint);
  }
  .mm-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    padding: 0 2px;
    cursor: pointer;
    font-size: var(--fs-sm);
    color: var(--gold-bright);
    user-select: none;
  }
  .mm-summary::-webkit-details-marker {
    display: none;
  }
  .mm-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    letter-spacing: 2px;
  }
  .mm-body {
    padding: 2px 0 10px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* 减弱动态效果：位移动画关闭 */
  @media (prefers-reduced-motion: reduce) {
    .level-picker.open > * {
      animation: none;
    }
  }
  :global(.reduce-motion) .level-picker.open > * {
    animation: none;
  }
</style>
