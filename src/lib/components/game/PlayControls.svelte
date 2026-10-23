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
    {#if running}
      <!-- 第十九轮：暂停此前只有空格键一条入口（运行中 UI 完全不可见），
           而暂停浮层带偏差诊断、是「边跑边看」的正经工具——给它一个对称的可见入口 -->
      <button type="button" class="ctrl-btn" title="暂停（空格）" onclick={toggleRun}>
        <Icon name="pause" size={15} />
        <span class="btn-label">暂停</span>
      </button>
      <span class="key-hint desktop-only" aria-hidden="true"><kbd>空格</kbd>暂停</span>
    {:else}
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
    {#if running && !engine.sandbox}
      <!-- 快进的意义是「跳过等待到超时」；沙盒无时限，转速键已覆盖速度，
           两个形似的 1× 并排只会让人分不清（第二十三轮实测） -->
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
   * 底部指令栏（第十四轮）：白色厚药丸浮条
   * 左「次级」/ 中「主操作（珊瑚厚实体）」/ 右「更多」
   * ============================================================ */
  .command-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    height: 100%;
    width: 100%;
    padding: 8px 12px;
    box-sizing: border-box;
    background: var(--mat-plate);
    border: 3px solid #ffffff;
    border-radius: var(--r-pill);
    box-shadow:
      0 6px 0 #d2eafa,
      0 20px 40px rgba(56, 116, 150, 0.2);
    z-index: 20;
  }
  /* 内框与包角：第十四轮取消 */
  .command-bar::after,
  .command-bar::before {
    content: none;
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
    /* 窄屏时快捷键提示会被主操作压住 → 裁掉溢出，别让它钻到按钮底下 */
    overflow: hidden;
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

  /* ---------- 次级键：浅蓝药丸 ---------- */
  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--ctl-md);
    padding: 0 14px;
    border-radius: var(--r-pill);
    background: #eaf7ff;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 0 #d6ecf9;
    color: var(--muted);
    font-family: var(--font-round);
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    transition:
      transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background 120ms ease;
  }
  .ctrl-btn:hover:not(:disabled) {
    background: #d9efff;
    color: var(--coral-text);
  }
  .ctrl-btn:active:not(:disabled) {
    transform: translateY(2px);
  }
  .ctrl-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }
  .ctrl-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .ctrl-btn.gold {
    background: var(--coral);
    color: #ffffff;
    box-shadow: 0 2px 0 var(--coral-edge);
  }
  /* ---------- 主操作：珊瑚厚实体（全屏唯一高饱和块） ---------- */
  .cmd-primary {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: var(--ctl-lg);
    min-width: 220px;
    padding: 0 34px;
    border-radius: var(--r-pill);
    border: 3px solid #ffffff;
    background: var(--coral-edge);
    /* 珊瑚面上用深棕字（白字 2.6:1 不合格） */
    color: var(--coral-ink);
    font-family: var(--font-round);
    font-size: calc(var(--ctl-font) + 3px);
    font-weight: 900;
    letter-spacing: 2px;
    white-space: nowrap;
    box-shadow:
      0 6px 0 var(--coral-edge),
      0 16px 30px rgba(200, 70, 30, 0.3);
    transition:
      transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 120ms ease;
  }
  /* 面：上 2px / 底 5px 留出侧壁 → 厚度 */
  .cmd-primary::before {
    content: '';
    position: absolute;
    inset: 2px 2px 6px;
    border-radius: var(--r-pill);
    background: var(--face-gold-plate);
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.42),
      inset 0 -3px 0 rgba(150, 40, 10, 0.22);
    z-index: -1;
  }
  .cmd-primary:hover:not(:disabled) {
    background: #a83814;
  }
  .cmd-primary:active:not(:disabled) {
    transform: translateY(4px);
    box-shadow:
      0 2px 0 var(--coral-edge),
      0 8px 16px rgba(200, 70, 30, 0.26);
  }
  .cmd-primary:active:not(:disabled)::before {
    inset: 2px 2px 2px;
  }
  .cmd-primary:focus-visible {
    outline: 3px solid #ffffff;
    outline-offset: 3px;
    box-shadow:
      0 6px 0 var(--coral-edge),
      0 0 0 8px var(--coral);
  }

  /* 危险态（结束并结算）：朱红 */
  .cmd-primary.danger {
    background: var(--danger-edge);
    box-shadow:
      0 6px 0 var(--danger-edge),
      0 16px 30px rgba(150, 30, 24, 0.3);
  }
  .cmd-primary.danger::before {
    background: var(--face-seal);
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.3),
      inset 0 -3px 0 rgba(90, 12, 8, 0.3);
  }
  .cmd-primary.danger:hover:not(:disabled) {
    background: #7a1712;
  }

  /* 起跑时的一圈扩散（保留「游戏感」反馈） */
  .primary-ring {
    position: absolute;
    inset: -3px;
    border-radius: var(--r-pill);
    border: 3px solid var(--mint);
    opacity: 0;
    pointer-events: none;
  }
  .cmd-primary.ignite .primary-ring {
    animation: ignite-ring 620ms cubic-bezier(0.16, 1, 0.3, 1) 1;
  }
  @keyframes ignite-ring {
    0% {
      opacity: 0.85;
      transform: scale(0.94);
    }
    100% {
      opacity: 0;
      transform: scale(1.16);
    }
  }

  .primary-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  /* 窄屏用短文案 */
  .bt-short {
    display: none;
  }

  .btn-label {
    white-space: nowrap;
  }

  /* 快捷键提示：浅色 chip，不做 kbd 拟物 */
  .key-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--muted-2);
    white-space: nowrap;
  }
  .key-hint kbd {
    display: inline-flex;
    align-items: center;
    min-height: 20px;
    padding: 0 7px;
    border-radius: 6px;
    background: #eaf7ff;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 0 #d6ecf9;
    font-family: var(--font-round);
    font-size: 12px;
    font-weight: 800;
    color: var(--muted);
  }

  /* ---------- 响应式 ---------- */
  /* 快捷键提示只在宽屏显示：窄屏时会被主操作压住（1440 实测已钻到按钮底下） */
  @media (max-width: 1500px) {
    .key-hint {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .command-bar {
      padding: 7px 10px;
      gap: 8px;
    }
    .cmd-left {
      flex: 0 0 auto;
      overflow: visible;
    }
    .cmd-right {
      flex: 0 0 auto;
    }
    .cmd-primary {
      min-width: 0;
      flex: 1 1 auto;
      padding: 0 20px;
      font-size: var(--ctl-font);
      letter-spacing: 1px;
    }
    .primary-label {
      display: none;
    }
    .bt-short {
      display: inline;
    }
    .key-hint {
      display: none;
    }
    /* 窄屏：次级键收成图标键，把宽度让给主操作（原来文字按钮把主操作挤到溢出） */
    .ctrl-btn {
      width: var(--ctl-md);
      padding: 0;
      gap: 0;
    }
    .ctrl-btn .btn-label {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .cmd-left {
      flex: 0 0 auto;
    }
    .cmd-primary {
      min-width: 0;
      flex: 1 1 auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cmd-primary.ignite .primary-ring {
      animation: none;
    }
  }
  :global(.reduce-motion) .cmd-primary.ignite .primary-ring {
    animation: none;
  }
</style>
