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

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  /**
   * 得分计数动画：0 → 最终得分（600ms easeOut）。
   * 结束帧直接取终值（不做四舍五入插值），保证动画结束后显示值与引擎完全一致；
   * reduce-motion 下不插值，直接显示终值。
   */
  let shownScore = $state(0);
  $effect(() => {
    const target = engine.score;
    if (!target || engine.lastRunSandbox || reduceMotion) {
      shownScore = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 600;
    const tick = (now: number): void => {
      const p = Math.min((now - t0) / dur, 1);
      shownScore = p >= 1 ? target : Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  /**
   * 结算印章：本局最值得盖的那一个（掌握类优先，其次纪录类）。
   * 只是呈现——判定仍来自引擎既有标志位。
   */
  const stamp = $derived.by(() => {
    const runCleared = engine.runCleared;
    if (runCleared && engine.isPerfect) return '完美全清';
    if (runCleared && engine.isExpertClear) return '专家全清';
    if (runCleared && engine.isExact) return '精确解';
    if (engine.newRecord) return '新纪录';
    if (engine.newClearRecord) return '最快全清';
    if (engine.streakJustBumped > 1) return '连胜 ' + engine.streakJustBumped + ' 天';
    return '';
  });

  /* ---------- 一句话结论与主行动 ---------- */

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

  /**
   * 一句话结论：大数字下面唯一的一行判断（原来是一排装饰 chip）。
   * 掌握类结论只在本局全清时出现：isPerfect/isExact 是"本关历史"口径，
   * 直接挂在 0/24 的结算卡上会读成"这局完美全清了"（实测踩过）。
   */
  const verdict = $derived.by(() => {
    const parts: string[] = [];
    if (st >= 3) parts.push('三星达成');
    else if (st > 0) parts.push(st + ' 星');
    else parts.push('还没拿到星');
    const runCleared = engine.runCleared;
    if (runCleared && engine.isPerfect) parts.push('完美全清');
    if (runCleared && engine.isExact) parts.push('精确解');
    if (runCleared && engine.isExpertClear) parts.push('专家全清');
    if (engine.newRecord) parts.push('新纪录');
    if (engine.newClearRecord) parts.push('最快全清');
    if (engine.streakJustBumped > 1) parts.push('连胜 ' + engine.streakJustBumped + ' 天');
    if (engine.newSeals.length > 0) parts.push('新盖 ' + engine.newSeals.length + ' 印');
    return parts.join(' · ');
  });

  /** 主按钮：能推进就推进（下一关），否则再来一次 */
  const mainAction = $derived.by(() => {
    if (engine.newlyUnlockedNext) {
      const def = engine.newlyUnlockedNext;
      return { icon: 'play', label: def.name, fn: () => engine.loadLevel(def) };
    }
    if (engine.nextLevelDef && (engine.bestStars[engine.level?.id ?? ''] ?? 0) >= 1) {
      const def = engine.nextLevelDef;
      return { icon: 'play', label: '下一关 · ' + def.name, fn: () => engine.loadLevel(def) };
    }
    return { icon: 'refresh', label: '再来一次', fn: () => engine.resetRun() };
  });
</script>

<div class="result">
  <div class="card g-rivets">
    <div class="card-rail">
      <span class="g-label">结算</span>
      <span class="rail-lv">{engine.level?.name ?? '自由观测'}</span>
    </div>
    <div class="card-body">
      {#if engine.lastRunSandbox}
        <div class="stars"><Icon name="flask" size={22} /></div>
        <div class="line">沙盒探索结束：收集 {got} / {n} 点 · 得分 {engine.score}</div>
        <div class="best">沙盒成绩不计入记录——挑战模式见真章！</div>
      {:else}
        <!-- 大数字一：星级 -->
        <div class="stars" aria-label="{st} 星">
          {#each [0, 1, 2] as i (i)}
            <!-- 只有已达成的星逐颗弹入（120ms 一颗）；未达成的星是静态空槽 -->
            <span
              class="star"
              class:on={i < st}
              class:pop={i < st}
              style={i < st ? 'animation-delay: ' + i * 120 + 'ms' : undefined}
            >
              {i < st ? '★' : '☆'}
            </span>
          {/each}
        </div>
        <!-- 大数字二：得分 -->
        <div class="score-big">
          <b class="g-num g-num--gold">{shownScore}</b>
          <span class="score-cap">得分</span>
        </div>
        <!-- 一句话结论：这一局是什么水平 -->
        <p class="verdict">{verdict}</p>
        <!-- 结算印章：斜盖入（内容与结论行重复，故对读屏隐藏） -->
        {#if stamp}
          <span class="stamp g-seal" aria-hidden="true">{stamp}</span>
        {/if}
        <!-- 一行明细：收集 / 全清 / 上届对比 / 距最佳 -->
        <p class="detail">
          <span>收集 <b>{got}</b>/{n}</span>
          {#if engine.lastClearT !== null}
            <span class="sep">·</span>
            <span>全清 <b>{engine.lastClearT.toFixed(1)}s</b></span>
          {/if}
          {#if engine.lastGhostDelta !== null}
            <span class="sep">·</span>
            <span class:ghost-ahead={engine.lastGhostDelta > 0}
              >较{engine.lastGhostVsBest ? '最佳' : '上届'}
              {engine.lastGhostDelta > 0 ? '+' : ''}{engine.lastGhostDelta}</span
            >
          {/if}
          {#if engine.bestGap !== null}
            <span class="sep">·</span>
            <span title="本关个人最佳那局收集了更多点，再来一局追上它"
              >距最佳还差 <b>{engine.bestGap}</b> 点</span
            >
          {/if}
        </p>
        {#if chapterSeal}
          <p class="seal-line">
            <span class="cs-seal">{chapterSeal.seal}</span>
            {chapterSeal.name} 章节印集齐（{chapterSeal.count} 关全部达成）
          </p>
        {/if}
        <!-- 下一步：一行可点的文字，不再是盒子 -->
        {#if nextSeal}
          <button
            type="button"
            class="next-line"
            title={nextAction ? '点这里：' + nextAction.label : '下一枚目标'}
            onclick={doNextAction}
          >
            <span class="ns-txt">下一枚目标 <b>{nextSeal.name}</b> · {nextSeal.how}</span>
            {#if nextAction}<span class="ns-go">{nextAction.label} →</span>{/if}
          </button>
        {:else}
          <p class="next-line done">本关四枚目标已集齐 ✓</p>
        {/if}
      {/if}
    </div>
    <div class="btns">
      <button class="g-btn g-btn--primary g-btn--lg primary" onclick={mainAction.fn}>
        {mainAction.label}
      </button>
      <!-- 方向自适应：窄屏向下（避开卡片里的星级/得分），桌面向上（避开下方运行栏） -->
      <MoreMenu
        direction={narrow ? 'down' : 'up'}
        items={[
          { icon: 'refresh', label: '再来一次', onclick: () => engine.resetRun() },
          { label: '查看轨迹', onclick: () => (engine.resultDismissed = true) },
          {
            label:
              shareState === 'ok'
                ? '✓ 已分享'
                : copyState === 'ok'
                  ? '✓ 已复制战报'
                  : copyState === 'fail'
                    ? '复制失败'
                    : '分享战报',
            onclick: () => void copyReport(),
          },
          {
            label: imgState === 'ok' ? '✓ 已保存' : '保存成绩图',
            onclick: () => void saveImage(),
          },
          { label: '挑战好友（分享解法）', onclick: () => void shareArms() },
          ...(engine.hintUnlocked && st < 3
            ? [
                {
                  label: applied ? '✓ 已套用精确解' : '套用精确参数',
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
    background: radial-gradient(circle at 50% 45%, rgba(8, 12, 22, 0.6), rgba(3, 5, 11, 0.9));
    backdrop-filter: blur(4px);
    border-radius: 14px;
    animation: fade-in 0.3s ease-out;
    z-index: 5;
  }

  /* 结算卡：一块平板；信息只有「大数字 → 结论 → 明细 → 两个按钮」 */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: min(100%, 400px);
    max-height: 100%;
    /* 放行溢出：结算卡的「⋯」菜单向下展开时不能被裁 */
    overflow: visible;
    border-radius: 10px;
    /* 器物面板：青铜边 + 内侧 1px 暗线 + 铆钉（.g-rivets::after） */
    background: var(--face-plate);
    border: 1px solid var(--edge-bronze);
    box-shadow:
      inset 0 0 0 1px var(--edge-inner),
      0 4px 8px rgba(0, 0, 0, 0.5);
    animation: card-in 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
    text-align: center;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 卡片抬头：左「结算」铭牌 + 右关卡名，一条底线分隔 */
  .card-rail {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px 8px;
    border-bottom: 1px solid var(--edge-faint);
    border-radius: 10px 10px 0 0;
    position: relative;
    z-index: 1;
  }
  .rail-lv {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 16px 10px;
    text-align: center;
  }

  /* 大数字一：星级（逐颗弹出） */
  /* 顶部金箔发丝线（器物面板的高光边；铆钉占的是 ::after） */
  .card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold) 20%, var(--gold) 80%, transparent);
    opacity: 0.55;
    pointer-events: none;
    z-index: 2;
  }

  .stars {
    display: flex;
    gap: 8px;
    font-size: 42px;
    line-height: 1;
    letter-spacing: 0;
  }
  /* 星位：每颗星坐在一个方形宝石座里（未达成 = 暗槽） */
  .stars .star {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.15em;
    height: 1.15em;
    border-radius: 6px;
    color: rgba(160, 172, 200, 0.3);
    background: linear-gradient(180deg, #070c17, #101a2c);
    box-shadow:
      inset 0 2px 5px rgba(0, 0, 0, 0.85),
      0 0 0 1px rgba(201, 162, 74, 0.25);
  }
  /* 已达成：金座 + 宝石（唯一的发光在这里） */
  .stars .star.on {
    color: #3a2400;
    background: var(--face-gold-plate, linear-gradient(180deg, #ffe7a3, #d69214));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 0 0 1px var(--edge-bronze-hot),
      0 0 12px rgba(245, 184, 65, 0.45);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  /* 已达成的星逐颗弹入：0.4 → 1.12 → 1.0（每颗 120ms，见内联 delay） */
  .stars .star.pop {
    animation: star-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  @keyframes star-pop {
    from {
      transform: scale(0.4);
      opacity: 0;
    }
    60% {
      transform: scale(1.12);
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* 结算印章：斜盖入 -8° → -6°，1.3 → 1.0（220ms，等星级弹完再盖） */
  /* 朱印（.g-seal 给形与色），这里只保留本卡的落款角度与盖章动画。
     选择器带 .card-body 提高优先级，压过公共件的 rotate(-2deg)。 */
  .card-body .stamp {
    align-self: center;
    margin-top: 2px;
    padding: 3px 12px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: var(--fs-md);
    letter-spacing: 3px;
    white-space: nowrap;
    /* 基准态就是盖好后的角度：动画结束后自然停在 -6° */
    transform: rotate(-6deg);
    animation: stamp-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s backwards;
  }
  @keyframes stamp-in {
    from {
      opacity: 0;
      transform: rotate(-8deg) scale(1.3);
    }
    to {
      opacity: 1;
      transform: rotate(-6deg) scale(1);
    }
  }

  /* 大数字二：得分 */
  .score-big {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .score-big b {
    font-size: 46px;
    line-height: 1;
    letter-spacing: 1px;
    background: linear-gradient(180deg, #ffe9a8, var(--gold) 65%, #e79a12);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .score-cap {
    font-size: var(--fs-sm);
    letter-spacing: 2px;
    color: var(--muted);
  }

  /* 一句话结论 */
  .verdict {
    margin: 2px 0 0;
    font-size: var(--fs-lg);
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--gold-bright);
    line-height: 1.4;
  }

  /* 一行明细 */
  .detail {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .detail b {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .detail .sep {
    color: var(--muted-2);
  }
  .detail .ghost-ahead {
    color: var(--cyan);
  }

  /* 章节印集齐：一行庆祝（红印 + 文字） */
  .seal-line {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .cs-seal {
    flex: none;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    background: linear-gradient(160deg, #d92b2b, #991b1b);
  }

  /* 下一步：一行可点的文字（下划线分隔），不再是盒子按钮 */
  .next-line {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    /* 触屏命中区 ≥40（桌面 30） */
    min-height: var(--ctl-md);
    margin-top: 2px;
    padding: 8px 2px;
    font: inherit;
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    text-align: left;
    background: none;
    border: none;
    border-top: 1px solid var(--edge-faint);
    cursor: pointer;
    transition: color 0.12s ease;
  }
  .next-line:hover {
    color: var(--text);
  }
  .next-line.done {
    cursor: default;
    justify-content: center;
    color: var(--cyan);
  }
  .ns-txt b {
    color: var(--gold-bright);
  }
  .ns-go {
    color: var(--cyan);
    white-space: nowrap;
  }

  /* 沙盒分支 */
  .line {
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .best {
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .btns {
    display: flex;
    gap: 8px;
    width: 100%;
    padding: 10px 14px 12px;
    box-sizing: border-box;
    flex: 0 0 auto;
    border-top: 1px solid var(--edge-faint);
  }
  .btns button {
    width: 100%;
  }
  .btns button.primary {
    flex: 1;
  }
  /* ⋯ 菜单与主按钮等高（MoreMenu 是子组件，需 :global） */
  .btns :global(.mm) {
    flex: 0 0 var(--ctl-lg);
  }
  .btns :global(.mm-btn) {
    width: 100%;
    height: 100%;
    min-height: var(--ctl-lg);
  }

  /* 矮屏（手机横屏 ~390px 高）：压缩密度 */
  @media (max-height: 460px) {
    .card-body {
      padding: 10px 14px 6px;
      gap: 6px;
    }
    .stars {
      font-size: 28px;
    }
    .score-big b {
      font-size: 32px;
    }
  }
  /* 矮视口或手机竖屏：结算卡整屏显示（座舱壳下画布高度不够放完整卡） */
  @media (max-width: 900px) and (max-height: 700px), (max-width: 640px) {
    .result {
      position: fixed;
      inset: 0;
      z-index: 40;
      border-radius: 0;
      padding: 10px;
    }
  }
  @media (max-width: 640px) {
    .card-body {
      padding: 12px 14px 8px;
      gap: 6px;
    }
    .stars {
      font-size: 34px;
    }
    .score-big b {
      font-size: 38px;
    }
    .verdict {
      font-size: var(--fs-md);
    }
    .btns {
      padding: 10px 14px 12px;
    }
  }

  /* 减弱动态效果：位移动画全部关闭（颜色/透明度变化保留） */
  @media (prefers-reduced-motion: reduce) {
    .card,
    .stars .star.pop,
    .stamp {
      animation: none;
    }
  }
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .stars .star.pop,
  :global(.reduce-motion) .stamp {
    animation: none;
  }
</style>
