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
    <span>
      <Icon name="share" size={14} />
      <b>好友的解法挑战</b>——参数已载入，点「▶ 开始旋转」试试能不能全清
    </span>
    <button
      type="button"
      class="rt-close"
      title="关闭提示"
      onclick={() => (engine.remoteChallenge = false)}
    >
      ✕
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
      <b>椭圆的秘密在"反转"</b>：启用 <b>②</b> 并把它切到 <b>⟲ 反转</b>—— 一顺一反才叠得出椭圆
    {/if}
    <button type="button" class="mini-btn" onclick={() => engine.markFlag('ellipseGuideDone')}>
      知道了
    </button>
  </div>
{/if}

<style>
  .first-guide {
    position: absolute;
    bottom: 52px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 420px;
    display: block;
    padding: 7px 12px;
    margin: 0;
    border-radius: var(--radius-lg);
    background: rgba(10, 16, 32, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(79, 209, 197, 0.45);
    box-shadow:
      0 4px 18px rgba(0, 0, 0, 0.6),
      0 0 12px rgba(79, 209, 197, 0.25);
    font-size: var(--fs-xs);
    line-height: 1.45;
    color: var(--text);
    text-align: center;
    z-index: 15;
    pointer-events: auto;
    animation: guide-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    box-sizing: border-box;
  }

  .first-guide b {
    color: var(--cyan);
    white-space: nowrap;
  }

  .first-guide.ok {
    background: rgba(20, 26, 16, 0.94);
    border-color: rgba(251, 191, 36, 0.65);
    box-shadow:
      0 4px 18px rgba(0, 0, 0, 0.6),
      0 0 16px rgba(251, 191, 36, 0.35);
  }

  .first-guide.ok b {
    color: var(--gold);
  }

  .mini-btn {
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text);
    border-radius: var(--radius-sm);
    padding: 2px 8px;
    font-size: 10px;
    margin-left: 6px;
    cursor: pointer;
  }
  .mini-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .remote-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 12px;
    margin: 0 auto;
    max-width: 100%;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.16), rgba(79, 209, 197, 0.1));
    border: 1px solid rgba(167, 139, 250, 0.5);
    font-size: var(--fs-sm);
    color: var(--text);
    text-align: center;
    animation: guide-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    box-sizing: border-box;
  }
  .remote-tip b {
    color: var(--purple);
  }
  .remote-tip .rt-close {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0 4px;
    color: var(--muted);
    font-size: var(--fs-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }
  .remote-tip .rt-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
  }

  .expert-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 12px;
    margin: 0 auto;
    max-width: 100%;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.18), rgba(79, 209, 197, 0.08));
    border: 1px solid rgba(167, 139, 250, 0.5);
    font-size: var(--fs-sm);
    color: var(--text);
    text-align: center;
    animation: guide-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    box-sizing: border-box;
  }
  .expert-tip b {
    color: #c4b5fd;
  }

  @media (min-width: 641px) {
    .first-guide {
      bottom: 12px;
    }
  }
</style>
