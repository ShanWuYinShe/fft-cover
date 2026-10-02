<script lang="ts">
  import { CIRCLED } from '../game/constants';
  import { engine } from '../game/engine.svelte';
  import type { Arm } from '../game/types';

  let { index, arm }: { index: number; arm: Arm } = $props();

  const freqOptions = Array.from({ length: 19 }, (_, i) => (i < 9 ? i - 10 : i - 8));

  function setR(e: Event): void {
    engine.setArm(index, { r: +(e.currentTarget as HTMLInputElement).value });
  }
  function setFreq(e: Event): void {
    engine.setArm(index, { freq: +(e.currentTarget as HTMLSelectElement).value });
  }
  function setPhase(e: Event): void {
    const deg = +(e.currentTarget as HTMLInputElement).value;
    engine.setArm(index, { phase: (deg * Math.PI) / 180 });
  }
  function toggleOn(e: Event): void {
    engine.setArm(index, { on: (e.currentTarget as HTMLInputElement).checked });
  }
</script>

<div class="arm" class:off={!arm.on}>
  <div class="row1">
    <label class="toggle">
      <input type="checkbox" checked={arm.on} onchange={toggleOn} />
      <b>{CIRCLED[index]}</b>
    </label>
    <input type="range" min="0" max="210" step="2" value={arm.r} oninput={setR} />
    <span class="rv">{arm.r}</span>
  </div>
  <div class="row2">
    <select title="负数 = 反向旋转" value={arm.freq} onchange={setFreq}>
      {#each freqOptions as f (f)}
        <option value={f}>{f}×</option>
      {/each}
    </select>
    <input
      type="range"
      title="初始相位"
      min="0"
      max="360"
      step="5"
      value={Math.round((arm.phase * 180) / Math.PI)}
      oninput={setPhase}
    />
    <span class="pv">{Math.round((arm.phase * 180) / Math.PI)}°</span>
  </div>
</div>

<style>
  .arm {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 7px 9px 8px;
    background: rgba(255, 255, 255, 0.02);
    min-width: 0;
  }
  .arm.off {
    opacity: 0.45;
  }
  .row1 {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .row1 b {
    width: 22px;
    text-align: center;
    color: var(--cyan);
  }
  .row1 input[type='range'] {
    flex: 1;
  }
  .rv {
    width: 34px;
    text-align: right;
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .row2 {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 6px;
    font-size: 11.5px;
  }
  select {
    background: #141a2e;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: 6px;
    font-size: 11.5px;
    padding: 2px 4px;
    font-family: inherit;
  }
  .pv {
    width: 34px;
    text-align: right;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    user-select: none;
  }
</style>
