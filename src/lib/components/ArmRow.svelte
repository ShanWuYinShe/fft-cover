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

  function toggleOn(e: Event): void {
    engine.setArm(index, { on: (e.currentTarget as HTMLInputElement).checked });
  }
</script>

<div class="arm-row" class:on={arm.on} class:sel={selected && arm.on}>
  <label class="tg" title={arm.on ? '停用这根指针' : '启用这根指针'}>
    <input
      type="checkbox"
      checked={arm.on}
      disabled={!arm.on && !engine.canEnableMore()}
      onchange={toggleOn}
    />
  </label>
  <button type="button" class="body" onclick={onselect} title="点击编辑这根指针">
    <span class="idx">{CIRCLED[index]}</span>
    <span class="rv">{arm.on ? arm.r : '—'}</span>
    <span class="dir" class:ccw={arm.freq < 0}>{arm.freq < 0 ? '逆' : '顺'}</span>
    <span class="fv">{Math.abs(arm.freq)}×</span>
  </button>
</div>

<style>
  .arm-row {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--line-2);
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.015);
    overflow: hidden;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .arm-row.on {
    background: rgba(79, 209, 197, 0.05);
  }
  .arm-row.sel {
    border-color: rgba(79, 209, 197, 0.7);
    box-shadow: 0 0 0 1px rgba(79, 209, 197, 0.25);
  }
  .arm-row:has(.body:hover) {
    border-color: rgba(255, 255, 255, 0.22);
  }
  .tg {
    display: flex;
    align-items: center;
    padding: 0 2px 0 7px;
    cursor: pointer;
    height: 38px;
  }
  .tg input {
    width: 15px;
    height: 15px;
  }
  .body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 8px 0 2px;
    min-height: 0;
    border: none;
    background: transparent;
    border-radius: 0;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .body:hover:not(:disabled) {
    border-color: transparent;
    box-shadow: none;
    background: rgba(255, 255, 255, 0.03);
  }
  .idx {
    color: var(--cyan);
    font-size: var(--fs-md);
    width: 16px;
    text-align: center;
  }
  .rv {
    flex: 1;
    /* 手机上臂卡片是两列网格（每格 ~150px），半径数字左对齐会在右侧留
       一大块空白。居中后「序号 · 半径 · 方向 · 频率」四段铺满整格。 */
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .on .rv {
    color: var(--text);
  }
  .dir {
    font-size: var(--fs-xs);
    color: var(--cyan);
  }
  .dir.ccw {
    color: var(--purple);
  }
  .fv {
    font-size: var(--fs-xs);
    color: var(--muted);
    width: 26px;
    text-align: right;
  }
  /* 未启用态：整行淡化 */
  .arm-row:not(.on) .rv,
  .arm-row:not(.on) .dir,
  .arm-row:not(.on) .fv,
  .arm-row:not(.on) .idx {
    opacity: 0.4;
  }
</style>
