<script lang="ts">
  import Icon from './Icon.svelte';
  import { engine } from '../game/engine.svelte';
  import { haptic } from '../game/haptics';
  import { achvSound } from '../game/audio';

  /** 波次难度预告：下一波用什么档（玩家心里有数，紧张感来自"看得见的爬坡"） */
  const nextDiff = $derived(
    engine.endlessDiff(engine.endlessWave + 1) === 'hard'
      ? '困难'
      : engine.endlessDiff(engine.endlessWave + 1) === 'normal'
        ? '普通'
        : '简单',
  );

  function goNext(): void {
    // 过波是里程碑时刻：成就音 + 重触感（与解锁成就同语言），随后进入下一波
    achvSound(engine.soundOn);
    haptic([12, 40, 12], engine.soundOn);
    engine.nextEndlessWave();
  }
  function retry(): void {
    haptic(12, engine.soundOn);
    engine.startEndless();
  }
  function quit(): void {
    engine.exitEndless();
  }

  /** 挑战结束时是否刷新了历史最佳——用引擎结算时记下的标志，
      不在组件里用 best <= score 反推（打平会误报，边界 bug） */
  const newBest = $derived(engine.endlessNewBest);
</script>

<div class="result">
  <div class="card">
    <div class="card-rail">
      <span class="g-label">无尽演武</span>
      <span class="rail-lv">
        {engine.endlessSurvived ? '第 ' + engine.endlessWave + ' 宿 · 破劫' : '星轨力竭'}
      </span>
    </div>
    <div class="card-body">
      {#if engine.endlessSurvived}
        <div class="wave-ico"><Icon name="infinity" size={26} /></div>
        <h2 class="line">第 {engine.endlessWave} 宿破劫通达</h2>

        <!-- 大数字：璇玑总分 -->
        <div class="score-big">
          <b class="g-num g-num--gold">{engine.endlessScore}</b>
          <span class="score-cap">总分</span>
        </div>

        <!-- 一句话结论 -->
        <p class="verdict">
          {#if engine.endlessNewBest}
            <Icon name="trophy" size={14} /> 登临新绝顶
          {:else}
            破劫通达 · 继续挑战下一宿
          {/if}
        </p>
        <p class="detail">
          <span>本宿实得 <b>{engine.score}</b> 分</span>
          <span class="sep">·</span>
          <span>过宿嘉赏 <b>+{engine.endlessWaveBonus}</b></span>
          {#if engine.endlessBest.wave > 0 && !engine.endlessNewBest}
            <span class="sep">·</span>
            <span>历代最佳 第 {engine.endlessBest.wave} 宿 · {engine.endlessBest.score} 分</span>
          {/if}
        </p>
        <p class="hint-line">
          <span class="nh-tag">{nextDiff}</span> 下一宿星晷更疾 · 收集 ≥35% 才能续命
        </p>

        <div class="actions">
          <button type="button" class="go" onclick={goNext}>启赴下一宿</button>
          <button type="button" class="ghost-btn" onclick={quit}>
            带着 {engine.endlessScore} 分返回星图
          </button>
        </div>
      {:else}
        <div class="wave-ico dead"><Icon name="infinity" size={26} /></div>
        <h2 class="line">周天星轨力竭</h2>

        <div class="score-big">
          <b class="g-num g-num--gold">{engine.endlessScore}</b>
          <span class="score-cap">总分</span>
        </div>

        <p class="verdict">
          {#if newBest}
            <Icon name="trophy" size={14} /> 创下新绝顶
          {:else if engine.endlessBest.wave > 0}
            止步第 {engine.endlessWave} 宿
          {:else}
            止步第 {engine.endlessWave} 宿
          {/if}
        </p>
        <p class="detail">
          {#if engine.endlessBest.wave > 0}
            <span>历代最佳 第 {engine.endlessBest.wave} 宿 · {engine.endlessBest.score} 分</span>
            {#if engine.endlessWave === engine.endlessBest.wave}
              <span class="sep">·</span>
              <span>仅差 <b>{engine.endlessBest.score - engine.endlessScore}</b> 分</span>
            {/if}
          {:else}
            <span>下次试试先收满 35%，就能续到下一宿</span>
          {/if}
        </p>

        <div class="actions">
          <button type="button" class="go" onclick={retry}>重启周天璇玑</button>
          <button type="button" class="ghost-btn" onclick={quit}>返回星图</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .result {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    background: rgba(3, 5, 11, 0.9);
    backdrop-filter: blur(6px);
    border-radius: var(--radius-md);
    animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 25;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* 无尽结算：同样只有「大数字 → 结论 → 明细 → 两个按钮」 */
  .card {
    position: relative;
    width: min(100%, 380px);
    max-height: 100%;
    overflow: visible;
    background: var(--metal);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    animation: card-in 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
    text-align: center;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .card-rail {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px 10px;
    border-bottom: 1px solid var(--edge-faint);
    border-radius: 10px 10px 0 0;
  }
  .rail-lv {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 20px 18px;
  }

  .wave-ico {
    color: var(--cyan);
    line-height: 1;
    animation: pop 0.45s cubic-bezier(0.34, 1.5, 0.64, 1);
  }
  .wave-ico.dead {
    color: var(--muted-2);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .line {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text);
  }

  /* 大数字：总分 */
  .score-big {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: 4px;
  }
  .score-big b {
    font-size: 46px;
    line-height: 1;
    background: linear-gradient(180deg, #ffe9a8, var(--gold) 65%, #e79a12);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .score-cap {
    font-size: var(--fs-sm);
    letter-spacing: 2px;
    color: var(--muted);
  }

  .verdict {
    margin: 2px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--gold-bright);
  }

  .detail {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .detail b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .detail .sep {
    color: var(--muted-2);
  }

  .hint-line {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .nh-tag {
    color: var(--cyan);
    font-weight: 600;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 9px;
    width: 100%;
    margin-top: 6px;
  }
  /* 主操作：金色厚键 */
  .go {
    appearance: none;
    width: 100%;
    min-height: 52px;
    padding: 0 20px;
    border-radius: 10px;
    cursor: pointer;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: 3px;
    color: #1a1002;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 3px 0 #7a4d05;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      background 0.12s ease;
  }
  .go:hover {
    background: var(--face-gold-hover);
  }
  .go:active {
    transform: translateY(2px);
  }
  /* 次操作：安静的一行描边 */
  .ghost-btn {
    appearance: none;
    width: 100%;
    min-height: 46px;
    padding: 0 16px;
    border-radius: 9px;
    cursor: pointer;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid var(--edge-faint);
    background: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .ghost-btn:hover {
    color: var(--text);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
  .ghost-btn:active {
    transform: translateY(1px);
  }

  /* 矮视口与手机竖屏：结算卡整屏显示 */
  @media (max-width: 900px) and (max-height: 700px), (max-width: 640px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px;
    }
  }
  @media (max-height: 460px) {
    .card-body {
      gap: 6px;
      padding: 12px 16px;
    }
    .score-big b {
      font-size: 34px;
    }
  }
</style>
