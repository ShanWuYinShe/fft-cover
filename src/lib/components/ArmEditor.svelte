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

<div class="editor-card">
  <!-- 半径卡槽 (双层贯穿式高精度结构) -->
  <div class="param-block">
    <div class="param-meta">
      <div class="param-title-wrap">
        <span class="param-lbl">半径</span>
        <span class="eng-lbl">RADIUS</span>
      </div>
      <div class="param-stepper">
        <button
          type="button"
          class="sb"
          title="半径 −1"
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
          <button type="button" class="val" title="点击直接输入" onclick={() => beginEdit('r')}>
            <b class="val-num">{arm.r}</b><span class="val-unit">px</span>
          </button>
        {/if}
        <button
          type="button"
          class="sb"
          title="半径 +1"
          onpointerdown={rPlus.onDown}
          onpointerup={rPlus.onUp}
          onpointerleave={rPlus.onUp}
          onpointercancel={rPlus.onUp}
          onclick={rPlus.onClick}>+</button
        >
      </div>
    </div>
    <div class="slider-track-wrap">
      <input
        type="range"
        min="0"
        max={R_MAX}
        step="1"
        value={arm.r}
        oninput={setR}
        title="半径推子"
        class="laser-slider"
      />
      <div class="ruler-marks"></div>
    </div>
  </div>

  <!-- 相位卡槽 (双层带角度刻度尺) -->
  <div class="param-block">
    <div class="param-meta">
      <div class="param-title-wrap">
        <span class="param-lbl">相位</span>
        <span class="eng-lbl">PHASE</span>
      </div>
      <div class="degree-snaps">
        <span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span>
      </div>
      <div class="param-stepper">
        <button
          type="button"
          class="sb"
          title="相位 −1°"
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
          <button type="button" class="val" title="点击直接输入角度" onclick={() => beginEdit('p')}>
            <b class="val-num">{deg}</b><span class="val-unit">°</span>
          </button>
        {/if}
        <button
          type="button"
          class="sb"
          title="相位 +1°"
          onpointerdown={pPlus.onDown}
          onpointerup={pPlus.onUp}
          onpointerleave={pPlus.onUp}
          onpointercancel={pPlus.onUp}
          onclick={pPlus.onClick}>+</button
        >
      </div>
    </div>
    <div class="slider-track-wrap">
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        value={deg}
        oninput={setPhase}
        title="相位推子"
        class="laser-slider"
      />
    </div>
  </div>

  <!-- 频率与极性：一体化金属琴键 + 翻转拨杆 -->
  <div class="param-block freq-block">
    <div class="freq-header">
      <div class="param-title-wrap">
        <span class="param-lbl">频率</span>
        <span class="eng-lbl">FREQ</span>
      </div>
      <button
        type="button"
        class="dir-toggle"
        class:ccw={arm.freq < 0}
        title={arm.freq < 0 ? '当前逆时针，点击切顺时针' : '当前顺时针，点击切逆时针'}
        onclick={toggleDir}
      >
        <span class="dir-dot"></span>
        <span class="dir-txt">{arm.freq < 0 ? '↺ 逆时针' : '↻ 顺时针'}</span>
      </button>
    </div>
    <div class="freq-matrix" role="radiogroup" aria-label="旋转频率档位">
      {#each freqOptions as f (f)}
        <button
          type="button"
          class="freq-key"
          class:active={Math.abs(arm.freq) === f}
          class:ccw={arm.freq < 0}
          aria-checked={Math.abs(arm.freq) === f}
          role="radio"
          title="{f}× 旋转频率"
          onclick={() => {
            engine.setArm(index, { freq: Math.sign(arm.freq || 1) * f });
            engine.flashArm(index);
          }}
        >
          {f}×
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .editor-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    background: #0f131c;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  /* 参数单块：扁平底盘 + 1px 淡分割线，消除套娃框 */
  .param-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 0 3px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .param-block:last-child {
    border-bottom: none;
    padding-bottom: 1px;
  }

  /* 上半层：标题在左，步进读数在右 */
  .param-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 19px;
  }

  .param-title-wrap {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
  }
  .param-lbl {
    font-size: 11px;
    font-weight: 600;
    color: #cbd5e1;
    letter-spacing: 0.5px;
  }
  .eng-lbl {
    font-size: 8px;
    font-weight: 500;
    color: #64748b;
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  /* 角度刻度吸附标签 */
  .degree-snaps {
    display: flex;
    gap: 10px;
    font-size: 8px;
    color: #64748b;
    font-family: monospace;
    user-select: none;
  }

  /* 下半层：全宽滑轨（占满 100% 容器宽度，手感翻倍） */
  .slider-track-wrap {
    position: relative;
    height: 16px;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .ruler-marks {
    position: absolute;
    inset: 4px 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to right,
      rgba(255, 255, 255, 0.08) 0px,
      rgba(255, 255, 255, 0.08) 1px,
      transparent 1px,
      transparent 10%
    );
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 1;
  }

  /* 激光游标滑块 */
  .laser-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    background: #080b12;
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.85);
    outline: none;
    position: relative;
    z-index: 2;
    margin: 0;
    cursor: pointer;
  }

  /* 菱形切角精密激光游标拨片（彻底干掉大白圆球！） */
  .laser-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 16px;
    background: #111a2e;
    border: 1.5px solid #00f5d4;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(0, 245, 212, 0.45), inset 0 0 3px rgba(0, 245, 212, 0.3);
    cursor: ew-resize;
    transition: transform 0.08s ease, border-color 0.1s ease;
  }
  .laser-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    border-color: #38bdf8;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.65);
  }
  .laser-slider::-moz-range-thumb {
    width: 12px;
    height: 16px;
    background: #111a2e;
    border: 1.5px solid #00f5d4;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(0, 245, 212, 0.45);
    cursor: ew-resize;
  }

  /* 步进器 */
  .param-stepper {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .sb {
    appearance: none;
    width: 19px;
    height: 19px;
    padding: 0;
    min-height: 0;
    line-height: 1;
    font-size: 11px;
    font-weight: 700;
    border-radius: 3px;
    background: #161e2e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    cursor: pointer;
    touch-action: none;
    user-select: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
  }
  .sb:hover {
    border-color: rgba(0, 245, 212, 0.4);
    color: #00f5d4;
    background: #1e293b;
  }
  .sb:active {
    transform: translateY(1px);
  }

  .val {
    appearance: none;
    background: #080b12;
    border: 1px solid rgba(0, 245, 212, 0.2);
    border-radius: 3px;
    padding: 0 4px;
    height: 19px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    cursor: pointer;
    transition: all 0.1s ease;
  }
  .val:hover {
    border-color: #00f5d4;
    box-shadow: 0 0 6px rgba(0, 245, 212, 0.2);
  }
  .val-num {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    font-weight: 700;
    color: #00f5d4;
  }
  .val-unit {
    font-size: 9px;
    color: #64748b;
  }

  .num-edit {
    width: 44px;
    height: 19px;
    padding: 0 2px;
    background: #000;
    border: 1px solid #00f5d4;
    border-radius: 3px;
    color: #00f5d4;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    text-align: center;
    outline: none;
  }

  /* 频率行 */
  .freq-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 19px;
  }

  .dir-toggle {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 18px;
    padding: 0 6px;
    border-radius: 3px;
    background: #141c2c;
    border: 1px solid rgba(0, 245, 212, 0.25);
    color: #00f5d4;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.1s ease;
  }
  .dir-toggle.ccw {
    border-color: rgba(168, 85, 247, 0.35);
    color: #c084fc;
    background: #1e152e;
  }
  .dir-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #00f5d4;
    box-shadow: 0 0 4px #00f5d4;
  }
  .dir-toggle.ccw .dir-dot {
    background: #c084fc;
    box-shadow: 0 0 4px #c084fc;
  }

  /* 频率 10 阶一体式金属琴键 */
  .freq-matrix {
    display: flex;
    width: 100%;
    border-radius: 3px;
    overflow: hidden;
    background: #090c14;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .freq-key {
    appearance: none;
    flex: 1;
    min-width: 0;
    height: 20px;
    border: none;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    background: transparent;
    color: #64748b;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.08s ease;
  }
  .freq-key:last-child {
    border-right: none;
  }
  .freq-key:hover {
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.04);
  }
  .freq-key.active {
    background: #00f5d4;
    color: #050b14;
    font-weight: 700;
    box-shadow: 0 0 8px rgba(0, 245, 212, 0.5);
  }
  .freq-key.active.ccw {
    background: #a855f7;
    color: #050b14;
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
  }
</style>
