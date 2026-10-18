<script lang="ts">
  import Icon from './Icon.svelte';
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
  /** 通道编号：机箱铭牌上的两位通道号 */
  const channelNo = $derived(String(index + 1).padStart(2, '0'));

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

<!-- 璇玑调谐仪：装甲面板外壳 + 三块嵌入式仪表凹槽 -->
<section class="tune-bay g-plate g-plate--lit g-corners" aria-labelledby="tune-title">
  <span class="g-corner tl" aria-hidden="true"></span>
  <span class="g-corner tr" aria-hidden="true"></span>
  <span class="g-corner bl" aria-hidden="true"></span>
  <span class="g-corner br" aria-hidden="true"></span>

  <!-- 铭牌头：段头小铭牌 + 通道号 + 三枚快速读数 -->
  <header class="bay-head">
    <div class="bay-ident">
      <span class="bay-gem" aria-hidden="true"><Icon name="sliders" size={12} /></span>
      <h3 id="tune-title" class="g-label bay-title">璇玑调谐仪</h3>
      <span class="bay-ch">CH {channelNo}</span>
    </div>
    <div class="bay-quick-readout">
      <span class="read-chip">
        <i>径</i><b class="g-num read-num">{arm.r}</b><em>px</em>
      </span>
      <span class="read-chip">
        <i>宿</i><b class="g-num read-num phase-num">{deg}</b><em>°</em>
      </span>
      <span class="read-chip" class:ccw={isCCW}>
        <b class="g-num read-num freq-num">{absFreq}×</b><em>{isCCW ? '逆' : '顺'}</em>
      </span>
    </div>
  </header>

  <hr class="g-divider bay-divider" />

  <!-- 仪一：周天 360° 宿度罗盘 (Phase Astrolabe Compass) -->
  <div class="instrument g-inset phase-instrument">
    <div class="inst-head">
      <span class="inst-icon" aria-hidden="true"><Icon name="compass" size={12} /></span>
      <span class="g-label inst-title">周天宿度仪</span>
      <span class="inst-sub">PHASE DIAL</span>
      <span class="g-lamp g-lamp--cyan inst-lamp" aria-hidden="true"></span>
    </div>

    <div class="phase-body">
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
          <circle cx="80" cy="80" r="29" class="center-hub-bg" />
          <circle cx="80" cy="80" r="27" class="center-hub-ring" />
        </svg>

        <!-- 轴心数值交互按钮（大号读数，点按可直接输入） -->
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
              <b class="g-num dial-deg-num">{deg}</b>
              <span class="dial-deg-unit">°</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- 右侧：四象快速卡准 + 微步进物理键 -->
      <div class="phase-side">
        <div class="snap-grid">
          <button
            type="button"
            class="g-btn snap-key"
            class:active={deg === 0}
            onclick={() => setPhaseDeg(0)}>0°</button
          >
          <button
            type="button"
            class="g-btn snap-key"
            class:active={deg === 90}
            onclick={() => setPhaseDeg(90)}>90°</button
          >
          <button
            type="button"
            class="g-btn snap-key"
            class:active={deg === 180}
            onclick={() => setPhaseDeg(180)}>180°</button
          >
          <button
            type="button"
            class="g-btn snap-key"
            class:active={deg === 270}
            onclick={() => setPhaseDeg(270)}>270°</button
          >
        </div>
        <div class="micro-row">
          <span class="g-label g-label--dim micro-label">微调</span>
          <button
            type="button"
            class="g-btn g-btn--icon step-key"
            title="相位 −1°（长按连发）"
            onpointerdown={pMinus.onDown}
            onpointerup={pMinus.onUp}
            onpointerleave={pMinus.onUp}
            onclick={pMinus.onClick}><Icon name="minus" size={16} /></button
          >
          <button
            type="button"
            class="g-btn g-btn--icon step-key"
            title="相位 +1°（长按连发）"
            onpointerdown={pPlus.onDown}
            onpointerup={pPlus.onUp}
            onpointerleave={pPlus.onUp}
            onclick={pPlus.onClick}><Icon name="plus" size={16} /></button
          >
        </div>
      </div>
    </div>
  </div>

  <!-- 仪二：周径伸缩铜尺 (Radius Vernier Caliper) -->
  <div class="instrument g-inset radius-instrument">
    <div class="inst-head">
      <span class="inst-icon" aria-hidden="true"><Icon name="ruler" size={12} /></span>
      <span class="g-label inst-title">周径游标规</span>
      <span class="inst-sub">RADIUS CALIPER</span>
      <span class="g-lamp inst-lamp" aria-hidden="true"></span>
      <div class="radius-readout">
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
            <b class="g-num radius-num">{arm.r}</b>
            <span class="radius-unit">px</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- 游标铜尺滑轨：− 键 | 凹槽滑轨（原生 range + 金色立方滑块） | + 键 -->
    <div class="radius-rail">
      <button
        type="button"
        class="g-btn g-btn--icon step-key rail-key"
        title="半径 −1"
        onpointerdown={rMinus.onDown}
        onpointerup={rMinus.onUp}
        onpointerleave={rMinus.onUp}
        onclick={rMinus.onClick}
      >
        <Icon name="minus" size={17} />
      </button>

      <div class="vernier-track-container">
        <div class="vernier-groove">
          <div class="ruler-fill" style={`width: ${(arm.r / R_MAX) * 100}%`}></div>
          <div class="ruler-hash-marks" aria-hidden="true"></div>
          <input
            type="range"
            min="0"
            max={R_MAX}
            step="1"
            value={arm.r}
            oninput={(e) => setR(+e.currentTarget.value)}
            class="vernier-range-slider"
            title="拖动调整周径"
            aria-label="律臂半径"
          />
        </div>
        <div class="ruler-milestones" aria-hidden="true">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>210px</span>
        </div>
      </div>

      <button
        type="button"
        class="g-btn g-btn--icon step-key rail-key"
        title="半径 +1"
        onpointerdown={rPlus.onDown}
        onpointerup={rPlus.onUp}
        onpointerleave={rPlus.onUp}
        onclick={rPlus.onClick}
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  </div>

  <!-- 仪三：天行谐波倍率齿轮箱与顺逆拨杆 -->
  <div class="instrument g-inset freq-instrument">
    <div class="inst-head">
      <span class="inst-icon" aria-hidden="true"><Icon name="gear" size={12} /></span>
      <span class="g-label inst-title">天行谐波倍率</span>
      <span class="inst-sub">HARMONIC GEARBOX</span>
      <span class="g-lamp g-lamp--cyan inst-lamp" aria-hidden="true"></span>
      <!-- 顺逆玄极机械拨杆 -->
      <button
        type="button"
        class="polarity-lever"
        class:ccw={isCCW}
        title={isCCW ? '当前为逆天旋转，点击拨为顺天' : '当前为顺天旋转，点击拨为逆天'}
        onclick={toggleDir}
      >
        <span class="lever-knob" aria-hidden="true"></span>
        <span class="lever-label">
          <Icon name={isCCW ? 'undo' : 'refresh'} size={13} />
          {isCCW ? '逆天' : '顺天'}
        </span>
      </button>
    </div>

    <!-- 10 阶黄铜档位按键：5×2 物理键盘 -->
    <div class="gear-matrix">
      {#each freqOptions as f}
        {@const active = absFreq === f}
        <button
          type="button"
          class="g-btn gear-key"
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
</section>

<style>
  /* ============================================================
   * 璇玑调谐仪 · 机箱仪表台
   * 结构：装甲面板(g-plate) 内嵌三块凹槽(g-inset)仪表：
   *   周天宿度仪（罗盘）/ 周径游标规（滑轨）/ 天行谐波倍率（档位键）
   * 所有按键都是「有厚度」的物理键；读数用 .g-num 大号发光。
   * ============================================================ */
  .tune-bay {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 9px;
    min-width: 0;
  }

  /* ---------- 铭牌头 ---------- */
  .bay-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .bay-ident {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .bay-gem {
    display: inline-flex;
    align-items: center;
    color: var(--gold-bright);
    font-size: 11px;
    text-shadow: 0 0 8px rgba(245, 184, 65, 0.8);
  }
  .bay-title {
    margin: 0;
    font-size: 12px;
    letter-spacing: 2px;
    white-space: nowrap;
  }
  .bay-ch {
    padding: 1px 6px;
    border: 1px solid var(--edge-soft);
    border-radius: 4px;
    background: rgba(4, 7, 14, 0.72);
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .bay-quick-readout {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .read-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    padding: 2px 6px 3px;
    border: 1px solid var(--edge-faint);
    border-radius: 5px;
    background: rgba(4, 7, 14, 0.72);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
  }
  .read-chip i {
    font-style: normal;
    font-size: 9px;
    letter-spacing: 0.5px;
    color: var(--muted-2);
  }
  .read-chip .read-num {
    font-size: 14px;
    line-height: 1.2;
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
  }
  .read-chip .phase-num {
    color: var(--cyan);
    text-shadow: 0 0 10px rgba(0, 245, 212, 0.45);
  }
  .read-chip em {
    font-style: normal;
    font-size: 9px;
    color: var(--muted-2);
  }
  .read-chip.ccw .freq-num {
    color: var(--purple);
    text-shadow: 0 0 10px rgba(167, 139, 250, 0.45);
  }

  .bay-divider {
    margin: 0;
  }

  /* ---------- 仪表凹槽通用 ---------- */
  .instrument {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 7px 8px 8px;
    min-width: 0;
  }
  .inst-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .inst-icon {
    display: inline-flex;
    align-items: center;
    color: var(--gold-bright);
    font-size: 10px;
    line-height: 1;
    text-shadow: 0 0 6px rgba(245, 184, 65, 0.7);
    flex: 0 0 auto;
  }
  .inst-title {
    font-size: 10px;
    letter-spacing: 1.6px;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .inst-sub {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 8px;
    letter-spacing: 1px;
    color: var(--muted-2);
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
  }
  .inst-head .inst-lamp {
    flex: 0 0 auto;
  }

  /* ---------- 仪一：周天宿度仪 ---------- */
  .phase-body {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 9px;
    align-items: center;
  }
  .compass-wrap {
    position: relative;
    width: 120px;
    height: 120px;
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
    fill: #05080f;
    stroke: var(--edge);
    stroke-width: 1.5;
  }
  .dial-inner-plate {
    fill: #0a101c;
    stroke: var(--edge-faint);
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
    fill: #0b1120;
  }
  .center-hub-ring {
    fill: #121b2c;
    stroke: var(--edge);
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    width: 46px;
    height: 46px;
    padding: 0 0 1px;
    border-radius: 50%;
    border: 1px solid rgba(0, 245, 212, 0.35);
    background: radial-gradient(circle at 50% 32%, rgba(0, 245, 212, 0.16), rgba(4, 7, 14, 0.94));
    box-shadow:
      var(--bevel-inset),
      0 0 12px rgba(0, 245, 212, 0.25);
    cursor: pointer;
  }
  .compass-center-display .dial-deg-num {
    font-size: 16px;
    font-family: 'JetBrains Mono', monospace;
    color: var(--cyan);
    text-shadow: 0 0 14px rgba(0, 245, 212, 0.6);
  }
  .dial-deg-unit {
    font-size: 10px;
    color: var(--muted-2);
  }
  .dial-input {
    width: 62px;
    height: 38px;
    padding: 0;
    background: var(--metal-deep);
    border: 1px solid var(--edge-hot);
    border-radius: 8px;
    color: var(--cyan);
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    text-align: center;
    outline: none;
    box-shadow:
      var(--bevel-inset),
      0 0 12px rgba(0, 245, 212, 0.35);
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .dial-input::-webkit-outer-spin-button,
  .dial-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .phase-side {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .snap-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .snap-key {
    height: 40px;
    min-height: 40px;
    padding: 0;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.5px;
    border-radius: 8px;
  }
  .snap-key.active {
    background: rgba(0, 245, 212, 0.14);
    border-color: var(--cyan-line);
    color: var(--cyan);
    box-shadow:
      var(--bevel-top),
      inset 0 -2px 0 rgba(0, 0, 0, 0.5),
      0 0 14px rgba(0, 245, 212, 0.3);
  }
  .snap-key.active:hover:not(:disabled) {
    color: var(--cyan);
    border-color: var(--cyan);
  }

  .micro-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .micro-label {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
  }
  .step-key {
    width: 42px;
    min-width: 42px;
    height: 42px;
    font-size: 17px;
    font-weight: 700;
    border-radius: 9px;
    flex: 0 0 auto;
  }

  /* ---------- 仪二：周径游标规 ---------- */
  .radius-readout {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }
  .vernier-val-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    min-height: 34px;
    padding: 1px 7px;
    border: 1px solid var(--edge-soft);
    border-radius: 6px;
    background: rgba(4, 7, 14, 0.72);
    box-shadow: var(--bevel-inset);
    cursor: pointer;
  }
  .radius-num {
    font-size: 26px;
    line-height: 1.1;
    font-family: 'JetBrains Mono', monospace;
    color: var(--gold-bright);
    text-shadow: 0 0 18px rgba(245, 184, 65, 0.55);
  }
  .radius-unit {
    font-size: 9px;
    color: var(--muted-2);
  }
  .vernier-input {
    width: 72px;
    height: 38px;
    padding: 0;
    background: var(--metal-deep);
    border: 1px solid var(--edge-hot);
    border-radius: 6px;
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    text-align: center;
    outline: none;
    box-shadow:
      var(--bevel-inset),
      0 0 12px rgba(245, 184, 65, 0.35);
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .vernier-input::-webkit-outer-spin-button,
  .vernier-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .radius-rail {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .rail-key {
    flex: 0 0 auto;
  }

  /* 游标铜尺滑轨：凹槽 + 金色立方滑块（跨浏览器） */
  .vernier-track-container {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .vernier-groove {
    position: relative;
    height: 44px;
    border-radius: 8px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(2, 4, 9, 0.96), rgba(9, 14, 26, 0.92));
    border: 1px solid var(--edge-soft);
    box-shadow: var(--bevel-inset);
  }
  .ruler-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(90deg, rgba(245, 184, 65, 0.07) 0%, rgba(245, 184, 65, 0.26) 100%);
    border-right: 2px solid var(--edge-hot);
    box-shadow: 0 0 12px rgba(245, 184, 65, 0.4);
    pointer-events: none;
  }
  .ruler-hash-marks {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to right,
      rgba(245, 184, 65, 0.22) 0px,
      rgba(245, 184, 65, 0.22) 1px,
      transparent 1px,
      transparent 10px
    );
  }
  .ruler-milestones {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
    font-size: 9px;
    line-height: 1;
    color: var(--muted-2);
    font-family: 'JetBrains Mono', monospace;
  }

  /* 原生 range：两条轨道都透明，视觉轨道由上面的凹槽承担；
     滑块是金色立方，WebKit 与 Firefox 分别声明。 */
  .vernier-range-slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
    cursor: ew-resize;
    z-index: 2;
    touch-action: pan-y;
  }
  /* WebKit / Blink */
  .vernier-range-slider::-webkit-slider-runnable-track {
    height: 100%;
    background: transparent;
    border: none;
  }
  .vernier-range-slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 22px;
    height: 34px;
    margin-top: 5px;
    border-radius: 5px;
    border: 1px solid #ffe7a3;
    background: linear-gradient(180deg, #ffe7a3 0%, #f7c250 45%, #d69214 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.65),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 rgba(0, 0, 0, 0.55),
      0 0 12px rgba(245, 184, 65, 0.5);
    cursor: grab;
  }
  .vernier-range-slider:active::-webkit-slider-thumb {
    cursor: grabbing;
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.4),
      inset 0 -1px 0 rgba(140, 80, 0, 0.4),
      0 1px 0 rgba(0, 0, 0, 0.5),
      0 0 16px rgba(245, 184, 65, 0.75);
  }
  .vernier-range-slider:focus-visible::-webkit-slider-thumb {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.65),
      0 0 0 2px var(--cyan),
      0 0 16px rgba(245, 184, 65, 0.7);
  }
  /* Firefox */
  .vernier-range-slider::-moz-range-track {
    height: 100%;
    background: transparent;
    border: none;
  }
  .vernier-range-slider::-moz-range-thumb {
    width: 22px;
    height: 34px;
    border-radius: 5px;
    border: 1px solid #ffe7a3;
    background: linear-gradient(180deg, #ffe7a3 0%, #f7c250 45%, #d69214 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.65),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 rgba(0, 0, 0, 0.55),
      0 0 12px rgba(245, 184, 65, 0.5);
    cursor: grab;
  }
  .vernier-range-slider:focus-visible::-moz-range-thumb {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.65),
      0 0 0 2px var(--cyan),
      0 0 16px rgba(245, 184, 65, 0.7);
  }

  /* ---------- 仪三：天行谐波倍率 ---------- */
  .polarity-lever {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    padding: 0 10px 0 5px;
    border-radius: 9px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      inset 0 -2px 0 rgba(0, 0, 0, 0.55),
      0 3px 0 rgba(0, 0, 0, 0.5);
    color: var(--cyan);
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    cursor: pointer;
    flex: 0 0 auto;
    transition:
      transform 0.09s ease,
      box-shadow 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .polarity-lever:active {
    transform: translateY(2px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }
  .lever-knob {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: 1px solid #a7fff3;
    background: var(--face-cyan);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 2px 0 rgba(0, 0, 0, 0.5),
      0 0 10px rgba(0, 245, 212, 0.5);
    flex: 0 0 auto;
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .lever-label {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .polarity-lever.ccw {
    color: var(--purple);
    border-color: rgba(167, 139, 250, 0.4);
  }
  .polarity-lever.ccw .lever-knob {
    border-color: #ddd6fe;
    background: linear-gradient(180deg, #c4b5fd 0%, #a78bfa 45%, #6d4fc4 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 2px 0 rgba(0, 0, 0, 0.5),
      0 0 10px rgba(167, 139, 250, 0.5);
  }

  .gear-matrix {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .gear-key {
    height: 40px;
    min-height: 40px;
    padding: 0;
    border-radius: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.5px;
  }
  .gear-key.active {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 2px 0 #7a4d05,
      0 0 16px rgba(245, 184, 65, 0.45);
    transform: translateY(1px);
  }
  .gear-key.active:hover:not(:disabled) {
    background: var(--face-gold-hover);
    border-color: #fff2c4;
    color: #120a00;
  }
  .gear-key.active.ccw {
    background: linear-gradient(180deg, #c4b5fd 0%, #a78bfa 45%, #6d4fc4 100%);
    border-color: #ddd6fe;
    color: #160c2e;
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(70, 40, 130, 0.5),
      0 2px 0 #3d2a6b,
      0 0 16px rgba(167, 139, 250, 0.45);
  }

  /* ---------- 触屏：物理键与滑轨放大到 ≥44 高 ---------- */
  @media (pointer: coarse), (max-width: 640px) {
    .snap-key {
      height: 44px;
      min-height: 44px;
    }
    .step-key {
      width: 44px;
      min-width: 44px;
      height: 44px;
    }
    .gear-key {
      height: 46px;
      min-height: 46px;
      font-size: 14px;
    }
    .polarity-lever {
      min-height: 44px;
    }
    .radius-num {
      font-size: 28px;
    }
    .vernier-val-btn {
      min-height: 44px;
    }
  }
</style>
