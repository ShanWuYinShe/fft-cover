<script lang="ts">
  import Icon from '../Icon.svelte';
  import MoreMenu from '../MoreMenu.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
  import { audioController } from '../../stores/audioController.svelte';
  import { toggleRun, stopRun } from '../../stores/keyboardHandler';
</script>

<div class="play-controls-wrap">
  {#if engine.sandbox}
    <div class="sandbox-controls">
      <button type="button" class="ctrl-btn primary" onclick={() => engine.exitSandbox()}>
        <Icon name="stop" size={13} /> 结束沙盒
      </button>
      <button
        type="button"
        class="ctrl-btn"
        title="按目标频谱自动解出精确参数"
        disabled={engine.autoSolve}
        onclick={() => engine.startAutoSolve()}
      >
        🪄 {engine.autoSolve ? '拟合中…' : '自动拟合'}
      </button>
      <button type="button" class="ctrl-btn" title="沙盒转速档位" onclick={() => engine.cycleSpeed()}>
        ⚡ {engine.speed}×
      </button>
      <button type="button" class="ctrl-btn" onclick={() => engine.resetRun()}>
        ⟲ 重置点
      </button>
      <div class="aux-icon-group">
        <button
          type="button"
          class="icon-btn"
          class:music-off={audioController.volume === 0}
          title="音量（点击循环 全/半/静）"
          aria-label={'音量：' + (audioController.volume === 1 ? '100%' : audioController.volume === 0.5 ? '50%' : '静音')}
          onclick={() => audioController.cycleVolume()}
        >
          <Icon name={audioController.volIconName} size={16} />
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
          <Icon name="music" size={16} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="成就"
          aria-label="成就"
          onclick={() => (uiState.showAchv = true)}
        >
          <Icon name="trophy" size={16} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="设置"
          aria-label="设置"
          onclick={() => (uiState.showSettings = true)}
        >
          <Icon name="gear" size={16} />
        </button>
      </div>
    </div>
  {:else}
    <div class="campaign-controls">
      {#if engine.phase === 'running' || engine.phase === 'paused'}
        <button
          type="button"
          class="ctrl-btn danger ignition-btn brake"
          onclick={stopRun}
        >
          <span class="btn-core-ring" aria-hidden="true"></span>
          <Icon name="stop" size={14} />
          <span class="bt-long font-celestial">⏹ 止 轨 结 算</span>
          <span class="bt-short">⏹ 止轨</span>
        </button>
        <button
          type="button"
          class="ctrl-btn overdrive-btn"
          class:gold={engine.fastForward}
          title="2× 超频加速"
          onclick={() => (engine.fastForward = !engine.fastForward)}
        >
          <span class="ff-flash" aria-hidden="true">⚡</span>
          ⏩ {engine.fastForward ? '2×' : '1×'}
        </button>
      {:else}
        <button
          type="button"
          class="ctrl-btn primary ignition-btn ignite"
          onclick={toggleRun}
        >
          <span class="btn-core-ring" aria-hidden="true"></span>
          <span class="ignite-spark" aria-hidden="true">✦</span>
          <span class="bt-long font-celestial">
            {engine.phase === 'edit' ? '▶ 启 天 动 轨' : engine.runLabel}
          </span>
          <span class="bt-short">{engine.runLabel}</span>
        </button>
        <button
          type="button"
          class="ctrl-btn rewind-btn"
          title="重置本局已收集点与指针"
          onclick={() => engine.resetRun()}
        >
          ⟲ 重置
        </button>
      {/if}

      {#if engine.hasSavedArms() && engine.phase === 'edit'}
        <button
          type="button"
          class="ctrl-btn best-btn"
          title="载入最佳解法"
          onclick={() => engine.loadSavedArms()}
        >
          ★ 最佳
        </button>
      {/if}

      <MoreMenu
        items={[
          {
            label: (engine.fastForward ? '✓ ' : '') + '⏩ 2× 快进',
            title: '跳过等待（不影响得分与连击判定）',
            disabled: engine.phase !== 'running',
            onclick: () => (engine.fastForward = !engine.fastForward),
          },
          { label: '⟲ 重置点', onclick: () => engine.resetRun() },
          ...(engine.hasSavedArms()
            ? [
                {
                  label: '▶ 回放上届解法',
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
            label: '⭯ 全部指针清零',
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
            icon: 'volume-high',
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
            title: engine.endless
              ? '无尽挑战中不能进沙盒'
              : '无限时自由旋转',
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
          aria-label={'音量：' + (audioController.volume === 1 ? '100%' : audioController.volume === 0.5 ? '50%' : '静音')}
          onclick={() => audioController.cycleVolume()}
        >
          <Icon name={audioController.volIconName} size={16} />
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
          <Icon name="music" size={16} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="成就"
          aria-label="成就"
          onclick={() => (uiState.showAchv = true)}
        >
          <Icon name="trophy" size={16} />
        </button>
        <button
          type="button"
          class="icon-btn"
          title="设置"
          aria-label="设置"
          onclick={() => (uiState.showSettings = true)}
        >
          <Icon name="gear" size={16} />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .play-controls-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .campaign-controls,
  .sandbox-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    max-width: 640px;
    justify-content: center;
  }

  .ctrl-btn {
    appearance: none;
    height: 38px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid var(--line);
    color: var(--text);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    transition: all 0.15s ease;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .ctrl-btn:hover:not(:disabled) {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    transform: translateY(-1px);
  }
  .ctrl-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ctrl-btn.primary {
    background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 100%);
    color: #060911;
    border: 1px solid var(--gold-bright);
    font-weight: 700;
    box-shadow: 0 2px 10px rgba(245, 184, 65, 0.45);
  }
  .ctrl-btn.primary:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 14px rgba(245, 184, 65, 0.6);
  }

  .ctrl-btn.danger {
    background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
    color: #ffffff;
    border: 1px solid #ef4444;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
  }
  .ctrl-btn.danger:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.55);
  }

  .ignition-btn {
    flex: 1 1 auto;
    max-width: 260px;
    font-size: var(--fs-md);
  }

  .overdrive-btn.gold {
    background: rgba(245, 184, 65, 0.25);
    border-color: rgba(245, 184, 65, 0.6);
    color: var(--gold-bright);
  }

  .best-btn {
    background: rgba(245, 184, 65, 0.15);
    color: var(--gold-bright);
    border: 1px solid rgba(245, 184, 65, 0.4);
    font-size: var(--fs-xs);
  }

  .aux-icon-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon-btn {
    appearance: none;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid var(--line);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  .icon-btn:hover {
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.5);
  }
  .icon-btn.gold {
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.6);
  }
  .icon-btn.music-off {
    opacity: 0.5;
  }

  .bt-short {
    display: none;
  }

  @media (max-width: 640px) {
    .bt-long {
      display: none;
    }
    .bt-short {
      display: inline;
    }
    .desktop-only {
      display: none !important;
    }
    .campaign-controls {
      padding: 0 var(--space-2);
    }
    .ctrl-btn {
      height: 32px;
      padding: 0 var(--space-3);
      font-size: var(--fs-xs);
    }
  }
</style>
