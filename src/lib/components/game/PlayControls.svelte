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
    /* 指令栏 = 器物下沿：装甲板面料 + 顶部内框发丝线 */
    background: var(--mat-plate);
    border-top: 1px solid var(--mat-frame-line);
    box-shadow: var(--mat-plate-shadow);
    z-index: 20;
  }
  /* 器物内框：内缩一道铜线 */
  .command-bar::after {
    content: '';
    position: absolute;
    inset: 6px 12px;
    z-index: 2;
    border: 1px solid var(--mat-frame-line);
    border-radius: 5px;
    box-shadow: inset 0 0 0 1px var(--edge-inner);
    pointer-events: none;
  }
  /* 雕花包角：全屏第二枚（左下角，与机坞那枚合计 2 处） */
  .command-bar::before {
    content: '';
    position: absolute;
    left: 8px;
    bottom: 6px;
    z-index: 3;
    width: 34px;
    height: 34px;
    background: var(--tex-corner) no-repeat center / 34px 34px;
    opacity: 0.55;
    pointer-events: none;
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

  /* ---------- 主操作：全屏唯一金色（金箔牌匾：拉丝叠金，深字） ---------- */
  .cmd-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: var(--ctl-lg);
    min-width: 168px;
    padding: 0 22px;
    border-radius: var(--ctl-radius-lg);
    border: none;
    background-color: var(--gold);
    background-image: var(--tex-brush), var(--face-gold-plate);
    background-blend-mode: soft-light, normal;
    color: #241300;
    font-size: calc(var(--ctl-font) + 2px);
    font-weight: 700;
    letter-spacing: 2px;
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.75),
      inset 0 -2px 0 rgba(120, 70, 0, 0.45),
      var(--sh-game);
    transition:
      transform 0.09s ease,
      filter 0.12s ease;
  }
  .cmd-primary:hover {
    filter: brightness(1.06);
  }
  .cmd-primary:focus-visible {
    background-image: var(--tex-brush), var(--face-gold-hover);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.75),
      inset 0 0 0 2px var(--edge-bronze-hot),
      inset 0 -2px 0 rgba(120, 70, 0, 0.45),
      var(--sh-game);
  }
  .cmd-primary:active {
    transform: translateY(2px);
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
  .cmd-primary.danger:focus-visible {
    filter: brightness(1.12);
    box-shadow:
      var(--bevel-top),
      inset 0 0 0 1px rgba(255, 235, 220, 0.9),
      inset 0 -3px 0 rgba(80, 10, 10, 0.55),
      0 4px 0 #6b1010;
  }

  /* 待发提示：D 只留一圈静态铜边（循环呼吸光取消，全屏并发动画 -1） */
  .primary-ring {
    position: absolute;
    inset: -4px;
    border-radius: var(--ctl-radius-lg);
    border: 1px solid var(--plate-brass-line);
    opacity: 0.5;
    pointer-events: none;
  }
  .cmd-primary.danger .primary-ring {
    border-color: var(--cinnabar);
  }

  /* ---------- 次级按键：小铜牌（安静，只有材质没有光） ---------- */
  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: var(--ctl-md);
    padding: 0 10px;
    border-radius: var(--ctl-radius);
    background: var(--mat-block);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--mat-block-shadow);
    color: var(--text);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .ctrl-btn:hover:not(:disabled) {
    background: var(--face-plate-hot);
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }
  .ctrl-btn:disabled {
    opacity: 0.45;
  }
  .ctrl-btn.gold {
    border-color: var(--plate-brass-line);
    color: var(--gold-bright);
    background: var(--plate-brass);
  }

  /* 键位提示：12px + --muted（11px/--muted-2 只有 3.77:1，低于红线） */
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 4px;
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    white-space: nowrap;
  }
  /* 键位提示：键帽 = 小凹槽（内阴影 + 下沿暖亮线） */
  .key-hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 4px;
    border-radius: var(--r-sm);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    border: 1px solid var(--edge-bronze);
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
      padding: 0 14px;
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
      min-width: var(--ctl-md);
      padding: 0 8px;
    }
    .primary-ring {
      display: none;
    }
  }

  /* 手机横屏：指令栏自己独占底部一行（竖屏的导航条在这一档不出现），
     横向空间富余，主操作不再压缩——沿用基础档的 min-width，保证 ≥150px */
  @media (max-width: 900px) and (orientation: landscape) {
    .command-bar {
      padding: 4px 10px;
      min-height: 52px;
    }
    .desktop-only {
      display: none;
    }
  }
</style>
