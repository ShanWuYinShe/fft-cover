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
  /** 档位矩阵是 5×2：当前选中档位所在的那一行（用于回纹装饰） */
  const activeRow = $derived(Math.ceil(absFreq / 5));

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
            class="val-btn g-chip"
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
            class="val-btn g-chip"
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
      <span class="param-value param-value--plaque">
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
        class="dir-btn g-btn"
        class:ccw={isCCW}
        class:guide={guideDir}
        title="点击切换旋转方向"
        onclick={toggleDir}
      >
        <span class="dir-ico g-socket" aria-hidden="true">
          <Icon name={isCCW ? 'undo' : 'refresh'} size={13} />
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
                <button type="button" class="snap-key g-btn" onclick={() => setPhaseDeg(0)}
                  >0°</button
                >
                <button type="button" class="snap-key g-btn" onclick={() => setPhaseDeg(90)}
                  >90°</button
                >
                <button type="button" class="snap-key g-btn" onclick={() => setPhaseDeg(180)}
                  >180°</button
                >
                <button type="button" class="snap-key g-btn" onclick={() => setPhaseDeg(270)}
                  >270°</button
                >
              </div>
              <div class="step-row">
                <button
                  type="button"
                  class="mini-key g-btn"
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
                  class="mini-key g-btn"
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
              class="mini-key g-btn"
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
              class="mini-key g-btn"
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
                class="gear-key g-btn"
                class:active
                class:ccw={active && isCCW}
                class:row-lit={Math.ceil(f / 5) === activeRow}
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
              class="tool-key g-btn"
              disabled={engine.armUndoCount === 0}
              title="撤销上一次调参（Ctrl+Z）"
              onclick={() => engine.undoArms()}
            >
              <span class="g-socket" aria-hidden="true"><Icon name="undo" size={13} /></span>
              撤销
            </button>
            <button
              type="button"
              class="tool-key g-btn"
              title="复位这根指针"
              onclick={() => engine.resetArm(index)}
            >
              <span class="g-socket" aria-hidden="true"><Icon name="refresh" size={13} /></span>
              复位
            </button>
            <button
              type="button"
              class="tool-key g-btn"
              title="随机扰动全部指针"
              onclick={() => {
                engine.randomizeArms();
                beep(440, 0.04, 'triangle', 0.08, engine.soundOn);
              }}
            >
              <span class="g-socket" aria-hidden="true"><Icon name="dice" size={13} /></span>
              随机
            </button>
            {#if engine.hasSavedArms()}
              <button
                type="button"
                class="tool-key g-btn tool-key--gold"
                title="载入历史最佳解"
                onclick={() => {
                  engine.loadSavedArms();
                  beep(523, 0.08, 'sine', 0.1, engine.soundOn);
                }}
              >
                <span class="g-socket" aria-hidden="true"><Icon name="award" size={13} /></span>
                最佳
              </button>
            {/if}
            {#if engine.expertUnlocked}
              <button
                type="button"
                class="tool-key g-btn"
                class:active={engine.expertMode}
                title="专家模式"
                onclick={() => engine.toggleExpert()}
              >
                <span class="g-socket" aria-hidden="true"><Icon name="gem" size={13} /></span>
                专家
              </button>
            {/if}
            {#if engine.spectrumUnlocked}
              <button
                type="button"
                class="tool-key g-btn"
                class:active={engine.spectrumCompare}
                title="频谱对比"
                onclick={() => engine.toggleSpectrumCompare()}
              >
                <span class="g-socket" aria-hidden="true"><Icon name="zoom" size={13} /></span>
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
    /* 面板被撑高时，把富余高度均摊到各段之间（无富余时与原来一致，不留空档） */
    flex: 1 0 auto;
    justify-content: space-evenly;
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
    padding: 4px 0 2px;
    min-width: 0;
  }
  .param-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .param-name {
    font-size: var(--ctl-font);
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
  /* 读数键 = 玉牌（公共 .g-chip：内凹玉面 + 青铜描边 + 青碧字） */
  .val-btn {
    display: inline-flex;
    align-items: baseline;
    position: relative;
    gap: 2px;
    min-height: var(--ctl-md);
    padding: 0 10px;
    border-radius: 4px;
    font-size: var(--ctl-font-sm);
    cursor: text;
    transition:
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      border-color 120ms ease,
      background 120ms ease;
  }
  .val-btn:active {
    transform: scale(0.97);
    transition-timing-function: ease-out;
  }
  .val-btn:hover {
    border-color: var(--edge-bronze-hot);
  }
  .param-value .val-num {
    font-size: 16px;
    line-height: 1.1;
    font-family: 'JetBrains Mono', monospace;
    color: #b9f7e8;
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
    font-size: var(--ctl-font-sm);
    color: rgba(157, 240, 216, 0.62);
  }
  /* 只读读数（倍率）也用玉牌承载，保证三行读数同一种器物语言 */
  .param-value--plaque {
    min-height: var(--ctl-md);
    padding: 0 10px;
    align-items: center;
    border-radius: 4px;
    background: var(--face-jade);
    border: 1px solid rgba(16, 185, 129, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      inset 0 0 0 1px rgba(0, 0, 0, 0.5);
  }
  .num-input {
    width: 64px;
    height: var(--ctl-md);
    padding: 0;
    background: var(--metal-deep);
    border: 1px solid var(--edge);
    border-radius: var(--ctl-radius);
    color: var(--gold-bright);
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--ctl-font);
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
    gap: 8px;
    min-width: 0;
  }
  .freq-row .range-wrap {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* 方向切换 = 铜板键（公共 .g-btn：切角铜边 + 内金属面） */
  .dir-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: 0 0 auto;
    min-height: var(--ctl-md);
    padding: 0 10px;
    color: var(--cyan);
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
    transition:
      color 120ms ease,
      filter 120ms ease,
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
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

  /* ---------- 核心滑杆 = 玉尺：青铜凹槽 + 两端铜钉 + 金箔填充 + 玉石立方滑块 ---------- */
  .range-wrap {
    position: relative;
    display: block;
    width: 100%;
    min-width: 0;
    height: 26px;
  }
  /* 两端铜钉（压在填充与输入层之上，仅装饰） */
  .range-wrap::before,
  .range-wrap::after {
    content: '';
    position: absolute;
    top: 50%;
    z-index: 3;
    width: 4px;
    height: 4px;
    margin-top: -2px;
    border-radius: 50%;
    background: var(--rivet);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }
  .range-wrap::before {
    left: 1px;
  }
  .range-wrap::after {
    right: 1px;
  }
  /* 玉尺凹槽：内凹阴影 + 1px 青铜边 */
  .range-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    z-index: 0;
    height: 6px;
    transform: translateY(-50%);
    border-radius: 2px;
    border: 1px solid var(--edge-bronze);
    background: linear-gradient(180deg, #04070c 0%, #0a1018 100%);
    box-shadow:
      inset 0 2px 5px rgba(0, 0, 0, 0.85),
      inset 0 -1px 0 rgba(255, 255, 255, 0.05);
    overflow: hidden;
    pointer-events: none;
  }
  /* 金箔填充条：transform 驱动，90ms 平滑跟随（不碰布局属性） */
  .range-fill {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: left center;
    background: linear-gradient(90deg, rgba(255, 231, 163, 0.72) 0%, rgba(214, 146, 20, 0.88) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.45),
      inset 0 -1px 0 rgba(120, 70, 0, 0.5);
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
    height: 6px;
    background: transparent;
    border: none;
  }
  .c-range::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -4px;
    border-radius: 2px;
    /* 切角 2px 的玉石立方（不用圆形） */
    clip-path: polygon(
      2px 0,
      calc(100% - 2px) 0,
      100% 2px,
      100% calc(100% - 2px),
      calc(100% - 2px) 100%,
      2px 100%,
      0 calc(100% - 2px),
      0 2px
    );
    border: 1px solid var(--edge-bronze-hot);
    background: linear-gradient(180deg, #c8fff0 0%, #3fd9bd 45%, #0c7d6a 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -1px 0 rgba(0, 60, 50, 0.55);
    cursor: grab;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  /* 按住滑块：放大（红线内 1.08） */
  .c-range:active::-webkit-slider-thumb {
    transform: scale(1.08);
    background: linear-gradient(180deg, #fff8e1 0%, #f7c250 45%, #c8870c 100%);
  }
  /* 焦点：切角会切掉外描边，改成「铜边变金 + 玉面提亮」 */
  .c-range:focus-visible::-webkit-slider-thumb {
    border-color: var(--gold-bright);
    background: linear-gradient(180deg, #e9fff9 0%, #7cf0d8 45%, #14a58c 100%);
  }
  /* 到端点：一次轻微「顿」感，不循环 */
  .c-range.bump::-webkit-slider-thumb {
    animation: thumb-bump 200ms ease-out;
  }
  .c-range::-moz-range-track {
    height: 6px;
    background: transparent;
    border: none;
  }
  .c-range::-moz-range-progress {
    height: 6px;
    background: transparent;
  }
  .c-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    clip-path: polygon(
      2px 0,
      calc(100% - 2px) 0,
      100% 2px,
      100% calc(100% - 2px),
      calc(100% - 2px) 100%,
      2px 100%,
      0 calc(100% - 2px),
      0 2px
    );
    border: 1px solid var(--edge-bronze-hot);
    background: linear-gradient(180deg, #c8fff0 0%, #3fd9bd 45%, #0c7d6a 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -1px 0 rgba(0, 60, 50, 0.55);
    cursor: grab;
    transition: transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .c-range:active::-moz-range-thumb {
    transform: scale(1.08);
    background: linear-gradient(180deg, #fff8e1 0%, #f7c250 45%, #c8870c 100%);
  }
  .c-range:focus-visible::-moz-range-thumb {
    border-color: var(--gold-bright);
    background: linear-gradient(180deg, #e9fff9 0%, #7cf0d8 45%, #14a58c 100%);
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

  /* 引导态专属描边：半径行是普通盒子，用 outline（不会被裁切） */
  .param.guide {
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
  /* 方向键是切角键帽，outline 会被 clip-path 切掉 → 改成沿切角形状的金色描边光晕 */
  .dir-btn.guide {
    animation: key-guide-pulse 1.6s ease-in-out infinite;
  }
  @keyframes key-guide-pulse {
    0%,
    100% {
      filter: drop-shadow(0 0 2px var(--gold-bright)) drop-shadow(0 0 1px var(--gold-bright));
    }
    50% {
      filter: drop-shadow(0 0 2px rgba(245, 184, 65, 0.3));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .param.guide,
    .dir-btn.guide {
      animation: none;
    }
    .dir-btn.guide {
      filter: drop-shadow(0 0 1px var(--gold-bright));
    }
  }
  :global(.reduce-motion) .param.guide,
  :global(.reduce-motion) .dir-btn.guide {
    animation: none;
  }
  :global(.reduce-motion) .dir-btn.guide {
    filter: drop-shadow(0 0 1px var(--gold-bright));
  }

  /* 触屏：读数热区抬到 ≥44 */
  @media (pointer: coarse), (max-width: 640px) {
    /* 读数键：触屏给足命中区（宽高都 ≥ --ctl-md=42） */
    .val-btn {
      min-width: var(--ctl-md);
      min-height: var(--ctl-md);
      justify-content: flex-end;
    }
    .param-value .val-num {
      font-size: 17px;
    }
    /* 滑杆：视觉行高 34，输入层外扩到 40px 命中区（不靠放大视觉） */
    .range-wrap {
      height: 34px;
    }
    .range-track,
    .c-range::-webkit-slider-runnable-track,
    .c-range::-moz-range-track,
    .c-range::-moz-range-progress {
      height: 8px;
    }
    .c-range {
      top: 50%;
      height: 40px;
      transform: translateY(-50%);
    }
    .c-range::-webkit-slider-thumb {
      width: 22px;
      height: 22px;
      margin-top: -7px;
    }
    .c-range::-moz-range-thumb {
      width: 22px;
      height: 22px;
    }
  }

  /* 触屏：键帽按下保留缩放回弹（桌面按第五轮规范改为「下沉 1px + 内阴影」） */
  @media (pointer: coarse) {
    .snap-key:active,
    .mini-key:active,
    .gear-key:active,
    .tool-key:active,
    .dir-btn:active {
      transform: scale(0.97);
      transition-timing-function: ease-out;
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
    min-height: var(--ctl-md);
    padding: 0 2px;
    border-top: 1px solid var(--edge-faint);
    list-style: none;
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--muted);
    transition: color 0.12s ease;
  }
  .adv-summary::-webkit-details-marker {
    display: none;
  }
  /* 段头铭牌：标题文字前挂 3px 金铭牌块（不改 DOM） */
  .adv-summary > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .adv-summary > span:first-child::before {
    content: '';
    flex: none;
    width: 3px;
    height: 12px;
    background: var(--face-gold-plate);
    clip-path: var(--chamfer-sm);
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
    padding: 3px 0 2px;
    min-width: 0;
  }
  .adv-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--ctl-font-sm);
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
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }
  .compass-wrap {
    position: relative;
    width: 96px;
    height: 96px;
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
  /* 卡准键 = 键帽（公共 .g-btn 提供切角铜边 + 内凹面，这里只留排版） */
  .snap-key {
    min-height: var(--ctl-md);
    padding: 0;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
  }
  .step-row {
    display: flex;
    gap: 6px;
  }
  .step-row .mini-key {
    flex: 1 1 0;
  }
  /* 步进键 = 键帽 */
  .mini-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--ctl-md);
    min-height: var(--ctl-md);
    padding: 0;
    touch-action: manipulation;
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
    height: 26px;
    border-radius: var(--ctl-radius);
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
    padding: 0 38px;
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
  }

  /* 档位矩阵 */
  .gear-matrix {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  /* 档位键 = 键帽；选中 = 金面 + 极小回纹 + 内嵌宝石灯 */
  .gear-key {
    min-height: var(--ctl-md);
    padding: 0;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  /* 选中档位所在行：键面加极小回纹（其余行保持素面） */
  .gear-key.row-lit:not(.active)::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      var(--face-plate);
  }
  .gear-key.row-lit:not(.active):hover:not(:disabled)::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      var(--face-plate-hot);
  }
  .gear-key.active {
    background: var(--bronze-bright);
    color: #1a1002;
    /* 选中的档位键弹入一次（切档时才播） */
    animation: gear-pop 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .gear-key.active::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      var(--face-gold-plate);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
  }
  /* 宝石灯：内嵌在键帽右上角 */
  .gear-key.active::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fffbe8 0%, #ffd166 55%, #a86b00 100%);
    box-shadow: 0 0 4px 1px rgba(255, 214, 130, 0.8);
    pointer-events: none;
  }
  .gear-key.active:hover:not(:disabled) {
    color: #1a1002;
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
    background: #b39ddb;
    color: #160c2e;
  }
  .gear-key.active.ccw::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      linear-gradient(180deg, #c4b5fd 0%, #a78bfa 50%, #6d4fc4 100%);
  }
  .gear-key.active.ccw::after {
    background: radial-gradient(circle at 35% 30%, #f3ebff 0%, #c4b5fd 55%, #4c2f8f 100%);
    box-shadow: 0 0 4px 1px rgba(196, 181, 253, 0.8);
  }
  .gear-key.active.ccw:hover:not(:disabled) {
    color: #160c2e;
  }

  /* 工具 */
  .tool-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* 工具键 = 键帽；选中（专家/频谱）= 青碧面 + 内嵌宝石灯 */
  .tool-key {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: var(--ctl-md);
    padding: 0 10px;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .tool-key--gold {
    color: var(--gold-bright);
  }
  .tool-key.active {
    background: rgba(0, 245, 212, 0.55);
    color: #041512;
  }
  .tool-key.active::before {
    background: linear-gradient(180deg, #49e6cf 0%, #12b39c 55%, #067a68 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .tool-key.active::after {
    content: '';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #dffff7 0%, #00f5d4 60%, #065f52 100%);
    box-shadow: 0 0 3px 1px rgba(0, 245, 212, 0.75);
    pointer-events: none;
  }
  .tool-key.active:hover:not(:disabled) {
    color: #041512;
  }
  /* 选中键在 hover / focus 下保持「金面 / 青碧面」，不被 .g-btn 的提亮面盖掉 */
  .gear-key.active:hover:not(:disabled)::before,
  .gear-key.active:focus-visible::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      var(--face-gold-plate);
  }
  .gear-key.active:focus-visible {
    color: #1a1002;
  }
  .gear-key.active.ccw:hover:not(:disabled)::before,
  .gear-key.active.ccw:focus-visible::before {
    background:
      var(--pattern-hui) 0 0 / 10px 10px repeat,
      linear-gradient(180deg, #c4b5fd 0%, #a78bfa 50%, #6d4fc4 100%);
  }
  .gear-key.active.ccw:focus-visible {
    color: #160c2e;
  }
  .tool-key.active:hover:not(:disabled)::before,
  .tool-key.active:focus-visible::before {
    background: linear-gradient(180deg, #49e6cf 0%, #12b39c 55%, #067a68 100%);
  }
  .tool-key.active:focus-visible {
    color: #041512;
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
