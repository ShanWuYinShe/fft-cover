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

  .daily-card {
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 60%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    padding: var(--space-2) var(--space-3);
    box-shadow: var(--bevel-top);
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
    gap: 5px;
  }

  .diff-btn-group {
    display: flex;
    gap: 6px;
  }
  /* 难度键：金属面；当前档金色实心 */
  .diff-btn {
    flex: 1;
    appearance: none;
    min-height: 40px;
    padding: 0 8px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .diff-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .diff-btn:active {
    transform: translateY(2px);
  }
  .diff-btn.active {
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 #7a4d05,
      0 0 14px rgba(245, 184, 65, 0.4);
  }

  .weekly-card {
    width: 100%;
  }
  .weekly-btn {
    appearance: none;
    width: 100%;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: var(--fs-xs);
    border-radius: 9px;
    background: linear-gradient(180deg, var(--metal-3) 0%, var(--metal) 60%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .weekly-btn:hover {
    border-color: var(--edge);
    color: var(--gold-bright);
    background: var(--face-metal-hover);
  }
  .weekly-btn:active {
    transform: translateY(2px);
  }
  .weekly-btn.active {
    border-color: var(--cyan);
    box-shadow:
      var(--bevel-top),
      0 0 16px rgba(0, 245, 212, 0.3);
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

  /* 打卡格：嵌进面板的小凹槽 */
  .dweek {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.9), rgba(8, 12, 22, 0.75));
    border: 1px solid var(--edge-faint);
    border-radius: 9px;
    box-shadow: var(--bevel-inset);
  }
  .dcell {
    flex: 1;
    height: 26px;
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
    box-shadow: 0 0 8px rgba(245, 184, 65, 0.3);
  }
  .dcell.done {
    background: linear-gradient(160deg, rgba(217, 43, 43, 0.55), rgba(142, 42, 31, 0.45));
    border-color: rgba(217, 43, 43, 0.6);
    color: #fdece7;
  }
  .dweek-cap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
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

  /* 分享键：金属小键 */
  .mini-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 30px;
    padding: 0 8px;
    cursor: pointer;
    color: var(--text);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    border-radius: 7px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .mini-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .mini-btn:active {
    transform: translateY(2px);
  }

  /* 触屏：所有可点元素补到 44 热区 */
  @media (pointer: coarse), (max-width: 640px) {
    .diff-btn {
      min-height: 44px;
    }
    .mini-btn {
      min-height: 40px;
      padding: 0 10px;
    }
  }
</style>
