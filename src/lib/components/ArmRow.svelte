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

<!-- 指针插槽行：左边通电开关（状态灯），右边读数（安静样式，不发光） -->
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
      <span class="g-lamp power-lamp"></span>
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
   * 指针插槽行 · 安静版
   * 只有选中态加金边；其余靠底色与留白区分
   * ============================================================ */
  .arm-slot {
    display: flex;
    align-items: stretch;
    min-width: 0;
    border-radius: 8px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.03);
    transition:
      background 0.12s ease,
      border-color 0.12s ease;
  }
  .arm-slot.on {
    background: rgba(0, 245, 212, 0.05);
  }
  .arm-slot.sel {
    border-color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.07);
  }
  .arm-slot.locked {
    opacity: 0.5;
  }

  /* 通电开关：物理小键，热区 ≥44 */
  .power-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 44px;
    min-height: 44px;
    padding: 0;
    cursor: pointer;
  }
  .power-btn:disabled {
    cursor: not-allowed;
  }
  .power-rock {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--edge-faint);
    transition: transform 0.09s ease;
  }
  .power-btn:active:not(:disabled) .power-rock {
    transform: translateY(2px);
  }
  .power-lamp {
    width: 8px;
    height: 8px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .arm-slot.on .power-lamp {
    background: var(--cyan);
    box-shadow: none;
  }

  /* 读数 */
  .slot-body {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 44px;
    padding: 0 10px 0 2px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    text-align: left;
  }
  .slot-body:disabled {
    cursor: not-allowed;
  }
  .idx {
    flex: 0 0 auto;
    width: 18px;
    text-align: center;
    color: var(--gold-bright);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 14px;
    line-height: 1;
  }
  .rv {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }
  .rv .slot-num {
    font-size: 16px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text);
  }
  .arm-slot.on .slot-num {
    color: var(--gold-bright);
  }
  .locked .rv .slot-num {
    font-size: 12px;
    color: var(--muted);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .dir {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 700;
    color: var(--cyan);
  }
  .dir.ccw {
    color: var(--purple);
  }
  .fv {
    flex: 0 0 auto;
    width: 34px;
    text-align: right;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }
</style>
