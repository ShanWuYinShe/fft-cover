<script lang="ts">
  import { CIRCLED } from '../game/constants';
  import { engine } from '../game/engine.svelte';
  import type { Arm } from '../game/types';

  let {
    index,
    arm,
    selected,
    onselect,
  }: { index: number; arm: Arm; selected: boolean; onselect: () => void } = $props();

  const isLocked = $derived(!arm.on && !engine.canEnableMore());

  function togglePower(): void {
    if (isLocked) return;
    engine.setArm(index, { on: !arm.on });
  }
</script>

<!-- 指针插槽行：左边圆形通电开关，右边读数（厚卡片，安静样式） -->
<div class="arm-slot" class:on={arm.on} class:sel={selected && arm.on} class:locked={isLocked}>
  <button
    type="button"
    class="power-btn"
    role="switch"
    aria-checked={arm.on}
    aria-label={arm.on ? `停用指针 ${CIRCLED[index]}` : `启用指针 ${CIRCLED[index]}`}
    disabled={isLocked}
    title={arm.on
      ? '点击断电 / 停用'
      : isLocked
        ? `本关最多启用 ${engine.level?.armLimit ?? 10} 根指针`
        : '点击通电 / 启用'}
    onclick={togglePower}
  >
    <span class="power-rock" aria-hidden="true">
      <span class="power-lamp"></span>
    </span>
  </button>

  <button
    type="button"
    class="slot-body"
    disabled={isLocked}
    onclick={onselect}
    title={isLocked ? '槽位已锁定（达到关卡指针上限）' : '点击编辑这根指针参数'}
  >
    <span class="idx">{CIRCLED[index]}</span>
    <span class="rv"><b class="slot-num">{arm.on ? arm.r : isLocked ? '封' : '—'}</b></span>
    <span class="dir" class:ccw={arm.freq < 0}>{arm.freq < 0 ? '逆' : '顺'}</span>
    <span class="fv">{Math.abs(arm.freq)}×</span>
  </button>
</div>

<style>
  /* ============================================================
   * 指针插槽行 · 厚卡片
   * 白面 + 浅蓝发丝边 + 硬投影；选中 = 珊瑚描边；
   * 通电开关 = 圆形糖果灯（未通电浅蓝、通电薄荷），不发光。
   * ============================================================ */
  .arm-slot {
    display: flex;
    align-items: stretch;
    min-width: 0;
    border: 2px solid var(--line-2);
    border-radius: var(--r-md);
    background: var(--card-bg);
    box-shadow: var(--card-shadow);
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }
  .arm-slot.sel {
    border-color: var(--coral-text);
    box-shadow:
      0 0 0 3px var(--coral-dim),
      var(--card-shadow);
  }
  .arm-slot.locked {
    opacity: 0.55;
  }

  /* 通电开关：整块热区 ≥ --ctl-md，视觉是里面的糖果灯 */
  .power-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 var(--ctl-md);
    min-height: var(--ctl-md);
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .power-btn:disabled {
    cursor: not-allowed;
  }
  .power-rock {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--ctl-md) - 10px);
    height: calc(var(--ctl-md) - 10px);
    border-radius: 50%;
    background: var(--bg-bay-inset);
    box-shadow: var(--groove-shadow);
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background 200ms ease,
      box-shadow 200ms ease;
  }
  .power-btn:active:not(:disabled) .power-rock {
    transform: scale(0.92);
    transition-timing-function: ease-out;
  }
  .power-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: -3px;
    border-radius: var(--r-sm);
  }
  .power-lamp {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--line-bright);
    transition: background 240ms ease;
  }
  .arm-slot.on .power-rock {
    background: var(--note-bg);
    box-shadow: inset 0 0 0 2px var(--note-edge);
  }
  .arm-slot.on .power-lamp {
    background: var(--mint);
    box-shadow: 0 2px 0 var(--mint-edge);
    transition-duration: 140ms;
  }

  /* 读数：编号 / 半径 / 方向 / 倍率 */
  .slot-body {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: var(--ctl-md);
    padding: 0 12px 0 4px;
    border: none;
    border-radius: 0 var(--r-md) var(--r-md) 0;
    background: transparent;
    cursor: pointer;
    font-family: var(--font-round);
    font-variant-numeric: tabular-nums;
    text-align: left;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .slot-body:active:not(:disabled) {
    transform: scale(0.99);
    transition-timing-function: ease-out;
  }
  .slot-body:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: -3px;
  }
  .slot-body:disabled {
    cursor: not-allowed;
  }

  .idx {
    flex: 0 0 auto;
    width: 24px;
    text-align: center;
    font-size: 15px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-edge);
  }
  .rv {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }
  .rv .slot-num {
    font-size: 20px;
    font-weight: 900;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .arm-slot.on .slot-num {
    color: var(--coral-text);
  }
  .locked .rv .slot-num {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .dir {
    flex: 0 0 auto;
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--mint-edge);
  }
  .dir.ccw {
    color: var(--grape-deep);
  }
  .fv {
    flex: 0 0 auto;
    width: 36px;
    text-align: right;
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--muted);
  }

  /* reduce-motion：位移 / 缩放全关 */
  @media (prefers-reduced-motion: reduce) {
    .power-rock,
    .slot-body,
    .power-lamp {
      transition: none;
    }
    .power-btn:active:not(:disabled) .power-rock,
    .slot-body:active:not(:disabled) {
      transform: none;
    }
  }
  :global(.reduce-motion) .power-rock,
  :global(.reduce-motion) .slot-body,
  :global(.reduce-motion) .power-lamp {
    transition: none;
  }
  :global(.reduce-motion) .power-btn:active:not(:disabled) .power-rock,
  :global(.reduce-motion) .slot-body:active:not(:disabled) {
    transform: none;
  }
</style>
