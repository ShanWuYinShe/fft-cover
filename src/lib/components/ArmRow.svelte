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

<div
  class="arm-slot"
  class:on={arm.on}
  class:sel={selected && arm.on}
  class:locked={isLocked}
>
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
    <span class="power-bar" class:powered={arm.on}></span>
  </button>

  <button
    type="button"
    class="slot-body"
    disabled={isLocked}
    onclick={onselect}
    title={isLocked ? '槽位已锁定（达到关卡指针上限）' : '点击编辑这根指针参数'}
  >
    <span class="idx">{CIRCLED[index]}</span>
    <span class="rv">{arm.on ? arm.r : isLocked ? '封' : '—'}</span>
    <span class="dir" class:ccw={arm.freq < 0}>{arm.freq < 0 ? '逆' : '顺'}</span>
    <span class="fv">{Math.abs(arm.freq)}×</span>
  </button>
</div>

<style>
  .arm-slot {
    display: flex;
    align-items: center;
    gap: 0;
    border-radius: 8px;
    background: #121620;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
    transition: all 0.15s ease;
  }
  .arm-slot.on {
    border-color: rgba(20, 184, 166, 0.4);
    background: #141b28;
  }
  .arm-slot.sel {
    border-color: #14b8a6;
    background: #182234;
  }
  .arm-slot.locked {
    background: rgba(15, 20, 32, 0.6);
    border-color: rgba(255, 255, 255, 0.04);
    opacity: 0.45;
  }
  .arm-slot:active:not(.locked) {
    transform: translateY(1px);
  }

  /* 通电开关与指示柱 */
  .power-btn {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0 8px 0 9px;
    height: 38px;
    display: flex;
    align-items: center;
    cursor: pointer;
    flex: 0 0 auto;
  }
  .power-btn:disabled {
    cursor: not-allowed;
  }
  .power-bar {
    width: 5px;
    height: 20px;
    border-radius: 2px;
    background: #1e283d;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: all 0.18s ease;
  }
  .power-bar.powered {
    background: var(--holo-cyan);
    box-shadow:
      0 0 8px var(--holo-cyan),
      0 0 2px #ffffff;
  }
  .arm-slot.sel .power-bar.powered {
    box-shadow:
      0 0 12px var(--holo-cyan),
      0 0 4px #ffffff;
  }

  /* 插槽正文 */
  .slot-body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 10px 0 2px;
    min-height: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    text-align: left;
  }
  .slot-body:disabled {
    cursor: not-allowed;
  }
  .idx {
    color: var(--cyan);
    font-size: var(--fs-md);
    width: 16px;
    text-align: center;
  }
  .rv {
    flex: 1;
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--text);
    font-weight: 600;
  }
  .locked .rv {
    font-size: 11px;
    color: var(--muted-2);
    letter-spacing: 1px;
  }
  .dir {
    font-size: var(--fs-xs);
    color: var(--cyan);
    font-weight: 500;
  }
  .dir.ccw {
    color: var(--purple);
  }
  .fv {
    font-size: var(--fs-xs);
    color: var(--muted);
    width: 26px;
    text-align: right;
    font-weight: 600;
  }

  @media (pointer: coarse), (max-width: 640px) {
    .power-btn {
      width: 44px;
      height: 44px;
      padding: 0;
      justify-content: center;
    }
    .power-bar {
      height: 24px;
      width: 6px;
    }
    .slot-body {
      height: 44px;
    }
  }
</style>
