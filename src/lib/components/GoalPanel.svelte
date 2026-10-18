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

<!-- 本关目标：装甲铭牌面板，四枚朱砂印嵌在凹槽插槽里 -->
<section class="goal-panel g-plate g-plate--lit" aria-labelledby="goal-title">
  <header class="goal-head">
    <h2 id="goal-title" class="g-label goal-title">本关目标</h2>
    <span class="goal-count" class:all={prog.done === prog.total}>
      <b class="g-num goal-done">{prog.done}</b>
      <span class="goal-sep">/</span>
      <span class="goal-total">{prog.total}</span>
    </span>
  </header>

  <hr class="g-divider goal-divider" />

  <!-- 达成即盖印：朱砂方印（篆刻样式），未达成是空印 -->
  <ul class="goals">
    {#each rows as g (g.id)}
      <li class="g-inset goal-row" class:done={g.done}>
        <span class="g-seal" aria-label={g.done ? g.name + ' 已达成' : g.name + ' 未达成'}
          >{g.seal}</span
        >
        <span class="g-body">
          <span class="g-name">{g.name}</span>
          <span class="g-tip">{g.tip}</span>
        </span>
        <span class="g-lamp goal-lamp" aria-hidden="true"></span>
      </li>
    {/each}
  </ul>

  {#if prog.done === prog.total}
    <p class="all-done">本关四印齐全——去随机关或每日挑战找新的曲线吧</p>
  {/if}
</section>

<style>
  /* ============================================================
   * 本关目标 · 机箱面板
   * 段头铭牌 + 大号达成读数 + 四枚朱砂印插槽
   * ============================================================ */
  .goal-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    min-width: 0;
  }
  .goal-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
  }
  .goal-title {
    margin: 0;
    font-size: 12px;
    letter-spacing: 2px;
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
    color: var(--gold-bright);
    text-shadow: 0 0 14px rgba(245, 184, 65, 0.5);
  }
  .goal-sep {
    font-size: 10px;
    color: var(--muted-2);
  }
  .goal-total {
    font-size: 10px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .goal-count.all .goal-done {
    color: var(--gold-bright);
    text-shadow: 0 0 20px rgba(255, 209, 102, 0.85);
  }

  .goal-divider {
    margin: 0;
  }

  .goals {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .goals .goal-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 9px;
    min-width: 0;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
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
    color: var(--muted-2);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--bevel-inset);
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
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .g-tip {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    font-variant-numeric: tabular-nums;
    line-height: 1.4;
  }
  .goal-lamp {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .goals .goal-row.done {
    border-color: var(--cinnabar-line);
    background: linear-gradient(180deg, rgba(192, 57, 43, 0.12), rgba(192, 57, 43, 0.03));
    box-shadow:
      var(--bevel-inset),
      0 0 14px rgba(217, 43, 43, 0.18);
  }
  .goals .goal-row.done .g-seal {
    color: #fdece7;
    background: linear-gradient(160deg, #d84b3c, #8e2a1f);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 2px 12px rgba(192, 57, 43, 0.45);
  }
  .goals .goal-row.done .g-name {
    color: var(--text);
  }
  .goals .goal-row.done .g-tip {
    color: rgba(226, 143, 131, 0.9);
  }
  .goals .goal-row.done .goal-lamp {
    background: var(--cinnabar);
    box-shadow:
      0 0 8px rgba(217, 43, 43, 0.9),
      inset 0 0 2px #fff;
  }

  .all-done {
    margin: 2px 0 0;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    background: rgba(192, 57, 43, 0.1);
    border: 1px solid var(--cinnabar-line);
    font-size: var(--fs-xs);
    color: #fca5a5;
    line-height: 1.7;
    text-align: center;
    box-shadow: var(--bevel-inset);
  }
</style>
