<script lang="ts">
  import Icon from './Icon.svelte';
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

<section>
  <h2>
    本关目标
    <span class="muted" class:all={prog.done === prog.total}>{prog.done} / {prog.total}</span>
  </h2>

  <!-- 达成即盖印：朱砂方印（篆刻样式），未达成是空印 -->
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
  .goals {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .goals li {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line-2);
  }
  /* 印章：楷体单字，未达成为空印（灰框），达成为朱砂实印 */
  .g-seal {
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    color: var(--muted-2);
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid var(--line);
  }
  .g-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .g-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
  }
  .g-tip {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  .goals li.done {
    border-color: rgba(192, 57, 43, 0.45);
    background: linear-gradient(180deg, rgba(192, 57, 43, 0.1), rgba(192, 57, 43, 0.04));
  }
  .goals li.done .g-seal {
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow: 0 2px 10px rgba(192, 57, 43, 0.35);
  }
  .goals li.done .g-name {
    color: var(--text);
  }
  .goals li.done .g-tip {
    color: rgba(226, 143, 131, 0.9);
  }
  .muted.all {
    color: var(--gold);
  }
  .all-done {
    margin: 9px 0 0;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    background: rgba(192, 57, 43, 0.09);
    border: 1px solid rgba(192, 57, 43, 0.38);
    font-size: var(--fs-xs);
    color: #e9a99f;
    line-height: 1.7;
  }
</style>
