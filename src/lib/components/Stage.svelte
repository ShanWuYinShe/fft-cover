<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { chainAt, tipAt } from '../game/math';
  import type { Vec } from '../game/types';
  import { RUN_DUR, SIZE, T0 } from '../game/constants';
  import { collectSound, finishChord, perfectArpeggio, startPad, stopPad } from '../game/audio';
  import { spectrumGaps } from '../game/scoring';

  let canvas: HTMLCanvasElement | undefined = $state();
  let ctx: CanvasRenderingContext2D | null = null;
  /** 拖拽中的指针下标（-1 = 无；编辑态拖关节调半径/相位） */
  let dragIdx = -1;
  /** ghost 轨迹缓存与参数签名（参数未变时跳过重建） */
  let ghostSig = '';
  let ghostPathCache: Path2D | null = null;

  /** CSS 像素 → 画布逻辑坐标 */
  function toLocal(ev: PointerEvent): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const k = SIZE / rect.width;
    return { x: (ev.clientX - rect.left) * k, y: (ev.clientY - rect.top) * k };
  }

  /** 编辑态命中关节：返回被拖指针的下标 */
  function hitJoint(x: number, y: number): number {
    if (engine.phase !== 'edit') return -1;
    const joints = chainAt(engine.arms, 0);
    for (let i = 1; i < joints.length; i++) {
      if (Math.hypot(joints[i].x - x, joints[i].y - y) < 16) {
        let n = -1;
        for (let k = 0; k < engine.arms.length; k++) {
          if (engine.arms[k].on) {
            n++;
            if (n === i - 1) return k;
          }
        }
      }
    }
    return -1;
  }

  function onPointerDown(ev: PointerEvent): void {
    const { x, y } = toLocal(ev);
    dragIdx = hitJoint(x, y);
    if (dragIdx >= 0) {
      engine.markFlag('dragUsed');
      engine.markFlag('dragUsed');
      try {
        canvas?.setPointerCapture(ev.pointerId);
      } catch {
        /* 合成事件无有效 pointerId 时忽略 */
      }
    }
  }

  function onPointerMove(ev: PointerEvent): void {
    if (dragIdx < 0 || !canvas) return;
    const { x, y } = toLocal(ev);
    const joints = chainAt(engine.arms, 0);
    let n = -1;
    let start: Vec = { x: SIZE / 2, y: SIZE / 2 };
    for (let k = 0; k < engine.arms.length; k++) {
      if (!engine.arms[k].on) continue;
      n++;
      if (k === dragIdx) {
        start = joints[n]; // 本根起点 = 前一关节，不随拖动改变
        break;
      }
    }
    const r = Math.max(0, Math.min(210, Math.hypot(x - start.x, y - start.y)));
    let phase = Math.atan2(y - start.y, x - start.x);
    if (phase < 0) phase += Math.PI * 2;
    engine.setArm(dragIdx, { r: Math.round(r), phase });
    engine.flashArm(dragIdx);
    dragInfo = {
      x: joints[n].x + Math.min(90, r) * 0.5 + 30,
      y: joints[n].y - 24,
      r: Math.round(r),
      deg: Math.round((phase * 180) / Math.PI),
    };
  }

  function onPointerUp(): void {
    dragIdx = -1;
    dragInfo = null;
  }

  /** 拖拽中的实时数值（画布提示用） */
  let dragInfo: { x: number; y: number; r: number; deg: number } | null = $state(null);

  function resize(): void {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    ctx = canvas.getContext('2d');
    ctx?.setTransform(canvas.width / SIZE, 0, 0, canvas.width / SIZE, 0, 0);
  }

  /** 频谱仪：右上角实时显示各启用指针的频率与半径——玩家正在编辑的傅立叶系数 */
  function drawSpectrum(): void {
    const on = engine.arms.filter((a) => a.on);
    if (on.length === 0 || !ctx) return;
    const x0 = SIZE - 148;
    const y0 = 70; // 位于 HUD 文字下方，大小屏均不重叠
    ctx.fillStyle = 'rgba(10,14,26,.6)';
    ctx.fillRect(x0 - 10, y0, 148, 64);
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.strokeRect(x0 - 10, y0, 148, 64);
    ctx.fillStyle = 'rgba(139,147,167,.95)';
    ctx.font = '10px sans-serif';
    ctx.fillText('频谱 |rₖ|', x0 - 4, y0 + 12);
    if (engine.spectrumCompare) {
      ctx.fillStyle = 'rgba(251,191,36,.9)';
      ctx.fillText('金框=目标', x0 + 44, y0 + 12);
    }
    const zx = x0 - 1 + 64;
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(zx, y0 + 18);
    ctx.lineTo(zx, y0 + 58);
    ctx.stroke();
    // 目标频谱对比（金色描边柱）：对齐它 = 完美拟合
    if (engine.spectrumCompare && engine.level) {
      for (const s of engine.level.spectrum) {
        if (s.mag < 2) continue;
        const px = x0 - 1 + (s.k + 10) * 6.4;
        const h = Math.max(2, (s.mag / 210) * 34);
        ctx.strokeStyle = 'rgba(251,191,36,.85)';
        ctx.strokeRect(px - 2.5, y0 + 58 - h, 5, h);
      }
    }
    for (const a of on) {
      const px = x0 - 1 + (a.freq + 10) * 6.4;
      const h = Math.max(2, (a.r / 210) * 34);
      ctx.fillStyle = a.freq < 0 ? 'rgba(167,139,250,.9)' : 'rgba(79,209,197,.9)';
      ctx.fillRect(px - 2.5, y0 + 58 - h, 5, h);
    }
  }

  function draw(now: number): void {
    if (!ctx || !engine.level) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // 网格底纹
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let g = 80; g < SIZE; g += 80) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(SIZE, g);
      ctx.stroke();
    }

    // 原点十字
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 7, SIZE / 2);
    ctx.lineTo(SIZE / 2 + 7, SIZE / 2);
    ctx.moveTo(SIZE / 2, SIZE / 2 - 7);
    ctx.lineTo(SIZE / 2, SIZE / 2 + 7);
    ctx.stroke();

    // 编辑态：目标曲线参考（暗金虚线）+ 幽灵预览轨迹（紫）
    // ghost 按"参数签名"缓存重建，参数未变时零成本复用
    if (engine.phase === 'edit') {
      const curve = engine.level.curve;
      ctx.strokeStyle = 'rgba(251,191,36,.32)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      for (let i = 0; i < curve.length; i++) {
        const p = curve[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      const sig = engine.arms
        .map((a) => (a.on ? 1 : 0) + a.r + ':' + a.freq + ':' + a.phase.toFixed(3))
        .join('|');
      if (sig !== ghostSig || !ghostPathCache) {
        ghostSig = sig;
        ghostPathCache = new Path2D();
        const N = 720;
        for (let i = 0; i <= N; i++) {
          const p = tipAt(engine.arms, (i / N) * T0);
          if (i === 0) ghostPathCache.moveTo(p.x, p.y);
          else ghostPathCache.lineTo(p.x, p.y);
        }
      }
      ctx.strokeStyle = 'rgba(167,139,250,.4)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 6]);
      ctx.stroke(ghostPathCache);
      ctx.setLineDash([]);
    }

    // 运行进度条（顶部，避开圆角）；沙盒不设时限，仅显示标记
    if (engine.phase === 'running' || engine.phase === 'paused') {
      if (engine.sandbox) {
        ctx.fillStyle = 'rgba(167,139,250,.85)';
        ctx.font = '11px sans-serif';
        ctx.fillText('🧪 沙盒模式 · 无限时 · 实时调参', 10, 15);
      } else {
        ctx.fillStyle = 'rgba(79,209,197,.55)';
        ctx.fillRect(4, 4, (engine.t / RUN_DUR) * (SIZE - 8), 3);
        if (engine.collectedCount === engine.total && engine.collectedCount > 0) {
          ctx.fillStyle = 'rgba(251,191,36,.95)';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('✨ 全清！3 秒后自动结算', 10, 30);
        } else if (engine.phase === 'paused' && engine.collectedCount > 0) {
          // 暂停时的偏差诊断：告诉玩家最该调整哪两个频率
          const gaps = spectrumGaps(engine.level.spectrum, engine.arms);
          if (gaps.length > 0) {
            ctx.fillStyle = 'rgba(251,191,36,.95)';
            ctx.font = '11px sans-serif';
            const parts = gaps.map(
              (g) =>
                (g.sign > 0 ? '' : '−') +
                Math.abs(g.k) +
                '× 差 ' +
                Math.round(g.mag) +
                (g.sign > 0 ? '' : '（过量）'),
            );
            ctx.fillText('暂停诊断：' + parts.join('　'), 10, 30);
          }
        }
      }
    }

    // 目标点
    const pts = engine.level.pts;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (engine.collected.has(i)) {
        const age = (now - (engine.collectAnim.get(i) ?? 0)) / 400;
        const burst = age < 1 ? (1 - age) * 10 : 0;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = 'rgba(251,191,36,.9)';
        ctx.shadowBlur = 12 + burst * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5 + burst * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(220,228,255,.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,228,255,.18)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, engine.level.tol, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 运行尾迹：分 48 组批量绘制（组内共享透明度），drawcall 数量级下降
    if (engine.trail.length > 1 && engine.phase !== 'edit') {
      ctx.lineCap = 'round';
      const trail = engine.trail;
      const GROUPS = 48;
      const per = Math.ceil(trail.length / GROUPS);
      for (let g = 0; g < GROUPS; g++) {
        const startIdx = g * per;
        const endIdx = Math.min(trail.length - 1, startIdx + per);
        if (startIdx >= endIdx) continue;
        const a = endIdx / trail.length;
        ctx.strokeStyle = 'rgba(79,209,197,' + (a * 0.75).toFixed(3) + ')';
        ctx.lineWidth = 1 + a * 1.8;
        ctx.beginPath();
        ctx.moveTo(trail[startIdx].x, trail[startIdx].y);
        for (let i = startIdx + 1; i <= endIdx; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
      }
    }

    // 幽灵竞速：上届解法的轨迹同屏（金色虚线），直观对比当前方案
    if (engine.phase !== 'edit' && engine.hasSavedArms() && engine.level) {
      const saved = engine.armsSaves[engine.level.id];
      const cur = engine.arms
        .map((a) => a.r + ':' + a.freq + ':' + Math.round((a.phase * 180) / Math.PI))
        .join();
      const sv = saved
        .map((a) => a.r + ':' + a.freq + ':' + Math.round((a.phase * 180) / Math.PI))
        .join();
      if (cur !== sv) {
        const ghost = new Path2D();
        const M = 480;
        const from = Math.max(0, engine.t - T0);
        for (let i = 0; i <= M; i++) {
          const p = tipAt(saved, from + ((engine.t - from) * i) / M);
          if (i === 0) ghost.moveTo(p.x, p.y);
          else ghost.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(251,191,36,.5)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([2, 5]);
        ctx.stroke(ghost);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(251,191,36,.75)';
        ctx.font = '10px sans-serif';
        ctx.fillText('👻 上届解法', 10, SIZE - 12);
      }
    }

    // 指针链
    const tt = engine.phase === 'edit' ? 0 : engine.t;
    const joints = chainAt(engine.arms, tt);
    let enabledIdx = 0;
    for (let i = 1; i < joints.length; i++) {
      while (!engine.arms[enabledIdx].on) enabledIdx++;
      const idx = enabledIdx++;
      const a = engine.arms[idx];
      const hot = dragIdx === idx || now < engine.flashTil[idx];
      const c = joints[i - 1];
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = hot ? 'rgba(251,191,36,.95)' : 'rgba(230,233,242,.55)';
      ctx.lineWidth = hot ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(joints[i].x, joints[i].y);
      ctx.stroke();
      ctx.fillStyle = hot ? '#fbbf24' : '#a78bfa';
      ctx.shadowColor = hot ? 'rgba(251,191,36,.9)' : 'rgba(167,139,250,.8)';
      ctx.shadowBlur = hot ? 12 : 6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 尖端
    const tip = joints[joints.length - 1];
    ctx.fillStyle = '#4fd1c5';
    ctx.shadowColor = 'rgba(79,209,197,1)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 全清冲击波：收集全部点时金色圆环自中心扩散
    if (engine.fullClearAt > 0) {
      const age = (now - engine.fullClearAt) / 1200;
      if (age < 1) {
        ctx.strokeStyle = 'rgba(251,191,36,' + ((1 - age) * 0.8).toFixed(3) + ')';
        ctx.lineWidth = 8 * (1 - age) + 1;
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, 20 + age * 440, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    // 拖拽实时数值提示
    if (dragInfo && dragIdx >= 0 && engine.phase === 'edit') {
      const label = dragInfo.r + ' · ' + dragInfo.deg + '°';
      ctx.font = 'bold 13px sans-serif';
      const w = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(10,14,26,.85)';
      ctx.fillRect(dragInfo.x - 6, dragInfo.y - 16, w + 12, 22);
      ctx.strokeStyle = 'rgba(251,191,36,.7)';
      ctx.strokeRect(dragInfo.x - 6, dragInfo.y - 16, w + 12, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(label, dragInfo.x, dragInfo.y);
    }

    drawSpectrum();
  }

  onMount(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas) ro.observe(canvas);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (engine.phase === 'running') {
        startPad(engine.soundOn); // 幂等：已在响则忽略
        const { got, finished } = engine.advance(dt);
        if (got > 0) collectSound(engine.collectedCount, engine.soundOn);
        if (finished) {
          if (engine.collectedCount === engine.total) perfectArpeggio(engine.soundOn);
          else finishChord(engine.soundOn);
        }
      } else {
        stopPad();
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  });
</script>

<canvas
  bind:this={canvas}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onclick={() => {
    if (engine.phase === 'done' && engine.resultDismissed) engine.resultDismissed = false;
  }}
></canvas>
