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

  /** 步进按钮：短按 click（兼容键盘/读屏），长按连发 */
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
        const d = ((n % 360) + 360) % 360;
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

<div class="editor">
  <div class="hd">
    <span class="who">编辑 <b>{CIRCLED[index]}</b></span>
    <button
      type="button"
      class="reset"
      title="复位这根指针的默认参数"
      onclick={() => engine.resetArm(index)}>复位</button
    >
  </div>

  <div class="line">
    <span class="lb">半径</span>
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
        <button type="button" class="val" title="点击输入精确值" onclick={() => beginEdit('r')}
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

  <div class="line">
    <span class="lb">相位</span>
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
          class="val"
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

  <div class="line freq-line">
    <span class="lb">频率</span>
    <select title="旋转频率" value={Math.abs(arm.freq)} onchange={setFreq}>
      {#each freqOptions as f (f)}
        <option value={f}>{f}×</option>
      {/each}
    </select>
    <button
      type="button"
      class="dir"
      class:ccw={arm.freq < 0}
      title={arm.freq < 0
        ? '当前逆时针旋转（紫色，对应频谱负频），点击改为顺时针'
        : '当前顺时针旋转（青色），点击改为逆时针——拟合三叶草/无穷等形状需要逆时针指针'}
      onclick={toggleDir}
    >
      {arm.freq < 0 ? '逆时针' : '顺时针'}
    </button>
  </div>
</div>

<style>
  .editor {
    border: 1px solid rgba(79, 209, 197, 0.35);
    border-radius: var(--r-md);
    background: linear-gradient(170deg, rgba(79, 209, 197, 0.06), rgba(167, 139, 250, 0.04));
    padding: 9px 11px 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-top: 7px;
  }
  .hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .who {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .who b {
    color: var(--cyan);
    font-size: var(--fs-md);
  }
  .reset {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0 4px;
    min-height: 22px;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    border-radius: var(--r-sm);
    cursor: pointer;
    font-family: inherit;
  }
  .reset:hover {
    color: var(--gold);
    background: var(--gold-dim);
    box-shadow: none;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .lb {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    width: 26px;
    flex: 0 0 auto;
  }
  .line input[type='range'] {
    flex: 1;
    min-width: 40px;
  }
  .spin {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
  }
  .sb {
    appearance: none;
    width: 30px;
    height: 30px;
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
  .val {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    min-height: 0;
    min-width: 42px;
    text-align: center;
    font-size: var(--fs-md);
    color: var(--text);
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    cursor: text;
  }
  .val:hover {
    color: var(--gold);
  }
  .num-edit {
    width: 52px;
    height: 30px;
    padding: 0 2px;
    text-align: center;
    font-size: var(--fs-md);
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
  .freq-line select {
    flex: 0 0 auto;
    background: #121829;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    font-size: var(--fs-sm);
    padding: 5px 6px;
    min-height: 30px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .dir {
    flex: 1;
    appearance: none;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    color: var(--cyan);
    font-size: var(--fs-xs);
    min-height: 30px;
    padding: 0 8px;
    cursor: pointer;
    font-family: inherit;
  }
  .dir:hover {
    border-color: rgba(79, 209, 197, 0.6);
    background: var(--cyan-dim);
  }
  .dir.ccw {
    color: var(--purple);
  }
  .dir.ccw:hover {
    border-color: rgba(167, 139, 250, 0.6);
    background: var(--purple-dim);
  }
</style>
