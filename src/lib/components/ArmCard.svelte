<script lang="ts">
  import { CIRCLED } from '../game/constants';
  import { engine } from '../game/engine.svelte';
  import type { Arm } from '../game/types';

  let { index, arm }: { index: number; arm: Arm } = $props();

  const freqOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  function setR(e: Event): void {
    engine.setArm(index, { r: +(e.currentTarget as HTMLInputElement).value });
    engine.flashArm(index);
  }
  function editR(): void {
    const v = prompt('精确半径（0–210）', String(arm.r));
    if (v === null) return;
    const n = Math.max(0, Math.min(210, Math.round(Number(v))));
    if (Number.isFinite(n)) engine.setArm(index, { r: n });
  }
  function editPhase(): void {
    const v = prompt('精确相位（角度 0–360）', String(Math.round((arm.phase * 180) / Math.PI)));
    if (v === null) return;
    const n = Math.max(0, Math.min(360, Math.round(Number(v))));
    if (Number.isFinite(n)) engine.setArm(index, { phase: (n * Math.PI) / 180 });
  }
  function setFreq(e: Event): void {
    const v = +(e.currentTarget as HTMLSelectElement).value;
    engine.setArm(index, { freq: Math.sign(arm.freq || 1) * v });
  }
  function toggleDir(): void {
    engine.setArm(index, { freq: -(arm.freq || 1) });
    engine.flashArm(index);
  }
  function setPhase(e: Event): void {
    const deg = +(e.currentTarget as HTMLInputElement).value;
    engine.setArm(index, { phase: (deg * Math.PI) / 180 });
    engine.flashArm(index);
  }
  function toggleOn(e: Event): void {
    engine.setArm(index, { on: (e.currentTarget as HTMLInputElement).checked });
  }
</script>

<div class="arm" class:off={!arm.on}>
  <div class="row1">
    <label class="toggle">
      <input
        type="checkbox"
        checked={arm.on}
        disabled={!arm.on && !engine.canEnableMore()}
        title={!arm.on && !engine.canEnableMore() ? '本关指针已达上限' : '启用/停用'}
        onchange={toggleOn}
      />
      <b>{CIRCLED[index]}</b>
    </label>
    <input type="range" min="0" max="210" step="2" value={arm.r} oninput={setR} />
    <button type="button" class="rv" title="点击输入精确值" onclick={editR}>{arm.r}</button>
  </div>
  <div class="row2">
    <button
      type="button"
      class="dir"
      title={arm.freq < 0 ? '当前反向旋转，点击改为正向' : '当前正向旋转，点击改为反向'}
      onclick={toggleDir}
    >
      {arm.freq < 0 ? '⟲' : '⟳'}
    </button>
    <select title="旋转频率" value={Math.abs(arm.freq)} onchange={setFreq}>
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
    <button type="button" class="pv" title="点击输入精确值" onclick={editPhase}>
      {Math.round((arm.phase * 180) / Math.PI)}°
    </button>
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
    appearance: none;
    background: none;
    border: none;
    padding: 0;
  }
  .row2 {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 6px;
    font-size: 11.5px;
  }
  .dir {
    appearance: none;
    background: #141a2e;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--cyan);
    font-size: 13px;
    width: 26px;
    height: 22px;
    padding: 0;
    cursor: pointer;
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
    appearance: none;
    background: none;
    border: none;
    padding: 0;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    user-select: none;
  }
</style>
