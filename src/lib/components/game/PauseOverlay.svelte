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

<!-- 暂停菜单：一块安静的面板盖住画布；画布很矮时外层滚动，三个按钮都能点到 -->
<div class="pause-menu" role="dialog" aria-modal="true">
  <div class="pm-panel">
    <h3 class="font-celestial">已暂停</h3>
    <p class="pm-sub">先看清现在的进度，再决定继续还是重来</p>

    {#if pauseProgress}
      <p class="pm-prog font-tabular">{pauseProgress}</p>
    {/if}
    {#if pauseGaps}
      <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">
        <Icon name="bulb" size={14} /> 最该调：{pauseGaps}
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
    background: rgba(5, 7, 14, 0.84);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: var(--radius-lg);
    z-index: 12;
    animation: fade-in 0.25s ease-out;
    /* 画布矮（手机竖屏）时整块可滚，按钮不会被裁掉 */
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* 面板：一块平板 + 1px 描边，无包边、无扫描线、无外发光 */
  .pm-panel {
    position: relative;
    margin: auto;
    width: min(100%, 320px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 18px;
    background: var(--metal);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    text-align: center;
  }

  .pm-panel h3 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 5px;
    color: var(--text);
  }

  .pm-sub {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  /* 本局进度：一行等宽读数（不再是凹槽盒子） */
  .pm-prog {
    margin: 2px 0 0;
    font-size: var(--fs-sm);
    color: var(--text);
  }

  /* 最该调的频率：一行金色提示 */
  .pm-gaps {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--fs-sm);
    color: var(--gold-bright);
    line-height: 1.5;
  }

  /* 三个动作：主操作金色，其余金属面 */
  .pm-btn {
    position: relative;
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 48px;
    margin-top: 4px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--edge-faint);
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 2px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .pm-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.1);
  }

  /* 主操作：金色实心（全屏唯一发光点之一） */
  .pm-btn.primary {
    min-height: 52px;
    margin-top: 0;
    margin-bottom: 4px;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: 4px;
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 3px 0 #7a4d05;
  }
  .pm-btn.primary:hover {
    color: #120a00;
    background: var(--face-gold-hover);
  }
  .pm-btn:active {
    transform: translateY(2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .pm-btn {
      transition: none;
    }
  }
</style>
