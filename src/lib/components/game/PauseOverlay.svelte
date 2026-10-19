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

<!-- 暂停菜单：一块安静的面板盖住画布；画布很矮时外层滚动，三个按钮都能点到 -->
<div class="pause-menu" role="dialog" aria-modal="true">
  <div class="pm-panel g-rivets" class:closing>
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
    gap: var(--space-2);
    padding: var(--space-4);
    /* 器物面板：青铜边 + 内侧暗线（右上角包角由 .g-rivets::after 提供，见模板）
       两条阴影必须写在同一个 box-shadow 里——分两条会互相覆盖，内暗线会丢 */
    background: var(--face-plate);
    border: 1px solid var(--edge-bronze);
    box-shadow:
      inset 0 0 0 1px var(--edge-inner),
      0 4px 8px rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    text-align: center;
    /* 进场：0.97 缩放 + 淡入 220ms */
    animation: pm-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) backwards;
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
  /* 退场：比进场快 30%（140ms），先缩再走 */
  .pm-panel.closing {
    animation: pm-out 0.14s cubic-bezier(0.4, 0, 1, 1) forwards;
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

  /* 朱印标题：题头左侧一方小印（装饰，无文案） */
  .pm-panel h3::before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 8px;
    vertical-align: 1px;
    border-radius: 2px;
    background: var(--face-seal);
    box-shadow: inset 0 0 0 1px rgba(255, 235, 220, 0.45);
    transform: rotate(-8deg);
  }
  .pm-panel h3 {
    margin: 0;
    font-size: var(--fs-xl);
    letter-spacing: 4px;
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
  /* 按钮：形与四态（含 :focus-visible）全部交给公共件 .g-btn / .g-btn--primary，
     本地只保留布局、字号与入场编排——本地的 border/background/box-shadow/color
     会盖掉公共件与结算卡同一套的边色与焦点态 */
  .pm-btn {
    position: relative;
    width: 100%;
    min-height: var(--ctl-md);
    margin-top: var(--space-1);
    padding: 0 14px;
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    letter-spacing: 1px;
    /* 按钮错峰进入（内联 animation-delay 40/90/140ms） */
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

  /* 主操作：金色实心（全屏唯一发光点之一），尺寸 = 结算卡的主操作。
     焦点态由公共件 .g-btn--primary:focus-visible 统一表达，本地不再覆盖。 */
  .pm-btn.primary {
    min-height: var(--ctl-lg);
    margin-top: 0;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 2px;
  }
  .pm-btn:active {
    transform: translateY(2px);
  }

  /* 减弱动态效果：位移/缩放动画全部关闭（颜色/透明度保留） */
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
