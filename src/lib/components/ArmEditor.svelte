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
  /** 高级调谐展开态：只有展开时才挂载内容，折叠时 DOM 里不存在多余控件 */
  let advOpen = $state(false);

  /**
   * 倍率跨档反馈：只有整数档真的变了才播一次（同档内不重复、加载不触发）。
   * 写入与音效仍走原来的 setFreqMag，行为不变。
   */
  function setFreqStep(v: number): void {
    const changed = v !== absFreq;
    setFreqMag(v);
    if (changed) bumpOnce('f');
  }

  /** 滑杆滑到端点时的「顿」感：只弹一次、不循环 */
  let bump = $state<'r' | 'p' | 'f' | null>(null);
  let bumpTimer: ReturnType<typeof setTimeout> | undefined;
  function bumpOnce(which: 'r' | 'p' | 'f'): void {
    bump = null;
    clearTimeout(bumpTimer);
    // 下一帧再置位：连续两次到端点也能各播一次
    requestAnimationFrame(() => {
      bump = which;
      bumpTimer = setTimeout(() => (bump = null), 220);
    });
  }

  /** 内联编辑状态（点击数值进入，Enter/blur 确认，Esc 取消） */
  let editing: 'r' | 'p' | null = $state(null);
  let draft = $state('');

  /** 引导联动高亮：只在对应引导进行中生效，引导结束立即消失 */
  const guideRadius = $derived(engine.showFirstGuide && engine.phase === 'edit');
  const guideDir = $derived(engine.showEllipseGuide && engine.phase === 'edit');

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

<!-- 指针参数：默认只露半径 / 相位 / 倍率三条核心控件，
     罗盘、四象卡准、刻度尺、完整档位矩阵、撤销等精度工具折进「高级调谐」 -->
<div class="tune">
  <!-- 半径（首关引导激活时高亮这一行） -->
  <div class="param param--radius" class:guide={guideRadius}>
    <div class="param-head">
      <span class="param-name">半径</span>
      <span class="param-value">
        {#if editing === 'r'}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="num-input"
            type="number"
            inputmode="numeric"
            autofocus
            value={draft}
            aria-label="半径像素值"
            oninput={(e) => (draft = e.currentTarget.value)}
            onblur={commitEdit}
            onkeydown={onEditKey}
          />
        {:else}
          <button
            type="button"
            class="val-btn"
            title="点击输入精确半径"
            onclick={() => beginEdit('r')}
          >
            <b class="g-num val-num">{arm.r}</b>
            <i class="val-unit">px</i>
          </button>
        {/if}
      </span>
    </div>
    <span class="range-wrap">
      <span class="range-track" aria-hidden="true">
        <span class="range-fill" style={`transform: scaleX(${arm.r / R_MAX})`}></span>
      </span>
      <input
        type="range"
        class="c-range"
        class:bump={bump === 'r'}
        min="0"
        max={R_MAX}
        step="1"
        value={arm.r}
        aria-label="半径（像素）"
        oninput={(e) => {
          const v = +e.currentTarget.value;
          setR(v);
          if (v <= 0 || v >= R_MAX) bumpOnce('r');
        }}
      />
    </span>
  </div>

  <hr class="g-divider" />

  <!-- 相位 -->
  <div class="param">
    <div class="param-head">
      <span class="param-name">相位</span>
      <span class="param-value">
        {#if editing === 'p'}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="num-input"
            type="number"
            inputmode="numeric"
            autofocus
            value={draft}
            aria-label="相位角度值"
            oninput={(e) => (draft = e.currentTarget.value)}
            onblur={commitEdit}
            onkeydown={onEditKey}
          />
        {:else}
          <button
            type="button"
            class="val-btn"
            title="点击输入精确角度"
            onclick={() => beginEdit('p')}
          >
            <b class="g-num val-num">{deg}</b>
            <i class="val-unit">°</i>
          </button>
        {/if}
      </span>
    </div>
    <span class="range-wrap">
      <span class="range-track" aria-hidden="true">
        <span class="range-fill" style={`transform: scaleX(${deg / 359})`}></span>
      </span>
      <input
        type="range"
        class="c-range"
        class:bump={bump === 'p'}
        min="0"
        max="359"
        step="1"
        value={deg}
        aria-label="相位（角度）"
        oninput={(e) => {
          const v = +e.currentTarget.value;
          setPhaseDeg(v);
          if (v <= 0 || v >= 359) bumpOnce('p');
        }}
      />
    </span>
  </div>

  <hr class="g-divider" />

  <!-- 倍率与方向 -->
  <div class="param">
    <div class="param-head">
      <span class="param-name">倍率</span>
      <span class="param-value">
        <b class="g-num val-num freq-num" class:ccw={isCCW} class:flash={bump === 'f'}>{absFreq}</b>
        <i class="val-unit">×</i>
      </span>
    </div>
    <div class="freq-row">
      <span class="range-wrap">
        <span class="range-track" aria-hidden="true">
          <span class="range-fill" style={`transform: scaleX(${(absFreq - 1) / 9})`}></span>
        </span>
        <input
          type="range"
          class="c-range"
          class:bump={bump === 'f'}
          min="1"
          max="10"
          step="1"
          value={absFreq}
          aria-label="谐波倍率"
          oninput={(e) => setFreqStep(+e.currentTarget.value)}
        />
      </span>
      <button
        type="button"
        class="dir-btn"
        class:ccw={isCCW}
        class:guide={guideDir}
        title="点击切换旋转方向"
        onclick={toggleDir}
      >
        <span class="dir-ico" aria-hidden="true">
          <Icon name={isCCW ? 'undo' : 'refresh'} size={14} />
        </span>
        {isCCW ? '逆时针' : '顺时针'}
      </button>
    </div>
  </div>

  <hr class="g-divider" />

  <!-- 高级调谐：默认折叠，键盘可达 -->
  <details class="adv" bind:open={advOpen}>
    <summary class="adv-summary">
      <span>高级调谐</span>
      <span class="adv-chev" aria-hidden="true"><Icon name="chevron-down" size={14} /></span>
    </summary>

    {#if advOpen}
      <div class="adv-body">
        <!-- 周天宿度仪：罗盘 + 四象卡准 + 微调 -->
        <div class="adv-group">
          <div class="adv-head"><span>精确相位</span><span class="adv-val">{deg}°</span></div>
          <div class="compass-row">
            <div class="compass-wrap">
              <svg
                bind:this={dialEl}
                class="compass-svg"
                viewBox="0 0 160 160"
                role="slider"
                aria-label="相位罗盘"
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
                <circle cx="80" cy="80" r="76" class="dial-track" />
                <circle cx="80" cy="80" r="70" class="dial-plate" />

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

                <text x="142" y="83" class="quadrant">0°</text>
                <text x="80" y="145" class="quadrant center">90°</text>
                <text x="18" y="83" class="quadrant end">180°</text>
                <text x="80" y="23" class="quadrant center">270°</text>

                <g transform={`rotate(${deg}, 80, 80)`}>
                  <line x1="80" y1="80" x2="136" y2="80" class="needle-shaft" />
                  <polygon points="142,80 130,75 133,80 130,85" class="needle-tip" />
                </g>

                <circle cx="80" cy="80" r="29" class="hub-bg" />
                <circle cx="80" cy="80" r="27" class="hub-ring" />
              </svg>
            </div>

            <div class="compass-side">
              <div class="snap-grid">
                <button type="button" class="snap-key" onclick={() => setPhaseDeg(0)}>0°</button>
                <button type="button" class="snap-key" onclick={() => setPhaseDeg(90)}>90°</button>
                <button type="button" class="snap-key" onclick={() => setPhaseDeg(180)}>180°</button
                >
                <button type="button" class="snap-key" onclick={() => setPhaseDeg(270)}>270°</button
                >
              </div>
              <div class="step-row">
                <button
                  type="button"
                  class="mini-key"
                  title="相位 −1°（长按连发）"
                  aria-label="相位减一度"
                  onpointerdown={pMinus.onDown}
                  onpointerup={pMinus.onUp}
                  onpointerleave={pMinus.onUp}
                  onclick={pMinus.onClick}
                >
                  <Icon name="minus" size={16} />
                </button>
                <button
                  type="button"
                  class="mini-key"
                  title="相位 +1°（长按连发）"
                  aria-label="相位加一度"
                  onpointerdown={pPlus.onDown}
                  onpointerup={pPlus.onUp}
                  onpointerleave={pPlus.onUp}
                  onclick={pPlus.onClick}
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr class="g-divider" />

        <!-- 精确半径：刻度尺 + 步进 -->
        <div class="adv-group">
          <div class="adv-head"><span>精确半径</span><span class="adv-val">{arm.r} px</span></div>
          <div class="ruler-row">
            <button
              type="button"
              class="mini-key"
              title="半径 −1（长按连发）"
              aria-label="半径减一"
              onpointerdown={rMinus.onDown}
              onpointerup={rMinus.onUp}
              onpointerleave={rMinus.onUp}
              onclick={rMinus.onClick}
            >
              <Icon name="minus" size={16} />
            </button>
            <div class="ruler" aria-hidden="true">
              <div class="ruler-fill" style={`width: ${(arm.r / R_MAX) * 100}%`}></div>
              <div class="ruler-ticks"></div>
            </div>
            <button
              type="button"
              class="mini-key"
              title="半径 +1（长按连发）"
              aria-label="半径加一"
              onpointerdown={rPlus.onDown}
              onpointerup={rPlus.onUp}
              onpointerleave={rPlus.onUp}
              onclick={rPlus.onClick}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          <div class="ruler-scale" aria-hidden="true">
            <span>0</span><span>50</span><span>100</span><span>150</span><span>210</span>
          </div>
        </div>

        <hr class="g-divider" />

        <!-- 倍率完整档位 -->
        <div class="adv-group">
          <div class="adv-head"><span>倍率档位</span></div>
          <div class="gear-matrix">
            {#each freqOptions as f}
              {@const active = absFreq === f}
              <button
                type="button"
                class="gear-key"
                class:active
                class:ccw={active && isCCW}
                title={`切至 ${f}× 谐波`}
                onclick={() => setFreqStep(f)}
              >
                {f}×
              </button>
            {/each}
          </div>
        </div>

        <hr class="g-divider" />

        <!-- 工具 -->
        <div class="adv-group">
          <div class="adv-head"><span>工具</span></div>
          <div class="tool-row">
            <button
              type="button"
              class="tool-key"
              disabled={engine.armUndoCount === 0}
              title="撤销上一次调参（Ctrl+Z）"
              onclick={() => engine.undoArms()}
            >
              <Icon name="undo" size={14} />
              撤销
            </button>
            <button
              type="button"
              class="tool-key"
              title="复位这根指针"
              onclick={() => engine.resetArm(index)}
            >
              <Icon name="refresh" size={14} />
              复位
            </button>
            <button
              type="button"
              class="tool-key"
              title="随机扰动全部指针"
              onclick={() => {
                engine.randomizeArms();
                beep(440, 0.04, 'triangle', 0.08, engine.soundOn);
              }}
            >
              <Icon name="dice" size={14} />
              随机
            </button>
            {#if engine.hasSavedArms()}
              <button
                type="button"
                class="tool-key tool-key--gold"
                title="载入历史最佳解"
                onclick={() => {
                  engine.loadSavedArms();
                  beep(523, 0.08, 'sine', 0.1, engine.soundOn);
                }}
              >
                <Icon name="award" size={14} />
                最佳
              </button>
            {/if}
            {#if engine.expertUnlocked}
              <button
                type="button"
                class="tool-key"
                class:active={engine.expertMode}
                title="专家模式"
                onclick={() => engine.toggleExpert()}
              >
                <Icon name="gem" size={14} />
                专家
              </button>
            {/if}
            {#if engine.spectrumUnlocked}
              <button
                type="button"
                class="tool-key"
                class:active={engine.spectrumCompare}
                title="频谱对比"
                onclick={() => engine.toggleSpectrumCompare()}
              >
                <Icon name="zoom" size={14} />
                频谱
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </details>
</div>

<style>
  /* ============================================================
   * 指针参数 · 渐进披露
   * 默认：半径 / 相位 / 倍率 三条核心滑杆（说人话的标签 + 大读数）
   * 折叠：罗盘、四象卡准、刻度尺、完整档位矩阵、撤销等工具
   * 约定：无外发光、无英文副标题、字号 ≥12px、盒子不套盒子
   * ============================================================ */
  .tune {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* 区块首次出现：上移 6px 淡入（300ms，逐块 60ms 错峰）；
     只在挂载时播一次，参数变化导致的重复渲染不会重播 */
  .tune > .param,
  .tune > .adv {
    animation: block-in 300ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  .tune > .param:nth-of-type(1) {
    animation-delay: 60ms;
  }
  .tune > .param:nth-of-type(2) {
    animation-delay: 120ms;
  }
  .tune > .param:nth-of-type(3) {
    animation-delay: 180ms;
  }
  .tune > .adv {
    animation-delay: 240ms;
  }
  @keyframes block-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* ---------- 核心参数行 ---------- */
  .param {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 0 2px;
    min-width: 0;
  }
  .param-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .param-name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text);
    white-space: nowrap;
  }
  .param-value {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    flex: 0 0 auto;
  }
  .val-btn {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    min-height: 32px;
    padding: 0 4px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    cursor: text;
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 120ms ease;
  }
  .val-btn:active {
    transform: scale(0.97);
    transition-timing-function: ease-out;
  }
  .val-btn:hover {
    border-color: var(--edge-soft);
  }
  .param-value .val-num {
    font-size: 26px;
    line-height: 1.1;
    font-family: 'JetBrains Mono', monospace;
    color: var(--gold-bright);
    text-shadow: none;
  }
  .param-value .val-num.ccw {
    color: var(--purple);
  }
  /* 跨档瞬间：读数轻弹一下 + 闪金（one-shot，160ms；未跨档不播） */
  .freq-num.flash {
    animation: readout-pop 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes readout-pop {
    45% {
      transform: scale(1.08);
      color: var(--gold-bright);
      filter: brightness(1.25);
    }
  }
  .val-unit {
    font-style: normal;
    font-size: 12px;
    color: var(--muted);
  }
  .num-input {
    width: 78px;
    height: 40px;
    padding: 0;
    background: var(--metal-deep);
    border: 1px solid var(--edge);
    border-radius: 6px;
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    text-align: center;
    outline: none;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .num-input::-webkit-outer-spin-button,
  .num-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .freq-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .freq-row .range-wrap {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* 方向切换：一枚安静的物理键 */
  .dir-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, #1a2438 0%, #0d1424 100%);
    color: var(--cyan);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 90ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }
  .dir-btn:active {
    transform: scale(0.97);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
    transition-timing-function: ease-out;
  }
  /* 顺/逆切换：图标 120ms 旋转，颜色跟随过渡 */
  .dir-ico {
    display: inline-flex;
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dir-btn.ccw {
    color: var(--purple);
  }
  .dir-btn.ccw .dir-ico {
    transform: rotate(180deg);
  }

  /* ---------- 核心滑杆：凹槽 + 可过渡填充 + 金色滑块（WebKit / Firefox 两套） ---------- */
  .range-wrap {
    position: relative;
    display: block;
    width: 100%;
    min-width: 0;
    height: 40px;
  }
  .range-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 8px;
    transform: translateY(-50%);
    border-radius: 4px;
    border: 1px solid var(--edge-faint);
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    pointer-events: none;
  }
  /* 填充用 transform 驱动：90ms 平滑跟随（不碰布局属性） */
  .range-fill {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: left center;
    background: rgba(245, 184, 65, 0.5);
    transition: transform 90ms linear;
  }

  .c-range {
    position: absolute;
    inset: 0;
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    cursor: ew-resize;
    touch-action: pan-y;
  }
  .c-range::-webkit-slider-runnable-track {
    height: 8px;
    background: transparent;
    border: none;
  }
  .c-range::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -8px;
    border-radius: 7px;
    border: 1px solid #ffe7a3;
    background: linear-gradient(180deg, #ffe7a3 0%, #f7c250 50%, #d69214 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 2px 0 rgba(0, 0, 0, 0.5);
    cursor: grab;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  /* 按住滑块：放大 + 阴影收紧（红线内 1.08） */
  .c-range:active::-webkit-slider-thumb {
    transform: scale(1.08);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.45),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }
  .c-range:focus-visible::-webkit-slider-thumb {
    box-shadow:
      0 0 0 2px var(--cyan),
      0 2px 0 rgba(0, 0, 0, 0.5);
  }
  /* 到端点：一次轻微「顿」感，不循环 */
  .c-range.bump::-webkit-slider-thumb {
    animation: thumb-bump 200ms ease-out;
  }
  .c-range::-moz-range-track {
    height: 8px;
    background: transparent;
    border: none;
  }
  .c-range::-moz-range-progress {
    height: 8px;
    background: transparent;
  }
  .c-range::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1px solid #ffe7a3;
    background: linear-gradient(180deg, #ffe7a3 0%, #f7c250 50%, #d69214 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 2px 0 rgba(0, 0, 0, 0.5);
    cursor: grab;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .c-range:active::-moz-range-thumb {
    transform: scale(1.08);
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.45),
      0 1px 0 rgba(0, 0, 0, 0.5);
  }
  .c-range:focus-visible::-moz-range-thumb {
    box-shadow:
      0 0 0 2px var(--cyan),
      0 2px 0 rgba(0, 0, 0, 0.5);
  }
  .c-range.bump::-moz-range-thumb {
    animation: thumb-bump 200ms ease-out;
  }
  @keyframes thumb-bump {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.06);
    }
    100% {
      transform: scale(1);
    }
  }

  /* 引导态专属描边：静态一层、不改布局、不加发光 */
  .param.guide,
  .dir-btn.guide {
    outline: 2px solid var(--gold-bright);
    outline-offset: 3px;
    border-radius: 10px;
    animation: guide-pulse 1.6s ease-in-out infinite;
  }
  @keyframes guide-pulse {
    0%,
    100% {
      outline-color: var(--gold-bright);
    }
    50% {
      outline-color: rgba(245, 184, 65, 0.35);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .param.guide,
    .dir-btn.guide {
      animation: none;
    }
  }
  :global(.reduce-motion) .param.guide,
  :global(.reduce-motion) .dir-btn.guide {
    animation: none;
  }

  /* 触屏：读数热区抬到 ≥44 */
  @media (pointer: coarse), (max-width: 640px) {
    .val-btn {
      min-width: 44px;
      min-height: 44px;
      justify-content: flex-end;
    }
  }

  /* ---------- 高级调谐（默认折叠） ---------- */
  .adv {
    min-width: 0;
  }
  .adv-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    padding: 0 2px;
    border-top: 1px solid var(--edge-faint);
    list-style: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--muted);
    transition: color 0.12s ease;
  }
  .adv-summary::-webkit-details-marker {
    display: none;
  }
  .adv-summary:hover {
    color: var(--gold-bright);
  }
  .adv-chev {
    display: inline-flex;
    transition: transform 0.15s ease;
  }
  .adv[open] .adv-chev {
    transform: rotate(180deg);
  }
  .adv-body {
    display: flex;
    flex-direction: column;
    padding-top: 4px;
  }

  .adv-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 0 2px;
    min-width: 0;
  }
  .adv-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .adv-val {
    color: var(--text);
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  /* 罗盘 */
  .compass-row {
    display: grid;
    grid-template-columns: 116px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }
  .compass-wrap {
    position: relative;
    width: 116px;
    height: 116px;
    user-select: none;
    touch-action: none;
  }
  .compass-svg {
    width: 100%;
    height: 100%;
    cursor: grab;
  }
  .compass-svg:active {
    cursor: grabbing;
  }
  .dial-track {
    fill: #05080f;
    stroke: var(--edge-soft);
    stroke-width: 1.5;
  }
  .dial-plate {
    fill: #0a101c;
    stroke: var(--edge-faint);
    stroke-width: 1;
  }
  .dial-tick {
    stroke: rgba(245, 184, 65, 0.28);
    stroke-width: 1;
  }
  .dial-tick.major {
    stroke: var(--gold);
    stroke-width: 1.6;
  }
  .quadrant {
    font-size: 8px;
    fill: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }
  .quadrant.center {
    text-anchor: middle;
  }
  .quadrant.end {
    text-anchor: end;
  }
  .needle-shaft {
    stroke: var(--gold-bright);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .needle-tip {
    fill: var(--gold-bright);
  }
  .hub-bg {
    fill: #0b1120;
  }
  .hub-ring {
    fill: #121b2c;
    stroke: var(--edge-soft);
    stroke-width: 1.5;
  }

  .compass-side {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .snap-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .snap-key {
    min-height: 40px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, #1a2438 0%, #0d1424 100%);
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 90ms ease,
      color 120ms ease,
      border-color 120ms ease;
  }
  .snap-key:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
  }
  .snap-key:active {
    transform: scale(0.97);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
    transition-timing-function: ease-out;
  }
  .step-row {
    display: flex;
    gap: 6px;
  }
  .step-row .mini-key {
    flex: 1 1 0;
  }
  .mini-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, #1a2438 0%, #0d1424 100%);
    color: var(--text);
    cursor: pointer;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    touch-action: manipulation;
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 90ms ease;
  }
  .mini-key:active {
    transform: scale(0.97);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
    transition-timing-function: ease-out;
  }

  /* 刻度尺 */
  .ruler-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .ruler {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    height: 40px;
    border-radius: 6px;
    border: 1px solid var(--edge-faint);
    background: rgba(4, 7, 14, 0.7);
    overflow: hidden;
  }
  .ruler-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    background: rgba(245, 184, 65, 0.18);
    border-right: 2px solid var(--gold);
  }
  .ruler-ticks {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      to right,
      rgba(245, 184, 65, 0.22) 0px,
      rgba(245, 184, 65, 0.22) 1px,
      transparent 1px,
      transparent 10px
    );
  }
  .ruler-scale {
    display: flex;
    justify-content: space-between;
    padding: 0 54px;
    font-size: 12px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* 档位矩阵 */
  .gear-matrix {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .gear-key {
    min-height: 44px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, #1a2438 0%, #0d1424 100%);
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background 120ms ease,
      color 120ms ease,
      border-color 120ms ease;
  }
  /* :not(:disabled) 提高特异性：选中档位的金色硬阴影不会盖掉按压收紧 */
  .gear-key:active:not(:disabled) {
    transform: scale(0.97);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
  }
  .gear-key:hover {
    color: var(--text);
    border-color: var(--edge);
  }
  .gear-key.active {
    background: var(--face-gold);
    border-color: #ffe7a3;
    color: #1a1002;
    box-shadow: 0 2px 0 #7a4d05;
    /* 选中的档位键弹入一次（切档时才播） */
    animation: gear-pop 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes gear-pop {
    0% {
      transform: scale(0.92);
    }
    60% {
      transform: scale(1.04);
    }
    100% {
      transform: scale(1);
    }
  }
  .gear-key.active.ccw {
    background: linear-gradient(180deg, #c4b5fd 0%, #a78bfa 50%, #6d4fc4 100%);
    border-color: #ddd6fe;
    color: #160c2e;
  }

  /* 工具 */
  .tool-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tool-key {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, #1a2438 0%, #0d1424 100%);
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 90ms ease,
      color 120ms ease,
      border-color 120ms ease;
  }
  .tool-key:hover:not(:disabled) {
    color: var(--gold-bright);
    border-color: var(--edge);
  }
  .tool-key:active:not(:disabled) {
    transform: scale(0.97);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.55);
    transition-timing-function: ease-out;
  }
  .tool-key:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tool-key--gold {
    color: var(--gold-bright);
    border-color: var(--edge);
  }
  .tool-key.active {
    color: var(--cyan);
    border-color: var(--cyan-line);
  }

  /* ---------- reduce-motion：位移/缩放/循环动画全关（颜色与瞬时状态保留） ---------- */
  @media (prefers-reduced-motion: reduce) {
    .tune > .param,
    .tune > .adv,
    .param.guide,
    .dir-btn.guide,
    .gear-key.active,
    .freq-num.flash,
    .c-range.bump::-webkit-slider-thumb,
    .c-range.bump::-moz-range-thumb {
      animation: none;
    }
    .val-btn,
    .dir-btn,
    .dir-ico,
    .mini-key,
    .snap-key,
    .gear-key,
    .tool-key,
    .range-fill,
    .c-range::-webkit-slider-thumb,
    .c-range::-moz-range-thumb {
      transition: none;
    }
    .val-btn:active,
    .dir-btn:active,
    .mini-key:active,
    .snap-key:active,
    .gear-key:active:not(:disabled),
    .tool-key:active:not(:disabled),
    .c-range:active::-webkit-slider-thumb,
    .c-range:active::-moz-range-thumb {
      transform: none;
    }
  }
  :global(.reduce-motion) .tune > .param,
  :global(.reduce-motion) .tune > .adv,
  :global(.reduce-motion) .param.guide,
  :global(.reduce-motion) .dir-btn.guide,
  :global(.reduce-motion) .gear-key.active,
  :global(.reduce-motion) .freq-num.flash,
  :global(.reduce-motion) .c-range.bump::-webkit-slider-thumb,
  :global(.reduce-motion) .c-range.bump::-moz-range-thumb {
    animation: none;
  }
  :global(.reduce-motion) .val-btn,
  :global(.reduce-motion) .dir-btn,
  :global(.reduce-motion) .dir-ico,
  :global(.reduce-motion) .mini-key,
  :global(.reduce-motion) .snap-key,
  :global(.reduce-motion) .gear-key,
  :global(.reduce-motion) .tool-key,
  :global(.reduce-motion) .range-fill,
  :global(.reduce-motion) .c-range::-webkit-slider-thumb,
  :global(.reduce-motion) .c-range::-moz-range-thumb {
    transition: none;
  }
  :global(.reduce-motion) .val-btn:active,
  :global(.reduce-motion) .dir-btn:active,
  :global(.reduce-motion) .mini-key:active,
  :global(.reduce-motion) .snap-key:active,
  :global(.reduce-motion) .gear-key:active:not(:disabled),
  :global(.reduce-motion) .tool-key:active:not(:disabled),
  :global(.reduce-motion) .c-range:active::-webkit-slider-thumb,
  :global(.reduce-motion) .c-range:active::-moz-range-thumb {
    transform: none;
  }
</style>
