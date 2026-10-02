<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { chainAt, tipAt } from '../game/math';
  import type { Vec } from '../game/types';
  import { RUN_DUR, SIZE, T0 } from '../game/constants';
  import { collectSound, finishChord, perfectArpeggio, solveDone, solveTick } from '../game/audio';
  import { spectrumGaps } from '../game/scoring';

  let canvas: HTMLCanvasElement | undefined = $state();
  /** 自动拟合音效的进度档位（-1 = 未在拟合） */
  let lastSolveStep = -1;
  let ctx: CanvasRenderingContext2D | null = null;
  /** 拖拽中的指针下标（-1 = 无；编辑态拖关节调半径/相位） */
  let dragIdx = -1;
  /** ghost 轨迹缓存与参数签名（参数未变时跳过重建） */
  let ghostSig = '';
  let ghostPathCache: Path2D | null = null;
  /** 编辑态预览：当前参数下幽灵轨迹能扫到的点索引 */
  let previewHits: Set<number> = new Set();

  /* ---------- 视图缩放/平移 ---------- */
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  /** 缩放倍率 */
  let zoom = $state(1);
  /** 视图中心相对画布中心的偏移（逻辑坐标） */
  let panX = $state(0);
  let panY = $state(0);
  /** 多指管理（捏合缩放/平移） */
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let pinchZoom = 1;
  let pinchMid = { x: 0, y: 0 };
  /** 单指/鼠标平移模式（中键、右键、Shift+拖动；触屏为单指空白处拖动） */
  let panning = false;
  let panStart = { x: 0, y: 0 };
  let panOrigin = { x: 0, y: 0 };

  const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  function resetView(): void {
    zoom = 1;
    panX = 0;
    panY = 0;
  }
  function zoomBy(factor: number): void {
    zoom = clampZoom(zoom * factor);
  }

  /** 屏幕(CSS 像素) → 画布逻辑坐标（含缩放与平移的反映射） */
  function screenToLogical(clientX: number, clientY: number): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const k = SIZE / rect.width; // CSS → 画布像素
    const sx = (clientX - rect.left) * k;
    const sy = (clientY - rect.top) * k;
    return {
      x: (sx - SIZE / 2) / zoom + SIZE / 2 + panX,
      y: (sy - SIZE / 2) / zoom + SIZE / 2 + panY,
    };
  }

  function toLocal(ev: PointerEvent): { x: number; y: number } {
    return screenToLogical(ev.clientX, ev.clientY);
  }

  /** 以某个屏幕点为锚点缩放（保持该点下的内容不动） */
  function zoomAt(clientX: number, clientY: number, factor: number): void {
    const before = screenToLogical(clientX, clientY);
    zoom = clampZoom(zoom * factor);
    const after = screenToLogical(clientX, clientY);
    panX += before.x - after.x;
    panY += before.y - after.y;
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(e.clientX, e.clientY, factor);
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
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    // 双指：进入捏合/平移模式（不拖关节）
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchZoom = zoom;
      pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      dragIdx = -1;
      dragInfo = null;
      return;
    }
    if (pointers.size > 2) return;
    const { x, y } = toLocal(ev);
    const hit = hitJoint(x, y);
    // 平移：中键/右键、Shift+拖动，或在触屏上按住空白处拖动（关节命中时优先拖关节）
    const wantPan =
      ev.button === 1 || ev.button === 2 || ev.shiftKey || (hit < 0 && ev.pointerType === 'touch');
    if (wantPan && hit < 0) {
      panning = true;
      panStart = { x: ev.clientX, y: ev.clientY };
      panOrigin = { x: panX, y: panY };
      dragIdx = -1;
      dragInfo = null;
      try {
        canvas?.setPointerCapture(ev.pointerId);
      } catch {
        /* 合成事件无有效 pointerId 时忽略 */
      }
      return;
    }
    dragIdx = hit;
    if (dragIdx >= 0) {
      engine.beginArmEdit(); // 整段拖动合并为一条撤销记录
      engine.markFlag('dragUsed');
      try {
        canvas?.setPointerCapture(ev.pointerId);
      } catch {
        /* 合成事件无有效 pointerId 时忽略 */
      }
    }
  }

  function onPointerMove(ev: PointerEvent): void {
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    // 单指/鼠标平移
    if (panning && canvas) {
      const rect = canvas.getBoundingClientRect();
      const k = SIZE / rect.width;
      panX = panOrigin.x - ((ev.clientX - panStart.x) * k) / zoom;
      panY = panOrigin.y - ((ev.clientY - panStart.y) * k) / zoom;
      return;
    }

    // 双指：捏合缩放 + 中点平移
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (canvas) {
        // 先按两指距离比例缩放（以中点为锚点）
        const target = clampZoom(pinchZoom * (dist / pinchDist));
        const factor = target / zoom;
        if (Math.abs(factor - 1) > 0.001) zoomAt(mid.x, mid.y, factor);
        // 再跟随中点位移平移（1:1 屏幕像素 → 逻辑像素）
        const rect = canvas.getBoundingClientRect();
        const k = SIZE / rect.width;
        panX -= ((mid.x - pinchMid.x) * k) / zoom;
        panY -= ((mid.y - pinchMid.y) * k) / zoom;
        pinchMid = mid;
      }
      return;
    }

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

  function onPointerUp(ev: PointerEvent): void {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (dragIdx >= 0) engine.endArmEdit();
    panning = false;
    dragIdx = -1;
    dragInfo = null;
  }

  /** 双击画布：复位视图 */
  function onDblClick(): void {
    resetView();
  }

  /** 右键用于平移，屏蔽浏览器菜单 */
  function onContextMenu(e: MouseEvent): void {
    e.preventDefault();
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
  /** 频谱仪：右上角精致面板，实时显示各启用指针的频率与半径 */
  function drawSpectrum(): void {
    const on = engine.arms.filter((a) => a.on);
    if (on.length === 0 || !ctx) return;
    const W = 152;
    const H = 74;
    const x0 = SIZE - W - 12;
    const y0 = 68;
    const radius = 10;

    // 面板背景（圆角 + 渐变 + 描边）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0 + radius, y0);
    ctx.arcTo(x0 + W, y0, x0 + W, y0 + H, radius);
    ctx.arcTo(x0 + W, y0 + H, x0, y0 + H, radius);
    ctx.arcTo(x0, y0 + H, x0, y0, radius);
    ctx.arcTo(x0, y0, x0 + W, y0, radius);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + H);
    grad.addColorStop(0, 'rgba(18,24,44,.88)');
    grad.addColorStop(1, 'rgba(11,15,30,.82)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.11)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    // 标题栏
    ctx.fillStyle = 'rgba(139,147,167,.92)';
    ctx.font = '9px sans-serif';
    ctx.fillText('频谱 |rₖ|', x0 + 9, y0 + 13);
    if (engine.spectrumCompare) {
      ctx.fillStyle = 'rgba(251,191,36,.9)';
      ctx.fillText('金框=目标', x0 + 62, y0 + 13);
    }
    // 标题分隔线
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath();
    ctx.moveTo(x0 + 8, y0 + 18);
    ctx.lineTo(x0 + W - 8, y0 + 18);
    ctx.stroke();

    const baseY = y0 + H - 10;
    const maxH = 34;
    const zx = x0 + 10 + 10 * 6.4;
    // 零频参考线与频率刻度
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.moveTo(zx, y0 + 22);
    ctx.lineTo(zx, baseY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(139,147,167,.5)';
    ctx.font = '7px sans-serif';
    ctx.fillText('0', zx - 2, baseY + 8);
    ctx.fillText('-10×', x0 + 10, baseY + 8);
    ctx.fillText('+10×', x0 + W - 26, baseY + 8);

    // 目标频谱（金色描边柱）
    if (engine.spectrumCompare && engine.level) {
      for (const s of engine.level.spectrum) {
        if (s.mag < 2) continue;
        const px = x0 + 10 + (s.k + 10) * 6.4;
        const h = Math.max(2, (s.mag / 210) * maxH);
        ctx.strokeStyle = 'rgba(251,191,36,.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 2.5, baseY - h, 5, h);
      }
    }
    // 玩家频谱柱（渐变填充）
    for (const a of on) {
      const px = x0 + 10 + (a.freq + 10) * 6.4;
      const h = Math.max(2, (a.r / 210) * maxH);
      const barGrad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      if (a.freq < 0) {
        barGrad.addColorStop(0, 'rgba(167,139,250,1)');
        barGrad.addColorStop(1, 'rgba(167,139,250,.35)');
      } else {
        barGrad.addColorStop(0, 'rgba(79,209,197,1)');
        barGrad.addColorStop(1, 'rgba(79,209,197,.35)');
      }
      ctx.fillStyle = barGrad;
      ctx.fillRect(px - 2.5, baseY - h, 5, h);
    }
    ctx.restore();
  }

  /** 应用视图变换：之后绘制的一切都随缩放/平移变换 */
  function applyView(): void {
    if (!ctx) return;
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-SIZE / 2 - panX, -SIZE / 2 - panY);
  }

  function draw(now: number): void {
    if (!ctx || !engine.level) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // 切关淡入：整画布内容透明度过渡（0.4 秒）
    const fade = Math.min(1, (now - engine.levelSwitchAt) / 400);
    if (fade < 1) ctx.globalAlpha = 0.25 + fade * 0.75;

    ctx.save();
    applyView();

    // 网格底纹：按当前可见范围绘制（随缩放自适应），每 160px 一条亮线
    const half = SIZE / 2 / zoom;
    const left = SIZE / 2 + panX - half;
    const top = SIZE / 2 + panY - half;
    const right = SIZE / 2 + panX + half;
    const bottom = SIZE / 2 + panY + half;
    ctx.lineWidth = 1 / zoom;
    for (let g = Math.floor(left / 40) * 40; g <= right; g += 40) {
      const major = ((g % 160) + 160) % 160 === 0;
      ctx.strokeStyle = major ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.022)';
      ctx.beginPath();
      ctx.moveTo(g, top);
      ctx.lineTo(g, bottom);
      ctx.stroke();
    }
    for (let g = Math.floor(top / 40) * 40; g <= bottom; g += 40) {
      const major = ((g % 160) + 160) % 160 === 0;
      ctx.strokeStyle = major ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.022)';
      ctx.beginPath();
      ctx.moveTo(left, g);
      ctx.lineTo(right, g);
      ctx.stroke();
    }

    // 原点：细十字 + 中心点
    ctx.strokeStyle = 'rgba(230,233,242,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SIZE / 2 - 8, SIZE / 2);
    ctx.lineTo(SIZE / 2 + 8, SIZE / 2);
    ctx.moveTo(SIZE / 2, SIZE / 2 - 8);
    ctx.lineTo(SIZE / 2, SIZE / 2 + 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,233,242,.35)';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, 1.6, 0, Math.PI * 2);
    ctx.fill();

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
        const tolSq = engine.level.tol * engine.level.tol;
        const hits = new Set<number>();
        for (let i = 0; i <= N; i++) {
          const p = tipAt(engine.arms, (i / N) * T0);
          if (i === 0) ghostPathCache.moveTo(p.x, p.y);
          else ghostPathCache.lineTo(p.x, p.y);
          // 预览命中：幽灵轨迹扫过的点（未收集的）
          for (let k = 0; k < engine.level.pts.length; k++) {
            if (hits.has(k)) continue;
            const q = engine.level.pts[k];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            if (dx * dx + dy * dy < tolSq) hits.add(k);
          }
        }
        previewHits = hits;
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
      } else if (engine.phase === 'edit' && previewHits.has(i)) {
        // 编辑态预览：当前参数下会被扫到的点（半透明金色，区别于已收集的实心金）
        ctx.fillStyle = 'rgba(251,191,36,.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251,191,36,.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, engine.level.tol, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1 / zoom;
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

    // —— 以下为屏幕空间元素（不随缩放变换）——
    ctx.restore();

    // 拖拽实时数值提示（跟随关节的逻辑位置 → 换算到屏幕空间）
    if (dragInfo && dragIdx >= 0 && engine.phase === 'edit') {
      const sx = (dragInfo.x - SIZE / 2 - panX) * zoom + SIZE / 2;
      const sy = (dragInfo.y - SIZE / 2 - panY) * zoom + SIZE / 2;
      const label = dragInfo.r + ' · ' + dragInfo.deg + '°';
      ctx.font = 'bold 13px sans-serif';
      const w = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(10,14,26,.85)';
      ctx.fillRect(sx - 6, sy - 16, w + 12, 22);
      ctx.strokeStyle = 'rgba(251,191,36,.7)';
      ctx.strokeRect(sx - 6, sy - 16, w + 12, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(label, sx, sy);
    }

    // 缩放指示（非 1× 时显示）
    if (Math.abs(zoom - 1) > 0.01) {
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(139,147,170,.9)';
      ctx.fillText('缩放 ' + zoom.toFixed(2) + '×', 12, SIZE - 14);
    }

    // 编辑态预览计数：当前参数预计能收集多少点（实时反馈，无需开始旋转）
    if (engine.phase === 'edit' && engine.level) {
      const total = engine.level.pts.length;
      const got = engine.collected.size;
      const willHit = previewHits.size;
      const label = '预览收集 ' + willHit + '/' + total + (got > 0 ? '（已收 ' + got + '）' : '');
      ctx.font = 'bold 12px sans-serif';
      const w = ctx.measureText(label).width;
      const bx = SIZE / 2 - w / 2 - 10;
      const by = SIZE - 16;
      ctx.fillStyle = 'rgba(16,21,42,.8)';
      ctx.fillRect(bx, by - 16, w + 20, 24);
      ctx.strokeStyle = willHit > 0 ? 'rgba(251,191,36,.45)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by - 16, w + 20, 24);
      ctx.fillStyle = willHit > 0 ? '#fbbf24' : 'rgba(139,147,167,.9)';
      ctx.fillText(label, bx + 10, by);
    }

    ctx.globalAlpha = 1;
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
        // 自动拟合进度音：每跨过 20% 播一个上行音符，呼应逐项逼近
        if (engine.autoSolve) {
          const step = Math.min(4, Math.floor(engine.autoProgress * 5));
          if (step !== lastSolveStep) {
            lastSolveStep = step;
            solveTick(step, engine.soundOn);
          }
        } else if (lastSolveStep >= 0) {
          lastSolveStep = -1;
          solveDone(engine.soundOn); // 拟合动画收尾
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
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onwheel={onWheel}
  ondblclick={onDblClick}
  oncontextmenu={onContextMenu}
  onclick={() => {
    if (engine.phase === 'done' && engine.resultDismissed) engine.resultDismissed = false;
  }}
></canvas>

<!-- 缩放控件（画布右下角） -->
<div class="zoom-bar">
  <button type="button" title="缩小" onclick={() => zoomBy(1 / 1.25)}>−</button>
  <span class="zoom-val">{Math.round(zoom * 100)}%</span>
  <button type="button" title="放大" onclick={() => zoomBy(1.25)}>+</button>
  <button
    type="button"
    class="zoom-reset"
    title="复位视图（双击画布同效；滚轮缩放，Shift/中键/右键拖动或双指平移）"
    onclick={resetView}>⤢</button
  >
</div>

<style>
  .zoom-bar {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px;
    border-radius: 999px;
    background: rgba(16, 21, 42, 0.78);
    border: 1px solid var(--line);
    backdrop-filter: blur(6px);
    z-index: 5;
  }
  .zoom-bar button {
    width: 26px;
    height: 26px;
    min-height: 0;
    padding: 0;
    line-height: 1;
    font-size: var(--fs-md);
    border-radius: 50%;
    background: transparent;
    border: none;
    color: var(--muted);
  }
  .zoom-bar button:hover:not(:disabled) {
    background: var(--cyan-dim);
    color: var(--cyan);
    box-shadow: none;
  }
  .zoom-bar .zoom-reset {
    font-size: var(--fs-sm);
  }
  .zoom-val {
    min-width: 38px;
    text-align: center;
    font-size: var(--fs-xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  @media (pointer: coarse), (max-width: 640px) {
    .zoom-bar button {
      width: 34px;
      height: 34px;
    }
  }
</style>
