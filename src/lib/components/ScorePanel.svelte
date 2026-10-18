<script lang="ts">
  import { engine } from '../game/engine.svelte';

  const STAR_LEVELS = [0.9, 0.65, 0.35];
  const nextStarGap = $derived.by(() => {
    const n = engine.total;
    const p = n ? engine.collectedCount / n : 0;
    if (p >= STAR_LEVELS[0]) return null;
    const next = STAR_LEVELS.find((t) => p < t);
    return next ? Math.ceil(next * n) - engine.collectedCount : null;
  });

  const bestText = $derived.by(() => {
    const id = engine.level?.id;
    const st = id ? (engine.bestStars[id] ?? 0) : 0;
    return st ? '★'.repeat(st) + '☆'.repeat(3 - st) : '—';
  });
</script>

<!-- 本次成绩：一行大读数 + 一行元数据，不再套卡片 -->
<section class="score-panel" aria-labelledby="score-title">
  <header class="score-head">
    <h2 id="score-title" class="score-title">本次成绩</h2>
    {#if engine.newRecord}
      <span class="new-record">新纪录</span>
    {/if}
  </header>

  <div class="stats">
    <div class="stat">
      <span class="stat-k">已收集</span>
      <span class="stat-v"
        ><b class="collect">{engine.collectedCount}</b><i>/{engine.total}</i></span
      >
    </div>
    <div class="stat">
      <span class="stat-k">得分</span>
      <span class="stat-v"><b class="score">{engine.score}</b></span>
    </div>
  </div>

  <div class="meta">
    <span>最佳 <b>{engine.bestScore || '—'}</b></span>
    <span class="dot" aria-hidden="true">·</span>
    <span>星级 <i class="st">{bestText}</i></span>
    <span class="dot" aria-hidden="true">·</span>
    <span>全清 <b>{engine.bestClear !== null ? engine.bestClear.toFixed(1) + 's' : '—'}</b></span>
  </div>

  {#if nextStarGap !== null}
    <div class="next">距下一星还差 <b>{nextStarGap}</b> 点</div>
  {/if}
</section>

<style>
  /* ============================================================
   * 本次成绩 · 无盒子版
   * 两个大读数并排（中间一条发丝线）+ 元数据行
   * ============================================================ */
  .score-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 4px 0;
  }
  .score-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .score-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .new-record {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #fca5a5;
    white-space: nowrap;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-width: 0;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 2px 0;
  }
  .stat + .stat {
    padding-left: 12px;
    border-left: 1px solid var(--edge-faint);
  }
  .stat-k {
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .stat-v {
    display: flex;
    align-items: baseline;
    gap: 1px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    min-width: 0;
  }
  .stat-v i {
    font-style: normal;
    font-size: 12px;
    color: var(--muted);
  }
  .stat-v .collect {
    font-size: 26px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--cyan);
  }
  .stat-v .score {
    font-size: 26px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--gold-bright);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
  }
  .meta b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .meta .dot {
    color: var(--muted-2);
  }
  .meta .st {
    color: var(--gold-bright);
    font-style: normal;
    letter-spacing: 1px;
  }

  .next {
    font-size: 12px;
    color: var(--cyan);
    font-variant-numeric: tabular-nums;
  }
  .next b {
    font-size: 14px;
    color: var(--gold-bright);
  }
</style>
