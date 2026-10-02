<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { chainAt, tipAt } from '../game/math';
  import { RUN_DUR, SIZE, T0 } from '../game/constants';
  import { collectSound, finishChord, perfectArpeggio } from '../game/audio';

  let canvas: HTMLCanvasElement | undefined = $state();
  let ctx: CanvasRenderingContext2D | null = null;

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
    const y0 = 40;
    ctx.fillStyle = 'rgba(10,14,26,.6)';
    ctx.fillRect(x0 - 10, y0, 148, 64);
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.strokeRect(x0 - 10, y0, 148, 64);
    ctx.fillStyle = 'rgba(139,147,167,.95)';
    ctx.font = '10px sans-serif';
    ctx.fillText('频谱 |rₖ|（你的傅立叶系数）', x0 - 4, y0 + 12);
    const zx = x0 - 1 + 64;
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(zx, y0 + 18);
    ctx.lineTo(zx, y0 + 58);
    ctx.stroke();
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

    // 编辑态：目标曲线参考（暗金虚线）+ 幽灵预览轨迹（紫，每帧重建以响应参数变化）
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
      const ghost = new Path2D();
      const N = 720;
      for (let i = 0; i <= N; i++) {
        const p = tipAt(engine.arms, (i / N) * T0);
        if (i === 0) ghost.moveTo(p.x, p.y);
        else ghost.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(167,139,250,.4)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 6]);
      ctx.stroke(ghost);
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

    // 运行尾迹
    if (engine.trail.length > 1 && engine.phase !== 'edit') {
      ctx.lineCap = 'round';
      const trail = engine.trail;
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = 'rgba(79,209,197,' + (a * 0.75).toFixed(3) + ')';
        ctx.lineWidth = 1 + a * 1.8;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    // 指针链
    const tt = engine.phase === 'edit' ? 0 : engine.t;
    const joints = chainAt(engine.arms, tt);
    let enabledIdx = 0;
    for (let i = 1; i < joints.length; i++) {
      while (!engine.arms[enabledIdx].on) enabledIdx++;
      const a = engine.arms[enabledIdx++];
      const c = joints[i - 1];
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230,233,242,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(joints[i].x, joints[i].y);
      ctx.stroke();
      ctx.fillStyle = '#a78bfa';
      ctx.shadowColor = 'rgba(167,139,250,.8)';
      ctx.shadowBlur = 6;
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
        const { got, finished } = engine.advance(dt);
        if (got > 0) collectSound(engine.collectedCount, engine.soundOn);
        if (finished) {
          if (engine.collectedCount === engine.total) perfectArpeggio(engine.soundOn);
          else finishChord(engine.soundOn);
        }
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
  onclick={() => {
    if (engine.phase === 'done' && engine.resultDismissed) engine.resultDismissed = false;
  }}
></canvas>
