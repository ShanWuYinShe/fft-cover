<script lang="ts">
  import Icon from './Icon.svelte';
  import Modal from './base/Modal.svelte';
  import Button from './base/Button.svelte';
  import { engine } from '../game/engine.svelte';
  import { uiState } from '../stores/uiState.svelte';
  import { uiChime } from '../game/audio';
  import { untrack } from 'svelte';
  import { encodeCoeffs, type HarmonicCoeff } from '../game/levels';
  import { CIRCLED, DRAFT_KEY } from '../game/constants';
  import { topHarmonics } from '../game/math';

  let { onclose }: { onclose: () => void } = $props();

  // 合成器展开的一声编钟——App 的弹层监听不覆盖这个本地开关，挂载即展开。
  // untrack：只认「挂载」这一次，不跟随 soundOn 变化重放
  $effect(() => {
    untrack(() => uiChime(engine.soundOn));
  });

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
      // 剪贴板不可用不再静默（r45 通则）：toast 明确告知失败
      uiState.setShareNote('邀请码复制失败，请重试');
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
    appliedPreset = '';
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
    appliedPreset = name;
    saveDraft();
  }

  /** 当前生效的预设名：芯片点亮用；手动改任何滑杆即转为自定义 */
  let appliedPreset = $state('');

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
    ctx.strokeStyle = 'rgba(74, 168, 216, 0.24)';
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
    ctx.strokeStyle = '#e2552a';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  function setMag(k: number, v: number): void {
    coeffs[k - 1].mag = v;
    appliedPreset = '';
    saveDraft();
  }
  function setPhase(k: number, v: number): void {
    coeffs[k - 1].phase = v;
    appliedPreset = '';
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
    // 生成并游玩：顺手收起星图抽屉——玩家刚造好自己的星轨，
    // 应该立刻满幅看到它，而不是隔着一层抽屉（第二十四轮实测）
    uiState.closeStarmap();
    onclose();
  }
</script>

<Modal title="✦ 浑天璇玑 · 谐波星盘" size="md" {onclose}>
  <p class="lead">调校各阶谐波幅值与周天宿度，铸造全新星轨。生成后可用密符邀好友破题。</p>
  <div class="presets">
    <span class="plabel">预设</span>
    {#each Object.keys(PRESETS) as name (name)}
      <button
        type="button"
        class="pchip"
        class:active={appliedPreset === name}
        onclick={() => applyPreset(name)}>{name}</button
      >
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

  <div class="composer-layout">
    <div class="preview-pane">
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
    </div>

    <div class="composer-body">
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
              <b class="val">{c.mag}</b>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={c.phase}
                oninput={(e) => setPhase(i + 1, +(e.currentTarget as HTMLInputElement).value)}
              />
              <b class="val val-deg">{c.phase}°</b>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="primary" size="md" disabled={activeCount === 0} onclick={play}>
      🎮 生成并游玩
    </Button>
    <Button variant="ghost" size="md" onclick={onclose}>关 闭</Button>
  {/snippet}
</Modal>

<style>
  .composer-body {
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .lead {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.6;
    color: var(--muted);
  }

  .lead b {
    color: var(--coral-edge);
    font-variant-numeric: tabular-nums;
  }

  .presets {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .plabel {
    font-size: var(--fs-xs);
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--muted-2);
  }

  /* 预设芯片：白药丸厚键 */
  .pchip.active {
    background: var(--face-jade);
    border-color: var(--mint-edge);
    color: var(--mint-ink);
  }

  .pchip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--r-pill);
    border: 2px solid #ffffff;
    background: var(--mat-block);
    box-shadow: var(--sh-1);
    color: var(--muted);
    font-family: var(--font-round);
    font-size: 12.5px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 0.12s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }

  .pchip:hover:not(:disabled) {
    color: var(--coral-edge);
    box-shadow: var(--sh-2);
  }

  .pchip:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  .pchip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pchip.import {
    border-color: var(--mint-bright);
    color: var(--mint-edge);
  }

  .pchip.import:hover:not(:disabled) {
    color: var(--mint-edge);
    background: var(--note-bg);
  }

  /* 已启用过滤：选中 = 薄荷 */
  .pchip.rev {
    background: var(--face-jade);
    border-color: var(--mint-edge);
    color: var(--mint-ink);
    box-shadow: 0 3px 0 var(--mint-edge);
  }

  /* 作品名输入：浅蓝凹槽 */
  .name-input {
    width: 100%;
    margin-bottom: 12px;
    padding: 9px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line-bright);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    color: var(--text);
    font-size: var(--fs-sm);
    font-weight: 600;
  }

  .name-input::placeholder {
    color: var(--muted-2);
  }

  .name-input:focus {
    outline: none;
    border-color: var(--coral-text);
  }

  .name-input:focus-visible {
    outline: 3px solid var(--coral);
    outline-offset: 2px;
  }

  /* 双栏（第二十九轮实测 40 根滑块把 150px 预览挤出视口造成盲编辑）：
     左=预览窗格（名字/画布/邀请码）固定不滚，右=参数列表独立内滚，
     曲线永远在眼前。窄屏收成上下两段（预览在上不滚、滑块内滚） */
  .composer-layout {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 10px;
    height: min(56vh, 500px);
    min-height: 300px;
  }
  .preview-pane {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
    padding: 4px 2px;
  }
  canvas {
    width: 150px;
    height: 150px;
    border: 3px solid #ffffff;
    border-radius: var(--r-md);
    background: #ffffff;
    box-shadow: var(--mat-block-shadow);
  }

  @media (max-width: 720px) {
    .composer-layout {
      grid-template-columns: 1fr;
      height: min(58vh, 460px);
    }
    .preview-pane {
      flex: 0 0 auto;
      overflow: visible;
    }
    .composer-body {
      flex: 1 1 auto;
    }
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    margin-bottom: 12px;
  }

  /* 数值读出：tabular 对齐，读得回设定值（精度工具的基本功） */
  .row .val {
    min-width: 26px;
    text-align: right;
    font-size: 12px;
    font-weight: 800;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .row .val-deg {
    min-width: 40px;
  }

  /* 每一阶谐波 = 自己的白卡面 */
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--muted-2);
    transition:
      border-color 0.14s ease,
      color 0.14s ease;
  }

  .row.active {
    border-color: var(--mint-bright);
    color: var(--text);
  }

  .row .side {
    flex: 0 0 auto;
    color: var(--mint-edge);
    font-weight: 900;
  }

  .row .side.rev {
    color: var(--grape-deep);
  }

  .row .k {
    flex: 0 0 auto;
    width: 48px;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }

  .row input[type='range'] {
    flex: 1;
    min-width: 0;
    accent-color: var(--coral-text);
  }

  /* 触屏命中 ≥40：裸 range 原生盒只有 ~21px，触屏下拉满滑杆行高令牌
     （令牌表：--ctl-md 即「滑杆行高」；桌面鼠标精度优先保持原生紧凑） */
  @media (pointer: coarse) {
    .row input[type='range'] {
      height: var(--ctl-md);
    }
  }

  .neg-label {
    margin: 8px 0 2px;
    font-size: 12.5px;
    font-weight: 900;
    color: var(--grape-deep);
    text-align: center;
    letter-spacing: 1px;
  }

  @media (pointer: coarse), (max-width: 640px) {
    .pchip {
      min-height: 40px;
    }
  }
</style>
