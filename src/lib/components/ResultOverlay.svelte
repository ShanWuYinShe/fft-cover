<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { uiToggle } from '../game/audio';
  import MoreMenu from './MoreMenu.svelte';
  import { engine } from '../game/engine.svelte';
  import { goalProgress, levelGoals } from '../game/goals';
  import { haptic } from '../game/haptics';
  import { CHAPTERS, LEVEL_DEFS } from '../game/levels';
  import { buildArmsUrl, buildChallengeLine, encodeArms, pickChallengeArms } from '../game/share';
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
    uiToggle(engine.soundOn);
    haptic(12, engine.soundOn);
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

  /** 分享解法挑战链接：好友打开即载入这套参数（个人最佳更强时改发最佳解法） */
  async function shareArms(): Promise<void> {
    const pick = pickChallengeArms(engine.bestRun, engine.bestGap, engine.arms);
    const code = encodeArms(pick.arms);
    if (!code) return;
    // 带上关卡标识：随机关/每日关/创作关的好友才面对同一道题
    const url = buildArmsUrl(
      location.origin + location.pathname,
      code,
      engine.level?.id ?? '',
      engine.randomDiff,
    );
    const text =
      '我在《傅立叶指针》的「' +
      (engine.level?.name ?? '') +
      '」调出了' +
      (pick.isBest ? '最佳' : '这套') +
      '解法，你能全清吗？';
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
    let text = engine.buildReport();
    // 战报末尾附挑战链接：好友点开即进同题对决（个人最佳更强时发最佳解法）
    const line = buildChallengeLine(
      location.origin + location.pathname,
      engine.bestRun,
      engine.bestGap,
      engine.arms,
      engine.level?.id ?? '',
      engine.randomDiff,
    );
    if (line) text += '\n' + line;
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
    // 每日关的邀请码只带难度（日期由打开那天决定），写成"日期+难度"没人能用
    else if (levelId.startsWith('daily-')) invite = levelId.split('-').pop() ?? '';
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

  const n = $derived(engine.total);
  const got = $derived(engine.collectedCount);
  const st = $derived(starsFor(n ? got / n : 0));
  const fit = $derived(engine.level ? fitScore(engine.level.spectrum, engine.arms) : 0);

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

  /* ---------- 精简徽章行与主行动 ---------- */

  /** 成就徽章（小 chip）：有才显示，新达成的带高亮 */
  /**
   * 窄屏（≤640）：结算卡菜单向下展开（避开卡片里的星级/得分）；
   * 桌面向上（避开下方运行栏）。必须监听媒体查询变化——直接读
   * matchMedia().matches 放进 $derived 不会随视口变化重算（旋转屏幕/
   * 缩放窗口后方向不更新，实测踩到）。
   */
  let narrow = $state(false);
  onMount(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = (): void => {
      narrow = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  const badges = $derived.by(() => {
    const out: Array<{ icon: string; text: string; fresh: boolean }> = [];
    // 掌握类徽章（👑💎🎯）只在本局全清时展示：isPerfect/isExact 是"本关历史"口径，
    // 直接挂在 0/24 的结算卡上会读成"这局完美全清了"（实测踩过）
    const runCleared = engine.runCleared;
    if (runCleared && engine.isPerfect)
      out.push({ icon: 'crown', text: '完美全清', fresh: engine.newPerfect });
    if (runCleared && engine.isExpertClear)
      out.push({ icon: 'gem', text: '专家全清', fresh: engine.newExpertClear });
    if (runCleared && engine.isExact)
      out.push({ icon: 'target', text: '精确解', fresh: engine.newExact });
    if (engine.streakJustBumped > 1)
      out.push({ icon: 'flame', text: '连胜 ' + engine.streakJustBumped + ' 天', fresh: true });
    if (engine.newSeals.length > 0)
      out.push({ icon: '🆕', text: '新盖 ' + engine.newSeals.length + ' 印', fresh: true });
    return out;
  });

  /** 主按钮：能推进就推进（下一关），否则再来一次 */
  const mainAction = $derived.by(() => {
    if (engine.newlyUnlockedNext) {
      const def = engine.newlyUnlockedNext;
      return { label: '▶ ' + def.name, fn: () => engine.loadLevel(def) };
    }
    if (engine.nextLevelDef && (engine.bestStars[engine.level?.id ?? ''] ?? 0) >= 1) {
      const def = engine.nextLevelDef;
      return { label: '▶ 下一关 · ' + def.name, fn: () => engine.loadLevel(def) };
    }
    return { label: '⟲ 再来一次', fn: () => engine.resetRun() };
  });
</script>

<div class="result">
  <div class="card">
    <div class="card-body">
      {#if engine.lastRunSandbox}
        <div class="stars"><Icon name="flask" size={22} /></div>
        <div class="line">沙盒探索结束：收集 {got} / {n} 点 · 得分 {engine.score}</div>
        <div class="best">沙盒成绩不计入记录——挑战模式见真章！</div>
      {:else}
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
        <!-- 一行摘要：收集 / 全清 / 与上届对比 -->
        <div class="stat-row">
          <span>收集 <b>{got}</b>/{n}</span>
          {#if engine.lastClearT !== null}
            <span class="dot">·</span>
            <span
              >全清 <b>{engine.lastClearT.toFixed(1)}s</b>{#if engine.newClearRecord}<i class="rec"
                  >最快</i
                >{/if}</span
            >
          {/if}
          {#if engine.lastGhostDelta !== null}
            <span class="dot">·</span>
            <span
              class="ghost-line"
              class:ahead={engine.lastGhostDelta > 0}
              class:even={engine.lastGhostDelta === 0}
              >👻 {engine.lastGhostDelta > 0
                ? '+'
                : ''}{engine.lastGhostDelta}{' '}{engine.lastGhostVsBest ? '最佳' : '上届'}</span
            >
          {/if}
          {#if engine.bestGap !== null}
            <span class="dot">·</span>
            <span title="本关个人最佳那局收集了更多点，再来一局追上它"
              >距最佳还差 <b>{engine.bestGap}</b> 点</span
            >
          {/if}
        </div>
        <!-- 成就徽章：有才出现，一眼扫过 -->
        {#if badges.length > 0}
          <div class="chips">
            {#each badges as b (b.text)}
              <span class="chip" class:fresh={b.fresh}
                ><Icon name={b.icon} size={13} /> {b.text}</span
              >
            {/each}
          </div>
        {/if}
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
      {/if}
    </div>
    <div class="btns">
      <button class="primary" onclick={mainAction.fn}>{mainAction.label}</button>
      <!-- 方向自适应：窄屏向下（避开卡片里的星级/得分），桌面向上（避开下方运行栏） -->
      <MoreMenu
        direction={narrow ? 'down' : 'up'}
        items={[
          { label: '⟲ 再来一次', onclick: () => engine.resetRun() },
          { label: '👁 查看轨迹', onclick: () => (engine.resultDismissed = true) },
          {
            label:
              shareState === 'ok'
                ? '✓ 已分享'
                : copyState === 'ok'
                  ? '✓ 已复制战报'
                  : copyState === 'fail'
                    ? '⚠ 复制失败'
                    : '📤 分享战报',
            onclick: () => void copyReport(),
          },
          {
            label: imgState === 'ok' ? '✓ 已保存' : '📸 保存成绩图',
            onclick: () => void saveImage(),
          },
          { label: '🔗 挑战好友（分享解法）', onclick: () => void shareArms() },
          ...(engine.hintUnlocked && st < 3
            ? [
                {
                  label: applied ? '✓ 已套用精确解' : '✨ 套用精确参数',
                  title: '卡关求助：把精确分解参数直接落到指针上（可撤销）',
                  onclick: () => applyExact(),
                },
              ]
            : []),
        ]}
      />
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
  /* 卡片默认 overflow:hidden（圆角裁切内部滚动区），但这会把「⋯」菜单一并
     裁掉——菜单向下展开时整块不可见（实测）。菜单打开期间放行。 */
  .card:has(:global(.mm-pop)) {
    overflow: visible;
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

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    /* 5px（原 7px）：星级→得分→摘要→徽章收成一个紧凑视觉组，
       加快读取并让「下一关」主按钮的引导更顺（Gemini 评审 #4） */
    gap: 5px;
    min-height: 0;
    overflow-y: auto;
    padding: 14px 18px 10px;
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
  /* 成就徽章：一行小 chip，有才出现；fresh（本局新达成）描金 */
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    width: 100%;
  }
  .chip {
    padding: 3px 9px;
    border-radius: 999px;
    font-size: var(--fs-xs);
    color: var(--muted);
    background: rgba(130, 150, 210, 0.08);
    border: 1px solid rgba(130, 150, 210, 0.22);
    white-space: nowrap;
  }
  .chip.fresh {
    color: var(--gold);
    border-color: rgba(251, 191, 36, 0.5);
    background: rgba(251, 191, 36, 0.08);
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
  .ghost-line.ahead {
    background: rgba(79, 209, 197, 0.1);
    border-color: rgba(79, 209, 197, 0.42);
  }
  .ghost-line.even {
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--line);
  }
  .btns {
    display: flex;
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
  /* 主按钮占满，⋯ 收紧为方形（MoreMenu 是子组件，需 :global） */
  .btns button.primary {
    flex: 1;
  }
  .btns :global(.mm) {
    flex: 0 0 44px;
  }
  .btns :global(.mm-btn) {
    width: 100%;
    height: 100%;
    min-height: 38px;
  }
  /* 矮屏（手机横屏 ~390px 高）：压缩结算卡密度，不靠隐蔽滚动也能看全 */
  @media (max-height: 460px) {
    .card-body {
      padding: 8px 14px 4px;
      gap: 3px;
    }
    .stars {
      font-size: 24px;
      gap: 4px;
    }
    .score-big b {
      font-size: 28px;
    }
    .next-seal {
      padding: 6px 10px;
    }
  }
  /* 矮视口（画布只有 ~180–250px 高）：结算卡若仍贴在画布框内，「收集 / 全清 /
     完美全清 / 下一枚印」全被裁掉甚至与主按钮串行——实测 320×568（竖屏）只剩
     星级与分数、640×360（横屏）下一枚印行被「下一关」压住。矮视口一律整屏
     显示（z-index 高于底部标签栏，结算时整屏就是这一张卡），统计一行不落。 */
  @media (max-width: 900px) and (max-height: 700px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px;
    }
  }
  /* 手机窄屏：说明文字与「对比频谱 →」挤在一行会把「拟合度」拦腰折断
     （实测 390 宽），改为说明占满首行、动作按钮落到第二行右对齐。 */
  @media (max-width: 640px) {
    .next-seal {
      flex-wrap: wrap;
      row-gap: 6px;
    }
    .ns-txt {
      flex: 1 1 100%;
      line-height: 1.5;
    }
    .ns-go {
      margin-left: auto;
    }
  }
</style>
