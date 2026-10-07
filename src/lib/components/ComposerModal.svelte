<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { encodeCoeffs, type HarmonicCoeff } from '../game/levels';
  import { CIRCLED, DRAFT_KEY } from '../game/constants';
  import { topHarmonics } from '../game/math';

  let { onclose }: { onclose: () => void } = $props();

  /** 恢复上次编辑的草稿（无草稿时给一个 1×=100 的起点）。返回系数 + 每行的旋转方向 */
  function loadDraft(): { coeffs: HarmonicCoeff[]; dirs: number[] } {
    const base = Array.from({ length: 10 }, (_, i) => ({ k: i + 1, mag: 0, phase: 0 }));
    const dirs = Array.from({ length: 10 }, () => 1);
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      if (Array.isArray(raw)) {
        for (const c of raw) {
          if (typeof c?.k === 'number' && c.k !== 0 && Math.abs(c.k) <= 10) {
            const i = Math.abs(c.k) - 1;
            base[i] = { k: Math.abs(c.k), mag: +c.mag || 0, phase: +c.phase || 0 };
            dirs[i] = c.k < 0 ? -1 : 1;
          }
        }
        return { coeffs: base, dirs };
      }
    } catch {
      /* 草稿损坏则用默认 */
    }
    base[0].mag = 100;
    return { coeffs: base, dirs };
  }

  const initial = loadDraft();
  let coeffs = $state<HarmonicCoeff[]>(initial.coeffs);
  let dirs = $state<number[]>(initial.dirs);

  function toggleDir(i: number): void {
    dirs[i] = -dirs[i];
    saveDraft();
  }

  /** 带方向的行 → 有符号谐波（负 k = ⟲ 反转，与邀请码/引擎同一表示） */
  function signedCoeffs(): HarmonicCoeff[] {
    return coeffs.map((c, i) => ({ k: c.k * (dirs[i] ?? 1), mag: c.mag, phase: c.phase }));
  }

  /** 保存草稿（弹层关闭/参数变化时调用）。k 存有符号值——符号即旋转方向 */
  function saveDraft(): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(signedCoeffs()));
    } catch {
      /* 存储不可用则忽略 */
    }
  }

  const PRESETS: Record<string, { k: number; mag: number; phase: number }[]> = {
    圆环: [{ k: 1, mag: 100, phase: 0 }],
    椭圆: [
      { k: 1, mag: 100, phase: 0 },
      { k: 2, mag: 50, phase: 90 },
    ],
    花瓣: [
      { k: 1, mag: 80, phase: 0 },
      { k: 3, mag: 55, phase: 0 },
      { k: 5, mag: 28, phase: 0 },
    ],
    波纹: [
      { k: 1, mag: 100, phase: 0 },
      { k: 6, mag: 38, phase: 0 },
    ],
    锯齿: [
      { k: 1, mag: 120, phase: 0 },
      { k: 2, mag: 60, phase: 0 },
      { k: 3, mag: 40, phase: 0 },
      { k: 4, mag: 30, phase: 0 },
      { k: 5, mag: 24, phase: 0 },
      { k: 6, mag: 20, phase: 0 },
      { k: 7, mag: 17, phase: 0 },
      { k: 8, mag: 15, phase: 0 },
      { k: 9, mag: 13, phase: 0 },
      { k: 10, mag: 12, phase: 0 },
    ],
    心搏: [
      { k: 1, mag: 80, phase: 90 },
      { k: 2, mag: 50, phase: 180 },
      { k: 3, mag: 26, phase: 90 },
    ],
  };

  /**
   * 逆向导入当前关卡：把它的傅立叶分解填进滑杆——
   * "看，心形就是这些系数"，改一改就是自己的创作。
   */
  function importCurrentLevel(): void {
    const curve = engine.level?.curve;
    if (!curve) return;
    const rows = topHarmonics(curve, 10, 120);
    coeffs = Array.from({ length: 10 }, (_, i) => ({ k: i + 1, mag: 0, phase: 0 }));
    dirs = Array.from({ length: 10 }, () => 1);
    for (const h of rows) {
      const i = Math.abs(h.k) - 1;
      if (i >= 0 && i < 10 && h.mag > 0) {
        // topHarmonics 的相位是弧度；滑杆/存档用角度
        coeffs[i] = { k: Math.abs(h.k), mag: h.mag, phase: (h.phase * 180) / Math.PI };
        dirs[i] = h.k < 0 ? -1 : 1;
      }
    }
    saveDraft();
  }

  function applyPreset(name: string): void {
    const p = PRESETS[name];
    if (!p) return;
    coeffs = Array.from({ length: 10 }, (_, i) => ({ k: i + 1, mag: 0, phase: 0 }));
    dirs = Array.from({ length: 10 }, () => 1);
    for (const c of p) coeffs[c.k - 1] = { ...c };
    saveDraft();
  }

  let canvas: HTMLCanvasElement | undefined = $state();

  const activeCount = $derived(coeffs.filter((c) => c.mag > 0.5).length);
  const code = $derived(encodeCoeffs(signedCoeffs()));

  $effect(() => {
    // 预览小画布（乘 DPR 保证高分屏清晰）
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 150 * dpr;
    canvas.height = 150 * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const S = 150;
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
    ctx.beginPath();
    const N = 360;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      let x = 0;
      let y = 0;
      for (let i = 0; i < coeffs.length; i++) {
        const c = coeffs[i];
        if (c.mag <= 0.5) continue;
        const k = c.k * (dirs[i] ?? 1);
        x += c.mag * Math.cos(k * t + (c.phase * Math.PI) / 180);
        y += c.mag * Math.sin(k * t + (c.phase * Math.PI) / 180);
      }
      pts.push({ x, y });
    }
    let m = 0;
    for (const p of pts) m = Math.max(m, Math.hypot(p.x, p.y));
    const scale = m > 1 ? (S / 2 - 10) / m : 0;
    pts.forEach((p, i) => {
      const px = S / 2 + p.x * scale;
      const py = S / 2 + p.y * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = '#4fd1c5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  function setMag(k: number, v: number): void {
    coeffs[k - 1].mag = v;
    saveDraft();
  }
  function setPhase(k: number, v: number): void {
    coeffs[k - 1].phase = v;
    saveDraft();
  }

  function play(): void {
    if (activeCount === 0) return;
    engine.loadCustomLevel(
      signedCoeffs()
        .filter((c) => c.mag > 0.5)
        .map((c) => ({ k: c.k, mag: c.mag, phase: (c.phase * Math.PI) / 180 })),
      '创作关卡',
    );
    try {
      localStorage.removeItem(DRAFT_KEY); // 已发布，清除草稿
    } catch {
      /* 忽略 */
    }
    onclose();
  }
</script>

<div class="modal">
  <div class="box">
    <h2>🎨 谐波合成器</h2>
    <p class="lead">调节各频率的幅值与相位，合成你的专属曲线。生成后好友可用邀请码载入挑战。</p>
    <button
      type="button"
      class="pchip import"
      title="把当前关卡的傅立叶分解填进滑杆（逆向）"
      onclick={importCurrentLevel}>⤓ 逆向当前关</button
    >
    <div class="presets">
      <span class="plabel">预设</span>
      {#each Object.keys(PRESETS) as name (name)}
        <button type="button" class="pchip" onclick={() => applyPreset(name)}>{name}</button>
      {/each}
      <button
        type="button"
        class="pchip import"
        title="取当前关卡的主频率填进滑杆——合成器是单侧旋转曲线，画布即所得"
        onclick={importCurrentLevel}>⤓ 取当前关主频</button
      >
    </div>
    <canvas bind:this={canvas} width="150" height="150"></canvas>
    <div class="sliders">
      {#each coeffs as c, i (i)}
        <div class="row" class:active={c.mag > 0.5}>
          <button
            type="button"
            class="dir {(dirs[i] ?? 1) < 0 ? 'rev' : ''}"
            class:rev={(dirs[i] ?? 1) < 0}
            title="反转这根指针（⟲ 反转出花瓣/实曲线的关键）"
            aria-label={(dirs[i] ?? 1) < 0
              ? '当前 ⟲ 反转，点击改回 ⟲ 正转'
              : '当前 ⟳ 正转，点击改为 ⟲ 反转'}
            onclick={() => toggleDir(i)}
          >
            {(dirs[i] ?? 1) < 0 ? '⟲' : '⟳'}
          </button>
          <span class="k">{CIRCLED[i] || i + 1} {c.k}×</span>
          <input
            type="range"
            min="0"
            max="150"
            step="2"
            value={c.mag}
            oninput={(e) => setMag(i + 1, +(e.currentTarget as HTMLInputElement).value)}
          />
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={c.phase}
            oninput={(e) => setPhase(i + 1, +(e.currentTarget as HTMLInputElement).value)}
          />
        </div>
      {/each}
    </div>
    <p class="lead">启用谐波 {activeCount} 个 · 邀请码 <b>{code || '—'}</b></p>
    <div class="btns">
      <button class="primary" disabled={activeCount === 0} onclick={play}>🎮 生成并游玩</button>
      <button onclick={onclose}>关 闭</button>
    </div>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 14, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 60;
  }
  .box {
    width: min(94vw, 440px);
    /* 用 dvh：vh 在移动端包含地址栏，会算高导致底部按钮被推出屏幕 */
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    background: #10152a;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  }
  h2 {
    margin: 0 0 6px;
    letter-spacing: 2px;
  }
  .lead {
    font-size: 12px;
    color: var(--muted);
    margin: 4px 0 10px;
  }
  .lead b {
    color: var(--gold);
  }
  .presets {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .plabel {
    font-size: var(--fs-xs);
    color: var(--muted-2);
  }
  .pchip {
    font-size: var(--fs-xs);
    padding: 3px 10px;
    min-height: 24px;
    border-radius: 999px;
    color: var(--muted);
  }
  .pchip:hover:not(:disabled) {
    color: var(--cyan);
    border-color: rgba(79, 209, 197, 0.5);
    box-shadow: none;
  }
  /* 逆向导入当前关：与预设同款外框，但用青色系区分"这是分析不是预设" */
  .pchip.import {
    border-color: rgba(79, 209, 197, 0.55);
    color: var(--cyan, #4fd1c5);
  }
  .pchip.import:hover:not(:disabled) {
    border-color: rgba(79, 209, 197, 0.9);
  }
  canvas {
    width: 150px;
    height: 150px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #0d1120;
    margin-bottom: 10px;
  }
  .sliders {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
    opacity: 0.55;
  }
  .row.active {
    opacity: 1;
  }
  .row .k {
    width: 44px;
    text-align: left;
  }
  .row input[type='range'] {
    flex: 1;
    min-width: 0;
  }
  /* 每行的 ⟳/⟲ 方向切换（与游戏指针的同款语言） */
  .row .dir {
    width: 26px;
    min-height: 24px;
    padding: 0;
    border-radius: var(--r-sm);
    border: 1px solid var(--line-2, rgba(130, 150, 210, 0.3));
    background: none;
    color: var(--muted);
    font-size: var(--fs-sm);
    line-height: 1;
    cursor: pointer;
  }
  .row .dir.rev {
    color: #c084fc; /* ⟲ 反转：与指针面板同款紫 */
    border-color: rgba(192, 132, 252, 0.55);
  }
  .btns {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  /* 触屏：预设 chip 的热区补够 */
  @media (pointer: coarse), (max-width: 640px) {
    .pchip {
      min-height: 38px;
    }
  }
</style>
