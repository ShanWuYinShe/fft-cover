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
      <span class="setting-k">音效</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.soundOn}
        aria-pressed={engine.soundOn}
        onclick={() => engine.setSound(!engine.soundOn)}
      >
        {engine.soundOn ? '开' : '关'}
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k">背景音乐</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.musicOn}
        aria-pressed={engine.musicOn}
        onclick={() => engine.setMusic(!engine.musicOn)}
      >
        {engine.musicOn ? '开' : '关'}
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k">音量</span>
      <button type="button" class="toggle-btn" onclick={onCycleVolume}>
        {volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音'}
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k">专家模式</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.expertMode}
        aria-pressed={engine.expertMode}
        onclick={() => engine.toggleExpert()}
      >
        {engine.expertMode ? '开' : '关'}
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k">随机 / 每日难度</span>
      <span class="chips">
        {#each DIFFS as d (d.id)}
          <button
            type="button"
            class="chip"
            class:on={engine.difficulty === d.id}
            onclick={() => engine.setDifficulty(d.id)}
          >
            {d.nm}
          </button>
        {/each}
      </span>
    </div>

    <div class="setting-row">
      <span class="setting-k">减少动画</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={reduceMotion}
        aria-pressed={reduceMotion}
        onclick={() => engine.setFlag('reduceMotion', !reduceMotion)}
      >
        {reduceMotion ? '开' : '关'}
      </button>
    </div>
  </div>

  <div class="settings-notes">
    <p class="desc">
      专家模式会隐藏目标轮廓与预览，只靠频谱与收集反馈推导参数。减少动画会关掉抖动、弹动与错峰入场（系统开启了“减弱动态效果”时默认打开）。
    </p>
    <p class="desc kb-only">
      快捷键：空格 开始 / 暂停（结算后立即重开）· S 停止结算 · R 重置 · ⌘/Ctrl+Z 撤销 · ⌘/Ctrl+Shift+Z 或 ⌘/Ctrl+Y 重做 · Esc 关闭面板
    </p>
    <p class="desc formula">
      原理：指针尖端位置 = Σ rₖ·e^(i(ωₖt+φₖ))——你调的每一根指针，都是目标曲线傅立叶展开中的一项。
    </p>
  </div>

  {#snippet footer()}
    <Button variant="primary" size="md" onclick={onclose}>
      关 闭
    </Button>
  {/snippet}
</Modal>

<style>
  .settings-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
  }

  .setting-k {
    font-size: var(--fs-sm);
    color: var(--text);
    font-weight: 500;
  }

  .toggle-btn {
    appearance: none;
    min-width: 60px;
    height: 28px;
    padding: 0 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .toggle-btn.on {
    background: var(--gold);
    color: #060911;
    border-color: var(--gold-bright);
    font-weight: 700;
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.35);
  }

  .chips {
    display: flex;
    gap: 4px;
  }
  .chip {
    appearance: none;
    padding: 3px 8px;
    font-size: var(--fs-xs);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line);
    color: var(--muted);
    cursor: pointer;
  }
  .chip.on {
    background: var(--gold);
    color: #060911;
    border-color: var(--gold-bright);
    font-weight: 700;
  }

  .settings-notes {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .desc {
    margin: 0;
    font-size: var(--fs-xs);
    line-height: 1.6;
    color: var(--muted);
  }
  .desc.formula {
    color: var(--cyan);
    font-family: monospace;
    font-size: 11px;
  }
</style>
