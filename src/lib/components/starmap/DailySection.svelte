<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { daysLeftInWeek } from '../../game/dates';
  import { buildDailyUrl } from '../../game/share';
  import { uiState } from '../../stores/uiState.svelte';

  let { onselect }: { onselect?: () => void } = $props();

  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;

  const isDaily = $derived(!!engine.level?.id.startsWith('daily-'));
  const dailyDiff = $derived(isDaily ? ((engine.level?.id ?? '').split('-').pop() ?? '') : '');
  const weekFull = $derived(engine.dailyWeek.every((d) => d.done));
  const streakAtRisk = $derived(
    engine.dailyStreak.streak > 0 && !engine.dailyWeek.some((d) => d.today && d.done),
  );

  let dailyShared = $state(false);

  function shareDaily(): void {
    const diff = (dailyDiff as 'easy' | 'normal' | 'hard') || engine.difficulty;
    const url = buildDailyUrl(diff);
    if (!navigator.clipboard) {
      uiState.setShareNote('复制失败，请重试');
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => {
        dailyShared = true;
        setTimeout(() => (dailyShared = false), 2000);
      })
      .catch(() => {
        uiState.setShareNote('复制失败，请重试');
      });
  }
</script>

<div class="daily-section">
  <!-- 每日挑战难度行 -->
  <div class="daily-card">
    <div class="dc-header">
      <span class="dc-title g-label">
        <Icon name="calendar" size={13} /> 每日一练
      </span>
      {#if isDaily}
        <button
          type="button"
          class="mini-btn g-btn g-btn--sm"
          title="分享今日挑战链接"
          onclick={shareDaily}
        >
          {#if dailyShared}<Icon name="check" size={11} /> 已复制{:else}<Icon
              name="share"
              size={11}
            /> 分享{/if}
        </button>
      {/if}
    </div>

    <div class="diff-btn-group">
      {#each DIFFS as d (d.id)}
        <button
          type="button"
          class="diff-btn g-btn"
          class:active={isDaily && dailyDiff === d.id}
          aria-pressed={isDaily && dailyDiff === d.id}
          onclick={() => {
            engine.setDifficulty(d.id);
            engine.loadDaily();
            onselect?.();
          }}
        >
          {d.nm}
        </button>
      {/each}
    </div>
  </div>

  <!-- 本周挑战 -->
  <div class="weekly-card">
    <button
      type="button"
      class="weekly-btn g-btn"
      class:active={engine.level?.id.startsWith('weekly-')}
      onclick={() => {
        engine.loadWeekly();
        onselect?.();
      }}
    >
      <span class="w-left"><Icon name="flag" size={14} /> 每周挑战</span>
      <span class="w-right font-tabular">
        {engine.weeklyBest > 0 ? engine.weeklyBest + ' 分 · ' : ''}还剩 {daysLeftInWeek()} 天
      </span>
    </button>
  </div>

  <!-- 最近 7 天打卡 -->
  <div class="dweek" aria-label="最近 7 天的每日挑战">
    {#each engine.dailyWeek as d (d.date)}
      <span
        class="dcell"
        class:done={d.done}
        class:today={d.today}
        title={d.date + (d.done ? ' · 已完成' : ' · 未完成')}
      >
        <i>{d.label}</i>
        {#if d.done}<b>✓</b>{/if}
      </span>
    {/each}
    <span class="dweek-cap font-tabular" class:full={weekFull} class:atrisk={streakAtRisk}>
      {#if weekFull}
        <Icon name="award" size={11} /> 本周全勤
      {:else if streakAtRisk}
        <Icon name="flame" size={11} /> 今天不打，连胜就断
      {:else if engine.dailyStreak.streak > 0}
        连续 {engine.dailyStreak.streak} 天
      {:else}
        每天一练
      {/if}
    </span>
  </div>
</div>

<style>
  .daily-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 0;
  }

  /* 每日一练：白卡 */
  .daily-card {
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .dc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }

  .daily-card .dc-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.3px;
    color: var(--text);
  }

  .diff-btn-group {
    display: flex;
    gap: 6px;
  }

  /* 难度键：白面小键，当前档 = 薄荷 */
  .diff-btn {
    flex: 1;
    min-height: var(--ctl-md);
    padding: 0 8px;
    cursor: pointer;
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    white-space: nowrap;
  }

  .diff-btn.active {
    background: var(--mint-edge);
    color: var(--mint-ink);
  }

  .diff-btn.active::before {
    background: var(--face-jade);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.45),
      inset 0 -2px 0 rgba(10, 119, 107, 0.25);
  }

  .weekly-card {
    width: 100%;
  }

  /* 每周挑战：整行白卡 */
  .weekly-btn {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
    transition: border-color 0.12s ease;
  }

  .weekly-btn::before {
    content: none;
  }

  .weekly-btn:hover {
    border-color: var(--coral-bright);
  }

  .weekly-btn.active {
    border-color: var(--mint);
  }

  .w-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 900;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  .w-left :global(svg) {
    color: var(--coral-text);
  }

  .w-right {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* 打卡格：白卡里一排浅蓝凹槽 */
  .dweek {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .dcell {
    flex: 1 1 30px;
    min-width: 30px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: var(--r-sm);
    border: 1px solid var(--line);
    background: var(--bg-bay-inset);
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--muted);
  }

  .dcell i {
    font-style: normal;
    line-height: 1;
  }

  .dcell.today {
    border-color: var(--coral-text);
    color: var(--coral-edge);
    box-shadow: 0 0 0 2px var(--coral-dim);
  }

  .dcell.done {
    border-color: var(--mint-edge);
    background: var(--face-jade);
    color: var(--mint-ink);
  }

  .dweek-cap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 2px;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .dweek-cap.full {
    color: var(--mint-edge);
    font-weight: 800;
  }

  .dweek-cap.atrisk {
    color: var(--danger-deep);
    font-weight: 800;
  }

  /* 分享键：小号白面药丸 */
  .mini-btn {
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    font-size: var(--fs-xs);
    font-weight: 800;
    white-space: nowrap;
  }

  /* 触屏：每周挑战行补到统一控件高度 */
  @media (pointer: coarse) {
    .weekly-btn {
      min-height: var(--ctl-md);
    }
  }
</style>
