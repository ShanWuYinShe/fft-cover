<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { CIRCLED } from '../game/constants';
  import ArmEditor from './ArmEditor.svelte';
  import Icon from './Icon.svelte';

  /** 当前编辑的指针序号（点击通道卡槽切换） */
  let selected = $state(0);

  const cur = $derived(engine.arms[selected]);
  const onCount = $derived(engine.arms.filter((a) => a.on).length);
  const armLimit = $derived(engine.level?.armLimit ?? 10);

  function pick(i: number): void {
    if (i >= armLimit) return;
    // 选中即启用
    if (!engine.arms[i].on) engine.setArm(i, { on: true });
    selected = i;
  }
</script>

<div class="arm-panel">
  <!-- 多指针音轨卡槽与工具栏（二合一高密度设计） -->
  <div class="channel-toolbar">
    <div class="channel-slots" role="tablist" aria-label="指针通道选择">
      {#each engine.arms as arm, i (i)}
        {#if i < armLimit}
          {@const isSelected = selected === i}
          <button
            type="button"
            role="tab"
            aria-selected={isSelected}
            class="slot-card"
            class:active={isSelected}
            class:powered={arm.on}
            title={arm.on
              ? `通道 ${CIRCLED[i]}：半径 ${arm.r}px · ${Math.abs(arm.freq)}×${arm.freq < 0 ? '逆' : '顺'} · 相位 ${Math.round((arm.phase * 180) / Math.PI)}°`
              : `点击启用通道 ${CIRCLED[i]}`}
            onclick={() => pick(i)}
          >
            <div class="slot-top">
              <span class="slot-led" class:on={arm.on}></span>
              <span class="slot-id">#{String(i + 1).padStart(2, '0')}</span>
              {#if arm.on}
                <span class="slot-f" class:ccw={arm.freq < 0}>
                  {Math.abs(arm.freq)}×{arm.freq < 0 ? '逆' : '顺'}
                </span>
              {:else}
                <span class="slot-off">待机</span>
              {/if}
            </div>
            <div class="slot-bottom">
              {#if arm.on}
                <span class="slot-readout">{arm.r}px · {Math.round((arm.phase * 180) / Math.PI)}°</span>
              {:else}
                <span class="slot-prompt">+点击启用</span>
              {/if}
            </div>
          </button>
        {/if}
      {/each}
    </div>

    <!-- 紧凑微调工具 -->
    <div class="action-btns">
      {#if engine.hasSavedArms()}
        <button
          type="button"
          class="act-btn best-btn"
          title="载入最佳解法"
          onclick={() => engine.loadSavedArms()}
        >
          ★ 最佳
        </button>
      {/if}
      <button
        type="button"
        class="act-btn"
        title="随机化已启用参数"
        onclick={() => engine.randomizeArms()}
      >
        <Icon name="dice" size={13} />
      </button>
      <button
        type="button"
        class="act-btn"
        title="撤销（Ctrl+Z）"
        disabled={engine.armUndoCount === 0}
        onclick={() => engine.undoArms()}
      >
        <span class="act-icon">↶</span>
      </button>
      <button
        type="button"
        class="act-btn"
        title="复位当前通道"
        onclick={() => engine.resetArm(selected)}
      >
        <span class="act-icon">↺</span>
      </button>
      {#if engine.expertUnlocked}
        <button
          type="button"
          class="act-btn expert-chip"
          class:active={engine.expertMode}
          title="专家模式"
          onclick={() => engine.toggleExpert()}
        >
          <Icon name="gem" size={12} />
        </button>
      {/if}
      {#if engine.spectrumUnlocked}
        <button
          type="button"
          class="act-btn spec-chip"
          class:active={engine.spectrumCompare}
          title="频谱对比"
          onclick={() => engine.toggleSpectrumCompare()}
        >
          <Icon name="zoom" size={12} />
        </button>
      {/if}
    </div>
  </div>

  <!-- 调参区（双层贯穿式精密游标卡尺） -->
  {#if cur}
    <ArmEditor index={selected} arm={cur} />
  {/if}
</div>

<style>
  .arm-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  /* 通道分段器与工具栏一体化 */
  .channel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    background: #0f131c;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 3px 6px;
    min-height: 40px;
  }

  .channel-slots {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    flex: 1;
    min-width: 0;
  }
  .channel-slots::-webkit-scrollbar {
    display: none;
  }

  /* 单个音轨卡槽 */
  .slot-card {
    appearance: none;
    flex: 1;
    min-width: 72px;
    max-width: 110px;
    height: 34px;
    padding: 2px 6px;
    border-radius: 4px;
    background: #141a26;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-left: 2.5px solid #334155;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    text-align: left;
    transition: all 0.1s ease;
  }
  .slot-card:hover {
    border-color: rgba(255, 255, 255, 0.15);
    background: #1a2334;
  }
  .slot-card.powered {
    border-left-color: #00f5d4;
    background: #131d2e;
  }
  .slot-card.active {
    border-color: rgba(0, 245, 212, 0.45);
    border-left-color: #00f5d4;
    background: linear-gradient(90deg, rgba(0, 245, 212, 0.12) 0%, #162238 60%);
    box-shadow: 0 0 8px rgba(0, 245, 212, 0.2);
  }

  .slot-top {
    display: flex;
    align-items: center;
    gap: 4px;
    line-height: 1;
  }
  .slot-led {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #475569;
    flex-shrink: 0;
  }
  .slot-led.on {
    background: #00f5d4;
    box-shadow: 0 0 5px #00f5d4;
  }

  .slot-id {
    font-size: 10px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #cbd5e1;
  }
  .slot-card.active .slot-id {
    color: #00f5d4;
  }

  .slot-f {
    font-size: 9px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: #38bdf8;
    margin-left: auto;
  }
  .slot-f.ccw {
    color: #c084fc;
  }
  .slot-off {
    font-size: 9px;
    color: #64748b;
    margin-left: auto;
  }

  .slot-bottom {
    display: flex;
    align-items: center;
    line-height: 1;
  }
  .slot-readout {
    font-size: 9px;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    color: #94a3b8;
  }
  .slot-card.active .slot-readout {
    color: #f1f5f9;
  }
  .slot-prompt {
    font-size: 8px;
    color: #475569;
  }

  /* 右侧工具按键 */
  .action-btns {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .act-btn {
    appearance: none;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 4px;
    background: #182030;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
  }
  .act-btn:hover:not(:disabled) {
    border-color: rgba(0, 245, 212, 0.4);
    color: #00f5d4;
    background: #202b40;
  }
  .act-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .act-icon {
    font-size: 13px;
    line-height: 1;
  }

  .best-btn {
    width: auto;
    padding: 0 6px;
    font-size: 10px;
    font-weight: 600;
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.08);
  }
  .best-btn:hover {
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.18);
  }

  .expert-chip.active,
  .spec-chip.active {
    border-color: #00f5d4;
    color: #00f5d4;
    background: rgba(0, 245, 212, 0.12);
  }
</style>
