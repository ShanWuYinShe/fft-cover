<script lang="ts">
  import Icon from '../Icon.svelte';
  import MoreMenu from '../MoreMenu.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import { audioController } from '../../stores/audioController.svelte';
  import { toggleRun, stopRun } from '../../stores/keyboardHandler';

  /** 运行态：主操作变成「止轨结算」 */
  const running = $derived(engine.phase === 'running' || engine.phase === 'paused');
</script>

<!-- 底部指令栏：整屏宽的游戏操作台 -->
<div class="command-bar" class:live={running}>
  <span class="cmd-edge" aria-hidden="true"></span>

  {#if engine.sandbox}
    <div class="cmd-group cmd-left">
      <span class="cmd-mode g-label">沙盒演道</span>
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
      <button type="button" class="ctrl-btn" onclick={() => engine.resetRun()}>
        <Icon name="refresh" size={15} /> 重置点
      </button>
    </div>

    <div class="cmd-group cmd-center">
      <button type="button" class="cmd-primary danger" onclick={() => engine.exitSandbox()}>
        <Icon name="stop" size={16} />
        <span class="primary-label">结 束 沙 盒</span>
      </button>
    </div>

    <div class="cmd-group cmd-right">
      <div class="aux-icon-group">
        <button
          type="button"
          class="icon-btn"
          class:music-off={audioController.volume === 0}
          title="音量（点击循环 全/半/静）"
          aria-label={'音量：' +
            (audioController.volume === 1
              ? '100%'
              : audioController.volume === 0.5
                ? '50%'
                : '静音')}
          onclick={() => audioController.cycleVolume()}
        >
          <Icon name={audioController.volIconName} size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          class:music-off={!engine.musicOn}
          class:gold={engine.musicOn}
          aria-pressed={engine.musicOn}
          aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
          title={engine.musicOn ? '背景音乐：实时合成和声' : '背景音乐已关闭'}
          onclick={() => engine.setMusic(!engine.musicOn)}
        >
          <Icon name="music" size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="成就"
          aria-label="成就"
          onclick={() => (uiState.showAchv = true)}
        >
          <Icon name="trophy" size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="设置"
          aria-label="设置"
          onclick={() => (uiState.showSettings = true)}
        >
          <Icon name="gear" size={17} />
        </button>
      </div>
    </div>
  {:else}
    <div class="cmd-group cmd-left">
      <span class="cmd-mode g-label">
        {engine.endless ? '无尽演武' : engine.phase === 'edit' ? '调参待发' : '演算中'}
      </span>

      <!-- 键位提示：桌面端才显示，给键盘玩家一个明确的操作入口 -->
      <span class="key-hint desktop-only" aria-hidden="true">
        <kbd>空格</kbd>{running ? '止轨' : '启轨'}<kbd>R</kbd>重置
      </span>

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
            class="ctrl-btn best-btn"
            title="载入最佳解法"
            onclick={() => engine.loadSavedArms()}
          >
            ★<span class="btn-label">最佳</span>
          </button>
        {/if}
      {/if}
    </div>

    <div class="cmd-group cmd-center">
      {#if running}
        <button type="button" class="cmd-primary danger" onclick={stopRun}>
          <span class="primary-ring" aria-hidden="true"></span>
          <Icon name="stop" size={16} />
          <span class="primary-label font-celestial">止 轨 结 算</span>
          <span class="bt-short">止轨</span>
        </button>
      {:else}
        <button type="button" class="cmd-primary ignite" onclick={toggleRun}>
          <span class="primary-ring" aria-hidden="true"></span>
          <span class="ignite-spark" aria-hidden="true">✦</span>
          <Icon name="play" size={16} />
          <span class="primary-label font-celestial">
            {engine.phase === 'edit' ? '启 天 动 轨' : engine.runLabel}
          </span>
          <span class="bt-short">{engine.runLabel}</span>
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

      <MoreMenu
        items={[
          {
            icon: 'zap',
            label: (engine.fastForward ? '✓ ' : '') + '2× 快进',
            title: '跳过等待（不影响得分与连击判定）',
            disabled: engine.phase !== 'running',
            onclick: () => (engine.fastForward = !engine.fastForward),
          },
          { icon: 'refresh', label: '重置点', onclick: () => engine.resetRun() },
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
          {
            label: '全部指针清零',
            icon: 'close',
            title: '全部指针清零关闭',
            onclick: () => engine.clearArms(),
          },
          {
            label:
              '音量：' +
              (audioController.volume === 1
                ? '100%'
                : audioController.volume === 0.5
                  ? '50%'
                  : '静音'),
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
            label: '沙盒',
            icon: 'flask',
            title: engine.endless ? '无尽挑战中不能进沙盒' : '无限时自由旋转',
            disabled: engine.phase === 'running' || engine.phase === 'paused' || engine.endless,
            onclick: () => engine.enterSandbox(),
          },
          { label: '成就', icon: 'trophy', onclick: () => (uiState.showAchv = true) },
          { label: '设置', icon: 'gear', onclick: () => (uiState.showSettings = true) },
        ]}
      />

      <div class="aux-icon-group desktop-only">
        <button
          type="button"
          class="icon-btn"
          class:music-off={audioController.volume === 0}
          title="音量（点击循环 全/半/静）"
          aria-label={'音量：' +
            (audioController.volume === 1
              ? '100%'
              : audioController.volume === 0.5
                ? '50%'
                : '静音')}
          onclick={() => audioController.cycleVolume()}
        >
          <Icon name={audioController.volIconName} size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          class:music-off={!engine.musicOn}
          class:gold={engine.musicOn}
          aria-pressed={engine.musicOn}
          aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
          title={engine.musicOn ? '背景音乐：实时合成和声' : '背景音乐已关闭'}
          onclick={() => engine.setMusic(!engine.musicOn)}
        >
          <Icon name="music" size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="成就"
          aria-label="成就"
          onclick={() => (uiState.showAchv = true)}
        >
          <Icon name="trophy" size={17} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="设置"
          aria-label="设置"
          onclick={() => (uiState.showSettings = true)}
        >
          <Icon name="gear" size={17} />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ============================================================
   * 底部指令栏：整屏宽的操作台（左：次要 / 中：主操作 / 右：工具）
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
    background: linear-gradient(180deg, rgba(13, 20, 35, 0.97) 0%, rgba(5, 8, 15, 0.99) 100%);
    border-top: 1px solid var(--edge);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 -10px 26px rgba(0, 0, 0, 0.6);
    z-index: 20;
  }

  .cmd-edge {
    position: absolute;
    left: 0;
    right: 0;
    top: -1px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(245, 184, 65, 0.6) 15%,
      rgba(0, 245, 212, 0.45) 50%,
      rgba(245, 184, 65, 0.6) 85%,
      transparent
    );
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
  }
  .cmd-right {
    flex: 1 1 0;
    justify-content: flex-end;
  }

  .cmd-mode {
    padding-right: 4px;
    white-space: nowrap;
  }

  /* 键位提示：小号铭牌 + 键帽 */
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: var(--muted);
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
    background: linear-gradient(180deg, #26324c, #131c2e);
    border: 1px solid var(--edge-soft);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
    color: var(--gold-bright);
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
  }

  /* ---------- 主操作：整条指令栏里最重的按键 ---------- */
  .cmd-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 52px;
    min-width: 190px;
    padding: 0 26px;
    border-radius: 12px;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    color: #1a1002;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 3px;
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 4px 0 #7a4d05,
      0 10px 26px rgba(245, 184, 65, 0.35);
    transition:
      transform 0.09s ease,
      box-shadow 0.12s ease,
      filter 0.12s ease;
  }
  .cmd-primary:hover {
    filter: brightness(1.06);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.45),
      0 4px 0 #7a4d05,
      0 12px 34px rgba(255, 209, 102, 0.5);
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
      0 4px 0 #6b1010,
      0 10px 26px rgba(220, 38, 38, 0.35);
  }

  /* 待发脉冲：一圈缓慢呼吸的金环 */
  .primary-ring {
    position: absolute;
    inset: -4px;
    border-radius: 15px;
    border: 1px solid rgba(255, 209, 102, 0.5);
    animation: cmd-pulse 2.2s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes cmd-pulse {
    0%,
    100% {
      opacity: 0.25;
      transform: scale(0.99);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.02);
    }
  }
  .cmd-primary.danger .primary-ring {
    border-color: rgba(252, 165, 165, 0.5);
  }

  .ignite-spark {
    font-size: 13px;
    color: #7a4d05;
  }

  /* ---------- 次要按键 ---------- */
  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 40px;
    padding: 0 14px;
    border-radius: 9px;
    background: var(--face-metal);
    border: 1px solid var(--edge-soft);
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.12s ease;
  }
  .ctrl-btn:hover:not(:disabled) {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .ctrl-btn:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: var(--bevel-inset);
  }
  .ctrl-btn:disabled {
    opacity: 0.45;
  }
  .ctrl-btn.gold {
    border-color: var(--edge-hot);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.18);
  }
  .best-btn {
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }
  .aux-icon-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 9px;
    background: var(--face-metal);
    border: 1px solid var(--edge-soft);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      var(--bevel-top),
      var(--bevel-bottom),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition: all 0.12s ease;
  }
  .icon-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
  }
  .icon-btn:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-inset);
  }
  .icon-btn.gold {
    color: var(--gold-bright);
    border-color: var(--edge);
  }
  .icon-btn.music-off {
    opacity: 0.5;
  }

  .bt-short {
    display: none;
  }

  /* ---------- 手机竖屏：主操作吃掉中间，次要键收成图标 ---------- */
  @media (max-width: 640px) and (orientation: portrait) {
    .command-bar {
      gap: 8px;
      padding: 6px 10px;
      min-height: 60px;
    }
    .cmd-mode {
      display: none;
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
      font-size: 13px;
    }
    .icon-btn {
      width: 44px;
      height: 44px;
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
