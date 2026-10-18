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

<!-- 本次成绩：装甲面板上的两块大读数仪表 + 元数据铭牌条 -->
<section class="score-panel g-plate g-plate--lit" aria-labelledby="score-title">
  <header class="score-head">
    <h2 id="score-title" class="g-label score-title">本次成绩</h2>
    {#if engine.newRecord}
      <span class="new-record">
        <span class="g-lamp g-lamp--red" aria-hidden="true"></span>
        新纪录
      </span>
    {/if}
  </header>

  <hr class="g-divider score-divider" />

  <div class="metrics">
    <div class="metric g-inset">
      <span class="metric-k g-label g-label--dim">已收集</span>
      <span class="metric-v">
        <b class="g-num collect-num">{engine.collectedCount}</b>
        <i>/{engine.total}</i>
      </span>
    </div>
    <div class="metric g-inset">
      <span class="metric-k g-label g-label--dim">得分</span>
      <span class="metric-v gold">
        <b class="g-num score-num">{engine.score}</b>
      </span>
    </div>
  </div>

  <div class="meta g-inset">
    <span class="meta-item">最佳 <b>{engine.bestScore || '—'}</b></span>
    <span class="dot" aria-hidden="true">·</span>
    <span class="meta-item">星级 <i class="st">{bestText}</i></span>
    <span class="dot" aria-hidden="true">·</span>
    <span class="meta-item"
      >全清 <b>{engine.bestClear !== null ? engine.bestClear.toFixed(1) + 's' : '—'}</b></span
    >
  </div>

  {#if nextStarGap !== null}
    <div class="next">
      <span class="g-lamp g-lamp--cyan" aria-hidden="true"></span>
      距下一星还差 <b class="g-num next-num">{nextStarGap}</b> 点
    </div>
  {/if}
</section>

<style>
  /* ============================================================
   * 本次成绩 · 机箱读数面板
   * 结构：段头铭牌 + 两块凹槽读数（大号发光数字）+ 元数据条
   * ============================================================ */
  .score-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    min-width: 0;
  }
  .score-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .score-title {
    margin: 0;
    font-size: 12px;
    letter-spacing: 2px;
    white-space: nowrap;
  }
  .new-record {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border: 1px solid var(--cinnabar-line);
    border-radius: 4px;
    background: rgba(217, 43, 43, 0.14);
    color: #fca5a5;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .new-record .g-lamp {
    width: 6px;
    height: 6px;
  }

  .score-divider {
    margin: 0;
  }

  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    min-width: 0;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 7px 10px 8px;
    min-width: 0;
  }
  .metric .metric-k {
    font-size: 9px;
    letter-spacing: 1.6px;
    white-space: nowrap;
  }
  .metric-v {
    display: flex;
    align-items: baseline;
    gap: 1px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    min-width: 0;
  }
  .metric-v i {
    font-style: normal;
    font-size: 11px;
    font-weight: 400;
    color: var(--muted-2);
  }
  .collect-num {
    font-size: 28px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--cyan);
    text-shadow: 0 0 18px rgba(0, 245, 212, 0.5);
  }
  .metric-v.gold .score-num {
    font-size: 30px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--gold-bright);
    text-shadow: 0 0 20px rgba(245, 184, 65, 0.6);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 6px 9px;
    font-size: var(--fs-sm);
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
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    background: rgba(0, 245, 212, 0.06);
    border: 1px dashed rgba(0, 245, 212, 0.32);
    font-size: var(--fs-sm);
    color: var(--cyan);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
  }
  .next .g-lamp {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
  }
  .next .next-num {
    font-size: 16px;
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    text-shadow: 0 0 12px rgba(245, 184, 65, 0.5);
  }
</style>
