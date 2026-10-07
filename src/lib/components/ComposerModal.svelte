<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { encodeCoeffs, type HarmonicCoeff } from '../game/levels';
  import { CIRCLED, DRAFT_KEY } from '../game/constants';
  import { topHarmonics } from '../game/math';

  let { onclose }: { onclose: () => void } = $props();

  /**
   * 20 行槽位：0~9 = ⟳ 正转（k = +1..+10），10~19 = ⟲ 反转（k = −1..−10）。
   * 行的 k 由槽位决定、不可改——⟳/⟲ 成对可同时启用，才能创作出"实曲线"。
   */
  function emptyRows(): HarmonicCoeff[] {
    return Array.from({ length: 20 }, (_, i) => ({
      k: i < 10 ? i + 1 : -(i - 9),
      mag: 0,
      phase: 0,
    }));
  }

  /** 恢复上次编辑的草稿（无草稿时给一个 1×=100 的起点） */
  function loadDraft(): HarmonicCoeff[] {
    const rows = emptyRows();
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      if (Array.isArray(raw)) {
        for (const c of raw) {
          if (typeof c?.k === 'number' && c.k !== 0 && Math.abs(c.k) <= 10) {
            const i = c.k > 0 ? c.k - 1 : 9 - c.k; // +k → 槽 k−1；−k → 槽 9+(|k|−1)
            if (i >= 0 && i < 20) rows[i] = { k: c.k, mag: +c.mag || 0, phase: +c.phase || 0 };
          }
        }
        return rows;
      }
    } catch {
      /* 草稿损坏则用默认 */
    }
    rows[0].mag = 100;
    return rows;
  }

  let coeffs = $state<HarmonicCoeff[]>(loadDraft());
  /** 折叠未启用行的偏好：持久化（与音量等偏好同一哲学） */
  let showOnlyActive = $state(
    ((): boolean => {
      try {
        return localStorage.getItem('fft-pointers-composer-filter-v1') === '1';
      } catch {
        return false;
      }
    })(),
  );

  let copied = $state(false);

  /** 复制邀请码给好友（1.5s 后恢复按钮文案） */
  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* 剪贴板不可用则忽略 */
    }
  }

  /** 作品名：玩家可给创作关起名，结算卡与续玩存档都用它 */
  let levelName = $state(
    ((): string => {
      try {
        return localStorage.getItem('fft-pointers-composer-name-v1') ?? '';
      } catch {
        return '';
      }
    })(),
  );

  function saveNamePref(v: string): void {
    try {
      localStorage.setItem('fft-pointers-composer-name-v1', v);
    } catch {
      /* 存储不可用则忽略 */
    }
  }

  function setFilterPref(v: boolean): void {
    showOnlyActive = v;
    try {
      localStorage.setItem('fft-pointers-composer-filter-v1', v ? '1' : '0');
    } catch {
      /* 存储不可用则忽略 */
    }
  }

  /** 保存草稿（弹层关闭/参数变化时调用）。k 存有符号值——符号即旋转方向 */
  function saveDraft(): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(coeffs));
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
    // 20 槽正好容纳 ±k 成对分量；相位从弧度转成角度（滑杆/存档口径）
    coeffs = topHarmonics(curve, 20, 120).map((h) => ({
      ...h,
      phase: (h.phase * 180) / Math.PI,
    }));
    saveDraft();
  }

  function applyPreset(name: string): void {
    const p = PRESETS[name];
    if (!p) return;
    coeffs = emptyRows();
    for (const c of p) {
      const i = c.k > 0 ? c.k - 1 : 9 - c.k;
      if (i >= 0 && i < 20) coeffs[i] = { ...c };
    }
    saveDraft();
  }

  let canvas: HTMLCanvasElement | undefined = $state();

  const activeCount = $derived(coeffs.filter((c) => c.mag > 0.5).length);
  const code = $derived(encodeCoeffs(coeffs));

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
        x += c.mag * Math.cos(c.k * t + (c.phase * Math.PI) / 180);
        y += c.mag * Math.sin(c.k * t + (c.phase * Math.PI) / 180);
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
      coeffs
        .filter((c) => c.mag > 0.5)
        .map((c) => ({ k: c.k, mag: c.mag, phase: (c.phase * Math.PI) / 180 })),
      levelName.trim() || '创作关卡',
    );
    try {
      localStorage.removeItem(DRAFT_KEY); // 已发布，清除草稿
    } catch {
      /* 忽略 */
    }
    onclose();
  }
</script>

<!-- Esc 关闭：与其他弹层（成就/设置/通关）同一交互 -->
<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') onclose();
  }}
/>

<div class="modal">
  <div class="box">
    <h2>🎨 谐波合成器</h2>
    <p class="lead">调节各频率的幅值与相位，合成你的专属曲线。生成后好友可用邀请码载入挑战。</p>
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
      <button
        type="button"
        class="pchip"
        class:rev={showOnlyActive}
        disabled={activeCount === 0}
        title={activeCount === 0
          ? '还没有启用的谐波，先拉高某行的幅值'
          : '只显示已启用（幅值 > 0）的行'}
        aria-pressed={showOnlyActive}
        onclick={() => setFilterPref(!showOnlyActive)}>⦿ 已启用</button
      >
    </div>
    <div class="sliders">
      {#each coeffs as c, i (i)}
        {#if i === 10}
          <div class="neg-label">⟲ 反转（负频率）</div>
        {/if}
        {#if !showOnlyActive || c.mag > 0.5}
          <div class="row" class:active={c.mag > 0.5}>
            <span class="side" class:rev={c.k < 0}>{c.k < 0 ? '⟲' : '⟳'}</span>
            <span class="k">{CIRCLED[Math.abs(c.k) - 1] || Math.abs(c.k)} {Math.abs(c.k)}×</span>
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
        {/if}
      {/each}
    </div>
    <input
      class="name-input"
      placeholder="给作品起个名字（可选，最多 12 字）"
      maxlength="12"
      bind:value={levelName}
      onblur={() => saveNamePref(levelName)}
    />
    <canvas bind:this={canvas} width="150" height="150"></canvas>
    <p class="lead">
      启用谐波 {activeCount} 个 · 邀请码 <b>{code || '—'}</b>
      {#if code}
        <button
          type="button"
          class="pchip"
          title="复制邀请码，好友在邀请码输入框粘贴即可挑战同一关"
          onclick={copyCode}>{copied ? '✓ 已复制' : '📋 复制'}</button
        >
      {/if}
    </p>
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
  .name-input {
    width: 100%;
    margin-bottom: 8px;
    padding: 7px 9px;
    border-radius: var(--r-sm);
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text);
    font-size: var(--fs-sm);
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
  /* 反转行的 ⟲ 徽标（负频率：与指针面板同款紫） */
  .row .side.rev {
    color: #c084fc;
  }
  /* ⟲ 反转（负频率）分隔条：把 20 行分成正/反两组 */
  .neg-label {
    margin: 4px 0 2px;
    font-size: var(--fs-xs);
    color: #c084fc;
    text-align: center;
    letter-spacing: 1px;
  }
  .btns {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  /* 触屏：预设 chip 的热区补够 */
  @media (pointer: coarse), (max-width: 640px) {
    .name-input {
      width: 100%;
      margin-bottom: 8px;
      padding: 7px 9px;
      border-radius: var(--r-sm);
      border: 1px solid var(--line-2);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
      font-size: var(--fs-sm);
    }

    .pchip {
      min-height: 38px;
    }
  }
</style>
