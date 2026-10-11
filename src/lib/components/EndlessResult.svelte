<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { haptic } from '../game/haptics';

  /** 波次难度预告：下一波用什么档（玩家心里有数，紧张感来自"看得见的爬坡"） */
  const nextDiff = $derived(
    engine.endlessDiff(engine.endlessWave + 1) === 'hard'
      ? '困难'
      : engine.endlessDiff(engine.endlessWave + 1) === 'normal'
        ? '普通'
        : '简单',
  );

  function goNext(): void {
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

  /** 挑战结束时是否刷新了历史最佳（波次更高，或同波次累计分更高） */
  const newBest = $derived(
    engine.endlessBest.wave === engine.endlessWave &&
      engine.endlessBest.score <= engine.endlessScore,
  );
</script>

<div class="result">
  <div class="card">
    <div class="card-body">
      {#if engine.endlessSurvived}
        <div class="wave-ico">♾</div>
        <div class="line">第 {engine.endlessWave} 波通过！</div>
        <div class="gain">
          本波 {engine.score} 分 + 过波奖励 {engine.endlessWaveBonus}
        </div>
        <div class="total">累计 <b>{engine.endlessScore}</b> 分</div>
        <div class="next-hint">下一波：{nextDiff}难度 · 收集 ≥35% 才能继续</div>
        <button type="button" class="primary go" onclick={goNext}>▶ 下一波</button>
        <button type="button" class="ghost-btn" onclick={quit}
          >带着 {engine.endlessScore} 分收工</button
        >
      {:else}
        <div class="wave-ico dead">♾</div>
        <div class="line">挑战结束</div>
        <div class="total">
          止步第 <b>{engine.endlessWave}</b> 波 · 累计 <b>{engine.endlessScore}</b> 分
        </div>
        {#if newBest}
          <div class="rec">🏅 新纪录！</div>
        {:else if engine.endlessBest.wave > 0}
          <div class="best">
            最佳：第 {engine.endlessBest.wave} 波 · {engine.endlessBest.score} 分
          </div>
        {/if}
        <button type="button" class="primary go" onclick={retry}>↻ 再来一局</button>
        <button type="button" class="ghost-btn" onclick={quit}>回到关卡</button>
      {/if}
    </div>
  </div>
</div>

<style>
  /* 与 ResultOverlay 同一套玻璃拟态卡片语言，保持视觉一致 */
  .result {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    background: radial-gradient(circle at 50% 45%, rgba(10, 14, 28, 0.62), rgba(5, 7, 14, 0.9));
    backdrop-filter: blur(5px);
    border-radius: 14px;
    animation: fade-in 0.3s ease-out;
    z-index: 5;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: min(100%, 360px);
    max-height: 100%;
    overflow: hidden;
    border-radius: 20px;
    background: linear-gradient(168deg, rgba(24, 30, 56, 0.96), rgba(12, 16, 32, 0.98));
    border: 1px solid rgba(130, 150, 210, 0.22);
    box-shadow:
      0 26px 70px rgba(0, 0, 0, 0.62),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset,
      0 1px 0 rgba(255, 255, 255, 0.07) inset;
    animation: card-in 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
    text-align: center;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 18px;
  }
  .wave-ico {
    font-size: 40px;
    line-height: 1;
    filter: drop-shadow(0 0 14px rgba(79, 209, 197, 0.5));
    animation: pop 0.5s cubic-bezier(0.34, 1.6, 0.64, 1);
  }
  .wave-ico.dead {
    filter: grayscale(0.6) drop-shadow(0 0 10px rgba(130, 150, 210, 0.25));
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
  .line {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
  }
  .gain {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .total {
    font-size: var(--fs-md);
    color: var(--text);
  }
  .total b {
    color: var(--gold);
    font-size: 1.25em;
  }
  .next-hint {
    font-size: var(--fs-xs);
    color: var(--muted);
    padding: 5px 10px;
    border-radius: var(--r-sm);
    background: rgba(251, 191, 36, 0.08);
    border: 1px dashed rgba(251, 191, 36, 0.35);
  }
  .rec {
    font-size: var(--fs-md);
    color: var(--gold);
    font-weight: 700;
  }
  .best {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .go {
    width: 100%;
    margin-top: 4px;
    padding: 9px 0;
    border-radius: var(--r-sm);
    font: inherit;
    font-size: var(--fs-md);
    font-weight: 600;
    color: #062a26;
    background: linear-gradient(160deg, #4fd1c5, #38b2a3);
    border: none;
    cursor: pointer;
    transition:
      filter 0.15s,
      transform 0.1s;
  }
  button.go:hover {
    filter: brightness(1.08);
  }
  button.go:active {
    transform: scale(0.98);
  }
  .ghost-btn {
    width: 100%;
    padding: 7px 0;
    border-radius: var(--r-sm);
    font: inherit;
    font-size: var(--fs-xs);
    color: var(--muted);
    background: transparent;
    border: 1px solid rgba(130, 150, 210, 0.25);
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  button.ghost-btn:hover {
    color: var(--text);
    border-color: rgba(130, 150, 210, 0.5);
  }
  /* 矮屏手机（画布只有 ~180px 高）：结算卡若仍贴在画布框内，「收集 / 全清 /
     完美全清 / 下一枚印」全被裁掉（实测 320×568 只剩星级与分数）。
     改为覆盖整屏、底部让开标签栏——统计一行不落，卡片居中。 */
  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px 10px 70px;
    }
  }
</style>
