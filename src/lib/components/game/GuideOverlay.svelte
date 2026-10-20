<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
</script>

{#if engine.expertMode}
  <div class="expert-tip">
    <Icon name="gem" size={14} />
    <span><b>专家模式</b>——目标轮廓与预览已隐藏，靠频谱对比和收集反馈来解（全清可得专家认证）</span>
  </div>
{/if}

{#if engine.remoteChallenge}
  <div class="remote-tip">
    <span class="rt-text">
      <Icon name="share" size={14} />
      <b>好友的解法挑战</b>——参数已载入，点「开始旋转」试试能不能全清
    </span>
    <button
      type="button"
      class="rt-close"
      title="关闭提示"
      aria-label="关闭好友挑战提示"
      onclick={() => (engine.remoteChallenge = false)}
    >
      <Icon name="close" size={14} />
    </button>
  </div>
{/if}

{#if engine.showFirstGuide && engine.phase === 'edit'}
  <div class="first-guide" class:ok={engine.guideRReady}>
    {#if engine.guideRReady}
      <b><Icon name="check" size={13} /> 很好！</b>
      现在点「开始旋转」，指针尖端扫过金色点即可收集
    {:else}
      <b>第 1 步</b>：把 ① 的半径调到 <b>120</b>（当前 {engine.arms[0]
        ?.r}）——金色虚线是目标，紫色是你的轨迹
    {/if}
  </div>
{:else if engine.showEllipseGuide && engine.phase === 'edit'}
  <div class="first-guide" class:ok={engine.guideE2Ready}>
    {#if engine.guideE2Ready}
      <b><Icon name="check" size={13} /> 对了！</b>
      再微调两根的半径与相位，让紫色轨迹贴上金色虚线（细节见提示）
    {:else}
      <b>椭圆的秘密在"反转"</b>：启用 <b>②</b> 并把它切到 <b>反转</b>—— 一顺一反才叠得出椭圆
    {/if}
    <button type="button" class="mini-btn" onclick={() => engine.markFlag('ellipseGuideDone')}>
      知道了
    </button>
  </div>
{/if}

<style>
  /* ============================================================
   * 引导条 / 提示条（第十四轮）
   * 薄荷浅底卡（--note-bg / --note-edge）+ 深蓝字 + 12px 圆角 +
   * 同色相硬投影；强调字用珊瑚深色（薄荷底上仍有 4.5:1）。
   * ============================================================ */
  .first-guide,
  .remote-tip,
  .expert-tip {
    flex: 0 0 auto;
    margin: 8px 10px 0;
    padding: 9px 12px;
    box-sizing: border-box;
    border: 2px solid var(--note-edge);
    border-radius: var(--r-sm);
    background: var(--note-bg);
    box-shadow: 0 3px 0 var(--note-edge);
    color: var(--text);
    font-family: var(--font-round);
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.5;
    text-align: left;
    animation: guide-in 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes guide-in {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .first-guide {
    display: block;
  }

  .remote-tip,
  .expert-tip {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .remote-tip {
    justify-content: space-between;
  }
  .expert-tip {
    justify-content: flex-start;
  }

  .rt-text {
    min-width: 0;
  }

  .remote-tip :global(svg),
  .expert-tip :global(svg) {
    vertical-align: -2px;
  }

  /* 强调：珊瑚深色（目标数字 / 关键操作） */
  .first-guide b,
  .remote-tip b,
  .expert-tip b {
    color: var(--coral-edge);
    font-weight: 800;
  }

  /* 完成态：边线换成薄荷深色，强调字也随之变薄荷 */
  .first-guide.ok {
    border-color: var(--mint-deep);
    box-shadow: 0 3px 0 var(--mint-deep);
  }
  .first-guide.ok b {
    color: var(--mint-edge);
  }

  /* 小按键：白药丸（触屏高度走 --ctl-md = 44） */
  .mini-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--ctl-md);
    margin-left: 8px;
    padding: 0 14px;
    border: 2px solid var(--line);
    border-radius: var(--r-pill);
    background: #ffffff;
    box-shadow: 0 3px 0 var(--mat-frame-line);
    color: var(--text);
    font-family: var(--font-round);
    font-size: var(--fs-sm);
    font-weight: 800;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 120ms ease,
      color 120ms ease;
  }
  .mini-btn:hover {
    border-color: var(--coral-text);
    color: var(--coral-edge);
  }
  .mini-btn:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 var(--mat-frame-line);
  }
  .mini-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  /* 关闭键：圆形白键 */
  .rt-close {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ctl-md);
    height: var(--ctl-md);
    padding: 0;
    border: 2px solid var(--line);
    border-radius: 50%;
    background: #ffffff;
    color: var(--muted);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .rt-close:hover {
    border-color: var(--coral-text);
    color: var(--coral-edge);
  }
  .rt-close:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .first-guide,
    .remote-tip,
    .expert-tip,
    .mini-btn {
      animation: none;
      transition: none;
    }
    .mini-btn:active {
      transform: none;
    }
  }
  :global(.reduce-motion) .first-guide,
  :global(.reduce-motion) .remote-tip,
  :global(.reduce-motion) .expert-tip,
  :global(.reduce-motion) .mini-btn {
    animation: none;
    transition: none;
  }
  :global(.reduce-motion) .mini-btn:active {
    transform: none;
  }
</style>
