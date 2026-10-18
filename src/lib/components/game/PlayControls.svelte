<script lang="ts">
  import Icon from '../Icon.svelte';
  import MoreMenu from '../MoreMenu.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import { audioController } from '../../stores/audioController.svelte';
  import { toggleRun, stopRun } from '../../stores/keyboardHandler';

  /** 运行态：主操作变成「结束并结算」 */
  const running = $derived(engine.phase === 'running' || engine.phase === 'paused');

  /** 引擎给的按钮文案带 ▶/⏸ 字形，这里已经有 SVG 图标了，去掉前缀避免两个三角 */
  const runText = $derived(engine.runLabel.replace(/^[^\p{L}\p{N}]+/u, ''));

  /** 更多菜单：音量/音乐/成就/设置只有这一处（不再在指令栏重复一排图标键） */
  const moreItems = $derived([
    {
      label: (engine.fastForward ? '✓ ' : '') + '2× 快进',
      icon: 'zap',
      title: '跳过等待（不影响得分与连击判定）',
      disabled: engine.phase !== 'running',
      onclick: () => (engine.fastForward = !engine.fastForward),
    },
    { label: '重置本局', icon: 'refresh', onclick: () => engine.resetRun() },
    ...(engine.hasSavedArms()
      ? [
          {
            label: '回放上届解法',
            icon: 'play',
            title: '载入上届解法并立即旋转',
            onclick: () => {
              engine.loadSavedArms();
              engine.resetRun();
              engine.startRun();
            },
          },
        ]
      : []),
    { label: '全部指针清零', icon: 'close', onclick: () => engine.clearArms() },
    {
      label:
        '音量：' +
        (audioController.volume === 1 ? '100%' : audioController.volume === 0.5 ? '50%' : '静音'),
      icon: audioController.volIconName,
      onclick: () => audioController.cycleVolume(),
    },
    {
      label: '背景音乐：' + (engine.musicOn ? '开' : '关'),
      icon: 'music',
      onclick: () => engine.setMusic(!engine.musicOn),
    },
    {
      label: '结算卡',
      icon: 'chart',
      title: '重新打开结算卡',
      disabled: !(engine.phase === 'done' && engine.resultDismissed),
      onclick: () => (engine.resultDismissed = false),
    },
    {
      label: '自由沙盒',
      icon: 'flask',
      title: engine.endless ? '无尽挑战中不能进沙盒' : '无限时自由旋转，成绩不计入记录',
      disabled: engine.phase === 'running' || engine.phase === 'paused' || engine.endless,
      onclick: () => engine.enterSandbox(),
    },
    { label: '成就与图鉴', icon: 'trophy', onclick: () => (uiState.showAchv = true) },
    { label: '设置', icon: 'gear', onclick: () => (uiState.showSettings = true) },
  ]);
</script>

<!-- 底部指令栏：左边「次级操作」，中间一颗主操作，右边「更多」 -->
<div class="command-bar" class:live={running}>
  <div class="cmd-group cmd-left">
    {#if !running}
      <button
        type="button"
        class="ctrl-btn"
        title="重置本局已收集点与指针"
        onclick={() => engine.resetRun()}
      >
        <Icon name="refresh" size={15} />
        <span class="btn-label">重置</span>
      </button>
      {#if engine.hasSavedArms() && engine.phase === 'edit'}
        <button
          type="button"
          class="ctrl-btn"
          title="载入最佳解法"
          onclick={() => engine.loadSavedArms()}
        >
          ★<span class="btn-label">最佳</span>
        </button>
      {/if}
      <span class="key-hint desktop-only" aria-hidden="true">
        <kbd>空格</kbd>开始<kbd>R</kbd>重置
      </span>
    {/if}
  </div>

  <div class="cmd-group cmd-center">
    {#if engine.sandbox}
      <button type="button" class="cmd-primary danger" onclick={() => engine.exitSandbox()}>
        <Icon name="stop" size={16} />
        <span class="primary-label">结束沙盒</span>
      </button>
      <button
        type="button"
        class="ctrl-btn"
        title="沙盒转速档位"
        onclick={() => engine.cycleSpeed()}
      >
        <Icon name="zap" size={15} />
        {engine.speed}×
      </button>
      <button
        type="button"
        class="ctrl-btn"
        title="按目标频谱自动解出精确参数"
        disabled={engine.autoSolve}
        onclick={() => engine.startAutoSolve()}
      >
        <Icon name="wand" size={15} />
        {engine.autoSolve ? '拟合中…' : '自动拟合'}
      </button>
    {:else if running}
      <button type="button" class="cmd-primary danger" onclick={stopRun}>
        <span class="primary-ring" aria-hidden="true"></span>
        <Icon name="stop" size={16} />
        <span class="primary-label font-celestial">结 束 并 结 算</span>
        <span class="bt-short">结束</span>
      </button>
    {:else}
      <button type="button" class="cmd-primary ignite" onclick={toggleRun}>
        <span class="primary-ring" aria-hidden="true"></span>
        <Icon name="play" size={16} />
        <span class="primary-label font-celestial">
          {engine.phase === 'edit' ? '开 始 旋 转' : runText}
        </span>
        <span class="bt-short">{runText}</span>
      </button>
    {/if}
  </div>

  <div class="cmd-group cmd-right">
    {#if running}
      <button
        type="button"
        class="ctrl-btn"
        class:gold={engine.fastForward}
        title="2× 超频加速"
        onclick={() => (engine.fastForward = !engine.fastForward)}
      >
        <Icon name="zap" size={15} />
        {engine.fastForward ? '2×' : '1×'}
      </button>
    {/if}
    <MoreMenu items={moreItems} />
  </div>
</div>

<style>
  /* ============================================================
   * 底部指令栏：左「次级」/ 中「主操作」/ 右「更多」
   * 全屏只有这一颗金色按钮，其余一律安静
   * ============================================================ */
  .command-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 100%;
    width: 100%;
    padding: 0 14px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(12, 18, 31, 0.97) 0%, rgba(6, 9, 16, 0.99) 100%);
    border-top: 1px solid var(--edge-soft);
    z-index: 20;
  }

  .cmd-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .cmd-left {
    flex: 1 1 0;
    justify-content: flex-start;
  }
  .cmd-center {
    flex: 0 1 auto;
    justify-content: center;
    gap: 8px;
  }
  .cmd-right {
    flex: 1 1 0;
    justify-content: flex-end;
  }

  /* ---------- 主操作：全屏唯一金色 ---------- */
  .cmd-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 52px;
    min-width: 200px;
    padding: 0 28px;
    border-radius: 12px;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    color: #1a1002;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 3px;
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 4px 0 #7a4d05,
      0 8px 24px rgba(245, 184, 65, 0.28);
    transition:
      transform 0.09s ease,
      filter 0.12s ease;
  }
  .cmd-primary:hover {
    filter: brightness(1.06);
  }
  .cmd-primary:active {
    transform: translateY(3px);
    box-shadow:
      inset 0 2px 8px rgba(0, 0, 0, 0.5),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }
  .cmd-primary.danger {
    border-color: #fca5a5;
    background: var(--face-danger);
    color: #fff;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(80, 10, 10, 0.55),
      0 4px 0 #6b1010;
  }

  /* 待发脉冲：唯一允许的呼吸光，用来指路 */
  .primary-ring {
    position: absolute;
    inset: -4px;
    border-radius: 15px;
    border: 1px solid rgba(255, 209, 102, 0.45);
    animation: cmd-pulse 2.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes cmd-pulse {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(0.995);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.015);
    }
  }
  .cmd-primary.danger .primary-ring {
    border-color: rgba(252, 165, 165, 0.45);
  }
  :global(.reduce-motion) .primary-ring {
    animation: none;
    opacity: 0.35;
  }

  /* ---------- 次级按键：安静 ---------- */
  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 0 14px;
    border-radius: 9px;
    background: rgba(19, 28, 46, 0.7);
    border: 1px solid var(--edge-soft);
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .ctrl-btn:hover:not(:disabled) {
    background: rgba(30, 42, 66, 0.85);
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .ctrl-btn:disabled {
    opacity: 0.45;
  }
  .ctrl-btn.gold {
    border-color: var(--edge);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.14);
  }

  /* 键位提示：小号、低对比，只帮键盘玩家 */
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 4px;
    font-size: 11px;
    color: var(--muted-2);
    white-space: nowrap;
  }
  .key-hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 5px;
    border-radius: 5px;
    background: rgba(30, 42, 66, 0.7);
    border: 1px solid var(--edge-faint);
    color: var(--muted);
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
  }

  .bt-short {
    display: none;
  }

  /* ---------- 手机竖屏 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .command-bar {
      gap: 8px;
      padding: 6px 10px;
      min-height: 60px;
    }
    .cmd-left,
    .cmd-right {
      flex: 0 0 auto;
    }
    .cmd-center {
      flex: 1 1 auto;
    }
    .cmd-primary {
      width: 100%;
      min-width: 0;
      height: 46px;
      padding: 0 16px;
      font-size: 15px;
      letter-spacing: 2px;
    }
    .primary-label {
      display: none;
    }
    .bt-short {
      display: inline;
    }
    .desktop-only,
    .btn-label {
      display: none;
    }
    .ctrl-btn {
      height: 44px;
      min-width: 44px;
      padding: 0 10px;
    }
    .primary-ring {
      display: none;
    }
  }

  @media (max-width: 900px) and (orientation: landscape) {
    .command-bar {
      padding: 4px 10px;
      min-height: 52px;
    }
    .cmd-primary {
      height: 42px;
      min-width: 150px;
      font-size: 14px;
      letter-spacing: 2px;
    }
    .desktop-only {
      display: none;
    }
  }
</style>
