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

<!-- 指针插槽行：左边是通电翘板（状态灯），右边是读数插槽 -->
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
    <span class="rv"><b class="g-num slot-num">{arm.on ? arm.r : isLocked ? '封' : '—'}</b></span>
    <span class="dir" class:ccw={arm.freq < 0}>{arm.freq < 0 ? '逆' : '顺'}</span>
    <span class="fv">{Math.abs(arm.freq)}×</span>
  </button>
</div>

<style>
  /* ============================================================
   * 指针插槽行 · 机箱插槽语言
   * 左：通电翘板 + 状态灯；右：通道印 / 半径读数 / 方向 / 倍率
   * ============================================================ */
  .arm-slot {
    display: flex;
    align-items: stretch;
    min-width: 0;
    border-radius: 9px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(7, 11, 20, 0.95), rgba(4, 7, 14, 0.92));
    border: 1px solid var(--edge-faint);
    box-shadow: var(--bevel-inset);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      background 0.15s ease;
  }
  .arm-slot.on {
    border-color: rgba(0, 245, 212, 0.28);
  }
  .arm-slot.sel {
    border-color: var(--edge-hot);
    background: linear-gradient(180deg, rgba(24, 20, 8, 0.72), rgba(6, 9, 16, 0.94));
    box-shadow:
      var(--bevel-inset),
      0 0 14px rgba(245, 184, 65, 0.35);
  }
  .arm-slot.locked {
    opacity: 0.5;
  }

  /* 通电翘板：物理小键，热区 ≥44 */
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
    background: linear-gradient(180deg, #1b2740 0%, #0b1220 100%);
    border: 1px solid var(--edge-soft);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .power-btn:active:not(:disabled) .power-rock {
    transform: translateY(2px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 6px rgba(0, 0, 0, 0.65);
  }
  .power-lamp {
    width: 8px;
    height: 8px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.9);
  }
  .arm-slot.on .power-lamp {
    background: var(--cyan);
    box-shadow:
      0 0 9px rgba(0, 245, 212, 0.9),
      inset 0 0 2px #fff;
  }
  .arm-slot.sel .power-rock {
    border-color: var(--edge);
  }

  /* 读数插槽 */
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
    font-size: 13px;
    line-height: 1;
  }
  .rv {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }
  .rv .slot-num {
    font-size: 16px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text);
  }
  .arm-slot.on .slot-num {
    color: var(--gold-bright);
    text-shadow: 0 0 12px rgba(245, 184, 65, 0.45);
  }
  .locked .rv .slot-num {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted-2);
    letter-spacing: 1px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    text-shadow: none;
  }
  .dir {
    flex: 0 0 auto;
    font-size: 10px;
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
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  @media (pointer: coarse), (max-width: 640px) {
    .slot-body {
      height: 48px;
    }
    .power-btn {
      min-height: 48px;
    }
    .power-rock {
      width: 34px;
      height: 34px;
    }
  }
</style>
