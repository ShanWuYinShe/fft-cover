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

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  /**
   * 数字 count-up：0 → 终值（easeOut）。结束帧直接取终值，保证显示值与引擎一致；
   * reduce-motion 下不做插值。
   */
  function countUp(target: number, dur: number, set: (v: number) => void): () => void {
    if (reduceMotion || target <= 0) {
      set(target);
      return () => {};
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min((now - t0) / dur, 1);
      set(p >= 1 ? target : Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  /** 大数字：总分与宿位都做 count-up（宿位快一些，像计数器跳到位） */
  let shownScore = $state(0);
  let shownWave = $state(0);
  $effect(() => {
    const stopA = countUp(engine.endlessScore, 600, (v) => (shownScore = v));
    const stopB = countUp(engine.endlessWave, 420, (v) => (shownWave = v));
    return () => {
      stopA();
      stopB();
    };
  });

  /** 结论印章：本局最值得盖的那一个（新绝顶 > 破劫 > 力竭） */
  const stamp = $derived(
    engine.endlessSurvived
      ? engine.endlessNewBest
        ? '新绝顶'
        : '破劫'
      : newBest
        ? '新绝顶'
        : '力竭',
  );
</script>

<div class="result">
  <div class="card g-rivets">
    <div class="card-rail">
      <span class="g-label">无尽演武</span>
      <span class="rail-lv">
        {engine.endlessSurvived ? '第 ' + engine.endlessWave + ' 宿 · 破劫' : '星轨力竭'}
      </span>
    </div>
    <div class="card-body">
      {#if engine.endlessSurvived}
        <div class="wave-ico"><Icon name="infinity" size={26} /></div>
        <h2 class="line">第 {shownWave} 宿破劫通达</h2>

        <!-- 大数字：璇玑总分 -->
        <div class="score-big">
          <b class="g-num g-num--gold">{shownScore}</b>
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
        <span class="stamp" aria-hidden="true">{stamp}</span>
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
          <button type="button" class="go g-btn g-btn--primary g-btn--lg" onclick={goNext}
            >启赴下一宿</button
          >
          <button type="button" class="ghost-btn g-btn" onclick={quit}>
            带着 {engine.endlessScore} 分返回星图
          </button>
        </div>
      {:else}
        <div class="wave-ico dead"><Icon name="infinity" size={26} /></div>
        <h2 class="line">周天星轨力竭</h2>

        <div class="score-big">
          <b class="g-num g-num--gold">{shownScore}</b>
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
        <span class="stamp" aria-hidden="true">{stamp}</span>
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
          <button type="button" class="go g-btn g-btn--primary g-btn--lg" onclick={retry}
            >重启周天璇玑</button
          >
          <button type="button" class="ghost-btn g-btn" onclick={quit}>返回星图</button>
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
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 结论印章：斜盖入 -8° → -6°，1.3 → 1.0（220ms，等大数字走完再盖） */
  .stamp {
    align-self: center;
    padding: 3px 12px;
    border: 1px solid rgba(217, 43, 43, 0.7);
    border-radius: 4px;
    color: #f0a6a6;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: 3px;
    white-space: nowrap;
    /* 基准态就是盖好后的角度：动画结束后自然停在 -6° */
    transform: rotate(-6deg);
    animation: stamp-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) 0.42s backwards;
  }
  @keyframes stamp-in {
    from {
      opacity: 0;
      transform: rotate(-8deg) scale(1.3);
    }
    to {
      opacity: 1;
      transform: rotate(-6deg) scale(1);
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
    gap: 6px;
    padding: 12px 16px 14px;
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
    gap: 7px;
    width: 100%;
    margin-top: 6px;
  }
  /* 主操作：金色厚键 */
  .go {
    width: 100%;
    min-height: var(--ctl-lg);
    padding: 0 18px;
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 2px;
    -webkit-tap-highlight-color: transparent;
    /* 形与四态交给公共件 .g-btn--primary（牌匾）：本地只保留布局与字号 */
  }
  .go:hover {
    background: var(--face-gold-hover);
  }
  .go:active {
    transform: translateY(2px);
  }
  /* 次操作：安静的一行描边 */
  /* 次键：形与四态交给公共件 .g-btn（铜板键），本地只保留布局与字号 */
  .ghost-btn {
    width: 100%;
    min-height: var(--ctl-md);
    padding: 0 14px;
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
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

  /* 减弱动态效果：位移动画关闭（颜色/透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .card,
    .stamp {
      animation: none;
    }
  }
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .stamp {
    animation: none;
  }
</style>
