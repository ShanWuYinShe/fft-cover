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
      <b>好友的解法挑战</b>——参数已载入，点「开始旋转」试试能不能全清
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
      <b>椭圆的秘密在"反转"</b>：启用 <b>②</b> 并把它切到 <b>反转</b>—— 一顺一反才叠得出椭圆
    {/if}
    <button type="button" class="mini-btn" onclick={() => engine.markFlag('ellipseGuideDone')}>
      知道了
    </button>
  </div>
{/if}

<style>
  /* 引导条：贴在画布下沿的一条任务提示铭牌 */
  .first-guide {
    position: absolute;
    bottom: 52px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 460px;
    display: block;
    padding: 8px 14px;
    margin: 0;
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(14, 24, 42, 0.95), rgba(6, 12, 22, 0.96));
    border: 1px solid rgba(0, 245, 212, 0.45);
    box-shadow:
      var(--bevel-top),
      0 6px 20px rgba(0, 0, 0, 0.65),
      0 0 16px rgba(0, 245, 212, 0.18);
    font-size: 12.5px;
    line-height: 1.5;
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
    background: linear-gradient(180deg, rgba(30, 26, 10, 0.95), rgba(14, 12, 4, 0.96));
    border-color: rgba(245, 184, 65, 0.7);
    box-shadow:
      var(--bevel-top),
      0 6px 20px rgba(0, 0, 0, 0.65),
      0 0 18px rgba(245, 184, 65, 0.3);
  }

  .first-guide.ok b {
    color: var(--gold-bright);
  }

  /* 小按键：有厚度的微型游戏键 */
  .mini-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 26px;
    padding: 0 10px;
    margin-left: 8px;
    border-radius: 7px;
    background: var(--face-metal);
    border: 1px solid var(--edge);
    color: var(--text);
    font-size: 11px;
    font-weight: 700;
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.1s ease;
  }
  .mini-btn:hover {
    background: var(--face-metal-hover);
    color: var(--gold-bright);
    border-color: var(--edge-hot);
  }
  .mini-btn:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-inset);
  }

  .remote-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 12px;
    margin: 0 auto;
    max-width: 100%;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.18), rgba(0, 245, 212, 0.08));
    border: 1px solid rgba(167, 139, 250, 0.55);
    box-shadow:
      var(--bevel-top),
      0 4px 14px rgba(0, 0, 0, 0.5);
    font-size: 12.5px;
    color: var(--text);
    text-align: center;
    animation: guide-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    box-sizing: border-box;
  }
  .remote-tip b {
    color: var(--purple);
  }
  .remote-tip .rt-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: rgba(10, 16, 28, 0.6);
    border: 1px solid var(--edge-soft);
    color: var(--muted);
    font-size: 12px;
  }
  .remote-tip .rt-close:hover {
    color: var(--text);
    border-color: var(--edge);
  }

  .expert-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 12px;
    margin: 0 auto;
    max-width: 100%;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(0, 245, 212, 0.06));
    border: 1px solid rgba(167, 139, 250, 0.55);
    box-shadow:
      var(--bevel-top),
      0 4px 14px rgba(0, 0, 0, 0.5);
    font-size: 12.5px;
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
