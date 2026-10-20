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
  <!-- 星图头：白卡标题条 + 成就勋章 -->
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
    gap: 12px;
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

  /* 星图头：白卡条 + 珊瑚标题 + 勋章 */
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .picker-title {
    margin: 0;
    font-family: var(--font-round);
    font-size: 20px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .header-badges {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: var(--fs-sm);
  }

  /* 勋章：白药丸小牌 */
  .h-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: var(--r-pill);
    border: 2px solid var(--line);
    background: var(--mat-block);
    color: var(--muted);
    white-space: nowrap;
    font-size: var(--fs-xs);
    font-weight: 800;
  }

  .h-badge--lit {
    border-color: var(--mint-bright);
    background: var(--note-bg);
    color: var(--mint-edge);
  }

  /* 无尽状态：白卡 + 珊瑚大读数 */
  .endless-banner {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .eb-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text);
  }

  .eb-k {
    flex: none;
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 800;
    letter-spacing: 1px;
  }

  .eb-wave {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--mint-edge);
    font-weight: 900;
  }

  .eb-score {
    margin-left: auto;
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-text);
    font-variant-numeric: tabular-nums;
  }

  .eb-sub {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
  }

  .eb-need {
    color: var(--coral-edge);
    font-weight: 800;
  }

  .eb-ok {
    color: var(--mint-edge);
    font-weight: 800;
  }

  /* 折叠区：白卡 + 珊瑚/薄荷摘要行 */
  .level-hint-drawer,
  .more-modes-drawer {
    border: 2px solid var(--line);
    border-radius: var(--r-md);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
    overflow: hidden;
  }

  .lhd-summary,
  .mm-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 46px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 800;
    user-select: none;
  }

  .lhd-summary {
    color: var(--coral-edge);
  }

  .mm-summary {
    color: var(--mint-edge);
  }

  .lhd-summary::-webkit-details-marker,
  .mm-summary::-webkit-details-marker {
    display: none;
  }

  .lhd-label,
  .mm-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    letter-spacing: 0.3px;
  }

  .lhd-caret,
  .mm-caret {
    flex: none;
    color: var(--muted-2);
    font-size: 12px;
  }

  .lhd-body {
    padding: 0 14px 12px;
  }

  .lhd-text {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--note-edge);
    background: var(--note-bg);
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.7;
    color: var(--text);
  }

  .mm-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 14px 14px;
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
