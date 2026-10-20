<script lang="ts">
  import { onMount } from 'svelte';
  import { engine } from '../game/engine.svelte';
  import { chainAt, tipAt } from '../game/math';
  import type { Vec } from '../game/types';
  import { COMBO_WINDOW, RUN_DUR, SIZE, T0 } from '../game/constants';
  import {
    chapterSealSound,
    collectSound,
    finishChord,
    perfectArpeggio,
    sealSound,
    solveDone,
    solveTick,
    starSound,
    woodfishSound,
  } from '../game/audio';
  import { haptic } from '../game/haptics';
  import { starsFor } from '../game/scoring';

  let canvas: HTMLCanvasElement | undefined = $state();
  /** 自动拟合音效的进度档位（-1 = 未在拟合） */
  let lastSolveStep = -1;
  let ctx: CanvasRenderingContext2D | null = null;
  /** 拖拽中的指针下标（-1 = 无；编辑态拖关节调半径/相位） */
  let dragIdx = -1;
  /** ghost 轨迹缓存与参数签名（参数未变时跳过重建） */
  let ghostSig = '';
  let ghostPathCache: Path2D | null = null;
  /** 运行态幽灵轨迹缓存：key = engine.t（两位小数） */
  let ghostRunSig = '';
  let ghostRunPath: Path2D | null = null;
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
    // 逻辑单位 → CSS 像素的比例（画布铺满容器后不再是 SIZE/rect.width）
    const k = viewW / rect.width;
    const sx = (clientX - rect.left) * k;
    const sy = (clientY - rect.top) * k;
    // 容器中心对应逻辑点 (SIZE/2, SIZE/2)
    return {
      x: (sx - viewW / 2) / zoom + SIZE / 2 + panX,
      y: (sy - viewH / 2) / zoom + SIZE / 2 + panY,
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
    if (engine.autoSolve) engine.cancelAutoSolve(); // 用户碰画布 = 打断拟合，回到手动控制
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
      engine.cancelAutoSolve(); // 用户拖关节 = 主动打断拟合
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

  /**
   * 画布铺满容器的等比缩放（第九轮：主区域占满整屏，HUD 浮在其上）。
   *
   * 逻辑空间仍是 640×640 的正方形（所有绘制代码围绕 SIZE/2 这个中心写），
   * 但视口不再被裁成正方形：按容器宽高比把「可见逻辑范围」扩出去，
   * 画布只负责把这块扩展后的范围等比映射到容器上。
   *
   *   scale = 容器宽 / 可见宽（= 容器高 / 可见高，两者相等 → 圆不会变椭圆）
   *   可见宽 = SIZE × max(1, w/h)，可见高 = SIZE × max(1, h/w)
   *
   * 所以：容器比正方形更宽 → 左右两侧多露出星盘外的空间；更高 → 上下多露。
   * 星盘本体（半径 SIZE/2-10）永远完整可见，且不会被拉伸。
   */
  let viewScale = 1; // 逻辑单位 → CSS 像素
  let viewW = SIZE; // 可见逻辑宽
  let viewH = SIZE; // 可见逻辑高

  function resize(): void {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, canvas.clientWidth);
    const ch = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);

    // 可见逻辑范围：短边恒为 SIZE，长边按容器比例扩展
    const aspect = cw / ch;
    viewW = aspect >= 1 ? SIZE * aspect : SIZE;
    viewH = aspect >= 1 ? SIZE : SIZE / aspect;
    // 等比：用宽度定标（与高度定标等价，因为 viewW/viewH 已按比例算好）
    viewScale = canvas.width / viewW;

    ctx = canvas.getContext('2d');
    // 把「可见逻辑范围」的中心对齐到容器中心：SIZE/2 是逻辑原点
    ctx?.setTransform(
      viewScale,
      0,
      0,
      viewScale,
      canvas.width / 2 - (SIZE / 2) * viewScale,
      canvas.height / 2 - (SIZE / 2) * viewScale,
    );
  }

  /**
   * 频谱仪：左下角精致面板，实时显示各启用指针的频率与半径。
   * 原先在右上角，与 HTML 的 HUD「收集 / 印 x/4」芯片抢同一块地盘——
   * 手机端实测两者叠在一起（芯片压住面板刻度）。右上角归 HUD、
   * 右下角是缩放条，左下角才是空闲区。
   */
  function drawSpectrum(): void {
    const on = engine.arms.filter((a) => a.on);
    if (on.length === 0 || !ctx) return;
    // 整个面板按显示尺寸等比放大：面板逻辑宽 152 在手机上只有 ~80px，
    // 内部 9px/7px 的字实际渲染不到 5px（放大截图糊成一团）。
    // 用 ctx.scale 统一缩放，内部所有尺寸/字号都不用逐个改。
    const k = canvasK();
    const W = 152;
    const H = 74;
    const x0 = 12;
    // 底边要让开「预览收集」提示条（编辑态画在 SIZE-16 附近，高 24*k）
    // 与 12 逻辑单位内距，取两者较大值；面板高度已按 k 放大
    const bottomGap = Math.max(12, 16 + 24 * k + 6);
    const y0 = SIZE - bottomGap - H * k;
    const radius = 10;

    // 面板背景（圆角 + 渐变 + 描边）
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(k, k);
    ctx.translate(-x0, -y0);
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
    ctx.lineWidth = lineW(1);
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
    /* 轴标 7px 小字，0.5 时不足 2.5:1（canvas 内文本同样按对比度要求） */
    ctx.fillStyle = 'rgba(139,147,167,.72)';
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
        ctx.lineWidth = lineW(1);
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

  /**
   * 画布内 UI 文字的字号补偿：逻辑坐标短边恒为 640，容器小的时候
   * 直接写 12px 实际只渲染出 ~6.3px（实测「连击 / 预览收集」在手机上糊成
   * 一团）。这里按「逻辑短边 ÷ 实际显示短边」反向放大，使物理字号恒定。
   * 只用于画布上的界面文字，不用于图形（曲线粗细另有 1/zoom 处理）。
   *
   * 第九轮起画布铺满容器，短边不再是 clientWidth（可能是高），所以用
   * 「逻辑短边 / CSS 短边」的等比关系：viewScale 就是 逻辑→CSS 的倍数。
   */
  function canvasK(): number {
    // viewScale = 画布像素 / 逻辑单位；除以 dpr 得到 CSS 比例
    const dpr = window.devicePixelRatio || 1;
    const cssPerLogical = viewScale / dpr;
    if (!cssPerLogical || cssPerLogical <= 0) return 1;
    // 上限 1.6：再大长文案（预览收集 / 上届漏点）会在逻辑宽里溢出
    return Math.min(1.6, Math.max(1, 1 / cssPerLogical));
  }

  /**
   * 线宽下限保护：逻辑线宽乘上屏幕比例后若不足 ~1.2px，会被抗锯齿糊成灰蒙蒙
   * 的细线（手机小画布下 1.8 逻辑 → 0.95px，目标曲线/指针线都发虚）。
   * 只做「不低于下限」，不整体放大——线条属信息承载图形，放大过头会改变画面气质。
   */
  function shownW(): number {
    // 返回「当前显示下 1 逻辑单位对应的 CSS 像素数」的倒数关系所需基数：
    // 保持原语义（越小画布 → 越大补偿）
    const dpr = window.devicePixelRatio || 1;
    const cssPerLogical = viewScale / dpr;
    return cssPerLogical > 0 ? SIZE * cssPerLogical : SIZE;
  }
  function lineW(base: number): number {
    return Math.max(base, 1.2 * (SIZE / shownW()));
  }

  /**
   * 辉光点：径向渐变光晕 + 实心核，视觉等价 shadowBlur，但没有
   * Canvas2D 模糊那一趟——shadowBlur 在低端手机是软路径，收集点一多
   * （每帧 20+ 次模糊填充）就掉帧，这是手机端掉帧的主因。
   */
  /** 辉光渐变缓存：只有 4 种颜色组合，按 key 复用渐变对象（定义在原点、
      绘制时 translate 到目标位置），省掉每帧 20+ 次 createRadialGradient。 */
  const glowCache = new Map<string, CanvasGradient>();
  function glowDot(
    x: number,
    y: number,
    r: number,
    core: string,
    glow: string,
    glowR: number,
  ): void {
    if (!ctx) return;
    // key 含 r 与 glowR：收集爆发期间半径连续变化不命中缓存（退化为新建），
    // 稳定态半径恒定 → 命中。数值取整避免浮点抖动。
    const key = glow + '|' + glowR.toFixed(1) + '|' + r.toFixed(1);
    let g = glowCache.get(key);
    if (!g) {
      g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r + glowR);
      g.addColorStop(0, glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      glowCache.set(key, g);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r + glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 与 canvasFont 同源的补偿系数：文字周围的背景框/进度条也要按同一比例缩放，
      否则放大的文字会溢出固定尺寸的底框（手机端实测）。 */
  function canvasFont(px: number, bold = false): string {
    return (bold ? 'bold ' : '') + (px * canvasK()).toFixed(1) + 'px sans-serif';
  }

  /** measureText 带缓存：画布内 4 处每帧量宽，label 不变时直接查表
      （文本布局比 Map 查找贵一个量级）。key = 字体 + 文本。 */
  const measureCache = new Map<string, number>();
  function measureW(label: string, font: string): number {
    const key = font + '|' + label;
    let w = measureCache.get(key);
    if (w === undefined) {
      if (!ctx) return 0;
      ctx.font = font;
      w = ctx.measureText(label).width;
      measureCache.set(key, w);
      if (measureCache.size > 400) measureCache.clear(); // 防长跑膨胀
    }
    return w;
  }

  /** 全清震动是否已触发（本局一次） */
  let shakeDone = false;
  /** 已播过升星音的档位（编辑态归零） */
  let lastStarTier = 0;

  /* ============================================================
   * 第三轮「游戏味」：星盘 / 星尘 / 拖尾 / 收集爆发 / 起跑脉冲 / 连击印章
   * 性能红线：不用 shadowBlur；路径与渐变能缓存就缓存；粒子总数 ≤ 60。
   * ============================================================ */
  /** 上一帧相位：捕捉「编辑 → 运行」的起跑瞬间 */
  let prevPhase = engine.phase;
  /** 起跑脉冲起点（0 = 未触发） */
  let launchAt = 0;
  /** 连击里程碑（每 5 连一次）：触发时间与档位 */
  let milestoneAt = 0;
  let milestoneN = 0;
  let lastMilestone = 0;
  /** 上一帧连击值：用于检测连击中断、重置里程碑档位 */
  let lastCombo = 0;
  /** 尖端拖尾：最近 16 帧的位置（逻辑坐标） */
  const TRAIL_N = 22;
  const tipTrail: { x: number; y: number }[] = [];

  /**
   * 星盘半径：随可视范围放大。
   * 画布铺满整屏后，短边可能远大于 640 逻辑（例如 1440×900 时可视逻辑宽 1024），
   * 星盘若仍固定为 SIZE/2-10=310 就只占中间一小块，四周全是空星域。
   * 取「可视短边的一半」再留 10 逻辑单位边距。
   */
  function arenaRadius(): number {
    const shortSide = Math.min(viewW, viewH);
    return shortSide / 2 - 10;
  }

  /** 星盘刻度环（构建一次复用，绕原点） */
  let tickPath: Path2D | null = null;
  let tickPathR = 0;
  function tickRing(): Path2D {
    const R = arenaRadius();
    if (tickPath && Math.abs(tickPathR - R) < 0.5) return tickPath;
    const p = new Path2D();
    tickPathR = R;
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const long = i % 6 === 0;
      const r0 = R - (long ? 10 : 5);
      p.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      p.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    tickPath = p;
    return p;
  }

  /** 星盘内圈柔光渐变（缓存） */
  let arenaGlow: CanvasGradient | null = null;

  /** 星尘：固定分布的漂浮微粒（用黄金角排布，避免每帧随机） */
  const dust = Array.from({ length: 36 }, (_, i) => {
    const a = i * 2.399963;
    const rr = 24 + ((i * 41) % 258);
    return {
      x: SIZE / 2 + Math.cos(a) * rr,
      y: SIZE / 2 + Math.sin(a) * rr,
      ph: (i % 9) * 0.7,
      amp: 6 + (i % 6) * 3,
      sp: 1500 + (i % 5) * 260,
      r: 1.6 + (i % 3) * 0.8,
    };
  });

  /** 是否减弱动态效果（星盘/星尘/扫掠在 reduce-motion 下保持静止） */
  const motionOff = (): boolean => !!engine.flags.reduceMotion;

  /** 指针链能量渐变：根金 → 梢青 */
  function linkColor(t: number, alpha = 1): string {
    const r = Math.round(251 + (79 - 251) * t);
    const g = Math.round(191 + (209 - 191) * t);
    const b = Math.round(36 + (197 - 36) * t);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /** 回纹边框路径（构建一次复用）：中国器物上的连续"回"字纹 */
  let huiPath: Path2D | null = null;
  function huiBorder(): Path2D {
    if (huiPath) return huiPath;
    const cell = 13;
    const inset = 4;
    const p = new Path2D();
    // 连续"回"字：外框几乎相接，读起来是一条纹带而不是一串点
    const glyph = (x: number, y: number): void => {
      p.rect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      p.rect(x + 4.5, y + 4.5, cell - 9, cell - 9);
    };
    for (let x = inset; x + cell <= SIZE - inset; x += cell) {
      glyph(x, inset);
      glyph(x, SIZE - inset - cell);
    }
    for (let y = inset + cell; y + cell <= SIZE - inset - cell; y += cell) {
      glyph(inset, y);
      glyph(SIZE - inset - cell, y);
    }
    huiPath = p;
    return p;
  }

  function draw(now: number): void {
    if (!ctx || !engine.level) return;
    // 全清震动：本局首次全清时触发一次 CSS 抖动
    if (!shakeDone && engine.fullClearAt > 0) {
      shakeDone = true;
      canvas?.classList.remove('shake');
      void canvas?.offsetWidth; // 强制 reflow 重启动画
      canvas?.classList.add('shake');
    }
    if (engine.phase === 'edit') {
      shakeDone = false;
      lastStarTier = 0;
    }

    // 清屏：铺满容器后可见逻辑范围可能比 SIZE 更大（宽屏左右/竖屏上下），
    // 只清 SIZE 会留下上一帧的残影，所以按实际可见范围清。
    ctx.clearRect(SIZE / 2 - viewW / 2, SIZE / 2 - viewH / 2, viewW, viewH);

    // 相位切换：捕捉起跑瞬间 / 归位里程碑
    if (engine.phase !== prevPhase) {
      if (prevPhase === 'edit' && engine.phase === 'running') launchAt = now;
      if (engine.phase === 'edit') {
        lastMilestone = 0;
        tipTrail.length = 0;
        milestoneAt = 0;
      }
      prevPhase = engine.phase;
    }
    // 连击里程碑：每满 5 连一次印章 + 四边脉冲
    // 连击断了（combo 归零）要把档位归零，否则下一轮 5 连不会再触发
    if (engine.combo < lastCombo) lastMilestone = 0;
    lastCombo = engine.combo;
    if (engine.phase === 'running' && engine.combo > 0) {
      const m = Math.floor((engine.combo + 1) / 5);
      if (m > lastMilestone) {
        lastMilestone = m;
        milestoneAt = now;
        milestoneN = engine.combo + 1;
      }
    }

    // —— 星盘：外环 + 缓慢旋转的刻度环 + 内圈柔光（让世界有边界、有生命）——
    const cx0 = SIZE / 2;
    const cy0 = SIZE / 2;
    const arenaR = arenaRadius();
    if (!arenaGlow) {
      const g = ctx.createRadialGradient(0, 0, arenaR * 0.35, 0, 0, arenaR);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.78, 'rgba(0,245,212,0.03)');
      g.addColorStop(1, 'rgba(251,191,36,0.065)');
      arenaGlow = g;
    }
    const still = motionOff();
    const tickTurn = still ? 0 : now / 9000;
    ctx.save();
    ctx.translate(cx0, cy0);
    // 柔光呼吸：整个星盘的亮度缓慢起伏（世界活着的底色）
    ctx.globalAlpha = still ? 0.8 : 0.62 + 0.3 * Math.sin(now / 1500);
    ctx.fillStyle = arenaGlow;
    ctx.beginPath();
    ctx.arc(0, 0, arenaR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.rotate(tickTurn);
    ctx.strokeStyle = 'rgba(251,191,36,.20)';
    ctx.lineWidth = lineW(1.2);
    ctx.stroke(tickRing());
    // 雷达扫掠：一道拖着尾光的弧线绕盘转动（世界「在工作」的感觉）
    if (!still) {
      const sweep = tickTurn * 2.2;
      for (let i = 0; i < 14; i++) {
        const a1 = sweep - i * 0.035;
        ctx.strokeStyle = 'rgba(0,245,212,' + (0.3 * (1 - i / 14)).toFixed(3) + ')';
        ctx.lineWidth = lineW(3 - i * 0.16);
        ctx.beginPath();
        ctx.arc(0, 0, arenaR - 16, a1 - 0.035, a1);
        ctx.stroke();
      }
    }
    ctx.restore();
    // 外环亮度呼吸：盘沿一圈明暗流动，静止时是一条恒亮细环
    ctx.strokeStyle =
      'rgba(251,191,36,' +
      (still ? 0.24 : (0.2 + 0.16 * Math.sin(now / 1200 + 0.6)).toFixed(3)) +
      ')';
    ctx.lineWidth = lineW(1.6);
    ctx.beginPath();
    ctx.arc(cx0, cy0, arenaR, 0, Math.PI * 2);
    ctx.stroke();

    // 星尘：24 颗缓慢漂浮的微粒（静息态也有「世界在呼吸」的动感）
    for (let d = 0; d < dust.length; d++) {
      const du = dust[d];
      const drift = still ? 0 : 1;
      const a2 = still ? 0.16 : 0.14 + 0.11 * Math.sin(now / du.sp + du.ph);
      ctx.fillStyle = 'rgba(200,225,255,' + a2.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(
        du.x + Math.sin(now / (du.sp * 1.3) + du.ph) * du.amp * drift,
        du.y + Math.cos(now / (du.sp * 1.7) + du.ph) * du.amp * drift,
        lineW(du.r),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // 回纹边框：极淡的中国纹样，铺在内容之下（不随缩放平移，只作画框）
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.05)';
    ctx.lineWidth = lineW(1);
    ctx.stroke(huiBorder());

    // 切关淡入：整画布内容透明度过渡（0.4 秒）
    const fade = Math.min(1, (now - engine.levelSwitchAt) / 400);
    if (fade < 1) ctx.globalAlpha = 0.25 + fade * 0.75;

    ctx.save();
    applyView();
    // 起跑脉冲：世界在 0.26 秒里从 1.06 收回到 1.0（有「出发」的力度）
    if (launchAt > 0) {
      const lp = (now - launchAt) / 260;
      if (lp >= 1) launchAt = 0;
      else {
        const sc = 1 + 0.06 * (1 - lp) * (1 - lp);
        ctx.translate(SIZE / 2, SIZE / 2);
        ctx.scale(sc, sc);
        ctx.translate(-SIZE / 2, -SIZE / 2);
      }
    }

    // 网格底纹：按当前可见范围绘制（随缩放自适应），每 160px 一条亮线
    // 可见范围：铺满容器后不再是 SIZE 正方形，按 viewW/viewH 算（含缩放与平移）
    const halfW = viewW / 2 / zoom;
    const halfH = viewH / 2 / zoom;
    const left = SIZE / 2 + panX - halfW;
    const top = SIZE / 2 + panY - halfH;
    const right = SIZE / 2 + panX + halfW;
    const bottom = SIZE / 2 + panY + halfH;
    ctx.lineWidth = Math.max(1 / zoom, 1.2 * (SIZE / shownW()));
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
    ctx.lineWidth = lineW(1);
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
    // 专家模式：全部隐藏——只能靠频谱对比与收集反馈推导参数
    if (engine.phase === 'edit' && !engine.expertMode) {
      const curve = engine.level.curve;
      ctx.strokeStyle = 'rgba(251,191,36,.55)';
      ctx.lineWidth = lineW(1.8);
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
      ctx.strokeStyle = 'rgba(196,181,253,.95)';
      ctx.lineWidth = lineW(2.2);
      ctx.setLineDash([]); // 实线：与目标的金色虚线强区分
      ctx.shadowColor = 'rgba(167,139,250,.6)';
      ctx.shadowBlur = 6;
      ctx.stroke(ghostPathCache);
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
    }

    // 运行进度条（顶部，避开圆角）；沙盒不设时限，仅显示标记
    if (engine.phase === 'running' || engine.phase === 'paused') {
      if (engine.sandbox) {
        ctx.fillStyle = 'rgba(167,139,250,.85)';
        ctx.font = canvasFont(11);
        ctx.fillText('沙盒模式 · 无限时 · 实时调参', 10, 15);
      } else {
        ctx.fillStyle = 'rgba(79,209,197,.55)';
        ctx.fillRect(4, 4, (engine.t / RUN_DUR) * (SIZE - 8), 3);
        if (engine.collectedCount === engine.total && engine.collectedCount > 0) {
          ctx.fillStyle = 'rgba(251,191,36,.95)';
          ctx.font = canvasFont(12, true);
          ctx.fillText('✨ 全清！3 秒后自动结算', 10, 30);
        }
        // 注：暂停时的偏差诊断原本画在这里（y=30），但暂停浮层是 inset:0 +
        // 磨砂不透明，文字永远被遮住（实测确认）。已移到 App 的暂停浮层内显示。
      }
    }

    // 收集飘字：+分数 ×连击（连击越高越大越金）
    // 固定锚点在画布顶部居中（Gemini 评审建议）：原地生成会盖住核心轨迹，
    // 改为顶部「计分条」样式——与两侧 HUD 芯片错开，只做计分反馈不遮玩法
    if (engine.floaters.length > 0) {
      ctx.textAlign = 'center';
      // 复审(23/30 号截图):连击 9 条时堆叠下探到 y≈300 会盖住圆顶轨迹——
      // 只保留最近 3 条并上移堆叠起点,长串计分不再进入玩法区
      const alive = engine.floaters.filter((f) => (now - f.born) / 900 < 1);
      // 星级徽章与飘字都锚在画布顶部居中。徽章盒为 y=30 上下各 14*canvasK
      // （见下方星档绘制），手机上 canvasK=1.6 时盒底到 y≈52；此前飘字
      // 从 y=34 起、行距固定 22 —— 41/34 号截图里「+900 ×9」直接压在
      // 「★★☆」徽章上。这里把行距与起点都按 canvasK 换算，让第一条落在
      // 徽章盒底之下。
      const ks = canvasK();
      const lineH = 22 * ks;
      const stackTop = 30 + 14 * ks + 26 * ks;
      // 小屏纵向余量不够：画布 CSS 宽只有 ~338px 时，圆顶(逻辑 y=120)
      // 换算到屏幕只剩 ~75px，徽章盒底 ~33px —— 3 行 24.6px 的飘字挤不
      // 进去，必然压住徽章或圆顶。移动端只留最新 1 条（41 号建议：小屏
      // 隐藏长串计分明细，分数仍由 HUD 的「收集」与得分给出）。
      const show = alive.slice(ks > 1.25 ? -1 : -3);
      for (let i = 0; i < show.length; i++) {
        const f = show[i];
        const age = Math.min((now - f.born) / 900, 1);
        // 堆叠层级递减：越旧的行越淡，最新的那条保持全亮——否则 3 行同亮度
        // 的金色数字与星档徽章抢同一块视觉焦点（54 号截图复审）
        const depth = show.length > 1 ? i / (show.length - 1) : 1;
        const alpha = (1 - age * age) * (0.45 + 0.55 * depth);
        const size = 12 + Math.min(f.combo, 9) * 1.4;
        ctx.font = canvasFont(size, true);
        ctx.fillStyle =
          f.combo >= 3
            ? 'rgba(251,191,36,' + alpha.toFixed(3) + ')'
            : 'rgba(230,233,242,' + (alpha * 0.9).toFixed(3) + ')';
        ctx.fillText(
          '+' + f.score + (f.combo >= 1 ? '  ×' + (f.combo + 1) : ''),
          SIZE / 2,
          // 顶部锚点垂直堆叠：新的在下、旧的在上方原地淡出
          stackTop + i * lineH - age * 14,
        );
      }
      ctx.textAlign = 'start';
    }

    // 目标点
    // 半径按显示尺寸补偿：逻辑圆点 3.5 在手机上只有 2.4px（放大截图确认
    // 几乎看不见），玩家分不清哪些点还没收。与文字/频谱仪同一套 canvasK()。
    const kd = canvasK();
    const pts = engine.level.pts;
    // 上届漏点（编辑态提示）：这次预览能扫到的会先被金色分支接管
    const missedSet = engine.phase === 'edit' ? engine.lastMissedSet : null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (engine.collected.has(i)) {
        const at = engine.collectAnim.get(i) ?? 0;
        const age = (now - at) / 450;
        if (age < 1 && age >= 0) {
          // 扩散环：命中点向外推出一圈金环
          ctx.strokeStyle = 'rgba(251,191,36,' + ((1 - age) * 0.85).toFixed(3) + ')';
          ctx.lineWidth = lineW(2.4 * (1 - age) + 0.6);
          ctx.beginPath();
          ctx.arc(p.x, p.y, (6 + age * 24) * kd, 0, Math.PI * 2);
          ctx.stroke();
          // 火花：方向按点索引固定（避免每帧随机造成抖动）
          for (let sp = 0; sp < 6; sp++) {
            const sa = i * 1.7 + (sp * Math.PI * 2) / 6;
            const sd = (5 + age * 22) * kd;
            ctx.fillStyle = 'rgba(255,214,102,' + ((1 - age) * 0.9).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(
              p.x + Math.cos(sa) * sd,
              p.y + Math.sin(sa) * sd,
              Math.max(0.4, 2.3 * (1 - age) * kd),
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        const burst = age < 1 ? (1 - age) * 10 : 0;
        glowDot(
          p.x,
          p.y,
          (4.5 + burst * 0.6) * kd,
          '#fbbf24',
          'rgba(251,191,36,.55)',
          (12 + burst * 2) * kd,
        );
      } else if (engine.phase === 'edit' && previewHits.has(i)) {
        // 编辑态预览：当前参数下会被扫到的点（半透明金色，区别于已收集的实心金）
        ctx.fillStyle = 'rgba(251,191,36,.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * kd, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251,191,36,.55)';
        ctx.lineWidth = lineW(1.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, engine.level.tol, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = Math.max(1 / zoom, 1.2 * (SIZE / shownW()));
      } else if (missedSet && missedSet.has(i)) {
        // 上届漏点：红色虚线圈（这次能扫到的会被上面的金色预览分支接管）
        ctx.strokeStyle = 'rgba(248,113,113,.6)';
        ctx.lineWidth = lineW(1.6);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 * kd, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(248,113,113,.55)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * kd, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1 / zoom, 1.2 * (SIZE / shownW()));
      } else if (engine.phase === 'done' && engine.resultDismissed) {
        // 看轨迹：把本局漏掉的点脉冲高亮（红圈），一眼看清差在哪几个
        const pulse = 0.5 + 0.5 * Math.sin(now / 320);
        ctx.strokeStyle = 'rgba(248,113,113,' + (0.4 + pulse * 0.5).toFixed(3) + ')';
        ctx.lineWidth = lineW(2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, (6 + pulse * 3.5) * kd, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(248,113,113,.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * kd, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1 / zoom, 1.2 * (SIZE / shownW()));
      } else {
        // 未收集目标：呼吸的宝石（深底 + 亮边 + 高光），一眼看出「这是要收的东西」
        const breathe = motionOff() ? 1 : 1 + 0.2 * Math.sin(now / 560 + i * 0.7);
        const rr = 3.6 * kd * breathe;
        ctx.fillStyle = 'rgba(190,215,255,.09)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr * 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(22,32,56,.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(214,228,255,.85)';
        ctx.lineWidth = lineW(1.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath();
        ctx.arc(p.x - rr * 0.3, p.y - rr * 0.34, Math.max(0.5, rr * 0.28), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(190,215,255,.14)';
        ctx.lineWidth = lineW(1);
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
        // 尾迹透明度：旧段在手机上（线宽已达下限）几乎看不见，整体提到 0.9 封顶
        ctx.strokeStyle = 'rgba(79,209,197,' + (a * 0.9).toFixed(3) + ')';
        ctx.lineWidth = lineW(1 + a * 1.8);
        ctx.beginPath();
        ctx.moveTo(trail[startIdx].x, trail[startIdx].y);
        for (let i = startIdx + 1; i <= endIdx; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
      }
    }

    // 幽灵竞速：参照解法（个人最佳 / 上届，自动取更强）的轨迹同屏（金色虚线）
    if (engine.ghostPathVisible && engine.level) {
      const saved = engine.raceArms;
      if (saved) {
        // Path2D 按 t 缓存：480 段 × 5 臂的三角函数每帧重建是隐藏开销，
        // 而轨迹形状只由 (saved, engine.t) 决定——t 不变时直接复用。
        const tKey = engine.t.toFixed(2);
        if (ghostRunSig !== tKey || !ghostRunPath) {
          ghostRunSig = tKey;
          const ghost = new Path2D();
          const M = 480;
          const from = Math.max(0, engine.t - T0);
          for (let i = 0; i <= M; i++) {
            const p = tipAt(saved, from + ((engine.t - from) * i) / M);
            if (i === 0) ghost.moveTo(p.x, p.y);
            else ghost.lineTo(p.x, p.y);
          }
          ghostRunPath = ghost;
        }
        const ghost = ghostRunPath;
        ctx.strokeStyle = 'rgba(251,191,36,.5)';
        ctx.lineWidth = lineW(1.4);
        ctx.setLineDash([2, 5]);
        ctx.stroke(ghost);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(251,191,36,.9)';
        ctx.font = canvasFont(10);
        ctx.fillText(engine.raceIsBest ? '👻 最佳解法' : '👻 上届解法', 10, SIZE - 12);
      }
    }

    // 指针链
    const tt = engine.phase === 'edit' ? 0 : engine.t;
    const joints = chainAt(engine.arms, tt);

    // 尖端拖尾：运行/暂停时记录最近 16 帧，画成一条渐隐的能量尾迹
    if (engine.phase !== 'edit') {
      const tj = joints[joints.length - 1];
      tipTrail.push({ x: tj.x, y: tj.y });
      if (tipTrail.length > TRAIL_N) tipTrail.shift();
      ctx.lineCap = 'round';
      for (let i = 1; i < tipTrail.length; i++) {
        const a = i / tipTrail.length;
        ctx.strokeStyle = linkColor(0.65 + a * 0.35, 0.04 + a * 0.3);
        ctx.lineWidth = lineW(1 + a * 5);
        ctx.beginPath();
        ctx.moveTo(tipTrail[i - 1].x, tipTrail[i - 1].y);
        ctx.lineTo(tipTrail[i].x, tipTrail[i].y);
        ctx.stroke();
      }
    }

    // 能量火花：3 颗沿连杆流动的光点（运行态），让「力在传」看得见
    if (engine.phase !== 'edit' && !motionOff() && joints.length > 1) {
      for (let k = 0; k < 3; k++) {
        const phase = ((now / 900 + k / 3) % 1) * (joints.length - 1);
        const si = Math.min(joints.length - 2, Math.floor(phase));
        const f = phase - si;
        const ax = joints[si].x + (joints[si + 1].x - joints[si].x) * f;
        const ay = joints[si].y + (joints[si + 1].y - joints[si].y) * f;
        glowDot(ax, ay, 1.8 * kd, '#eafffb', 'rgba(0,245,212,.55)', 7 * kd);
      }
    }

    let enabledIdx = 0;
    const segs = Math.max(1, joints.length - 1);
    for (let i = 1; i < joints.length; i++) {
      while (!engine.arms[enabledIdx].on) enabledIdx++;
      const idx = enabledIdx++;
      const a = engine.arms[idx];
      const hot = dragIdx === idx || now < engine.flashTil[idx];
      const c = joints[i - 1];
      const ratio = (i - 1) / segs;
      ctx.strokeStyle = 'rgba(255,255,255,.13)';
      ctx.lineWidth = lineW(1);
      ctx.fillStyle = 'rgba(255,255,255,.022)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, a.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 连杆：根金梢青的能量渐变，比纯白细线更有「在传力」的感觉
      ctx.strokeStyle = hot ? 'rgba(251,191,36,.95)' : linkColor(ratio, 0.8);
      ctx.lineWidth = hot ? lineW(3.4) : lineW(2.6);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(joints[i].x, joints[i].y);
      ctx.stroke();
      glowDot(
        c.x,
        c.y,
        3.2,
        hot ? '#fbbf24' : linkColor(ratio, 1),
        hot ? 'rgba(251,191,36,.9)' : linkColor(ratio, 0.7),
        hot ? 12 : 7,
      );
    }

    // 尖端：彗星头（外晕 + 亮核）
    const tip = joints[joints.length - 1];
    ctx.fillStyle = 'rgba(79,209,197,.14)';
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, lineW(16), 0, Math.PI * 2);
    ctx.fill();
    glowDot(tip.x, tip.y, 5.2, '#eafffb', 'rgba(79,209,197,.95)', 20);

    // 全清冲击波：收集全部点时金色圆环自中心扩散
    if (engine.fullClearAt > 0) {
      const age = (now - engine.fullClearAt) / 1200;
      if (age < 1) {
        ctx.strokeStyle = 'rgba(251,191,36,' + ((1 - age) * 0.8).toFixed(3) + ')';
        ctx.lineWidth = lineW(8 * (1 - age) + 1);
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, 20 + age * 440, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = lineW(1);
      }
    }

    // —— 以下为屏幕空间元素（不随缩放变换）——
    ctx.restore();

    // 起跑演出：中心扩散环 + 一个短促的「起」字（0.7 秒，不阻塞操作）
    if (launchAt > 0) {
      const rp = (now - launchAt) / 520;
      if (rp < 1) {
        ctx.strokeStyle = 'rgba(0,245,212,' + ((1 - rp) * 0.7).toFixed(3) + ')';
        ctx.lineWidth = lineW(7 * (1 - rp) + 1);
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, (20 + rp * 250) * canvasK(), 0, Math.PI * 2);
        ctx.stroke();
      }
      const tp = (now - launchAt) / 700;
      if (tp < 1) {
        ctx.save();
        ctx.globalAlpha = (1 - tp) * 0.95;
        ctx.fillStyle = 'rgba(255,214,102,1)';
        ctx.font = canvasFont(56, true);
        ctx.textAlign = 'center';
        ctx.fillText('起', SIZE / 2, SIZE / 2 + 20 * canvasK());
        ctx.restore();
      }
    }

    // 连击里程碑（每 5 连）：四边金色脉冲 + 斜盖的 ×N 印章
    if (milestoneAt > 0) {
      const mp = (now - milestoneAt) / 560;
      if (mp >= 1) milestoneAt = 0;
      else {
        const w = lineW(12 * (1 - mp) + 1);
        ctx.strokeStyle = 'rgba(255,209,102,' + ((1 - mp) * 0.5).toFixed(3) + ')';
        ctx.lineWidth = w;
        ctx.strokeRect(w / 2, w / 2, SIZE - w, SIZE - w);
        const pop = mp < 0.35 ? 1.35 - mp * 1.0 : 1;
        ctx.save();
        ctx.translate(SIZE - 78 * canvasK(), 78 * canvasK());
        ctx.rotate(-0.14);
        ctx.scale(pop, pop);
        ctx.globalAlpha = (1 - mp) * 0.95;
        ctx.font = canvasFont(24, true);
        ctx.fillStyle = 'rgba(251,191,36,1)';
        ctx.textAlign = 'center';
        ctx.fillText('×' + milestoneN, 0, 8 * canvasK());
        ctx.restore();
      }
    }

    // 拖拽实时数值提示（跟随关节的逻辑位置 → 换算到屏幕空间）
    if (dragInfo && dragIdx >= 0 && engine.phase === 'edit') {
      const sx = (dragInfo.x - SIZE / 2 - panX) * zoom + SIZE / 2;
      const sy = (dragInfo.y - SIZE / 2 - panY) * zoom + SIZE / 2;
      const label = dragInfo.r + ' · ' + dragInfo.deg + '°';
      const w = measureW(label, canvasFont(13, true));
      ctx.fillStyle = 'rgba(10,14,26,.85)';
      const kk = canvasK();
      ctx.fillRect(sx - 6 * kk, sy - 16 * kk, w + 12 * kk, 22 * kk);
      ctx.strokeStyle = 'rgba(251,191,36,.7)';
      ctx.strokeRect(sx - 6 * kk, sy - 16 * kk, w + 12 * kk, 22 * kk);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(label, sx, sy);
    }

    // 连击状态：×N 连击 + 剩余窗口条（运行态且连击 ≥2 时显示）
    if (engine.phase === 'running' && engine.combo >= 2) {
      const remain = Math.max(0, 1 - (performance.now() - engine.lastCollectAt) / COMBO_WINDOW);
      if (remain > 0) {
        // 左上角：右上角是 HUD「收集 / 印 x/4」芯片与频谱仪的地盘，
        // 连击提示挤在那里会与 HTML 芯片互相压字（手机端实测明显）。
        const cxr = 24;
        const cyr = 118; // 让开左上角的关卡序号标签（canvasFont 补偿后文字更高）
        // 复审(23/30 号截图):裸文字偏扁平——加暗底圆角面板与主题色描边提精致度
        let bx = 0;
        let bw = 0;
        {
          const padX = 10 * canvasK();
          const label = '×' + (engine.combo + 1) + ' 连击';
          // 字体必须先设再量：此前的度量发生在上一个绘制阶段的字体上，
          // 1440×900 实测 33.4px vs 正确 58.1px —— 徽章盒比文字窄，
          // 文字溢出盒子。衰减条(下方)也依赖这个宽度。
          ctx.font = canvasFont(16, true);
          const wTxt = ctx.measureText(label).width;
          bx = cxr - padX;
          const by = cyr - 20 * canvasK();
          bw = wTxt + padX * 2;
          const bh = 30 * canvasK();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, 6 * canvasK());
          else ctx.rect(bx, by, bw, bh);
          ctx.fillStyle = 'rgba(20,25,38,.78)';
          ctx.fill();
          ctx.strokeStyle = engine.combo >= 5 ? 'rgba(251,191,36,.45)' : 'rgba(196,181,253,.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.textAlign = 'left';
        ctx.font = canvasFont(16, true);
        const hot = engine.combo >= 5;
        ctx.fillStyle = hot ? 'rgba(251,191,36,.95)' : 'rgba(196,181,253,.95)';
        ctx.fillText('×' + (engine.combo + 1) + ' 连击', cxr, cyr);
        // 剩余窗口条：与徽章盒同宽同位。此前硬编码 78 逻辑宽，比徽章宽出
        // 一截悬空的灰条（实测 5174 复核 trackW 84.9 vs badgeW 55.1）。
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(bx, cyr + 6 * canvasK(), bw, 3 * canvasK());
        ctx.fillStyle = hot ? 'rgba(251,191,36,.9)' : 'rgba(196,181,253,.9)';
        ctx.fillRect(bx, cyr + 6 * canvasK(), bw * remain, 3 * canvasK());
        ctx.textAlign = 'start';
      }
    }

    // 看轨迹状态：漏点提示 + 怎么回到结算（点画布）
    if (engine.phase === 'done' && engine.resultDismissed && engine.level) {
      const missed = engine.total - engine.collectedCount;
      const label =
        missed > 0 ? '漏了 ' + missed + ' 点（红圈）· 点画布返回结算' : '全部收齐 · 点画布返回结算';
      const kb0 = canvasK();
      const w = measureW(label, canvasFont(12, true));
      // 贴右下角：频谱仪常驻左下（y 由 SIZE-12-H*k 起），居中的提示条会与它
      // 相交 18px（实测回看态 + 频谱仪解锁同时出现）。右下只有缩放条，已让开。
      const bx = SIZE - 12 - w - 20 * kb0;
      const by = SIZE - 46;
      ctx.fillStyle = 'rgba(16,21,42,.85)';
      const kb = canvasK();
      ctx.fillRect(bx, by, w + 20 * kb, 24 * kb);
      ctx.strokeStyle = missed > 0 ? 'rgba(248,113,113,.55)' : 'rgba(47,158,127,.55)';
      ctx.lineWidth = lineW(1);
      ctx.strokeRect(bx, by, w + 20 * kb, 24 * kb);
      ctx.fillStyle = missed > 0 ? '#fca5a5' : '#7fe3c4';
      ctx.fillText(label, bx + 10, by + 17);
    }

    // 缩放指示（非 1× 时显示）
    if (Math.abs(zoom - 1) > 0.01) {
      ctx.font = canvasFont(11);
      ctx.fillStyle = 'rgba(139,147,170,.9)';
      ctx.fillText('缩放 ' + zoom.toFixed(2) + '×', 12, SIZE - 14);
    }

    // 运行中的星级阈值反馈：越过 35% / 65% / 90% 就在顶部点亮一档（升档时弹一下）
    if (engine.phase !== 'edit' && !engine.sandbox && engine.total > 0 && engine.starReached > 0) {
      // 减少动画时不做弹动（只静态显示当前档位）
      const pop = engine.flags.reduceMotion
        ? 0
        : Math.max(0, 1 - (now - engine.starReachedAt) / 420);
      const tier = engine.starReached;
      const label = '★'.repeat(tier) + '☆'.repeat(3 - tier);
      ctx.save();
      ctx.translate(SIZE / 2, 30);
      const s = 1 + pop * 0.3;
      ctx.scale(s, s);
      ctx.font = canvasFont(15, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = measureW(label, canvasFont(15, true));
      ctx.fillStyle = 'rgba(16,21,42,.85)';
      const ks = canvasK();
      ctx.fillRect(-w / 2 - 12 * ks, -14 * ks, w + 24 * ks, 28 * ks);
      ctx.strokeStyle =
        tier === 3 ? 'rgba(251,191,36,.85)' : 'rgba(251,191,36,' + (0.4 + pop * 0.4) + ')';
      ctx.lineWidth = lineW(1);
      ctx.strokeRect(-w / 2 - 12 * ks, -14 * ks, w + 24 * ks, 28 * ks);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(label, 0, 1);
      ctx.restore();
    }

    // 编辑态预览计数：当前参数预计能收集多少点（桌面端绘制于底边；移动端由悬浮 HUD 承载）
    if (
      engine.phase === 'edit' &&
      engine.level &&
      (typeof window === 'undefined' || window.innerWidth > 640)
    ) {
      const total = engine.level.pts.length;
      const got = engine.collected.size;
      const willHit = previewHits.size;
      const missed = engine.lastMissedSet.size;
      const label =
        '预览收集 ' +
        willHit +
        '/' +
        total +
        (got > 0 ? '（已收 ' + got + '）' : '') +
        (missed > 0 ? ' · 上届漏 ' + missed + ' 点（红圈）' : '');
      const w = measureW(label, canvasFont(12, true));
      const bx = SIZE / 2 - w / 2 - 10;
      const by = SIZE - 16;
      ctx.fillStyle = 'rgba(16,21,42,.8)';
      const kp = canvasK();
      ctx.fillRect(bx, by - 16 * kp, w + 20 * kp, 24 * kp);
      ctx.strokeStyle = willHit > 0 ? 'rgba(251,191,36,.45)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = lineW(1);
      ctx.strokeRect(bx, by - 16 * kp, w + 20 * kp, 24 * kp);
      ctx.fillStyle = willHit > 0 ? '#fbbf24' : 'rgba(139,147,167,.9)';
      ctx.fillText(label, bx + 10, by);
    }

    ctx.globalAlpha = 1;
    // 频谱仪是精通工具：与"频谱对比"同门槛解锁，新手期不占画布（渐进披露）
    if (engine.spectrumUnlocked || engine.spectrumCompare) drawSpectrum();
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
        if (got > 0) collectSound(engine.collectedCount, engine.soundOn, engine.collectScale);
        // 连击里程碑（每满 5 连）敲一声木鱼：中国打击乐的轻点缀
        if (engine.combo > 0 && engine.combo % 5 === 0) woodfishSound(engine.soundOn);
        // 升星提示音 + 触感：本局刚越过一个星级阈值
        if (engine.starReached > lastStarTier) {
          lastStarTier = engine.starReached;
          starSound(engine.starReached, engine.soundOn);
          haptic(engine.starReached >= 3 ? [16, 40, 16] : 14, engine.soundOn);
        }
        if (finished) {
          if (engine.collectedCount === engine.total)
            perfectArpeggio(engine.soundOn, engine.collectScale.slice(0, 8));
          else finishChord(engine.soundOn);
          // 本局盖了新印：等收尾音落定，一枚一枚盖下去（音 + 触感）
          engine.newSeals.forEach((_, i) => {
            setTimeout(
              () => {
                sealSound(engine.soundOn);
                haptic(22, engine.soundOn);
              },
              430 + i * 260,
            );
          });
          // 章节印：所有单枚印盖完之后，再盖一方大印
          if (engine.newChapterSeal) {
            setTimeout(
              () => {
                chapterSealSound(engine.soundOn);
                haptic([18, 50, 30], engine.soundOn);
              },
              430 + engine.newSeals.length * 260 + 240,
            );
          }
        }
        // 自动拟合进度音：每跨过 20% 播一个上行音符，呼应逐项逼近
        if (engine.autoSolve) {
          const step = Math.min(4, Math.floor(engine.autoProgress * 5));
          if (step !== lastSolveStep) {
            lastSolveStep = step;
            solveTick(step, engine.soundOn, engine.collectScale.slice(0, 5));
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
  aria-label="傅立叶指针游戏画布：中央为原点，虚线为目标曲线，圆点为收集目标"
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

<!-- 视图复位：缩放用滚轮/双指，这里只留一个「回到默认视角」的出口 -->
<button
  type="button"
  class="view-reset"
  title="复位视图（滚轮或双指缩放，Shift/中键/右键拖动或双指平移；双击画布同效）"
  aria-label="复位视图"
  onclick={resetView}
>
  ⤢
</button>

<style>
  /* 画布铺满整个主区域（第九轮）：不再锁正方形，HUD 浮在它上面。
     逻辑空间仍是 640 正方形，视口按容器比例扩展，所以圆不会变椭圆。 */
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    background: radial-gradient(ellipse at 50% 45%, #16243a 0%, #0a1220 55%, #060b14 100%);
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .view-reset {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: var(--ctl-md);
    height: var(--ctl-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(9, 14, 24, 0.72);
    border: 1px solid var(--edge-faint);
    color: var(--muted);
    font-size: 13px;
    opacity: 0.7;
    z-index: 5;
    transition:
      opacity 0.12s ease,
      color 0.12s ease,
      border-color 0.12s ease;
  }
  .view-reset:hover {
    opacity: 1;
    color: var(--gold-bright);
    border-color: var(--edge-soft);
  }

  /* 手机竖屏：缩放/复位入口收进手势，键位隐藏 */
  @media (max-width: 640px) and (orientation: portrait) {
    .view-reset {
      display: none;
    }
  }
</style>
