<script lang="ts">
  import { engine, starsFor } from '../game/engine.svelte';

  const words = [
    '再调调指针，让它扫过更多点！',
    '有点意思了！试着叠加一根新指针。',
    '相当不错！微调相位还能更准。',
    '完美拟合！你已掌握谐波的力量！',
  ];

  const n = $derived(engine.total);
  const got = $derived(engine.collectedCount);
  const st = $derived(starsFor(n ? got / n : 0));
  const best = $derived(engine.level ? (engine.bestStars[engine.level.id] ?? 0) : 0);
</script>

<div class="result">
  <div class="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</div>
  <div class="line">
    收集 {got} / {n} 点（{n ? Math.round((got / n) * 100) : 0}%）· 得分 {engine.score}{engine.newRecord
      ? ' 🆕新纪录'
      : ''}
  </div>
  <div class="best">历史最佳 ★{Math.max(st, best)}　{words[st]}</div>
  <div class="btns">
    <button class="primary" onclick={() => engine.resetRun()}>⟲ 再来一次</button>
    <button onclick={() => (engine.resultDismissed = true)}>👁 查看轨迹</button>
  </div>
</div>

<style>
  .result {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background: rgba(8, 10, 20, 0.72);
    backdrop-filter: blur(3px);
    border-radius: 14px;
    text-align: center;
  }
  .stars {
    font-size: 42px;
    letter-spacing: 8px;
    color: var(--gold);
    text-shadow: 0 0 24px rgba(251, 191, 36, 0.6);
  }
  .line {
    font-size: 15px;
    color: var(--text);
  }
  .best {
    font-size: 13px;
    color: var(--muted);
  }
  .btns {
    display: flex;
    gap: 8px;
  }
</style>
