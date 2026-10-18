<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { daysLeftInWeek } from '../../game/dates';
  import { buildDailyUrl } from '../../game/share';

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
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        dailyShared = true;
        setTimeout(() => (dailyShared = false), 2000);
      });
    }
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
        <button type="button" class="mini-btn" title="分享今日挑战链接" onclick={shareDaily}>
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
          class="diff-btn"
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
      class="weekly-btn"
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
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  /* 每日一练：小标题 + 一行难度键（无卡片） */
  .daily-card {
    padding: 10px 0;
    border-bottom: 1px solid var(--edge-faint);
  }

  .dc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: var(--space-2);
  }
  .dc-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
    font-weight: 600;
    letter-spacing: 1px;
  }

  .diff-btn-group {
    display: flex;
    gap: 6px;
  }
  /* 难度键：安静描边；当前档描金 */
  .diff-btn {
    flex: 1;
    appearance: none;
    min-height: var(--ctl-md);
    padding: 0 8px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    border-radius: var(--ctl-radius);
    border: 1px solid var(--edge-faint);
    background: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .diff-btn:hover {
    color: var(--text);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
  .diff-btn.active {
    color: var(--gold-bright);
    border-color: var(--gold);
    background: rgba(245, 184, 65, 0.1);
    font-weight: 700;
  }

  .weekly-card {
    width: 100%;
  }
  .weekly-btn {
    appearance: none;
    width: 100%;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: var(--ctl-font-sm);
    background: none;
    border: none;
    border-bottom: 1px solid var(--edge-faint);
    transition: color 0.12s ease;
  }
  .weekly-btn:hover {
    color: var(--gold-bright);
  }
  .weekly-btn.active {
    color: var(--gold-bright);
  }
  .w-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .w-right {
    color: var(--muted);
    white-space: nowrap;
  }

  /* 打卡格：一行 7 格（无外框） */
  .dweek {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 0;
    border-bottom: 1px solid var(--edge-faint);
  }
  .dcell {
    flex: 1;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid transparent;
    font-size: 12px;
    color: var(--muted);
  }
  .dcell i {
    font-style: normal;
    line-height: 1;
  }
  .dcell.today {
    border-color: var(--gold);
    color: var(--gold-bright);
    box-shadow: 0 0 8px rgba(245, 184, 65, 0.3);
  }
  .dcell.done {
    background: linear-gradient(160deg, rgba(217, 43, 43, 0.55), rgba(142, 42, 31, 0.45));
    border-color: rgba(217, 43, 43, 0.6);
    color: #fdece7;
  }
  /* 触屏：每周挑战行补到统一控件高度 */
  @media (pointer: coarse) {
    .weekly-btn {
      min-height: var(--ctl-md);
    }
  }

  .dweek-cap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
    margin-left: 6px;
    white-space: nowrap;
  }
  .dweek-cap.full {
    color: var(--gold-bright);
    font-weight: 700;
  }
  .dweek-cap.atrisk {
    color: #f87171;
    font-weight: 700;
  }

  /* 分享键：安静小键 */
  .mini-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    border-radius: var(--ctl-radius);
    border: 1px solid var(--edge-faint);
    background: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .mini-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
</style>
