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

<section>
  <h2>本次成绩</h2>

  <div class="metrics">
    <div class="metric">
      <span class="k">已收集</span>
      <span class="v"><b>{engine.collectedCount}</b><i>/{engine.total}</i></span>
    </div>
    <div class="metric">
      <span class="k">得分{engine.newRecord ? ' 🆕' : ''}</span>
      <span class="v gold"><b>{engine.score}</b></span>
    </div>
  </div>

  <div class="meta">
    <span>最佳 {engine.bestScore || '—'}</span>
    <span class="dot">·</span>
    <span>星级 <i class="st">{bestText}</i></span>
    <span class="dot">·</span>
    <span>全清 {engine.bestClear !== null ? engine.bestClear.toFixed(1) + 's' : '—'}</span>
  </div>

  {#if nextStarGap !== null}
    <div class="next">距下一星还差 <b>{nextStarGap}</b> 点</div>
  {/if}
</section>

<style>
  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 9px 12px;
    border-radius: var(--r-md);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(245, 197, 66, 0.16);
  }
  .metric .k {
    font-size: var(--fs-xs);
    color: var(--muted);
    letter-spacing: 1px;
  }
  .metric .v {
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .metric .v i {
    font-style: normal;
    font-size: var(--fs-sm);
    font-weight: 400;
    color: var(--muted-2);
  }
  .metric .v.gold b {
    color: var(--gold-bright);
    text-shadow: 0 0 18px rgba(245, 197, 66, 0.35);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: var(--fs-sm);
    color: var(--muted);
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
    margin-top: 9px;
    padding: 6px 11px;
    border-radius: var(--r-sm);
    background: rgba(45, 212, 191, 0.06);
    border: 1px dashed rgba(45, 212, 191, 0.35);
    font-size: var(--fs-sm);
    color: var(--cyan);
  }
  .next b {
    font-size: var(--fs-md);
    color: var(--gold-bright);
    font-variant-numeric: tabular-nums;
  }
</style>
