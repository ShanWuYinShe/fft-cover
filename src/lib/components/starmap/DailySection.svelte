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
      <span class="dc-title font-celestial">
        <Icon name="calendar" size={14} /> 每日一练
      </span>
      {#if isDaily}
        <button type="button" class="mini-btn" title="分享今日挑战链接" onclick={shareDaily}>
          {dailyShared ? '✓ 已复制' : '📤 分享'}
        </button>
      {/if}
    </div>

    <div class="diff-btn-group">
      {#each DIFFS as d (d.id)}
        <button
          type="button"
          class="diff-btn"
          class:active={isDaily && dailyDiff === d.id}
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
        🎉 本周全勤
      {:else if streakAtRisk}
        ⚠️ 今天不打，连胜就断
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

  .daily-card {
    background: linear-gradient(180deg, #131c2e 0%, #0a1120 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .dc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }
  .dc-title {
    font-size: var(--fs-xs);
    color: var(--gold-bright);
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .diff-btn-group {
    display: flex;
    gap: var(--space-2);
  }
  .diff-btn {
    flex: 1;
    appearance: none;
    height: 28px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .diff-btn:hover {
    color: var(--text);
    border-color: var(--gold);
  }
  .diff-btn.active {
    background: var(--gold);
    color: #060911;
    border-color: var(--gold-bright);
    font-weight: 700;
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.4);
  }

  .weekly-card {
    width: 100%;
  }
  .weekly-btn {
    appearance: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, #162035 0%, #0d1524 100%);
    border: 1px solid var(--line);
    color: var(--text);
    cursor: pointer;
    font-size: var(--fs-xs);
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .weekly-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .weekly-btn.active {
    border-color: var(--cyan);
    box-shadow: 0 0 10px rgba(0, 245, 212, 0.3);
  }
  .w-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .w-right {
    color: var(--muted);
  }

  .dweek {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: var(--radius-sm);
  }
  .dcell {
    flex: 1;
    height: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid transparent;
    font-size: 9px;
    color: var(--muted-2);
  }
  .dcell i {
    font-style: normal;
    line-height: 1;
  }
  .dcell b {
    font-size: 8px;
    line-height: 1;
  }
  .dcell.today {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .dcell.done {
    background: rgba(217, 43, 43, 0.25);
    border-color: rgba(217, 43, 43, 0.5);
    color: #fca5a5;
  }
  .dweek-cap {
    font-size: 10px;
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

  .mini-btn {
    appearance: none;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 10px;
    padding: 2px 6px;
    cursor: pointer;
  }
  .mini-btn:hover {
    background: rgba(255, 255, 255, 0.16);
  }
</style>
