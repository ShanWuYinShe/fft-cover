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

  <div class="settings-notes">
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

  /* 每一行就是一行：名称在左、开关在右，行间用发丝线分隔（不套卡片） */
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 4px 0;
    min-height: 46px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--edge-faint);
  }
  .setting-row:last-child {
    border-bottom: none;
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

  /* 开关：一行细描边的小键，只用「亮灯 + 金色文字」表示开 */
  .toggle-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: none;
    min-width: 68px;
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    border-radius: var(--ctl-radius);
    border: 1px solid var(--edge-faint);
    background: transparent;
    -webkit-tap-highlight-color: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .toggle-btn:hover {
    color: var(--text);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
  .toggle-btn.on {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(245, 184, 65, 0.08);
    font-weight: 700;
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
    background: var(--gold-bright);
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.8);
  }

  /* 音量三格电平条 */
  .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
  }
  .bars .bar {
    width: 3px;
    border-radius: 1px;
    background: rgba(148, 163, 184, 0.25);
  }
  .bars .bar:nth-child(1) {
    height: 5px;
  }
  .bars .bar:nth-child(2) {
    height: 8px;
  }
  .bars .bar:nth-child(3) {
    height: 12px;
  }
  .bars .bar.lite {
    background: var(--gold-bright);
  }

  /* 难度三选一：并排的三个安静小键，选中的描金 */
  .chips {
    display: flex;
    gap: 6px;
    flex: none;
  }
  .chip {
    appearance: none;
    min-width: 52px;
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    border-radius: var(--ctl-radius);
    border: 1px solid var(--edge-faint);
    background: transparent;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .chip:hover {
    color: var(--text);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
  .chip.on {
    color: var(--gold-bright);
    border-color: var(--gold);
    background: rgba(245, 184, 65, 0.1);
    font-weight: 700;
  }

  /* 说明文字：与设置行用一条线隔开，不再包一层凹槽 */
  .settings-notes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--edge-faint);
  }
  .desc {
    margin: 0;
    font-size: var(--fs-sm);
    line-height: 1.7;
    color: var(--muted);
  }
  .desc.formula {
    color: var(--cyan);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  /* 窄屏：分段选择器占满一行（高度由 --ctl-* 按指针类型自动切换） */
  @media (max-width: 640px) {
    .setting-row--seg .chips {
      width: 100%;
    }
    .setting-row--seg .chip {
      flex: 1 1 0;
    }
  }
</style>
