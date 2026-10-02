<script lang="ts">
  import { engine } from '../game/engine.svelte';

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
  <div class="stars-line">历史最佳：<span class="st">{bestText}</span></div>
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
</style>
