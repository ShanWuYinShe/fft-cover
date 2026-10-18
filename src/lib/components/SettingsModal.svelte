<script lang="ts">
  import Modal from './base/Modal.svelte';
  import Button from './base/Button.svelte';
  import { engine } from '../game/engine.svelte';

  let {
    onclose,
    volume,
    onCycleVolume,
  }: { onclose: () => void; volume: number; onCycleVolume: () => void } = $props();

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;
</script>

<Modal title="设置" icon="gear" size="md" {onclose}>
  <div class="settings-rows">
    <div class="setting-row">
      <span class="setting-k g-label">音效</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.soundOn}
        aria-pressed={engine.soundOn}
        onclick={() => engine.setSound(!engine.soundOn)}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.soundOn ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">背景音乐</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.musicOn}
        aria-pressed={engine.musicOn}
        onclick={() => engine.setMusic(!engine.musicOn)}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.musicOn ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">音量</span>
      <button type="button" class="toggle-btn" onclick={onCycleVolume}>
        <!-- 音量是循环档：三格电平条直观表示当前档位 -->
        <span class="bars" aria-hidden="true">
          <i class="bar" class:lite={volume > 0}></i>
          <i class="bar" class:lite={volume >= 0.5}></i>
          <i class="bar" class:lite={volume >= 1}></i>
        </span>
        <span class="tv">{volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">专家模式</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.expertMode}
        aria-pressed={engine.expertMode}
        onclick={() => engine.toggleExpert()}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.expertMode ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row setting-row--seg">
      <span class="setting-k g-label">随机 / 每日难度</span>
      <span class="chips" role="group" aria-label="随机与每日难度">
        {#each DIFFS as d (d.id)}
          <button
            type="button"
            class="chip"
            class:on={engine.difficulty === d.id}
            aria-pressed={engine.difficulty === d.id}
            onclick={() => engine.setDifficulty(d.id)}
          >
            {d.nm}
          </button>
        {/each}
      </span>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">减少动画</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={reduceMotion}
        aria-pressed={reduceMotion}
        onclick={() => engine.setFlag('reduceMotion', !reduceMotion)}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{reduceMotion ? '开' : '关'}</span>
      </button>
    </div>
  </div>

  <div class="settings-notes g-inset">
    <p class="desc">
      专家模式会隐藏目标轮廓与预览，只靠频谱与收集反馈推导参数。减少动画会关掉抖动、弹动与错峰入场（系统开启了“减弱动态效果”时默认打开）。
    </p>
    <p class="desc kb-only">
      快捷键：空格 开始 / 暂停（结算后立即重开）· S 停止结算 · R 重置 · ⌘/Ctrl+Z 撤销 ·
      ⌘/Ctrl+Shift+Z 或 ⌘/Ctrl+Y 重做 · Esc 关闭面板
    </p>
    <p class="desc formula">
      原理：指针尖端位置 = Σ rₖ·e^(i(ωₖt+φₖ))——你调的每一根指针，都是目标曲线傅立叶展开中的一项。
    </p>
  </div>

  {#snippet footer()}
    <Button variant="primary" size="md" onclick={onclose}>关 闭</Button>
  {/snippet}
</Modal>

<style>
  .settings-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  /* 每一行是一格嵌进面板的凹槽，左侧铭牌 + 右侧金属开关 */
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 8px 12px;
    min-height: 56px;
    box-sizing: border-box;
    background: linear-gradient(180deg, rgba(9, 14, 25, 0.9), rgba(4, 7, 13, 0.88));
    border: 1px solid var(--edge-faint);
    border-radius: 10px;
    box-shadow:
      var(--bevel-inset),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }
  .setting-row--seg {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .setting-k {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
  }

  /* 开关按键：金属键帽，开=金色实心 + 指示灯亮 */
  .toggle-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: none;
    min-width: 88px;
    min-height: 44px;
    padding: 0 14px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    border-radius: 9px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  .toggle-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .toggle-btn:active {
    transform: translateY(2px);
    box-shadow: var(--bevel-top);
  }
  .toggle-btn.on {
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 3px 0 #7a4d05,
      0 0 16px rgba(245, 184, 65, 0.35);
  }
  .toggle-btn.on:hover {
    background: var(--face-gold-hover);
    color: #120a00;
  }

  /* 指示灯：开=亮金，关=暗灯 */
  .lamp {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
    background: rgba(148, 163, 184, 0.3);
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.7);
  }
  .toggle-btn.on .lamp {
    background: #fff3c4;
    box-shadow:
      0 0 8px rgba(255, 255, 255, 0.8),
      inset 0 0 2px #fff;
  }

  /* 音量三格电平条 */
  .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;
  }
  .bars .bar {
    width: 4px;
    border-radius: 1px;
    background: rgba(148, 163, 184, 0.25);
  }
  .bars .bar:nth-child(1) {
    height: 6px;
  }
  .bars .bar:nth-child(2) {
    height: 10px;
  }
  .bars .bar:nth-child(3) {
    height: 14px;
  }
  .bars .bar.lite {
    background: var(--gold-bright);
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.7);
  }

  /* 难度分段选择器：凹槽轨道 + 三枚芯片 */
  .chips {
    display: flex;
    gap: 4px;
    flex: none;
    padding: 4px;
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.92), rgba(8, 12, 22, 0.75));
    border: 1px solid var(--edge-faint);
    border-radius: 10px;
    box-shadow: var(--bevel-inset);
  }
  .chip {
    appearance: none;
    min-width: 58px;
    min-height: 36px;
    padding: 0 12px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    border-radius: 7px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .chip:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .chip:active {
    transform: translateY(2px);
  }
  .chip.on {
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 #7a4d05,
      0 0 14px rgba(245, 184, 65, 0.4);
  }

  .settings-notes {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 11px 13px;
  }
  .desc {
    margin: 0;
    font-size: var(--fs-xs);
    line-height: 1.7;
    color: var(--muted);
  }
  .desc.formula {
    color: var(--cyan);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    text-shadow: 0 0 10px rgba(0, 245, 212, 0.25);
  }

  /* 触屏：热区补到 44，分段芯片占满一行 */
  @media (pointer: coarse), (max-width: 640px) {
    .toggle-btn {
      min-height: 46px;
      min-width: 96px;
    }
    .chip {
      min-height: 44px;
      min-width: 64px;
    }
    .setting-row--seg .chips {
      width: 100%;
    }
    .setting-row--seg .chip {
      flex: 1 1 0;
    }
  }
</style>
