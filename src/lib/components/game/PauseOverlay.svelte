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

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  /** 退场：先播 140ms 缩小淡出（比进场 220ms 快 30%），再执行动作 */
  let closing = $state(false);
  function leave(fn: () => void): void {
    if (closing) return;
    if (reduceMotion) {
      fn();
      return;
    }
    closing = true;
    setTimeout(fn, 140);
  }

  function resume(): void {
    leave(() => engine.toggleRun());
  }

  function backToEdit(): void {
    leave(() => {
      engine.fastForward = false;
      engine.resetRun();
    });
  }

  function restart(): void {
    leave(() => {
      engine.fastForward = false;
      engine.resetRun();
      engine.startRun();
    });
  }
</script>

<!-- 暂停菜单：--scrim 遮罩 + 居中白卡；画布很矮时整块可滚，三个按钮都点得到 -->
<div class="pause-menu" role="dialog" aria-modal="true">
  <div class="pm-panel" class:closing>
    <h3>已暂停</h3>
    <p class="pm-sub">先看清现在的进度，再决定继续还是重来</p>

    {#if pauseProgress}
      <p class="pm-prog font-tabular">{pauseProgress}</p>
    {/if}
    {#if pauseGaps}
      <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">
        <Icon name="bulb" size={14} /> 最该调：{pauseGaps}
      </p>
    {/if}

    <!-- 三个动作 50ms 错峰进入 -->
    <button
      type="button"
      class="pm-btn primary g-btn g-btn--primary g-btn--lg"
      style="animation-delay: 40ms"
      onclick={resume}
    >
      <Icon name="play" size={14} /> 继 续 旋 转
    </button>
    <button type="button" class="pm-btn g-btn" style="animation-delay: 90ms" onclick={backToEdit}>
      <Icon name="sliders" size={14} /> 回 到 调 参
    </button>
    <button type="button" class="pm-btn g-btn" style="animation-delay: 140ms" onclick={restart}>
      <Icon name="refresh" size={14} /> 重 新 开 始
    </button>
  </div>
</div>

<style>
  /* ============================================================
   * 暂停菜单 · 白卡居中（第十四轮）
   * 遮罩 --scrim；卡片 = 白卡 + 36px 大圆角 + 硬投影（--sh-3）。
   * 不用玻璃拟态、不用模糊、不用黑色阴影。
   * ============================================================ */
  .pause-menu {
    position: absolute;
    inset: 0;
    display: flex;
    padding: 12px;
    box-sizing: border-box;
    background: var(--scrim);
    border-radius: var(--r-lg);
    z-index: 12;
    animation: fade-in 0.25s ease-out;
    /* 画布矮（手机竖屏）时整块可滚，按钮不会被裁掉 */
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .pm-panel {
    position: relative;
    margin: auto;
    width: min(100%, 340px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-5);
    box-sizing: border-box;
    border: 3px solid #ffffff;
    border-radius: var(--r-xl);
    background: var(--mat-plate);
    box-shadow: var(--sh-3);
    text-align: center;
    /* 进场：0.97 缩放 + 淡入 260ms（回弹曲线只用于缩放） */
    animation: pm-in 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  @keyframes pm-in {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  /* 退场：比进场快 30%（180ms），先缩再走 */
  .pm-panel.closing {
    animation: pm-out 0.18s cubic-bezier(0.4, 0, 1, 1) forwards;
    pointer-events: none;
  }
  @keyframes pm-out {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  /* 标题：珊瑚圆点 + 深蓝字（不用朱印、不用宽字距） */
  .pm-panel h3 {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-family: var(--font-round);
    font-size: var(--fs-xl);
    font-weight: 900;
    letter-spacing: 1px;
    color: var(--text);
  }
  .pm-panel h3::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--coral);
    box-shadow: 0 2px 0 var(--coral-edge);
  }

  .pm-sub {
    margin: 0;
    font-size: var(--fs-sm);
    line-height: 1.5;
    color: var(--muted);
  }

  /* 本局进度：一行等宽读数 */
  .pm-prog {
    margin: 2px 0 0;
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
  }

  /* 最该调的频率：一行珊瑚提示 */
  .pm-gaps {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: var(--fs-sm);
    font-weight: 700;
    line-height: 1.5;
    color: var(--coral-edge);
  }

  /* 三个动作：形与四态全部交给公共件 .g-btn，本地只留布局与入场编排 */
  .pm-btn {
    position: relative;
    width: 100%;
    min-height: var(--ctl-md);
    margin-top: var(--space-1);
    padding: 0 14px;
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    letter-spacing: 1px;
    animation: pm-btn-in 0.26s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  @keyframes pm-btn-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 主操作：尺寸 = 结算卡的主操作（视觉由 .g-btn--primary 提供） */
  .pm-btn.primary {
    min-height: var(--ctl-lg);
    margin-top: 0;
    font-size: var(--ctl-font);
    font-weight: 900;
    letter-spacing: 2px;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .pm-panel {
      padding: var(--space-4);
      border-radius: var(--r-lg);
    }
  }

  /* 减弱动态效果：位移 / 缩放动画全部关闭（颜色 / 透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .pm-panel,
    .pm-panel.closing,
    .pm-btn {
      animation: none;
      transition: none;
    }
  }
  :global(.reduce-motion) .pm-panel,
  :global(.reduce-motion) .pm-panel.closing,
  :global(.reduce-motion) .pm-btn {
    animation: none;
    transition: none;
  }
</style>
