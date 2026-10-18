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
    <!-- 座舱装饰：扫描线 + 四角包边 + 顶部铭牌 -->
    <span class="g-scanlines card-scan" aria-hidden="true"></span>
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>
    <div class="glow" aria-hidden="true"></div>
    <div class="card-rail">
      <span class="g-label">周 天 演 武</span>
      <span class="rail-lv">
        {engine.endlessSurvived ? '第 ' + engine.endlessWave + ' 宿 · 破劫' : '星轨力竭'}
      </span>
    </div>
    <div class="endless-seal" aria-hidden="true">{engine.endlessSurvived ? '破劫' : '力竭'}</div>
    <div class="card-body">
      {#if engine.endlessSurvived}
        <div class="wave-ico"><Icon name="infinity" size={30} /></div>
        <div class="title-wrap">
          <div class="eyebrow">✦ 周天无尽演武 ✦</div>
          <h2 class="line">第 {engine.endlessWave} 宿破劫通达</h2>
        </div>

        <div class="stats-grid">
          <div class="stat-cell">
            <span class="sk g-label g-label--dim">本宿实得</span>
            <span class="sv g-num">{engine.score} <small>分</small></span>
          </div>
          <div class="stat-cell">
            <span class="sk g-label g-label--dim">过宿嘉赏</span>
            <span class="sv gold g-num">+{engine.endlessWaveBonus}</span>
          </div>
          <div class="stat-cell full-width">
            <span class="sk g-label g-label--dim">璇玑总分</span>
            <span class="sv total-val"><b class="g-num g-num--gold">{engine.endlessScore}</b></span>
          </div>
        </div>

        {#if engine.endlessNewBest}
          <div class="rec">
            <Icon name="trophy" size={14} /> 登临新绝顶！（第 {engine.endlessWave} 宿）
          </div>
        {:else if engine.endlessBest.wave > 0}
          <div class="best">
            历代最佳：第 {engine.endlessBest.wave} 宿 · {engine.endlessBest.score} 分
          </div>
        {/if}

        <span class="g-divider card-div" aria-hidden="true"></span>
        <div class="next-hint">
          <span class="nh-tag">{nextDiff}</span> 下一宿星晷更疾 · 汲纳度需 ≥35% 方可延生
        </div>

        <div class="actions">
          <button type="button" class="go" onclick={goNext}>✦ 启赴下一宿 ✦</button>
          <button type="button" class="ghost-btn" onclick={quit}>
            载录 {engine.endlessScore} 分回阁
          </button>
        </div>
      {:else}
        <div class="wave-ico dead"><Icon name="infinity" size={30} /></div>
        <div class="title-wrap">
          <div class="eyebrow">✦ 演武终局 ✦</div>
          <h2 class="line">周天星轨力竭</h2>
        </div>

        <div class="stats-grid">
          <div class="stat-cell">
            <span class="sk g-label g-label--dim">止步宿位</span>
            <span class="sv">第 <b class="g-num g-num--gold">{engine.endlessWave}</b> 宿</span>
          </div>
          <div class="stat-cell">
            <span class="sk g-label g-label--dim">璇玑总分</span>
            <span class="sv gold"><b class="g-num g-num--gold">{engine.endlessScore}</b></span>
          </div>
        </div>

        {#if newBest}
          <div class="rec"><Icon name="trophy" size={14} /> ✦ 创下璇玑新绝顶 ✦</div>
        {:else if engine.endlessBest.wave > 0}
          <div class="best">
            历代最佳：第 {engine.endlessBest.wave} 宿 · {engine.endlessBest.score} 分
            {#if engine.endlessWave === engine.endlessBest.wave}
              · 仅差 {engine.endlessBest.score - engine.endlessScore} 分
            {/if}
          </div>
        {/if}

        <div class="actions">
          <button type="button" class="go" onclick={retry}>↻ 重启周天璇玑</button>
          <button type="button" class="ghost-btn" onclick={quit}>返回星图星宿</button>
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
    background:
      radial-gradient(circle at 50% 45%, rgba(11, 17, 28, 0.86), rgba(3, 5, 11, 0.96)),
      rgba(3, 5, 11, 0.9);
    backdrop-filter: blur(8px);
    border-radius: var(--chamfer-lg);
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

  /* 演武结算：金属装甲板 + 四角包边 */
  .card {
    position: relative;
    width: min(100%, 366px);
    max-height: 100%;
    overflow: visible;
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 45%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: 8px;
    box-shadow:
      var(--sh-game-lg),
      var(--bevel-top),
      inset 0 0 60px rgba(245, 184, 65, 0.06);
    animation: card-in 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
    text-align: center;
  }
  .card::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 14%,
      var(--edge-hot) 86%,
      transparent
    );
    opacity: 0.8;
    pointer-events: none;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.93);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .card-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0.65;
  }

  /* 顶部铭牌 */
  .card-rail {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 14px 8px;
    border-bottom: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.1), rgba(245, 184, 65, 0.015));
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.5);
    border-radius: 8px 8px 0 0;
    position: relative;
    z-index: 1;
  }
  .rail-lv {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text);
    letter-spacing: 1px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .glow {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 140px;
    background: radial-gradient(circle, rgba(245, 184, 65, 0.25), transparent 70%);
    pointer-events: none;
  }

  /* 落款朱印：竖排两字（下移，避开右上角包边） */
  .endless-seal {
    position: absolute;
    top: 46px;
    right: 12px;
    width: 28px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 2px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 13px;
    font-weight: 700;
    color: #fff1ed;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(192, 57, 43, 0.45);
    z-index: 2;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 18px 20px 20px;
  }

  .card-div {
    width: 100%;
    margin: 2px 0;
  }

  .wave-ico {
    font-size: 32px;
    line-height: 1;
    color: var(--cyan);
    filter: drop-shadow(0 0 12px rgba(45, 212, 191, 0.6));
    animation: pop 0.5s cubic-bezier(0.34, 1.6, 0.64, 1);
  }
  .wave-ico.dead {
    color: var(--muted-2);
    filter: drop-shadow(0 0 8px rgba(148, 163, 184, 0.2));
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .eyebrow {
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 2px;
    color: var(--gold-bright);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .line {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: 1px;
    color: #f1f5f9;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    margin: 4px 0;
  }
  .stat-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 9px 10px;
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.88), rgba(8, 12, 22, 0.72));
    border: 1px solid var(--edge-faint);
    border-radius: var(--r-sm);
    box-shadow: var(--bevel-inset);
  }
  .stat-cell.full-width {
    grid-column: span 2;
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.12), rgba(245, 184, 65, 0.03));
    border-color: rgba(245, 184, 65, 0.34);
  }
  .sk {
    font-size: var(--fs-xs);
    color: var(--muted);
    letter-spacing: 1px;
    text-align: left;
  }
  .sv {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    text-align: left;
  }
  .sv.gold {
    color: var(--gold-bright);
  }
  .sv small {
    font-size: var(--fs-xs);
    font-weight: 400;
    color: var(--muted-2);
    text-shadow: none;
  }
  .total-val {
    font-size: var(--fs-xl);
  }
  .total-val b {
    font-size: 30px;
  }

  .next-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--fs-xs);
    color: var(--muted);
    padding: 6px 12px;
    border-radius: var(--r-sm);
    background: rgba(45, 212, 191, 0.06);
    border: 1px dashed rgba(45, 212, 191, 0.3);
    width: 100%;
  }
  .nh-tag {
    color: var(--cyan);
    font-weight: 700;
    padding: 1px 6px;
    background: rgba(45, 212, 191, 0.15);
    border-radius: 4px;
  }

  .rec {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--fs-sm);
    color: var(--gold-bright);
    font-weight: 700;
    letter-spacing: 1px;
  }
  .best {
    font-size: var(--fs-xs);
    color: var(--muted-2);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 9px;
    width: 100%;
    margin-top: 4px;
  }
  /* 主行动：金色厚键（与 .g-btn--primary .g-btn--lg 同规格） */
  .go {
    appearance: none;
    width: 100%;
    min-height: 52px;
    padding: 0 20px;
    border-radius: 12px;
    cursor: pointer;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: 3px;
    color: #1a1002;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 4px 0 #7a4d05,
      0 10px 26px rgba(245, 184, 65, 0.35);
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  .go:hover {
    background: var(--face-gold-hover);
  }
  .go:active {
    transform: translateY(3px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  /* 次行动：金属面 */
  .ghost-btn {
    appearance: none;
    width: 100%;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    cursor: pointer;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .ghost-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .ghost-btn:active {
    transform: translateY(2px);
  }

  /* 矮视口与手机竖屏：结算卡整屏显示（座舱壳下画布高度不够放完整卡） */
  @media (max-width: 900px) and (max-height: 700px), (max-width: 640px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px;
    }
  }
</style>
