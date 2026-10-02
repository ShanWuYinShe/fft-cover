<script lang="ts">
  import { CIRCLED } from '../game/constants';
  import { engine } from '../game/engine.svelte';
  import type { Arm } from '../game/types';

  let { index, arm }: { index: number; arm: Arm } = $props();

  const freqOptions = Array.from({ length: 10 }, (_, i) => i + 1);
  const R_MAX = 210;

  /** 内联编辑状态（点击数值进入，Enter/blur 确认，Esc 取消） */
  let editing: 'r' | 'p' | null = $state(null);
  let draft = $state('');

  const deg = $derived(Math.round((arm.phase * 180) / Math.PI));

  function setR(e: Event): void {
    engine.setArm(index, { r: +(e.currentTarget as HTMLInputElement).value });
    engine.flashArm(index);
  }
  function setPhase(e: Event): void {
    const d = +(e.currentTarget as HTMLInputElement).value;
    engine.setArm(index, { phase: (d * Math.PI) / 180 });
    engine.flashArm(index);
  }
  function setFreq(e: Event): void {
    const v = +(e.currentTarget as HTMLSelectElement).value;
    engine.setArm(index, { freq: Math.sign(arm.freq || 1) * v });
  }
  function toggleDir(): void {
    engine.setArm(index, { freq: -(arm.freq || 1) });
    engine.flashArm(index);
  }
  function toggleOn(e: Event): void {
    engine.setArm(index, { on: (e.currentTarget as HTMLInputElement).checked });
  }

  /** 步进：半径 ±1（可长按连发），相位 ±1° */
  function stepR(delta: number): void {
    const next = Math.max(0, Math.min(R_MAX, arm.r + delta));
    if (next !== arm.r) {
      engine.setArm(index, { r: next });
      engine.flashArm(index);
    }
  }
  function stepP(delta: number): void {
    let d = (deg + delta) % 360;
    if (d < 0) d += 360;
    engine.setArm(index, { phase: (d * Math.PI) / 180 });
    engine.flashArm(index);
  }

  /**
   * 步进按钮：短按走 click（同时支持键盘 Enter/Space 与读屏点击），
   * 长按 320ms 后以 55ms 连发；连发过则忽略抬手那一次 click。
   */
  function repeat(fn: () => void): {
    onDown: (e: PointerEvent) => void;
    onUp: () => void;
    onClick: () => void;
  } {
    let delay: ReturnType<typeof setTimeout> | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let repeatFired = false;
    const stop = () => {
      clearTimeout(delay);
      clearInterval(timer);
      delay = undefined;
      timer = undefined;
    };
    return {
      onDown: (e: PointerEvent) => {
        repeatFired = false;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        delay = setTimeout(() => {
          repeatFired = true;
          fn();
          timer = setInterval(fn, 55);
        }, 320);
      },
      onUp: stop,
      onClick: () => {
        if (!repeatFired) fn();
        repeatFired = false;
      },
    };
  }
  const rMinus = repeat(() => stepR(-1));
  const rPlus = repeat(() => stepR(1));
  const pMinus = repeat(() => stepP(-1));
  const pPlus = repeat(() => stepP(1));

  function beginEdit(which: 'r' | 'p'): void {
    editing = which;
    draft = which === 'r' ? String(arm.r) : String(deg);
  }
  function commitEdit(): void {
    const n = Math.round(Number(draft));
    if (Number.isFinite(n)) {
      if (editing === 'r') {
        engine.setArm(index, { r: Math.max(0, Math.min(R_MAX, n)) });
      } else if (editing === 'p') {
        let d = ((n % 360) + 360) % 360;
        engine.setArm(index, { phase: (d * Math.PI) / 180 });
      }
      engine.flashArm(index);
    }
    editing = null;
  }
  function onEditKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      editing = null;
    }
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
    <input type="range" min="0" max={R_MAX} step="1" value={arm.r} oninput={setR} title="半径" />
    <div class="spin">
      <button
        type="button"
        class="sb"
        title="半径 −1（长按连发）"
        onpointerdown={rMinus.onDown}
        onpointerup={rMinus.onUp}
        onpointerleave={rMinus.onUp}
        onpointercancel={rMinus.onUp}
        onclick={rMinus.onClick}>−</button
      >
      {#if editing === 'r'}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="num-edit"
          type="number"
          inputmode="numeric"
          autofocus
          value={draft}
          oninput={(e) => (draft = e.currentTarget.value)}
          onblur={commitEdit}
          onkeydown={onEditKey}
        />
      {:else}
        <button type="button" class="val rv" title="点击输入精确值" onclick={() => beginEdit('r')}
          >{arm.r}</button
        >
      {/if}
      <button
        type="button"
        class="sb"
        title="半径 +1（长按连发）"
        onpointerdown={rPlus.onDown}
        onpointerup={rPlus.onUp}
        onpointerleave={rPlus.onUp}
        onpointercancel={rPlus.onUp}
        onclick={rPlus.onClick}>+</button
      >
    </div>
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
      step="1"
      value={deg}
      oninput={setPhase}
    />
    <div class="spin">
      <button
        type="button"
        class="sb"
        title="相位 −1°（长按连发）"
        onpointerdown={pMinus.onDown}
        onpointerup={pMinus.onUp}
        onpointerleave={pMinus.onUp}
        onpointercancel={pMinus.onUp}
        onclick={pMinus.onClick}>−</button
      >
      {#if editing === 'p'}
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="num-edit"
          type="number"
          inputmode="numeric"
          autofocus
          value={draft}
          oninput={(e) => (draft = e.currentTarget.value)}
          onblur={commitEdit}
          onkeydown={onEditKey}
        />
      {:else}
        <button
          type="button"
          class="val pv"
          title="点击输入精确值（角度）"
          onclick={() => beginEdit('p')}>{deg}°</button
        >
      {/if}
      <button
        type="button"
        class="sb"
        title="相位 +1°（长按连发）"
        onpointerdown={pPlus.onDown}
        onpointerup={pPlus.onUp}
        onpointerleave={pPlus.onUp}
        onpointercancel={pPlus.onUp}
        onclick={pPlus.onClick}>+</button
      >
    </div>
  </div>
</div>

<style>
  .arm {
    position: relative;
    border: 1px solid var(--line-2);
    border-radius: var(--r-md);
    padding: 8px 9px 9px 11px;
    background: rgba(255, 255, 255, 0.022);
    min-width: 0;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .arm::before {
    content: '';
    position: absolute;
    left: 0;
    top: 9px;
    bottom: 9px;
    width: 2.5px;
    border-radius: 0 2px 2px 0;
    background: linear-gradient(180deg, var(--cyan), var(--purple));
    transition: opacity 0.15s;
  }
  .arm.off::before {
    opacity: 0;
  }
  .arm:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }
  .arm.off {
    opacity: 0.55;
  }
  .row1,
  .row2 {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .row2 {
    margin-top: 7px;
  }
  .row1 input[type='range'],
  .row2 input[type='range'] {
    flex: 1;
    min-width: 40px;
  }
  .row1 b {
    width: 18px;
    text-align: center;
    color: var(--cyan);
    font-size: var(--fs-md);
  }
  /* 步进器：− 数值 + */
  .spin {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
  }
  .sb {
    appearance: none;
    width: 22px;
    height: 24px;
    padding: 0;
    min-height: 0;
    line-height: 1;
    font-size: var(--fs-md);
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid var(--line);
    color: var(--muted);
    cursor: pointer;
    touch-action: none;
    user-select: none;
  }
  .sb:hover {
    border-color: rgba(79, 209, 197, 0.6);
    color: var(--cyan);
    background: var(--cyan-dim);
  }
  .sb:active {
    background: var(--cyan-dim);
    color: var(--cyan);
  }
  .val {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    min-height: 0;
    width: 34px;
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--text);
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    cursor: text;
  }
  .val:hover {
    color: var(--gold);
  }
  .num-edit {
    width: 46px;
    height: 24px;
    padding: 0 2px;
    text-align: center;
    font-size: var(--fs-sm);
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    background: #0f1428;
    border: 1px solid rgba(79, 209, 197, 0.7);
    border-radius: var(--r-sm);
    outline: none;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .num-edit::-webkit-outer-spin-button,
  .num-edit::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .dir {
    appearance: none;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    color: var(--cyan);
    font-size: var(--fs-md);
    width: 24px;
    height: 24px;
    padding: 0;
    min-height: 0;
    cursor: pointer;
  }
  .dir:hover {
    border-color: rgba(79, 209, 197, 0.6);
    background: var(--cyan-dim);
  }
  select {
    background: #121829;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    font-size: var(--fs-xs);
    padding: 3px 4px;
    height: 24px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  select:hover {
    border-color: rgba(79, 209, 197, 0.45);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    user-select: none;
  }
  /* 触屏：加大步进按钮热区到 32px */
  @media (pointer: coarse), (max-width: 640px) {
    .sb {
      width: 32px;
      height: 32px;
      font-size: var(--fs-lg);
    }
    .val {
      width: 40px;
      font-size: var(--fs-md);
    }
    .num-edit {
      width: 56px;
      height: 32px;
    }
    .dir {
      width: 32px;
      height: 32px;
    }
    select {
      height: 32px;
      font-size: var(--fs-sm);
    }
  }
</style>
