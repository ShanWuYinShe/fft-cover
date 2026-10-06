<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { goalById, goalProgress, levelGoals } from '../game/goals';
  import { CHAPTERS, LEVEL_DEFS } from '../game/levels';
  import { buildShareUrl, encodeArms } from '../game/share';
  import { fitScore, starsFor } from '../game/scoring';

  /** 本关朱印进度（结算时给一条"这一关还差什么"的落点） */
  const sealProg = $derived(goalProgress(levelGoals(engine.levelGoalState)));

  /**
   * 下一枚印：按推荐顺序（星 → 满 → 准 → 专）取第一个未达成的，
   * 并把它"还差什么"说清楚——结算页直接给出下一步该做什么。
   */
  const nextSeal = $derived.by(() => {
    const g = levelGoals(engine.levelGoalState).find((x) => !x.done);
    if (!g) return null;
    let how = g.how;
    if (g.id === 'stars' || g.id === 'perfect') {
      const left = Math.max(0, n - got);
      if (left > 0) how = '再收集 ' + left + ' 点即可';
    } else if (g.id === 'exact') {
      how = '当前拟合度 ' + (fit * 100).toFixed(0) + '% · 需 ≥99%';
    }
    return { id: g.id, seal: g.seal, name: g.name, how };
  });

  /**
   * "下一枚印"对应的立刻可做的动作：
   * 专 → 开专家模式；准 → 打开频谱对比；星 / 满 → 关掉浮层看轨迹找漏点。
   */
  const nextAction = $derived.by(() => {
    switch (nextSeal?.id) {
      case 'expert':
        return { label: '开启专家模式' };
      case 'exact':
        return { label: '对比频谱' };
      case 'stars':
      case 'perfect':
        return { label: '看轨迹' };
      default:
        return null;
    }
  });

  /** 执行"下一枚印"的动作并落到可继续操作的状态 */
  function doNextAction(): void {
    switch (nextSeal?.id) {
      case 'expert':
        if (!engine.expertMode) engine.toggleExpert();
        engine.resetRun();
        break;
      case 'exact':
        if (!engine.spectrumCompare) engine.toggleSpectrumCompare();
        engine.resetRun();
        break;
      default:
        // 看轨迹：只收起结算浮层（点画布可再打开），保留本局轨迹
        engine.resultDismissed = true;
    }
  }

  /** 本局若让某一章集齐四印：取出该章的章节印与关卡数（盖大印用） */
  const chapterSeal = $derived.by(() => {
    const id = engine.newChapterSeal;
    if (!id) return null;
    const def = CHAPTERS.find((c) => c.id === id);
    if (!def) return null;
    const count = LEVEL_DEFS.filter((d) => (d.chapter ?? 'basics') === id).length;
    return { seal: def.seal, name: def.name, count };
  });

  type CopyState = 'idle' | 'ok' | 'fail';
  let copyState = $state<CopyState>('idle');
  let shareState: 'idle' | 'ok' = $state('idle');
  /** 卡关提示里"一键套用精确解"是否已执行 */
  let applied = $state(false);

  /** 把精确分解参数落到编辑态，稍后自动回到调参界面让玩家直接开跑 */
  function applyExact(): void {
    if (applied) return;
    if (engine.applyExactSolution() > 0) {
      applied = true;
      setTimeout(() => engine.resetRun(), 700);
    }
  }
  let imgState: 'idle' | 'ok' = $state('idle');

  /** 兼容降级：旧式 execCommand 复制 */
  function fallbackCopy(text: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  /** 分享解法挑战链接：好友打开即载入这套参数 */
  async function shareArms(): Promise<void> {
    const code = encodeArms(engine.arms);
    if (!code) return;
    const url = buildShareUrl(location.origin + location.pathname, code);
    const text =
      '我在《傅立叶指针》的「' + (engine.level?.name ?? '') + '」调出了这套解法，你能全清吗？';
    try {
      if (navigator.share) {
        await navigator.share({ title: '傅立叶指针 · 解法挑战', text, url });
        shareState = 'ok';
        setTimeout(() => (shareState = 'idle'), 1600);
      } else {
        await navigator.clipboard.writeText(text + ' ' + url);
        copyState = 'ok';
        setTimeout(() => (copyState = 'idle'), 1600);
      }
    } catch {
      copyState = 'fail';
      setTimeout(() => (copyState = 'idle'), 1600);
    }
  }

  async function copyReport(): Promise<void> {
    const text = engine.buildReport();
    // 移动端优先原生分享面板
    if ('share' in navigator) {
      try {
        await navigator.share({ title: '傅立叶指针战报', text });
        shareState = 'ok';
        setTimeout(() => (shareState = 'idle'), 1500);
        return;
      } catch {
        /* 用户取消或环境不支持则走剪贴板 */
      }
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
    }
    copyState = ok ? 'ok' : 'fail';
    setTimeout(() => (copyState = 'idle'), 1500);
  }

  /** 导出画布当前帧 + 成绩条为 PNG */
  async function saveImage(): Promise<void> {
    const src = document.querySelector('canvas');
    if (!src) return;
    const FOOTER = 152;
    const off = document.createElement('canvas');
    off.width = src.width;
    off.height = src.height + FOOTER;
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.drawImage(src, 0, 0);
    const h = src.height;
    octx.fillStyle = 'rgba(8,10,20,.92)';
    octx.fillRect(0, h, off.width, FOOTER);
    // 第一行：关卡名 + 得分 + 星级
    octx.fillStyle = '#fbbf24';
    octx.font = 'bold 44px sans-serif';
    const head = (engine.level?.name ?? '') + '  ' + engine.score + ' 分';
    octx.fillText(head, 40, h + 52);
    const headW = octx.measureText(head).width;
    octx.font = 'bold 38px sans-serif';
    octx.fillText('★'.repeat(st) + '☆'.repeat(3 - st), 40 + headW + 16, h + 52);
    octx.fillStyle = '#8b93a7';
    octx.font = '30px sans-serif';
    // 进步对比：与上一局得分差（历史中倒数第二条为本局之前的一局）
    const hist = engine.recentHistory(10);
    let deltaText = '';
    if (hist.length >= 2) {
      const prev = hist[hist.length - 2].score;
      const cur = hist[hist.length - 1].score;
      const d = cur - prev;
      if (d !== 0) {
        deltaText = '  较上局 ' + (d > 0 ? '+' : '') + d;
        octx.fillStyle = d > 0 ? '#4fd1c5' : '#f87171';
      }
    }
    octx.fillText(
      '收集 ' +
        got +
        '/' +
        n +
        ' · 拟合度 ' +
        (fit * 100).toFixed(0) +
        '% · 傅立叶指针' +
        deltaText,
      40,
      h + 100,
    );
    const levelId = engine.level?.id ?? '';
    let invite: string | null = null;
    if (levelId.startsWith('random-')) invite = levelId.replace('random-', '');
    else if (levelId.startsWith('daily-')) invite = levelId.replace('daily-', '');
    else if (levelId.startsWith('custom-')) {
      // custom id 格式 k-mag-phaseDeg（_ 分隔）→ 转回 k:mag:phaseDeg（, 分隔）系数串
      invite = levelId.replace('custom-', '').replaceAll('_', ',').replaceAll('-', ':');
    }
    // 第三行：本关四枚朱印（达成的填朱砂）+ 邀请码
    const imgGoals = levelGoals(engine.levelGoalState);
    imgGoals.forEach((g, i) => {
      const x = 40 + i * 44;
      const y = h + 110;
      octx.fillStyle = g.done ? '#c0392b' : 'rgba(255,255,255,.05)';
      octx.fillRect(x, y, 34, 34);
      octx.strokeStyle = g.done ? 'rgba(192,57,43,.9)' : 'rgba(255,255,255,.16)';
      octx.lineWidth = 1;
      octx.strokeRect(x, y, 34, 34);
      octx.fillStyle = g.done ? '#fdece7' : 'rgba(139,147,167,.65)';
      octx.font = 'bold 20px "STKaiti", "KaiTi", serif';
      octx.textAlign = 'center';
      octx.fillText(g.seal, x + 17, y + 24);
    });
    octx.textAlign = 'start';
    if (invite) {
      octx.fillStyle = '#4fd1c5';
      octx.font = '28px sans-serif';
      octx.fillText('邀请码 ' + invite, 40 + imgGoals.length * 44 + 10, h + 136);
    }
    // 优先 Web Share files（移动端可直接分享图片到社交 App）
    const dataUrl = off.toDataURL('image/png');
    try {
      const blob = await new Promise<Blob>((resolve2) =>
        off.toBlob((b) => resolve2(b!), 'image/png'),
      );
      const file = new File([blob], 'fft-score.png', { type: 'image/png' });
      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '傅立叶指针战报' });
        imgState = 'ok';
        setTimeout(() => (imgState = 'idle'), 1500);
        return;
      }
    } catch {
      /* 用户取消或不支持则走下载 */
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'fft-' + (engine.level?.id ?? 'run') + '-' + engine.score + '.png';
    a.click();
    imgState = 'ok';
    setTimeout(() => (imgState = 'idle'), 1500);
  }

  const words = [
    '再调调指针，让它扫过更多点！',
    '有点意思了！试着叠加一根新指针。',
    '相当不错！微调相位还能更准。',
    '完美拟合！你已掌握谐波的力量！',
  ];

  const n = $derived(engine.total);
  const got = $derived(engine.collectedCount);
  const st = $derived(starsFor(n ? got / n : 0));
  const best = $derived(engine.level ? (engine.bestStars[engine.level.id] ?? 0) : 0);
  const fit = $derived(engine.level ? fitScore(engine.level.spectrum, engine.arms) : 0);

  /** 是否展开"精确参数提示"（卡关 2 次后可用，主动点击才显示） */
  let showHint = $state(false);

  /** 得分计数动画：结算时从 0 递增到最终得分（游戏化反馈） */
  let shownScore = $state(0);
  $effect(() => {
    const target = engine.score;
    if (!target || engine.lastRunSandbox) {
      shownScore = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 620;
    const tick = (now: number): void => {
      const p = Math.min((now - t0) / dur, 1);
      shownScore = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  /* ---------- 最近成绩趋势（迷你折线） ---------- */
  const trend = $derived(engine.recentHistory(10));
  const chart = $derived.by(() => {
    const W = 220;
    const H = 42;
    const PAD = 4;
    if (trend.length < 2) return null;
    const max = Math.max(...trend.map((e) => e.score), 1);
    const min = Math.min(...trend.map((e) => e.score), 0);
    const span = Math.max(max - min, 1);
    const step = (W - PAD * 2) / (trend.length - 1);
    const pts = trend.map((e, i) => {
      const x = PAD + i * step;
      const y = H - PAD - ((e.score - min) / span) * (H - PAD * 2);
      return { x, y, e };
    });
    return {
      W,
      H,
      pts,
      path: pts.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '),
      last: pts[pts.length - 1],
    };
  });
</script>

<div class="result">
  <div class="card">
    <div class="card-body">
      {#if engine.lastRunSandbox}
        <div class="stars">🧪</div>
        <div class="line">沙盒探索结束：收集 {got} / {n} 点 · 得分 {engine.score}</div>
        <div class="best">沙盒成绩不计入记录——挑战模式见真章！</div>
      {:else}
        {#if engine.newExpertClear}
          <div class="expert-banner">
            <span class="ex-ico2">💎</span>
            <span class="ex-txt"><b>专家全清</b><i>无轮廓预览下 100% 收集</i></span>
          </div>
        {:else if engine.isExpertClear}
          <div class="expert-mini">💎 专家全清</div>
        {/if}
        {#if engine.newExact}
          <div class="exact-banner">
            <span class="ex-ico">🎯</span>
            <span class="ex-txt"><b>精确解认证</b><i>参数与傅立叶分解完全一致</i></span>
          </div>
        {:else if engine.isExact}
          <div class="exact-mini">🎯 精确解</div>
        {/if}
        {#if engine.newPerfect}
          <div class="perfect-banner">
            <span class="pf-ico">🏆</span>
            <span class="pf-txt"><b>完美全清</b><i>100% 收集 · 全部命中</i></span>
          </div>
        {:else if engine.isPerfect}
          <div class="perfect-mini">👑 完美全清</div>
        {/if}
        <div class="stars" aria-label="{st} 星">
          {#each [0, 1, 2] as i (i)}
            <span class="star" class:on={i < st} style="animation-delay: {0.15 + i * 0.13}s">
              {i < st ? '★' : '☆'}
            </span>
          {/each}
        </div>
        <div class="score-big">
          <b>{shownScore}</b>
          <span class="score-cap">
            得分{#if engine.newRecord}<i class="rec">新纪录</i>{/if}
          </span>
        </div>
        {#if chapterSeal}
          <div class="chapter-seal-banner">
            <span class="cs-seal">{chapterSeal.seal}</span>
            <span class="cs-txt">
              <b>章节印 · {chapterSeal.seal}</b>
              <i
                >{chapterSeal.name} 全部 {chapterSeal.count} 关、共 {chapterSeal.count * 4} 枚朱印集齐</i
              >
            </span>
          </div>
        {/if}
        {#if engine.newSeals.length > 0}
          <div class="seal-row">
            <span class="sr-label">本局新盖 {engine.newSeals.length} 枚</span>
            <span class="sr-seals">
              {#each engine.newSeals as id, i (id)}
                {@const def = goalById(id)}
                <span class="seal" style="animation-delay: {0.3 + i * 0.18}s" title={def.name}
                  >{def.seal}</span
                >
              {/each}
            </span>
          </div>
        {/if}
        {#if nextSeal}
          <button
            type="button"
            class="next-seal"
            title={nextAction ? '点这里：' + nextAction.label : '下一枚印'}
            onclick={doNextAction}
          >
            <span class="ns-seal">{nextSeal.seal}</span>
            <span class="ns-txt">下一枚印 <b>{nextSeal.name}</b> · {nextSeal.how}</span>
            {#if nextAction}<span class="ns-go">{nextAction.label} →</span>{/if}
          </button>
        {:else}
          <div class="next-seal all-done">
            <span class="ns-seal">印</span>
            <span class="ns-txt">本关四枚朱印已集齐 ✓</span>
          </div>
        {/if}
        <div class="stat-row">
          <span>收集 <b>{got}</b>/{n}（{n ? Math.round((got / n) * 100) : 0}%）</span>
          {#if engine.lastClearT !== null}
            <span class="dot">·</span>
            <span
              >全清 <b>{engine.lastClearT.toFixed(1)}s</b>{#if engine.newClearRecord}<i class="rec"
                  >最快</i
                >{/if}</span
            >
          {/if}
        </div>
        <div class="seal-line">
          本关朱印 <b>{sealProg.done}</b>/{sealProg.total} · 星/满/准/专
        </div>
        <div class="best">
          历史最佳 ★{Math.max(st, best)}
          {#if engine.bestClear !== null}· 最快全清 {engine.bestClear.toFixed(1)}s{/if}　{words[st]}
        </div>
        {#if engine.lastGhostDelta !== null}
          <div
            class="ghost-line"
            class:ahead={engine.lastGhostDelta > 0}
            class:even={engine.lastGhostDelta === 0}
          >
            👻 上届同期
            <b>{engine.lastGhostDelta > 0 ? '+' : ''}{engine.lastGhostDelta}</b> 点（同一时长内）
          </div>
        {/if}
        {#if engine.hintUnlocked && st < 3}
          <div class="ask-hint">
            {#if !showHint}
              <button type="button" class="hint-btn" onclick={() => (showHint = true)}>
                💡 卡住了？查看精确参数分解
              </button>
            {:else}
              <p class="hint-txt">
                <b>精确解：</b>{engine.exactSolutionText()}
              </p>
              <p class="hint-note">
                按这些参数设置指针（方向为「逆」的指针需要切到逆时针），再开始旋转即可全清；也可以直接套用。
              </p>
              <button type="button" class="apply-btn" disabled={applied} onclick={applyExact}>
                {applied ? '✓ 已套用，回到调参界面…' : '✨ 一键套用这些参数'}
              </button>
            {/if}
          </div>
        {/if}
        <div class="arms-line">解法：{engine.armsLine()} · 拟合度 {(fit * 100).toFixed(0)}%</div>
        {#if engine.streakJustBumped > 1}
          <div class="streak-line">
            🔥 每日挑战连续 <b>{engine.streakJustBumped}</b> 天完成
          </div>
        {/if}
        {#if engine.newlyUnlockedNext}
          <button
            type="button"
            class="next-unlock"
            onclick={() => engine.loadLevel(engine.newlyUnlockedNext!)}
          >
            <span class="nu-badge">🔓</span>
            <span class="nu-txt">
              <b>下一关已解锁</b>
              <i>{engine.newlyUnlockedNext.name} → 前往挑战</i>
            </span>
            <span class="nu-arrow">→</span>
          </button>
        {/if}
        {#if chart}
          <div class="trend">
            <span class="tlabel">最近 {trend.length} 局</span>
            <svg
              viewBox="0 0 {chart.W} {chart.H}"
              width={chart.W}
              height={chart.H}
              role="img"
              aria-label="最近成绩趋势"
            >
              <polyline
                points={chart.path}
                fill="none"
                stroke="rgba(79,209,197,.65)"
                stroke-width="1.6"
              />
              {#each chart.pts.slice(0, -1) as p (p.x)}
                <circle cx={p.x} cy={p.y} r="1.8" fill="rgba(139,147,167,.75)" />
              {/each}
              <circle cx={chart.last.x} cy={chart.last.y} r="3.4" fill="#fbbf24" />
            </svg>
            <span class="tval">本局 {chart.last.e.score}</span>
          </div>
        {/if}
      {/if}
    </div>
    <div class="btns">
      <button class="primary" onclick={() => engine.resetRun()}>⟲ 再来一次</button>
      <button onclick={() => (engine.resultDismissed = true)}>👁 查看轨迹</button>
      <button onclick={copyReport}>
        {shareState === 'ok'
          ? '✓ 已分享'
          : copyState === 'ok'
            ? '✓ 已复制'
            : copyState === 'fail'
              ? '⚠ 复制失败'
              : '📤 分享战报'}
      </button>
      <button onclick={saveImage}>{imgState === 'ok' ? '✓ 已保存' : '📸 保存成绩图'}</button>
      <button class="wide" onclick={shareArms}>🔗 挑战好友（分享解法）</button>
    </div>
  </div>
</div>

<style>
  .result {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    background: radial-gradient(circle at 50% 45%, rgba(10, 14, 28, 0.62), rgba(5, 7, 14, 0.9));
    backdrop-filter: blur(5px);
    border-radius: 14px;
    animation: fade-in 0.3s ease-out;
    z-index: 5;
  }
  /* 结果面板：游戏结算卡（玻璃拟态 + 上浮入场） */
  .card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: min(100%, 396px);
    max-height: 100%;
    overflow: hidden;
    border-radius: 20px;
    background: linear-gradient(168deg, rgba(24, 30, 56, 0.96), rgba(12, 16, 32, 0.98));
    border: 1px solid rgba(130, 150, 210, 0.22);
    box-shadow:
      0 26px 70px rgba(0, 0, 0, 0.62),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset,
      0 1px 0 rgba(255, 255, 255, 0.07) inset;
    animation: card-in 0.42s cubic-bezier(0.34, 1.4, 0.64, 1);
    text-align: center;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 下一枚印：结算页的下一步指引（整行可点，直接落到那个动作） */
  .next-seal {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    background: rgba(251, 191, 36, 0.09);
    border: 1px dashed rgba(251, 191, 36, 0.4);
    font: inherit;
    font-size: var(--fs-xs);
    color: var(--muted);
    text-align: left;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  button.next-seal:hover {
    background: rgba(251, 191, 36, 0.16);
    border-color: rgba(251, 191, 36, 0.7);
  }
  .ns-txt {
    flex: 1;
    min-width: 0;
  }
  .ns-go {
    flex: none;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid rgba(79, 209, 197, 0.5);
    background: rgba(79, 209, 197, 0.12);
    color: #8ff2e6;
    font-size: 10px;
    white-space: nowrap;
  }
  .ns-txt b {
    color: var(--gold);
  }
  .ns-seal {
    flex: none;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    box-shadow: 0 1px 8px rgba(192, 57, 43, 0.4);
  }
  .next-seal.all-done {
    background: rgba(47, 158, 127, 0.1);
    border-color: rgba(47, 158, 127, 0.45);
  }
  .next-seal.all-done .ns-seal {
    background: linear-gradient(160deg, #2f9e7f, #1f6f59);
    box-shadow: none;
  }
  /* 每日连胜提示 */
  .streak-line {
    width: 100%;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    background: rgba(251, 146, 60, 0.12);
    border: 1px solid rgba(251, 146, 60, 0.45);
    font-size: var(--fs-xs);
    color: var(--text);
  }
  .streak-line b {
    color: #fb923c;
    font-size: var(--fs-md);
  }
  /* 专家全清：无预览硬核认证（紫色） */
  .expert-banner {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.24), rgba(79, 209, 197, 0.1));
    border: 1px solid rgba(167, 139, 250, 0.7);
    box-shadow: 0 0 24px rgba(167, 139, 250, 0.28);
    animation: perfect-in 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) 0.2s backwards;
  }
  .ex-ico2 {
    font-size: 19px;
    filter: drop-shadow(0 0 9px rgba(167, 139, 250, 0.8));
  }
  .expert-mini {
    font-size: var(--fs-xs);
    color: #c4b5fd;
    letter-spacing: 2px;
    opacity: 0.85;
  }
  /* 精确解认证：方法层面的精通（参数与 DFT 分解一致） */
  .exact-banner {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, rgba(79, 209, 197, 0.2), rgba(167, 139, 250, 0.14));
    border: 1px solid rgba(79, 209, 197, 0.6);
    box-shadow: 0 0 22px rgba(79, 209, 197, 0.2);
    animation: perfect-in 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) 0.35s backwards;
  }
  .ex-ico {
    font-size: 19px;
    filter: drop-shadow(0 0 8px rgba(79, 209, 197, 0.7));
  }
  .ex-txt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .ex-txt b {
    font-size: var(--fs-sm);
    color: var(--cyan);
    letter-spacing: 2px;
  }
  .ex-txt i {
    font-style: normal;
    font-size: 10px;
    color: var(--muted);
  }
  .exact-mini {
    font-size: var(--fs-xs);
    color: var(--cyan);
    letter-spacing: 2px;
    opacity: 0.85;
  }
  /* 章节印：本章四印集齐，盖一方大印（比单枚印更隆重） */
  .chapter-seal-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, rgba(192, 57, 43, 0.22), rgba(251, 191, 36, 0.1));
    border: 1px solid rgba(192, 57, 43, 0.62);
    box-shadow: 0 0 28px rgba(192, 57, 43, 0.22);
    animation: ch-banner-in 0.36s ease-out 0.25s backwards;
  }
  @keyframes ch-banner-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .cs-seal {
    flex: none;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 23px;
    font-weight: 700;
    line-height: 1;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    box-shadow: 0 3px 16px rgba(192, 57, 43, 0.5);
    animation: seal-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s backwards;
  }
  .cs-txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    min-width: 0;
  }
  .cs-txt b {
    font-size: var(--fs-sm);
    color: #f6c9a8;
    letter-spacing: 1px;
  }
  .cs-txt i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  /* 本局新盖的朱印：结算时一枚一枚盖下来（与「本关目标」面板同一套字形） */
  .seal-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(180deg, rgba(192, 57, 43, 0.16), rgba(192, 57, 43, 0.05));
    border: 1px solid rgba(192, 57, 43, 0.42);
    animation: seal-row-in 0.34s ease-out 0.2s backwards;
  }
  @keyframes seal-row-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .sr-label {
    font-size: var(--fs-xs);
    color: #e9a99f;
    letter-spacing: 1px;
  }
  .sr-seals {
    display: inline-flex;
    gap: 6px;
  }
  .seal {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 16px;
    font-weight: 700;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    box-shadow: 0 2px 10px rgba(192, 57, 43, 0.42);
    animation: seal-stamp 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  @keyframes seal-stamp {
    from {
      opacity: 0;
      transform: scale(1.7) rotate(-14deg);
    }
    60% {
      opacity: 1;
      transform: scale(0.94) rotate(2deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0);
    }
  }
  .seal-line {
    font-size: var(--fs-xs);
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .seal-line b {
    color: #e9a99f;
  }

  /* 完美全清：三星之上的顶端追求 */
  .perfect-banner {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.22), rgba(255, 233, 168, 0.12));
    border: 1px solid rgba(251, 191, 36, 0.6);
    box-shadow: 0 0 26px rgba(251, 191, 36, 0.25);
    animation: perfect-in 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) 0.5s backwards;
  }
  @keyframes perfect-in {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .pf-ico {
    font-size: 22px;
    filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.7));
  }
  .pf-txt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .pf-txt b {
    font-size: var(--fs-md);
    color: var(--gold);
    letter-spacing: 2px;
  }
  .pf-txt i {
    font-style: normal;
    font-size: 10px;
    color: var(--muted);
  }
  .perfect-mini {
    font-size: var(--fs-xs);
    color: var(--gold);
    letter-spacing: 2px;
    opacity: 0.85;
  }
  /* 卡关求助：连续 0 星 2 次后才出现，主动点击才展开 */
  .ask-hint {
    width: 100%;
    margin-top: 2px;
  }
  .hint-btn {
    width: 100%;
    min-height: 34px;
    font-size: var(--fs-xs);
    color: var(--cyan);
    background: var(--cyan-dim);
    border: 1px dashed rgba(79, 209, 197, 0.45);
    border-radius: var(--r-md);
  }
  .hint-btn:hover:not(:disabled) {
    border-style: solid;
    border-color: rgba(79, 209, 197, 0.8);
  }
  .hint-txt {
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    background: rgba(79, 209, 197, 0.09);
    border: 1px solid rgba(79, 209, 197, 0.3);
    font-size: var(--fs-sm);
    color: var(--text);
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .hint-txt b {
    color: var(--cyan);
  }
  /* 一键套用精确解（卡关求助的最后一步） */
  .apply-btn {
    margin-top: 6px;
    width: 100%;
    min-height: 38px;
    border-radius: var(--r-sm);
    border: 1px solid rgba(79, 209, 197, 0.55);
    background: rgba(79, 209, 197, 0.12);
    color: #8ff2e6;
    font-size: var(--fs-sm);
    letter-spacing: 1px;
    cursor: pointer;
  }
  .apply-btn:hover:not(:disabled) {
    background: rgba(79, 209, 197, 0.2);
  }
  .apply-btn:disabled {
    opacity: 0.75;
    cursor: default;
  }
  .hint-note {
    margin: 5px 0 0;
    font-size: 10px;
    color: var(--muted-2);
    text-align: left;
  }

  /* 移动端：结算卡只保留核心信息（认证/星级/分数/收集统计），
     历史最佳、解法与趋势在统计面板里都有——保证分数与按钮不被滚动截断 */
  @media (max-width: 640px) {
    .card-body .best,
    .card-body .arms-line,
    .card-body .trend,
    .card-body .perfect-mini,
    .card-body .exact-mini {
      display: none;
    }
    .card-body {
      gap: 4px;
      padding: 10px 14px 6px;
    }
    .btns {
      gap: 6px;
      padding: 6px 10px 10px;
    }
    .btns button {
      min-height: 34px;
      font-size: var(--fs-xs);
      padding: 5px 6px;
    }
    .stars {
      font-size: 30px;
    }
    .score-big b {
      font-size: 34px;
    }
  }

  /* 内容区：独立滚动，保证操作按钮始终可见（游戏结算标准） */
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 18px 10px;
    text-align: center;
  }
  /* 星级：逐颗弹出 */
  .stars {
    display: flex;
    gap: 6px;
    font-size: 34px;
    line-height: 1;
  }
  .stars .star {
    color: rgba(160, 172, 200, 0.35);
    animation: star-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  .stars .star.on {
    color: var(--gold);
    text-shadow:
      0 0 18px rgba(251, 191, 36, 0.7),
      0 0 42px rgba(251, 191, 36, 0.35);
  }
  /* 超大得分数字 */
  .score-big {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 2px 0 0;
  }
  .score-big b {
    font-size: 40px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
    background: linear-gradient(180deg, #ffe9a8, var(--gold) 65%, #e79a12);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 4px 18px rgba(251, 191, 36, 0.35));
  }
  .score-cap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-xs);
    letter-spacing: 3px;
    color: var(--muted);
  }
  .rec {
    font-style: normal;
    font-size: 10px;
    letter-spacing: 0;
    padding: 1px 6px;
    border-radius: 999px;
    color: #0a0d18;
    background: linear-gradient(135deg, #ffe9a8, var(--gold));
    font-weight: 700;
  }
  /* 次要统计行 */
  .stat-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: var(--fs-md);
    color: var(--muted);
  }
  .stat-row b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .stat-row .dot {
    color: var(--muted-2);
  }
  .stars {
    font-size: 42px;
    letter-spacing: 8px;
    color: var(--gold);
    text-shadow: 0 0 24px rgba(251, 191, 36, 0.6);
    animation: star-pop 0.5s ease-out backwards;
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.92);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes star-pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
    60% {
      transform: scale(1.15);
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  .line {
    font-size: 15px;
    color: var(--text);
  }
  .arms-line {
    font-size: 12px;
    color: var(--muted);
    max-width: 90%;
  }
  .best {
    font-size: 13px;
    color: var(--muted);
  }
  /* 上届竞速结果：与上届同一时刻相比多收/少收了多少点 */
  .ghost-line {
    width: 100%;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.4);
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .ghost-line b {
    color: #f87171;
    font-size: var(--fs-md);
    font-variant-numeric: tabular-nums;
  }
  .ghost-line.ahead {
    background: rgba(79, 209, 197, 0.1);
    border-color: rgba(79, 209, 197, 0.42);
  }
  .ghost-line.ahead b {
    color: var(--cyan);
  }
  .ghost-line.even {
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--line);
  }
  .ghost-line.even b {
    color: var(--text);
  }
  .next-unlock {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(167, 139, 250, 0.12));
    border: 1px solid rgba(251, 191, 36, 0.45);
    cursor: pointer;
    text-align: left;
  }
  .next-unlock:hover:not(:disabled) {
    border-color: rgba(251, 191, 36, 0.8);
    box-shadow: 0 0 18px rgba(251, 191, 36, 0.18);
  }
  .nu-badge {
    font-size: 20px;
  }
  .nu-txt {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .nu-txt b {
    font-size: var(--fs-sm);
    color: var(--gold);
  }
  .nu-txt i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .nu-arrow {
    color: var(--gold);
    font-size: var(--fs-lg);
  }
  .btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    padding: 8px 14px 12px;
    flex: 0 0 auto;
  }
  .btns button {
    width: 100%;
    font-size: var(--fs-sm);
    min-height: 38px;
    padding: 8px 10px;
  }
  /* 横跨整行的次级按钮（分享解法） */
  .btns button.wide {
    grid-column: 1 / -1;
  }
  /* 主按钮（再来一次）横跨整行，突出主操作 */
  .btns button:first-child {
    grid-column: 1 / -1;
  }
  .trend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    padding: 5px 10px;
    border-radius: var(--r-md);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line-2);
  }
  .trend .tlabel {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    white-space: nowrap;
  }
  .trend .tval {
    font-size: var(--fs-xs);
    color: var(--gold);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .trend svg {
    display: block;
    height: 34px;
    width: auto;
  }

  /* 移动端结算压缩：按钮 3 行紧凑 + 内容精简，保证分数与主操作同屏 */
  @media (max-width: 640px) {
    .btns {
      gap: 6px;
      padding: 6px 10px 10px;
    }
    .btns button {
      min-height: 34px;
      font-size: var(--fs-xs);
      padding: 5px 6px;
    }
    /* 挑战好友不再横跨：与保存成绩图同行，省一行 */
    .btns button.wide {
      grid-column: auto;
    }
    .card-body {
      gap: 4px;
      padding: 10px 14px 6px;
    }
    .stars {
      font-size: 26px;
      gap: 4px;
    }
    .score-big b {
      font-size: 30px;
    }
  }
</style>
