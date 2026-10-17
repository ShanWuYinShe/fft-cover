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
    <div class="glow"></div>
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
            <span class="sk">本宿实得</span>
            <span class="sv">{engine.score} <small>分</small></span>
          </div>
          <div class="stat-cell">
            <span class="sk">过宿嘉赏</span>
            <span class="sv gold">+{engine.endlessWaveBonus}</span>
          </div>
          <div class="stat-cell full-width">
            <span class="sk">璇玑总分</span>
            <span class="sv total-val"><b>{engine.endlessScore}</b></span>
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

        <div class="next-hint">
          <span class="nh-tag">{nextDiff}</span> 下一宿星晷更疾 · 汲纳度需 ≥35% 方可延生
        </div>

        <div class="actions">
          <button type="button" class="primary go" onclick={goNext}>✦ 启赴下一宿 ✦</button>
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
            <span class="sk">止步宿位</span>
            <span class="sv">第 <b>{engine.endlessWave}</b> 宿</span>
          </div>
          <div class="stat-cell">
            <span class="sk">璇玑总分</span>
            <span class="sv gold"><b>{engine.endlessScore}</b></span>
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
          <button type="button" class="primary go" onclick={retry}>↻ 重启周天璇玑</button>
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
      radial-gradient(circle at 50% 45%, rgba(13, 20, 32, 0.85), rgba(5, 7, 13, 0.96)),
      rgba(5, 7, 13, 0.88);
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

  .card {
    position: relative;
    width: min(100%, 360px);
    max-height: 100%;
    overflow: hidden;
    background: linear-gradient(170deg, rgba(17, 24, 39, 0.98), rgba(9, 13, 22, 0.99));
    border: 1px solid rgba(245, 197, 66, 0.35);
    clip-path: polygon(
      0 12px,
      12px 0,
      calc(100% - 12px) 0,
      100% 12px,
      100% calc(100% - 12px),
      calc(100% - 12px) 100%,
      12px 100%,
      0 calc(100% - 12px)
    );
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.75),
      0 0 40px rgba(245, 197, 66, 0.08) inset;
    animation: card-in 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
    text-align: center;
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

  .glow {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 140px;
    background: radial-gradient(circle, rgba(245, 197, 66, 0.25), transparent 70%);
    pointer-events: none;
  }

  .endless-seal {
    position: absolute;
    top: 12px;
    right: 14px;
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
    padding: 22px 20px;
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
    gap: 2px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(245, 197, 66, 0.15);
    border-radius: var(--r-sm);
  }
  .stat-cell.full-width {
    grid-column: span 2;
    background: rgba(245, 197, 66, 0.04);
    border-color: rgba(245, 197, 66, 0.3);
  }
  .sk {
    font-size: var(--fs-xs);
    color: var(--muted);
    letter-spacing: 1px;
  }
  .sv {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .sv.gold {
    color: var(--gold-bright);
  }
  .sv small {
    font-size: var(--fs-xs);
    font-weight: 400;
    color: var(--muted-2);
  }
  .total-val {
    font-size: var(--fs-xl);
  }
  .total-val b {
    color: var(--gold-bright);
    font-size: 1.2em;
    text-shadow: 0 0 16px rgba(245, 197, 66, 0.35);
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
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }
  .go {
    width: 100%;
    padding: 10px 0;
    font-size: var(--fs-md);
    letter-spacing: 2px;
  }
  .ghost-btn {
    width: 100%;
    padding: 8px 0;
    border-radius: var(--r-sm);
    font: inherit;
    font-size: var(--fs-xs);
    color: var(--muted);
    background: transparent;
    border: 1px solid rgba(245, 197, 66, 0.2);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .ghost-btn:hover {
    color: var(--text);
    border-color: rgba(245, 197, 66, 0.5);
    background: rgba(245, 197, 66, 0.05);
  }

  @media (max-width: 900px) and (max-height: 700px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px;
    }
  }
</style>
