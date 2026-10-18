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
    border-radius: var(--ctl-radius);
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

  /* 通电开关：物理小键（桌面紧凑，触屏由令牌放大） */
  .power-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 var(--ctl-md);
    min-height: var(--ctl-md);
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
    width: var(--ctl-xs);
    height: var(--ctl-xs);
    border-radius: var(--ctl-radius);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--edge-faint);
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 200ms ease;
  }
  .power-btn:active:not(:disabled) .power-rock {
    transform: scale(0.94);
    transition-timing-function: ease-out;
  }
  .power-lamp {
    width: 6px;
    height: 6px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: background 240ms ease;
  }
  .arm-slot.on .power-lamp {
    background: var(--cyan);
    box-shadow: none;
    transition-duration: 140ms;
  }

  /* 读数 */
  .slot-body {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: var(--ctl-md);
    padding: 0 10px 0 2px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    text-align: left;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .slot-body:active:not(:disabled) {
    transform: scale(0.97);
    transition-timing-function: ease-out;
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
    font-size: var(--ctl-font);
    line-height: 1;
  }
  .rv {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }
  .rv .slot-num {
    font-size: 14px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text);
  }
  .arm-slot.on .slot-num {
    color: var(--gold-bright);
  }
  .locked .rv .slot-num {
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .dir {
    flex: 0 0 auto;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    color: var(--cyan);
  }
  .dir.ccw {
    color: var(--purple);
  }
  .fv {
    flex: 0 0 auto;
    width: 32px;
    text-align: right;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* reduce-motion：位移/缩放全关 */
  @media (prefers-reduced-motion: reduce) {
    .power-rock,
    .slot-body {
      transition: none;
    }
    .power-btn:active:not(:disabled) .power-rock,
    .slot-body:active:not(:disabled) {
      transform: none;
    }
  }
  :global(.reduce-motion) .power-rock,
  :global(.reduce-motion) .slot-body {
    transition: none;
  }
  :global(.reduce-motion) .power-btn:active:not(:disabled) .power-rock,
  :global(.reduce-motion) .slot-body:active:not(:disabled) {
    transform: none;
  }
</style>
