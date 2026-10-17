<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import type { Arm } from '../game/types';
  import { beep } from '../game/audio';
  import { haptic } from '../game/haptics';

  let { index, arm }: { index: number; arm: Arm } = $props();

  const freqOptions = Array.from({ length: 10 }, (_, i) => i + 1);
  const R_MAX = 210;

  let dialEl: SVGSVGElement | undefined = $state();
  let isDraggingDial = $state(false);

  /** 内联编辑状态（点击数值进入，Enter/blur 确认，Esc 取消） */
  let editing: 'r' | 'p' | null = $state(null);
  let draft = $state('');

  const deg = $derived(Math.round((arm.phase * 180) / Math.PI));
  const isCCW = $derived(arm.freq < 0);
  const absFreq = $derived(Math.abs(arm.freq || 1));

  function setR(val: number): void {
    const clamped = Math.max(0, Math.min(R_MAX, Math.round(val)));
    if (clamped !== arm.r) {
      engine.setArm(index, { r: clamped });
      engine.flashArm(index);
    }
  }

  function setPhaseDeg(d: number): void {
    let normalized = Math.round(d) % 360;
    if (normalized < 0) normalized += 360;
    engine.setArm(index, { phase: (normalized * Math.PI) / 180 });
    engine.flashArm(index);
  }

  function setFreqMag(mag: number): void {
    const sign = arm.freq < 0 ? -1 : 1;
    engine.setArm(index, { freq: sign * mag });
    engine.flashArm(index);
    beep(300 + mag * 35, 0.05, 'triangle', 0.08, engine.soundOn);
    haptic(10, engine.soundOn);
  }

  function toggleDir(): void {
    engine.setArm(index, { freq: -(arm.freq || 1) });
    engine.flashArm(index);
    beep(arm.freq < 0 ? 330 : 440, 0.08, 'sawtooth', 0.06, engine.soundOn);
    haptic(16, engine.soundOn);
  }

  /** 360° 宿度仪拖拽运算 */
  function onDialPointerDown(e: PointerEvent): void {
    if (!dialEl) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    isDraggingDial = true;
    updateAngleFromEvent(e);
  }

  function onDialPointerMove(e: PointerEvent): void {
    if (!isDraggingDial) return;
    updateAngleFromEvent(e);
  }

  function onDialPointerUp(e: PointerEvent): void {
    isDraggingDial = false;
  }

  let lastTickAngle = -1;
  function updateAngleFromEvent(e: PointerEvent): void {
    if (!dialEl) return;
    const rect = dialEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let rad = Math.atan2(dy, dx);
    let d = (rad * 180) / Math.PI;
    if (d < 0) d += 360;

    // 四象吸附
    for (const snap of [0, 90, 180, 270, 360]) {
      if (Math.abs(d - snap) < 3.5) {
        d = snap % 360;
        break;
      }
    }

    setPhaseDeg(d);

    const stepTen = Math.floor(d / 15);
    if (stepTen !== lastTickAngle) {
      lastTickAngle = stepTen;
      beep(880, 0.015, 'triangle', 0.03, engine.soundOn);
    }
  }

  /** 步进：短按 click，长按连发 */
  function repeat(fn: () => void) {
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
        }, 300);
      },
      onUp: stop,
      onClick: () => {
        if (!repeatFired) fn();
        repeatFired = false;
      },
    };
  }

  const rMinus = repeat(() => setR(arm.r - 1));
  const rPlus = repeat(() => setR(arm.r + 1));
  const pMinus = repeat(() => setPhaseDeg(deg - 1));
  const pPlus = repeat(() => setPhaseDeg(deg + 1));

  function beginEdit(which: 'r' | 'p'): void {
    editing = which;
    draft = which === 'r' ? String(arm.r) : String(deg);
  }
  function commitEdit(): void {
    const n = Math.round(Number(draft));
    if (Number.isFinite(n)) {
      if (editing === 'r') setR(n);
      else if (editing === 'p') setPhaseDeg(n);
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

<div class="astrolabe-instrument-bay">
  <!-- 顶栏：通道仪表题序与物理读数 -->
  <div class="bay-header">
    <div class="bay-title-wrap">
      <span class="bay-crest">璇玑调谐仪</span>
      <span class="bay-badge">通道 #{index + 1}</span>
    </div>
    <div class="bay-quick-readout">
      <span class="read-chip radius-chip">径 <b>{arm.r}</b><i>px</i></span>
      <span class="read-chip phase-chip">宿 <b>{deg}</b><i>°</i></span>
      <span class="read-chip freq-chip" class:ccw={isCCW}>
        {absFreq}×{isCCW ? '逆天' : '顺天'}
      </span>
    </div>
  </div>

  <!-- 双子机巧仪：左侧周天 360° 罗盘，右侧精密游标伸缩铜尺 -->
  <div class="instruments-split">
    <!-- 仪一：周天 360° 宿度罗盘 (Phase Astrolabe Compass) -->
    <div class="instrument-cell compass-cell">
      <div class="instrument-label">
        <span class="inst-icon">✦</span>
        <span>周天宿度仪</span>
        <span class="inst-sub">PHASE DIAL</span>
      </div>

      <div class="compass-wrap">
        <svg
          bind:this={dialEl}
          class="celestial-compass-svg"
          viewBox="0 0 160 160"
          role="slider"
          aria-label="周天宿度罗盘"
          aria-valuenow={deg}
          aria-valuemin={0}
          aria-valuemax={359}
          tabindex="0"
          onpointerdown={onDialPointerDown}
          onpointermove={onDialPointerMove}
          onpointerup={onDialPointerUp}
          onpointercancel={onDialPointerUp}
          onkeydown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setPhaseDeg(deg + (e.shiftKey ? 10 : 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setPhaseDeg(deg - (e.shiftKey ? 10 : 1));
            }
          }}
        >
          <!-- 外环刻度与黄铜座圈 -->
          <circle cx="80" cy="80" r="76" class="dial-outer-track" />
          <circle cx="80" cy="80" r="70" class="dial-inner-plate" />

          <!-- 刻度线 (每 30° 一大刻，每 10° 一小刻) -->
          {#each Array(36) as _, i}
            {@const a = (i * 10 * Math.PI) / 180}
            {@const isMajor = i % 3 === 0}
            {@const r1 = isMajor ? 62 : 65}
            {@const r2 = 69}
            <line
              x1={80 + r1 * Math.cos(a)}
              y1={80 + r1 * Math.sin(a)}
              x2={80 + r2 * Math.cos(a)}
              y2={80 + r2 * Math.sin(a)}
              class="dial-tick"
              class:major={isMajor}
            />
          {/each}

          <!-- 四象方位金印 (0°/90°/180°/270°) -->
          <text x="142" y="83" class="quadrant-label">0°</text>
          <text x="80" y="145" class="quadrant-label center">90°</text>
          <text x="18" y="83" class="quadrant-label end">180°</text>
          <text x="80" y="23" class="quadrant-label center">270°</text>

          <!-- 动态宿度指针 (Needle) -->
          <g transform={`rotate(${deg}, 80, 80)`} class="compass-needle-group">
            <line x1="80" y1="80" x2="136" y2="80" class="needle-shaft" />
            <polygon points="142,80 130,75 133,80 130,85" class="needle-tip" />
            <circle cx="138" cy="80" r="3.5" class="needle-gem" />
          </g>

          <!-- 轴心青铜印钮 -->
          <circle cx="80" cy="80" r="26" class="center-hub-bg" />
          <circle cx="80" cy="80" r="24" class="center-hub-ring" />
        </svg>

        <!-- 轴心数值交互按钮 -->
        <div class="compass-center-display">
          {#if editing === 'p'}
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="dial-input"
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
              class="dial-val-btn"
              title="点击手动输入角度"
              onclick={() => beginEdit('p')}
            >
              <b class="dial-deg-num">{deg}</b>
              <span class="dial-deg-unit">°</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- 四极快速卡准按纽与微步进 -->
      <div class="cardinal-snaps">
        <button
          type="button"
          class="snap-btn"
          class:active={deg === 0}
          onclick={() => setPhaseDeg(0)}>0°</button
        >
        <button
          type="button"
          class="snap-btn"
          class:active={deg === 90}
          onclick={() => setPhaseDeg(90)}>90°</button
        >
        <button
          type="button"
          class="snap-btn"
          class:active={deg === 180}
          onclick={() => setPhaseDeg(180)}>180°</button
        >
        <button
          type="button"
          class="snap-btn"
          class:active={deg === 270}
          onclick={() => setPhaseDeg(270)}>270°</button
        >
        <div class="stepper-pair">
          <button
            type="button"
            class="mini-step"
            onpointerdown={pMinus.onDown}
            onpointerup={pMinus.onUp}
            onclick={pMinus.onClick}>−</button
          >
          <button
            type="button"
            class="mini-step"
            onpointerdown={pPlus.onDown}
            onpointerup={pPlus.onUp}
            onclick={pPlus.onClick}>+</button
          >
        </div>
      </div>
    </div>

    <!-- 仪二：周径伸缩铜尺 (Radius Vernier Caliper) -->
    <div class="instrument-cell vernier-cell">
      <div class="instrument-label">
        <span class="inst-icon">◈</span>
        <span>周径游标规</span>
        <span class="inst-sub">RADIUS CALIPER</span>
      </div>

      <!-- 游标铜尺读数台 -->
      <div class="vernier-meter">
        <div class="vernier-readout-wrap">
          <span class="meter-name">律臂半径</span>
          {#if editing === 'r'}
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="vernier-input"
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
              class="vernier-val-btn"
              title="点击手动输入半径"
              onclick={() => beginEdit('r')}
            >
              <b class="vernier-val-num">{arm.r}</b>
              <span class="vernier-val-unit">px</span>
            </button>
          {/if}
        </div>

        <div class="meter-steppers">
          <button
            type="button"
            class="gear-step-btn"
            title="半径 −1"
            onpointerdown={rMinus.onDown}
            onpointerup={rMinus.onUp}
            onpointerleave={rMinus.onUp}
            onclick={rMinus.onClick}
          >
            −
          </button>
          <button
            type="button"
            class="gear-step-btn"
            title="半径 +1"
            onpointerdown={rPlus.onDown}
            onpointerup={rPlus.onUp}
            onpointerleave={rPlus.onUp}
            onclick={rPlus.onClick}
          >
            +
          </button>
        </div>
      </div>

      <!-- 仿古黄铜游标拉尺滑轨 -->
      <div class="vernier-track-container">
        <div class="vernier-brass-ruler">
          <div class="ruler-laser-line" style={`width: ${(arm.r / R_MAX) * 100}%`}></div>
          <div class="ruler-hash-marks"></div>
          <input
            type="range"
            min="0"
            max={R_MAX}
            step="1"
            value={arm.r}
            oninput={(e) => setR(+e.currentTarget.value)}
            class="vernier-range-slider"
            title="拖动调整周径"
          />
        </div>
        <div class="ruler-milestones">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>210px</span>
        </div>
      </div>

      <!-- 仪三：天行档位齿轮箱与顺逆拨杆 -->
      <div class="gearbox-section">
        <div class="gearbox-meta">
          <div class="gear-title">
            <span class="gear-dot">⚙</span>
            <span>天行谐波倍率</span>
          </div>
          <!-- 顺逆玄极机械拨杆 -->
          <button
            type="button"
            class="polarity-lever"
            class:ccw={isCCW}
            title={isCCW ? '当前为逆天旋转，点击拨为顺天' : '当前为顺天旋转，点击拨为逆天'}
            onclick={toggleDir}
          >
            <span class="lever-knob"></span>
            <span class="lever-label">{isCCW ? '↺ 逆天' : '↻ 顺天'}</span>
          </button>
        </div>

        <!-- 10 阶黄铜档位按键 -->
        <div class="gear-matrix">
          {#each freqOptions as f}
            {@const active = absFreq === f}
            <button
              type="button"
              class="gear-tooth"
              class:active
              class:ccw={active && isCCW}
              title={`切至 ${f}× 谐波`}
              onclick={() => setFreqMag(f)}
            >
              <span class="tooth-num">{f}×</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .astrolabe-instrument-bay {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: linear-gradient(180deg, rgba(16, 23, 40, 0.95) 0%, rgba(8, 12, 22, 0.98) 100%);
    border: 1px solid rgba(245, 184, 65, 0.3);
    border-radius: 14px;
    padding: 12px 14px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 8px 24px rgba(0, 0, 0, 0.6);
  }

  .bay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(245, 184, 65, 0.16);
  }
  .bay-title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bay-crest {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2px;
  }
  .bay-badge {
    font-size: 10px;
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.15);
    border: 1px solid rgba(245, 184, 65, 0.35);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }
  .bay-quick-readout {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .read-chip {
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    padding: 2px 7px;
    border-radius: 4px;
    background: #060912;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--muted);
  }
  .read-chip b {
    color: #fff;
    margin: 0 2px;
  }
  .read-chip.radius-chip b {
    color: var(--gold-bright);
  }
  .read-chip.phase-chip b {
    color: var(--cyan);
  }
  .read-chip.freq-chip {
    color: var(--cyan);
    border-color: rgba(0, 245, 212, 0.3);
  }
  .read-chip.freq-chip.ccw {
    color: var(--purple);
    border-color: rgba(167, 139, 250, 0.3);
  }

  /* 分栏仪表台 */
  .instruments-split {
    display: grid;
    grid-template-columns: 136px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  @media (max-width: 640px) {
    .instruments-split {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  .instrument-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .instrument-label {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--gold-bright);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    letter-spacing: 1px;
  }
  .inst-sub {
    font-size: 8px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* 360° 罗盘容器 */
  .compass-wrap {
    position: relative;
    width: 124px;
    height: 124px;
    margin: 0 auto;
    user-select: none;
    touch-action: none;
  }
  .celestial-compass-svg {
    width: 100%;
    height: 100%;
    cursor: grab;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.7));
  }
  .celestial-compass-svg:active {
    cursor: grabbing;
  }
  .dial-outer-track {
    fill: #060912;
    stroke: rgba(245, 184, 65, 0.35);
    stroke-width: 1.5;
  }
  .dial-inner-plate {
    fill: #0a0f1d;
    stroke: rgba(245, 184, 65, 0.15);
    stroke-width: 1;
  }
  .dial-tick {
    stroke: rgba(245, 184, 65, 0.3);
    stroke-width: 1;
  }
  .dial-tick.major {
    stroke: var(--gold-bright);
    stroke-width: 1.8;
  }
  .quadrant-label {
    font-size: 8px;
    fill: rgba(245, 184, 65, 0.6);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }
  .quadrant-label.center {
    text-anchor: middle;
  }
  .quadrant-label.end {
    text-anchor: end;
  }

  .compass-needle-group {
    transition: transform 0.05s ease-out;
  }
  .needle-shaft {
    stroke: #ffd700;
    stroke-width: 2.5;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px rgba(245, 184, 65, 0.8));
  }
  .needle-tip {
    fill: #ffd700;
  }
  .needle-gem {
    fill: #00f5d4;
    stroke: #fff;
    stroke-width: 1;
    filter: drop-shadow(0 0 6px #00f5d4);
  }

  .center-hub-bg {
    fill: #0c1222;
  }
  .center-hub-ring {
    fill: #141c30;
    stroke: rgba(245, 184, 65, 0.4);
    stroke-width: 1.5;
  }

  .compass-center-display {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: auto;
  }
  .dial-val-btn {
    appearance: none;
    background: transparent;
    border: none;
    color: #fff;
    display: flex;
    align-items: baseline;
    cursor: pointer;
    padding: 4px;
  }
  .dial-deg-num {
    font-size: 15px;
    color: var(--cyan);
    font-family: 'JetBrains Mono', monospace;
    text-shadow: 0 0 8px rgba(0, 245, 212, 0.6);
  }
  .dial-deg-unit {
    font-size: 11px;
    color: var(--muted);
  }
  .dial-input {
    width: 44px;
    height: 24px;
    background: #000;
    border: 1px solid var(--gold-bright);
    color: var(--cyan);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    text-align: center;
    border-radius: 4px;
    outline: none;
  }

  .cardinal-snaps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 4px;
  }
  .snap-btn {
    appearance: none;
    background: rgba(16, 23, 40, 0.8);
    border: 1px solid rgba(245, 184, 65, 0.2);
    border-radius: 4px;
    color: var(--muted);
    font-size: 10px;
    padding: 2px 5px;
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    transition: all 0.12s;
  }
  .snap-btn:hover,
  .snap-btn.active {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.15);
  }
  .stepper-pair {
    display: flex;
    gap: 2px;
    margin-left: 4px;
  }
  .mini-step {
    appearance: none;
    background: #141c30;
    border: 1px solid rgba(245, 184, 65, 0.25);
    border-radius: 3px;
    color: var(--text);
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
  }
  .mini-step:active {
    transform: scale(0.92);
  }

  /* 游标拉尺 */
  .vernier-meter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #080d1a;
    border: 1px solid rgba(245, 184, 65, 0.22);
    border-radius: 8px;
    padding: 6px 12px;
  }
  .vernier-readout-wrap {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .meter-name {
    font-size: 12px;
    color: var(--muted);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .vernier-val-btn {
    appearance: none;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: baseline;
    gap: 2px;
  }
  .vernier-val-num {
    font-size: 18px;
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    text-shadow: 0 0 10px rgba(245, 184, 65, 0.5);
  }
  .vernier-val-unit {
    font-size: 10px;
    color: var(--muted);
  }
  .vernier-input {
    width: 50px;
    height: 24px;
    background: #000;
    border: 1px solid var(--gold-bright);
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    text-align: center;
    border-radius: 4px;
    outline: none;
  }

  .meter-steppers {
    display: flex;
    gap: 4px;
  }
  .gear-step-btn {
    appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 5px;
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid rgba(245, 184, 65, 0.35);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.1s;
  }
  .gear-step-btn:hover {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
  }
  .gear-step-btn:active {
    transform: translateY(1px);
  }

  /* 游标铜尺滑轨 */
  .vernier-track-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .vernier-brass-ruler {
    position: relative;
    height: 24px;
    background: #050812;
    border: 1px solid rgba(245, 184, 65, 0.3);
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 4px;
    overflow: hidden;
  }
  .ruler-laser-line {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, rgba(245, 184, 65, 0.15) 0%, rgba(245, 184, 65, 0.4) 100%);
    border-right: 2px solid var(--gold-bright);
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.5);
    pointer-events: none;
  }
  .ruler-hash-marks {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to right,
      rgba(245, 184, 65, 0.25) 0px,
      rgba(245, 184, 65, 0.25) 1px,
      transparent 1px,
      transparent 10px
    );
  }
  .vernier-range-slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: ew-resize;
    z-index: 3;
    margin: 0;
  }
  .ruler-milestones {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    padding: 0 4px;
  }

  /* 档位齿轮箱 */
  .gearbox-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #070c18;
    border: 1px solid rgba(245, 184, 65, 0.2);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .gearbox-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .gear-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #fff;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .gear-dot {
    color: var(--gold-bright);
    font-size: 13px;
  }

  .polarity-lever {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 14px;
    background: rgba(0, 245, 212, 0.12);
    border: 1.5px solid rgba(0, 245, 212, 0.4);
    color: var(--cyan);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
  }
  .polarity-lever .lever-knob {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 6px var(--cyan);
    transition: all 0.15s ease;
  }
  .polarity-lever.ccw {
    background: rgba(167, 139, 250, 0.15);
    border-color: rgba(167, 139, 250, 0.5);
    color: var(--purple);
  }
  .polarity-lever.ccw .lever-knob {
    background: var(--purple);
    box-shadow: 0 0 6px var(--purple);
  }

  .gear-matrix {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
  }
  .gear-tooth {
    appearance: none;
    height: 32px;
    border-radius: 4px;
    background: linear-gradient(180deg, #182235 0%, #0c1220 100%);
    border: 1px solid rgba(245, 184, 65, 0.2);
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.12s;
  }
  .gear-tooth:hover {
    border-color: rgba(245, 184, 65, 0.5);
    color: #fff;
  }
  .gear-tooth.active {
    background: linear-gradient(180deg, #382909 0%, #1a1304 100%);
    border-color: #ffd700;
    color: #ffd700;
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.4);
    transform: translateY(1px);
  }
  .gear-tooth.active.ccw {
    background: linear-gradient(180deg, #2b1742 0%, #140b20 100%);
    border-color: #a78bfa;
    color: #a78bfa;
    box-shadow: 0 0 10px rgba(167, 139, 250, 0.4);
  }
</style>
