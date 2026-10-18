<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { CIRCLED } from '../game/constants';
  import ArmEditor from './ArmEditor.svelte';
  import Icon from './Icon.svelte';
  import { beep, pluck } from '../game/audio';
  import { haptic } from '../game/haptics';

  /** 当前编辑的指针序号（点击通道卡槽切换） */
  let selected = $state(0);

  const cur = $derived(engine.arms[selected]);
  const onCount = $derived(engine.arms.filter((a) => a.on).length);
  const armLimit = $derived(engine.level?.armLimit ?? 10);
  /** 机架固定 10 个物理插槽，超出本关上限的显示为「未启」空槽 */
  const ghostCount = $derived(Math.max(0, 10 - armLimit));

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
    if (!engine.arms[i].on) engine.setArm(i, { on: true });
    selected = i;
    pluck(261.6 + i * 36, engine.soundOn);
    haptic(12, engine.soundOn);
  }
</script>

<div class="arm-panel">
  <!-- 十方星宿共鸣律柱台 (The 10 Resonance Tone Pillars)
       机坞级铭牌头由 GameShell 提供，这里只放工具条 + 插槽矩阵，避免双标题 -->
  <section class="rack-panel g-plate g-plate--lit" aria-label="十方星宿律柱插槽台">
    <!-- 工具条：小铭牌 + 一排物理小键（触屏 ≥40×40） -->
    <div class="rack-toolbar">
      <span class="g-label g-label--dim rack-sub">TONE PILLARS</span>
      <span class="rack-tool-line" aria-hidden="true"></span>
      <div class="rack-keys" role="group" aria-label="律柱快捷操作">
        {#if engine.hasSavedArms()}
          <button
            type="button"
            class="g-btn rack-key rack-key--best"
            title="载入历史最佳解"
            onclick={() => {
              engine.loadSavedArms();
              beep(523, 0.08, 'sine', 0.1, engine.soundOn);
            }}
          >
            <Icon name="award" size={14} />
            最佳
          </button>
        {/if}
        <button
          type="button"
          class="g-btn g-btn--icon rack-key"
          title="随机扰动参数"
          aria-label="随机扰动参数"
          onclick={() => {
            engine.randomizeArms();
            beep(440, 0.04, 'triangle', 0.08, engine.soundOn);
          }}
        >
          <Icon name="dice" size={15} />
        </button>
        <button
          type="button"
          class="g-btn g-btn--icon rack-key"
          title="撤销（Ctrl+Z）"
          aria-label="撤销（Ctrl+Z）"
          disabled={engine.armUndoCount === 0}
          onclick={() => engine.undoArms()}
        >
          <Icon name="undo" size={15} />
        </button>
        <button
          type="button"
          class="g-btn g-btn--icon rack-key"
          title="复位当前律柱"
          aria-label="复位当前律柱"
          onclick={() => engine.resetArm(selected)}
        >
          <Icon name="refresh" size={15} />
        </button>
        {#if engine.expertUnlocked}
          <button
            type="button"
            class="g-btn g-btn--icon rack-key"
            class:active={engine.expertMode}
            title="专家模式"
            aria-label="专家模式"
            onclick={() => engine.toggleExpert()}
          >
            <Icon name="gem" size={14} />
          </button>
        {/if}
        {#if engine.spectrumUnlocked}
          <button
            type="button"
            class="g-btn g-btn--icon rack-key"
            class:active={engine.spectrumCompare}
            title="频谱对比"
            aria-label="频谱对比"
            onclick={() => engine.toggleSpectrumCompare()}
          >
            <Icon name="zoom" size={14} />
          </button>
        {/if}
      </div>
    </div>

    <!-- 律柱矩阵：嵌进机箱的凹槽，固定 10 个插槽 -->
    <div class="rack-bed g-inset">
      <div class="pillars-matrix" role="tablist" aria-label="十方星宿律柱通道选择">
        {#each engine.arms as arm, i (i)}
          {#if i < armLimit}
            {@const isSelected = selected === i}
            {@const rRatio = Math.min(1, arm.r / 210)}
            {@const isCCW = arm.freq < 0}
            <button
              type="button"
              role="tab"
              aria-selected={isSelected}
              class="pillar-col"
              class:active={isSelected}
              class:powered={arm.on}
              class:ccw={arm.on && isCCW}
              title={arm.on
                ? `律柱 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）：半径 ${arm.r}px · ${Math.abs(arm.freq)}×${isCCW ? '逆' : '顺'} · 相位 ${Math.round((arm.phase * 180) / Math.PI)}°`
                : `点击启通律柱 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）`}
              onclick={() => pick(i)}
            >
              <!-- 顶冠状态灯 -->
              <span class="pillar-finial" aria-hidden="true">
                <span class="g-lamp pillar-lamp"></span>
              </span>

              <!-- 水晶共鸣管与能量液柱 -->
              <span class="pillar-tube">
                <span
                  class="pillar-fluid"
                  style={`height: ${arm.on ? Math.max(14, rRatio * 100) : 0}%`}
                >
                  <span class="fluid-crest"></span>
                </span>
                <span class="tube-ticks" aria-hidden="true"></span>
                <span class="pillar-freq">
                  {#if arm.on}
                    {Math.abs(arm.freq)}×
                  {:else}
                    <span class="off-mark">休</span>
                  {/if}
                </span>
              </span>

              <!-- 底座基石与铭文 -->
              <span class="pillar-base">
                <span class="base-no">{i + 1}</span>
                <span class="base-name">{CELESTIAL_NAMES[i]}</span>
              </span>
            </button>
          {/if}
        {/each}
        <!-- 超出关卡上限的空插槽（纯装饰，读屏忽略） -->
        {#each Array(ghostCount) as _, g (g)}
          <span class="pillar-ghost" aria-hidden="true">
            <span class="ghost-lamp"></span>
            <span class="ghost-tube"></span>
          </span>
        {/each}
      </div>
    </div>
  </section>

  <!-- 调谐控制台核心 -->
  {#if cur}
    <ArmEditor index={selected} arm={cur} />
  {/if}
</div>

<style>
  /* ============================================================
   * 十方星宿律柱 · 机箱插槽面板
   * 结构：装甲面板(g-plate) = 工具条(小铭牌 + 物理按键) + 凹槽律柱矩阵
   * 机坞级大标题与容量 pips 由 GameShell 提供，这里不重复。
   * ============================================================ */
  .arm-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .rack-panel {
    position: relative;
    padding: 9px;
    min-width: 0;
  }

  /* ---------- 工具条：小铭牌 + 物理按键 ---------- */
  .rack-toolbar {
    display: flex;
    align-items: center;
    gap: 8px 10px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .rack-sub {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
  }

  /* ---------- 快捷按键排：物理小键 ---------- */
  .rack-tool-line {
    flex: 1 1 20px;
    min-width: 12px;
    height: 1px;
    background: linear-gradient(90deg, var(--edge-soft), transparent);
  }
  .rack-keys {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .rack-panel .rack-key {
    height: 40px;
    min-height: 40px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    border-radius: 8px;
    flex: 0 0 auto;
  }
  .rack-panel .rack-key.g-btn--icon {
    width: 40px;
    min-width: 40px;
    padding: 0;
    font-size: 15px;
  }
  .rack-panel .rack-key--best {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 #7a4d05;
  }
  .rack-panel .rack-key--best:hover:not(:disabled) {
    background: var(--face-gold-hover);
    border-color: #fff2c4;
    color: #120a00;
  }
  .rack-panel .rack-key.active {
    background: rgba(0, 245, 212, 0.14);
    border-color: var(--cyan-line);
    color: var(--cyan);
    box-shadow:
      var(--bevel-top),
      inset 0 -2px 0 rgba(0, 0, 0, 0.5),
      0 0 14px rgba(0, 245, 212, 0.3);
  }
  .rack-panel .rack-key.active:hover:not(:disabled) {
    color: var(--cyan);
    border-color: var(--cyan);
  }

  /* ---------- 律柱矩阵：10 个固定物理插槽 ---------- */
  .rack-bed {
    padding: 8px 7px 6px;
    min-width: 0;
  }
  .pillars-matrix {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 5px;
  }

  .pillar-col {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 2px 0 3px;
    border-radius: 7px;
    background: transparent;
    border: none;
    cursor: pointer;
    touch-action: manipulation;
    transition:
      transform 0.12s ease,
      background 0.12s ease;
  }
  .pillar-col:hover {
    background: rgba(245, 184, 65, 0.05);
  }
  .pillar-col.active {
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.13), rgba(245, 184, 65, 0.03));
    box-shadow: inset 0 0 0 1px var(--edge-soft);
  }
  .pillar-col:active {
    transform: translateY(1px);
  }

  /* 顶冠状态灯 */
  .pillar-finial {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 9px;
  }
  .pillar-col .pillar-lamp {
    width: 6px;
    height: 6px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.9);
  }
  .pillar-col.powered .pillar-lamp {
    background: var(--cyan);
    box-shadow:
      0 0 9px rgba(0, 245, 212, 0.9),
      inset 0 0 2px #fff;
  }
  .pillar-col.powered.ccw .pillar-lamp {
    background: var(--purple);
    box-shadow:
      0 0 9px rgba(167, 139, 250, 0.9),
      inset 0 0 2px #fff;
  }

  /* 水晶管身：内嵌凹槽 */
  .pillar-tube {
    position: relative;
    display: block;
    width: 100%;
    max-width: 30px;
    height: 42px;
    border-radius: 4px;
    overflow: hidden;
    background: linear-gradient(180deg, #05080f, #02040a 70%, #060b14);
    border: 1px solid var(--edge-faint);
    box-shadow: var(--bevel-inset);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .pillar-col.powered .pillar-tube {
    border-color: rgba(0, 245, 212, 0.35);
  }
  .pillar-col.powered.ccw .pillar-tube {
    border-color: rgba(167, 139, 250, 0.35);
  }
  .pillar-col.active .pillar-tube {
    border-color: var(--edge-hot);
    box-shadow:
      var(--bevel-inset),
      0 0 12px rgba(245, 184, 65, 0.4);
  }

  /* 能量液位 */
  .pillar-fluid {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(0, 245, 212, 0.55) 0%, rgba(0, 245, 212, 0.15) 100%);
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .pillar-col.ccw .pillar-fluid {
    background: linear-gradient(
      180deg,
      rgba(167, 139, 250, 0.62) 0%,
      rgba(167, 139, 250, 0.18) 100%
    );
  }
  .fluid-crest {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #fff;
    box-shadow: 0 0 6px var(--cyan);
  }
  .pillar-col.ccw .fluid-crest {
    box-shadow: 0 0 6px var(--purple);
  }

  .tube-ticks {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.09) 0px,
      rgba(255, 255, 255, 0.09) 1px,
      transparent 1px,
      transparent 6px
    );
  }

  .pillar-freq {
    position: absolute;
    top: 3px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    line-height: 1;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
    z-index: 2;
  }
  .off-mark {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.28);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }

  /* 底座铭文 */
  .pillar-base {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-width: 0;
  }
  .base-no {
    font-size: 8px;
    line-height: 1.1;
    color: var(--muted-2);
    font-family: 'JetBrains Mono', monospace;
  }
  .base-name {
    font-size: 10px;
    line-height: 1.2;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    color: var(--text);
    font-weight: 600;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .pillar-col.active .base-name {
    color: var(--gold-bright);
    text-shadow: 0 0 6px rgba(245, 184, 65, 0.5);
  }

  /* 未启空插槽（纯装饰） */
  .pillar-ghost {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 2px 0 3px;
    opacity: 0.5;
  }
  .ghost-lamp {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #101827;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .ghost-tube {
    display: block;
    width: 100%;
    max-width: 30px;
    height: 42px;
    border-radius: 4px;
    border: 1px dashed rgba(245, 184, 65, 0.13);
    background: rgba(2, 4, 9, 0.6);
    box-shadow: var(--bevel-inset);
  }
  /* 触屏：插槽横排滚动，单槽热区 ≥40×40 */
  @media (pointer: coarse), (max-width: 640px) {
    .rack-panel .rack-key {
      height: 44px;
      min-height: 44px;
    }
    .rack-panel .rack-key.g-btn--icon {
      width: 44px;
      min-width: 44px;
      height: 44px;
    }
    .pillars-matrix {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .pillars-matrix::-webkit-scrollbar {
      display: none;
    }
    .pillar-col,
    .pillar-ghost {
      flex: 0 0 40px;
    }
    .pillar-tube,
    .ghost-tube {
      max-width: 34px;
      height: 46px;
    }
  }
</style>
