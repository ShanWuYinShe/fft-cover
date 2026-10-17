<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { spectrumGaps, starsFor } from '../../game/scoring';
  import { STAR_LEVELS } from '../../game/constants';

  const pauseProgress = $derived.by(() => {
    if (engine.phase !== 'paused' || engine.total === 0) return '';
    const got = engine.collectedCount;
    const ratio = got / engine.total;
    const st = starsFor(ratio);
    const parts = ['收集 ' + got + '/' + engine.total, '★'.repeat(st) + '☆'.repeat(3 - st)];
    if (st < 3) {
      const nextTier = STAR_LEVELS[2 - st];
      const need = Math.ceil(nextTier * engine.total - 1e-9) - got;
      if (need > 0) parts.push('再收 ' + need + ' 点升 ' + (st + 1) + ' 星');
    }
    return parts.join(' · ');
  });

  const pauseGaps = $derived.by(() => {
    if (engine.phase !== 'paused' || engine.collectedCount === 0 || !engine.level) return '';
    const gaps = spectrumGaps(engine.level.spectrum, engine.arms);
    if (gaps.length === 0) return '';
    return gaps
      .map(
        (g) =>
          (g.sign > 0 ? '' : '−') +
          Math.abs(g.k) +
          '× 差 ' +
          Math.round(g.mag) +
          (g.sign > 0 ? '' : '（过量）'),
      )
      .join('　');
  });

  function resume(): void {
    engine.toggleRun();
  }

  function backToEdit(): void {
    engine.fastForward = false;
    engine.resetRun();
  }

  function restart(): void {
    engine.fastForward = false;
    engine.resetRun();
    engine.startRun();
  }
</script>

<div class="pause-menu" role="dialog" aria-modal="true">
  <h3 class="font-celestial">已暂停</h3>
  <p class="pm-sub">调整策略后继续，或者重新来过</p>
  {#if pauseProgress}
    <p class="pm-prog font-tabular">{pauseProgress}</p>
  {/if}
  {#if pauseGaps}
    <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">
      <Icon name="bulb" size={13} /> 最该调：{pauseGaps}
    </p>
  {/if}
  <button type="button" class="pm-btn primary" onclick={resume}> ▶ 继续旋转 </button>
  <button type="button" class="pm-btn" onclick={backToEdit}> ⟲ 回到调参 </button>
  <button type="button" class="pm-btn" onclick={restart}> ↻ 重新开始 </button>
</div>

<style>
  .pause-menu {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 9px;
    padding: var(--space-4);
    background: rgba(6, 8, 16, 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: var(--radius-lg);
    z-index: 12;
    animation: fade-in 0.25s ease-out;
    box-sizing: border-box;
  }

  .pause-menu h3 {
    margin: 0 0 2px;
    font-size: 22px;
    letter-spacing: 6px;
    color: var(--text);
  }

  .pm-sub {
    margin: 0 0 10px;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .pm-prog {
    margin: 0 0 10px;
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    background: rgba(79, 209, 197, 0.1);
    border: 1px solid rgba(79, 209, 197, 0.32);
    font-size: var(--fs-sm);
    color: var(--cyan);
  }

  .pm-gaps {
    margin: 0 0 10px;
    max-width: 100%;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: rgba(251, 191, 36, 0.1);
    border: 1px dashed rgba(251, 191, 36, 0.4);
    font-size: var(--fs-xs);
    color: #fbbf24;
    line-height: 1.6;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .pm-btn {
    appearance: none;
    width: min(100%, 240px);
    min-height: 42px;
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid var(--line);
    color: var(--text);
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pm-btn:hover {
    background: linear-gradient(90deg, rgba(79, 209, 197, 0.1), transparent);
    transform: translateX(4px);
    border-color: rgba(79, 209, 197, 0.4);
    color: var(--cyan);
  }

  .pm-btn.primary {
    background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 100%);
    color: #060911;
    border: 1px solid var(--gold-bright);
    box-shadow: 0 2px 10px rgba(245, 184, 65, 0.4);
  }
  .pm-btn.primary:hover {
    filter: brightness(1.1);
    transform: translateX(4px);
  }
</style>
