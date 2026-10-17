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

  const CELESTIAL_NAMES = [
    '天枢',
    '天璇',
    '天玑',
    '天权',
    '玉衡',
    '开阳',
    '摇光',
    '洞明',
    '隐元',
    '紫微',
  ];

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
              ? `通道 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）：半径 ${arm.r}px · ${Math.abs(arm.freq)}×${arm.freq < 0 ? '逆' : '顺'} · 相位 ${Math.round((arm.phase * 180) / Math.PI)}°`
              : `点击启用通道 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）`}
            onclick={() => pick(i)}
          >
            <div class="slot-top">
              <span class="slot-led" class:on={arm.on}></span>
              <span class="slot-id"
                >#{String(i + 1).padStart(2, '0')}&nbsp;<span class="star-nm"
                  >{CELESTIAL_NAMES[i]}</span
                ></span
              >
              {#if arm.on}
                <span class="slot-f" class:ccw={arm.freq < 0}>
                  {Math.abs(arm.freq)}×{arm.freq < 0 ? '逆' : '顺'}
                </span>
              {:else}
                <span class="slot-off">待命</span>
              {/if}
            </div>
            <div class="slot-bottom">
              {#if arm.on}
                <span class="slot-readout"
                  >{arm.r}px · {Math.round((arm.phase * 180) / Math.PI)}°</span
                >
              {:else}
                <span class="slot-prompt">+启通此道</span>
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

  /* 通道分段器与工具栏一体化 (Celestial Astrolabe Channel Deck) */
  .channel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    background: rgba(8, 12, 22, 0.92);
    border: 1px solid rgba(245, 184, 65, 0.2);
    border-radius: var(--r-sm);
    padding: 3px 6px;
    min-height: 40px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
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

  /* 单个音轨卡槽 (Astrolabe Channel Slot) */
  .slot-card {
    appearance: none;
    flex: 1;
    min-width: 82px;
    max-width: 115px;
    height: 35px;
    padding: 2px 7px;
    border-radius: var(--r-sm);
    background: rgba(13, 19, 32, 0.9);
    border: 1px solid rgba(245, 184, 65, 0.12);
    border-left: 2.5px solid #334155;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    text-align: left;
    transition: all 0.12s ease;
  }
  .slot-card:hover {
    border-color: rgba(245, 184, 65, 0.35);
    background: #152035;
  }
  .slot-card.powered {
    border-left-color: var(--cyan);
    background: rgba(16, 24, 42, 0.95);
  }
  .slot-card.active {
    border-color: rgba(245, 184, 65, 0.6);
    border-left-color: var(--gold);
    background: linear-gradient(90deg, rgba(245, 184, 65, 0.16) 0%, rgba(20, 32, 54, 0.9) 70%);
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.25);
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
    background: var(--gold);
    box-shadow: 0 0 6px var(--gold);
  }

  .slot-id {
    font-size: 10px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: #cbd5e1;
  }
  .star-nm {
    font-size: 9px;
    font-weight: 600;
    color: var(--gold-bright);
    font-family: -apple-system, sans-serif;
  }
  .slot-card.active .slot-id {
    color: var(--gold-bright);
  }

  .slot-f {
    font-size: 9px;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
    color: var(--cyan);
    margin-left: auto;
  }
  .slot-f.ccw {
    color: var(--purple);
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
    color: #64748b;
  }

  /* 右侧工具按键 (Astrolabe Tool Buttons) */
  .action-btns {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .act-btn {
    appearance: none;
    width: 25px;
    height: 25px;
    padding: 0;
    border-radius: var(--r-sm);
    background: rgba(14, 20, 34, 0.85);
    border: 1px solid rgba(245, 184, 65, 0.18);
    color: var(--muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s ease;
  }
  .act-btn:hover:not(:disabled) {
    border-color: rgba(245, 184, 65, 0.55);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.12);
    box-shadow: 0 0 8px rgba(245, 184, 65, 0.2);
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
    padding: 0 7px;
    font-size: 10px;
    font-weight: 700;
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.45);
    background: rgba(245, 184, 65, 0.12);
  }
  .best-btn:hover {
    border-color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.22);
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.3);
  }

  .expert-chip.active {
    border-color: var(--purple);
    color: var(--purple);
    background: rgba(167, 139, 250, 0.16);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.25);
  }
  .spec-chip.active {
    border-color: var(--cyan);
    color: var(--cyan);
    background: rgba(0, 245, 212, 0.14);
    box-shadow: 0 0 8px rgba(0, 245, 212, 0.25);
  }
</style>
