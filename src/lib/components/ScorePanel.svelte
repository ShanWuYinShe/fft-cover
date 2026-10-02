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
  <div class="score-line">
    <span>已收集</span>
    <span><b>{engine.collectedCount}</b> / {engine.total} 点</span>
  </div>
  <div class="score-line">
    <span>得分</span>
    <span><b>{engine.score}</b>{engine.newRecord ? ' 🆕' : ''}</span>
  </div>
  <div class="stars-line">
    最佳得分：{engine.bestScore || '—'} · 历史星级：<span class="st">{bestText}</span>
  </div>
  <div class="stars-line">
    最快全清：{engine.bestClear !== null ? engine.bestClear.toFixed(1) + 's' : '—'}
  </div>
  {#if nextStarGap !== null}
    <div class="stars-line">距下一星：还需收集 <span class="gap">{nextStarGap}</span> 点</div>
  {/if}
</section>

<style>
  .score-line {
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .score-line b {
    color: var(--gold);
    font-size: 20px;
  }
  .stars-line {
    margin-top: 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .st {
    color: var(--gold);
    letter-spacing: 2px;
  }
  .gap {
    color: var(--cyan);
  }
</style>
