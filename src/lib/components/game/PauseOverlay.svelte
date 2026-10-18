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

<!-- 暂停舱：整块盖住画布；画布很矮时外层滚动，保证三个按钮都能点到 -->
<div class="pause-menu" role="dialog" aria-modal="true">
  <div class="pm-panel">
    <span class="g-scanlines pm-scan" aria-hidden="true"></span>
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>

    <span class="pm-eyebrow g-label">观测暂止</span>
    <h3 class="font-celestial">已暂停</h3>
    <p class="pm-sub">调整策略后继续，或者重新来过</p>
    <span class="g-divider pm-div" aria-hidden="true"></span>

    {#if pauseProgress}
      <p class="pm-prog font-tabular">{pauseProgress}</p>
    {/if}
    {#if pauseGaps}
      <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">
        <Icon name="bulb" size={13} /> 最该调：{pauseGaps}
      </p>
    {/if}

    <button type="button" class="pm-btn primary" onclick={resume}>
      <Icon name="play" size={14} /> 继 续 旋 转
    </button>
    <button type="button" class="pm-btn" onclick={backToEdit}>
      <Icon name="sliders" size={14} /> 回 到 调 参
    </button>
    <button type="button" class="pm-btn" onclick={restart}>
      <Icon name="refresh" size={14} /> 重 新 开 始
    </button>
  </div>
</div>

<style>
  .pause-menu {
    position: absolute;
    inset: 0;
    display: flex;
    padding: 12px;
    box-sizing: border-box;
    background: rgba(5, 7, 14, 0.86);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: var(--radius-lg);
    z-index: 12;
    animation: fade-in 0.25s ease-out;
    /* 画布矮（手机竖屏）时整块可滚，按钮不会被裁掉 */
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* 座舱面板：居中，撑不满就滚动 */
  .pm-panel {
    position: relative;
    margin: auto;
    width: min(100%, 320px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 18px 18px;
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 45%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: var(--radius-md);
    box-shadow: var(--sh-game-lg), var(--bevel-top);
    text-align: center;
  }
  .pm-panel::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 16%,
      var(--edge-hot) 84%,
      transparent
    );
    opacity: 0.75;
    pointer-events: none;
  }

  .pm-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0.7;
  }

  .pm-eyebrow {
    position: relative;
  }

  .pm-panel h3 {
    position: relative;
    margin: 0;
    font-size: 24px;
    letter-spacing: 8px;
    color: var(--text);
    text-shadow: 0 0 18px rgba(245, 184, 65, 0.35);
  }

  .pm-div {
    width: 100%;
    margin: 2px 0 4px;
  }

  .pm-sub {
    position: relative;
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  /* 本局读数：小铭牌 + 等宽数字的凹槽条 */
  .pm-prog {
    position: relative;
    margin: 0;
    width: 100%;
    padding: 7px 10px;
    box-sizing: border-box;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, rgba(3, 8, 12, 0.9), rgba(6, 14, 16, 0.85));
    border: 1px solid rgba(0, 245, 212, 0.32);
    box-shadow: var(--bevel-inset);
    font-size: var(--fs-sm);
    color: var(--cyan);
    text-shadow: 0 0 12px rgba(0, 245, 212, 0.3);
  }

  /* 最该调的频率：金色警示凹槽 */
  .pm-gaps {
    position: relative;
    margin: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, rgba(24, 16, 3, 0.9), rgba(12, 8, 2, 0.88));
    border: 1px solid rgba(245, 184, 65, 0.4);
    box-shadow: var(--bevel-inset);
    font-size: var(--fs-xs);
    color: var(--gold-bright);
    line-height: 1.6;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  /* 暂停菜单按键：满宽厚键，主操作金色 */
  .pm-btn {
    position: relative;
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    margin-top: 2px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    color: var(--text);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow:
      var(--bevel-top),
      0 4px 0 rgba(0, 0, 0, 0.55);
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  .pm-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .pm-btn:active {
    transform: translateY(3px);
    box-shadow: var(--bevel-top);
  }

  .pm-btn.primary {
    min-height: 52px;
    font-size: var(--fs-lg);
    letter-spacing: 5px;
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 4px 0 #7a4d05,
      0 0 22px rgba(245, 184, 65, 0.35);
  }
  .pm-btn.primary:hover {
    color: #120a00;
    background: var(--face-gold-hover);
  }

  @media (prefers-reduced-motion: reduce) {
    .pm-btn {
      transition: none;
    }
  }
</style>
