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
        <span class="stamp g-seal" aria-hidden="true">{stamp}</span>
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
          <button type="button" class="ghost-btn g-btn g-btn--ghost" onclick={quit}>
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
        <span class="stamp g-seal" aria-hidden="true">{stamp}</span>
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
          <button type="button" class="ghost-btn g-btn g-btn--ghost" onclick={quit}>返回星图</button
          >
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
    padding: 14px;
    background: var(--scrim-strong);
    border-radius: var(--r-lg);
    z-index: 25;
    animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .card {
    position: relative;
    width: min(100%, 400px);
    max-height: 100%;
    overflow: visible;
    border-radius: var(--r-xl);
    background: var(--mat-plate);
    border: 3px solid #ffffff;
    box-shadow: var(--sh-3);
    animation: card-in 0.32s cubic-bezier(0.16, 1, 0.3, 1);
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

  /* 结论印章：薄荷庆祝印（本地覆盖公共 .g-seal 的朱红） */
  .stamp {
    align-self: center;
    padding: 4px 14px;
    font-family: var(--font-round);
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 2px;
    white-space: nowrap;
    color: var(--mint-ink);
    background: var(--face-jade);
    border: 2px solid #ffffff;
    border-radius: var(--r-sm);
    box-shadow: 0 3px 0 var(--mint-edge);
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
    padding: 15px 16px 10px;
    border-bottom: 2px solid var(--line);
  }

  .card-rail .g-label {
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--coral-edge);
  }

  .rail-lv {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 14px 18px 16px;
  }

  .wave-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    color: var(--mint-deep);
    background: var(--mint-dim);
    line-height: 1;
    animation: pop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
  }

  .wave-ico.dead {
    color: var(--muted-2);
    background: var(--line-quiet);
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
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  /* 大数字：总分 */
  .score-big {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-top: 2px;
  }

  .score-big b {
    font-size: 40px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-text);
    font-variant-numeric: tabular-nums;
    letter-spacing: 1px;
  }

  .score-cap {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--muted);
  }

  .verdict {
    margin: 2px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
  }

  .detail {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .detail b {
    color: var(--text);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }

  .detail .sep {
    color: var(--muted-2);
  }

  /* 下一宿预告：自己的浅薄荷提示卡 */
  .hint-line {
    margin: 2px 0 0;
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--note-edge);
    background: var(--note-bg);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .nh-tag {
    display: inline-block;
    margin-right: 4px;
    padding: 1px 8px;
    border-radius: var(--r-pill);
    background: var(--mint-dim);
    color: var(--mint-edge);
    font-weight: 900;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    margin-top: 6px;
  }

  .go {
    width: 100%;
    min-height: var(--ctl-lg);
    padding: 0 18px;
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 800;
    letter-spacing: 1px;
    -webkit-tap-highlight-color: transparent;
  }

  .ghost-btn {
    width: 100%;
    min-height: var(--ctl-md);
    padding: 0 14px;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    white-space: nowrap;
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

  @media (max-width: 640px) {
    .score-big b {
      font-size: 36px;
    }
    .line {
      font-size: 22px;
    }
  }

  /* 减弱动态效果：位移动画关闭（颜色/透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .result,
    .card,
    .wave-ico,
    .stamp {
      animation: none;
    }
  }

  :global(.reduce-motion) .result,
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .wave-ico,
  :global(.reduce-motion) .stamp {
    animation: none;
  }
</style>
