<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { goalProgress, levelGoals } from '../game/goals';
  import { fitScore } from '../game/scoring';

  const state = $derived(engine.levelGoalState);
  const goals = $derived(levelGoals(state));
  const prog = $derived(goalProgress(goals));
  /** 实时拟合度：精确解目标的进度指针（编辑态也算，参数一改就动） */
  const fit = $derived(engine.level ? fitScore(engine.level.spectrum, engine.arms) : 0);

  /** 未达成的目标给一句"现在离它多远" */
  const rows = $derived.by(() =>
    goals.map((g) => {
      if (g.done) return { ...g, tip: g.how };
      if (g.id === 'stars') return { ...g, tip: '当前最好 ' + state.stars + '★ · 单局收集 ≥90%' };
      if (g.id === 'exact') {
        return { ...g, tip: '当前拟合度 ' + Math.round(fit * 100) + '% · 需 ≥99%' };
      }
      if (g.id === 'perfect') {
        return { ...g, tip: '单局把 ' + engine.total + ' 个点全部收齐' };
      }
      return { ...g, tip: g.how };
    }),
  );
</script>

<!-- 本关目标：安静的分隔行列表（不套盒子、不发光） -->
<section class="goal-panel" aria-labelledby="goal-title">
  <header class="goal-head">
    <h2 id="goal-title" class="goal-title">本关目标</h2>
    <span class="goal-count" class:all={prog.done === prog.total}>
      <b class="goal-done">{prog.done}</b>
      <span class="goal-sep">/</span>
      <span class="goal-total">{prog.total}</span>
    </span>
  </header>

  <!-- 达成即盖印：朱砂方印，未达成是空印 -->
  <ul class="goals">
    {#each rows as g (g.id)}
      <li class:done={g.done}>
        <span class="g-seal" aria-label={g.done ? g.name + ' 已达成' : g.name + ' 未达成'}
          >{g.seal}</span
        >
        <span class="g-body">
          <span class="g-name">{g.name}</span>
          <span class="g-tip">{g.tip}</span>
        </span>
      </li>
    {/each}
  </ul>

  {#if prog.done === prog.total}
    <p class="all-done">本关四印齐全——去随机关或每日挑战找新的曲线吧</p>
  {/if}
</section>

<style>
  /* ============================================================
   * 本关目标 · 无盒子版
   * 标题 + 达成读数 + 分隔行；行与行之间只用发丝线
   * ============================================================ */
  .goal-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 4px 0;
  }
  .goal-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .goal-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text);
    white-space: nowrap;
  }
  .goal-count {
    display: flex;
    align-items: baseline;
    gap: 2px;
    flex: 0 0 auto;
  }
  .goal-count .goal-done {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--gold-bright);
  }
  .goal-sep {
    font-size: 12px;
    color: var(--muted);
  }
  .goal-total {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .goal-count.all .goal-done {
    color: var(--gold-bright);
  }

  .goals {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
  }
  .goals li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    min-width: 0;
    border-bottom: 1px solid var(--edge-faint);
  }
  .goals li:last-child {
    border-bottom: none;
  }

  /* 印章：楷体单字，未达成为空印（灰框），达成为朱砂实印 */
  .g-seal {
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    color: var(--muted);
    background: transparent;
    border: 1px solid var(--edge-faint);
  }
  .g-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .g-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .g-tip {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    line-height: 1.4;
  }

  .goals li.done .g-seal {
    color: #fdece7;
    background: linear-gradient(160deg, #d84b3c, #8e2a1f);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .goals li.done .g-name {
    color: var(--text);
  }
  .goals li.done .g-tip {
    color: rgba(226, 143, 131, 0.9);
  }

  .all-done {
    margin: 10px 0 0;
    padding: 8px 0 0;
    border-top: 1px solid var(--cinnabar-line);
    font-size: 12px;
    color: #fca5a5;
    line-height: 1.6;
    text-align: center;
  }
</style>
