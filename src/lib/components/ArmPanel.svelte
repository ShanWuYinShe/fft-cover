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
  <!-- 十方星宿共鸣律柱台 (The 10 Resonance Tone Pillars) -->
  <div class="pillars-rack-container">
    <div class="rack-header">
      <div class="rack-title">
        <span class="rack-gem">◆</span>
        <span>十方星宿律柱</span>
        <span class="rack-sub">TONE PILLARS ({onCount}/{armLimit})</span>
      </div>

      <!-- 紧凑机巧微调工具 -->
      <div class="rack-actions">
        {#if engine.hasSavedArms()}
          <button
            type="button"
            class="rack-btn best-btn"
            title="载入历史最佳解"
            onclick={() => {
              engine.loadSavedArms();
              beep(523, 0.08, 'sine', 0.1, engine.soundOn);
            }}
          >
            ★ 最佳
          </button>
        {/if}
        <button
          type="button"
          class="rack-btn"
          title="随机扰动参数"
          onclick={() => {
            engine.randomizeArms();
            beep(440, 0.04, 'triangle', 0.08, engine.soundOn);
          }}
        >
          <Icon name="dice" size={13} />
        </button>
        <button
          type="button"
          class="rack-btn"
          title="撤销（Ctrl+Z）"
          disabled={engine.armUndoCount === 0}
          onclick={() => engine.undoArms()}
        >
          ↶
        </button>
        <button
          type="button"
          class="rack-btn"
          title="复位当前律柱"
          onclick={() => engine.resetArm(selected)}
        >
          ↺
        </button>
        {#if engine.expertUnlocked}
          <button
            type="button"
            class="rack-btn"
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
            class="rack-btn"
            class:active={engine.spectrumCompare}
            title="频谱对比"
            onclick={() => engine.toggleSpectrumCompare()}
          >
            <Icon name="zoom" size={12} />
          </button>
        {/if}
      </div>
    </div>

    <!-- 律柱矩阵横排 -->
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
            <!-- 顶冠指示珠 -->
            <div class="pillar-finial">
              <span class="finial-orb"></span>
            </div>

            <!-- 水晶共鸣管与能量液柱 -->
            <div class="pillar-glass-tube">
              <div
                class="pillar-fluid-level"
                style={`height: ${arm.on ? Math.max(14, rRatio * 100) : 0}%`}
              >
                <span class="fluid-crest"></span>
              </div>
              <div class="tube-ruler-ticks"></div>
              <span class="pillar-freq-tag">
                {#if arm.on}
                  {Math.abs(arm.freq)}×
                {:else}
                  <span class="off-label">休</span>
                {/if}
              </span>
            </div>

            <!-- 底座基石与铭文 -->
            <div class="pillar-base">
              <span class="base-no">{i + 1}</span>
              <span class="base-name">{CELESTIAL_NAMES[i]}</span>
            </div>
          </button>
        {/if}
      {/each}
    </div>
  </div>

  <!-- 调谐控制台核心 -->
  {#if cur}
    <ArmEditor index={selected} arm={cur} />
  {/if}
</div>

<style>
  .arm-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pillars-rack-container {
    background: linear-gradient(180deg, rgba(14, 20, 35, 0.96) 0%, rgba(6, 9, 18, 0.98) 100%);
    border: 1px solid rgba(245, 184, 65, 0.28);
    border-radius: 14px;
    padding: 10px 12px 12px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 6px 20px rgba(0, 0, 0, 0.5);
  }

  .rack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(245, 184, 65, 0.15);
  }
  .rack-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 1.5px;
  }
  .rack-gem {
    color: var(--cyan);
    font-size: 11px;
    text-shadow: 0 0 6px var(--cyan);
  }
  .rack-sub {
    font-size: 9px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0;
  }

  .rack-actions {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .rack-btn {
    appearance: none;
    height: 26px;
    padding: 0 8px;
    border-radius: 5px;
    background: linear-gradient(180deg, #1d273a 0%, #0d1422 100%);
    border: 1px solid rgba(245, 184, 65, 0.25);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
  }
  .rack-btn:hover:not(:disabled) {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
  }
  .rack-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .rack-btn.best-btn {
    background: linear-gradient(180deg, #3d2d0c 0%, #1c1505 100%);
    border-color: #ffd700;
    color: #ffd700;
    font-weight: 700;
  }
  .rack-btn.active {
    background: rgba(0, 245, 212, 0.15);
    border-color: var(--cyan);
    color: var(--cyan);
  }

  /* 律柱横排矩阵 */
  .pillars-matrix {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));
    gap: 6px;
  }

  .pillar-col {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    position: relative;
    transition: transform 0.12s ease;
  }
  .pillar-col:hover {
    transform: translateY(-2px);
  }
  .pillar-col.active {
    transform: translateY(-4px);
  }

  /* 顶冠宝珠 */
  .pillar-finial {
    width: 14px;
    height: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .finial-orb {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1e283c;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s;
  }
  .pillar-col.powered .finial-orb {
    background: var(--cyan);
    border-color: #fff;
    box-shadow: 0 0 8px var(--cyan);
  }
  .pillar-col.powered.ccw .finial-orb {
    background: var(--purple);
    box-shadow: 0 0 8px var(--purple);
  }

  /* 水晶管身 */
  .pillar-glass-tube {
    width: 100%;
    max-width: 36px;
    height: 64px;
    background: #040710;
    border: 1px solid rgba(245, 184, 65, 0.2);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
    transition: border-color 0.2s;
  }
  .pillar-col.active .pillar-glass-tube {
    border-color: var(--gold-bright);
    box-shadow:
      inset 0 0 8px rgba(0, 0, 0, 0.6),
      0 0 12px rgba(245, 184, 65, 0.35);
  }

  /* 能量液位 */
  .pillar-fluid-level {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, rgba(0, 245, 212, 0.6) 0%, rgba(0, 245, 212, 0.2) 100%);
    transition: height 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .pillar-col.ccw .pillar-fluid-level {
    background: linear-gradient(
      180deg,
      rgba(167, 139, 250, 0.7) 0%,
      rgba(167, 139, 250, 0.25) 100%
    );
  }
  .fluid-crest {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #fff;
    box-shadow: 0 0 6px #00f5d4;
  }
  .pillar-col.ccw .fluid-crest {
    box-shadow: 0 0 6px #a78bfa;
  }

  .tube-ruler-ticks {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.1) 0px,
      rgba(255, 255, 255, 0.1) 1px,
      transparent 1px,
      transparent 12px
    );
  }

  .pillar-freq-tag {
    position: absolute;
    top: 3px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
    z-index: 2;
  }
  .off-label {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.25);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }

  /* 底座 */
  .pillar-base {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 4px;
    width: 100%;
  }
  .base-no {
    font-size: 8px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }
  .base-name {
    font-size: 10px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    color: var(--text);
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .pillar-col.active .base-name {
    color: var(--gold-bright);
    text-shadow: 0 0 6px rgba(245, 184, 65, 0.5);
  }
</style>
