<script lang="ts">
  import { onMount } from 'svelte';
  import Stage from './lib/components/Stage.svelte';
  import ArmPanel from './lib/components/ArmPanel.svelte';
  import TitleScreen from './lib/components/TitleScreen.svelte';
  import {
    readArmsFromHash,
    readCustomFromHash,
    readDailyFromHash,
    readRandomFromHash,
    readWeeklyFromHash,
  } from './lib/game/share';
  import LevelPicker from './lib/components/LevelPicker.svelte';
  import ResultOverlay from './lib/components/ResultOverlay.svelte';
  import EndlessResult from './lib/components/EndlessResult.svelte';
  import MoreMenu from './lib/components/MoreMenu.svelte';
  import AchievementsModal from './lib/components/AchievementsModal.svelte';
  import FinaleOverlay from './lib/components/FinaleOverlay.svelte';
  import ChapterIntroOverlay from './lib/components/ChapterIntroOverlay.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import { decodeCoeffs, LEVEL_DEFS } from './lib/game/levels';
  import { levelGoals } from './lib/game/goals';
  import { spectrumGaps, starsFor } from './lib/game/scoring';
  import { STAR_LEVELS } from './lib/game/constants';
  import { chapterProgress, type ChapterProgress } from './lib/game/campaign';
  import { engine } from './lib/game/engine.svelte';
  import {
    achvSound,
    beep,
    finishChord,
    perfectArpeggio,
    setVolume,
    getVolume,
    initVolumeFromStorage,
    uiClick,
    uiToggle,
  } from './lib/game/audio';
  import { haptic } from './lib/game/haptics';
  import { isTypingTarget } from './lib/game/keys';
  import { musicIntensity } from './lib/game/harmony';
  import { musicLevelArrival, setMusicSuspended, startMusic, updateMusic } from './lib/game/music';

  let showAchv = $state(false);
  let showSettings = $state(false);
  /** 开始画面：首次访问显示（老玩家直接进游戏，点标题可再看） */
  let showTitle = $state(false);
  /** 移动端底部标签：关卡 / 指针 / 成绩（桌面端忽略，全部 section 同屏显示） */
  let mobileTab: 'levels' | 'arms' | 'score' = $state('levels');
  /**
   * 手机端面板全屏展开：面板可视高只有 ~330px 而内容要 503px（实测 28%
   * 的元素必须滚动才看得到）。展开时画布让位、面板铺满，信息一次看全。
   * 点底部标签栏的**当前项**切换，点另一项则切页并收起。
   */
  let panelExpanded = $state(false);
  function onTab(t: 'levels' | 'arms'): void {
    if (mobileTab === t) panelExpanded = !panelExpanded;
    else {
      mobileTab = t;
      panelExpanded = false;
    }
  }
  /** PWA：有新版本等待接管（main.ts 在 SW 进入 waiting 时派发 pwa-update） */
  let updateReady = $state(false);
  /** 分享链接载入提示（几秒后自动消失） */
  let shareNote = $state<string | null>(null);

  /** 减少动画：优先尊重系统的"减弱动态效果"，其次看设置里的开关 */
  $effect(() => {
    document.documentElement.classList.toggle('reduce-motion', !!engine.flags.reduceMotion);
  });

  onMount(() => {
    // 系统开了"减弱动态效果"且用户没手动设过 → 默认打开减少动画
    if (
      engine.flags.reduceMotion === undefined &&
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      engine.setFlag('reduceMotion', true);
    }
    const sharedLevel = readRandomFromHash(location.hash) ?? readDailyFromHash(location.hash);
    // 首次访问显示开始画面（有分享链接时直接进游戏，避免挡住挑战链接）
    if (!engine.flags.seenTitle && !readArmsFromHash(location.hash) && !sharedLevel) {
      showTitle = true;
      engine.markFlag('seenTitle');
    }
    applyHashShare();
    // 无尽进行中的续玩优先于常规续玩（玩家上次是中途退出无尽）
    engine.resumeEndlessRun();
    // 同一标签页里粘贴新链接（只改 hash 不会重新加载文档）也要生效
    window.addEventListener('hashchange', applyHashShare);
    // 旋到横屏/缩放出竖屏范围：展开态只在竖屏生效，离开时自动复位，
    // 否则标签会残留「收起」字样（状态与实际布局不符）
    const panelMq = window.matchMedia('(max-width: 640px) and (orientation: portrait)');
    const syncPanel = (): void => {
      if (!panelMq.matches) panelExpanded = false;
    };
    syncPanel();
    panelMq.addEventListener('change', syncPanel);
    window.addEventListener('hashchange', syncPanel);
    const onUpdate = () => (updateReady = true);
    window.addEventListener('pwa-update', onUpdate);
    // 全局按钮点击音（capture：先于组件自身 handler，业界标准 UI juice）
    const onUiClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('button')) uiClick(engine.soundOn);
    };
    document.addEventListener('click', onUiClick, true);
    // 浏览器自动播放策略：音频必须在用户手势后起播（首次交互即开始配乐）
    const onFirstGesture = () => {
      startMusic();
      syncMusic(); // 手势本身不改变响应式状态，建图后需立即落地一次当前声部
    };
    document.addEventListener('pointerdown', onFirstGesture, { capture: true, once: true });
    document.addEventListener('keydown', onFirstGesture, { capture: true, once: true });
    // 切到后台挂起音频（省电，也不会在后台继续响）
    const onVisibility = () => setMusicSuspended(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('hashchange', applyHashShare);
      window.removeEventListener('pwa-update', onUpdate);
      document.removeEventListener('click', onUiClick, true);
      document.removeEventListener('pointerdown', onFirstGesture, true);
      document.removeEventListener('keydown', onFirstGesture, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
  /**
   * 处理 URL hash 里的分享内容（首次进入与同标签页改 hash 都走这里）：
   * 随机关卡链接先载关（带难度），解法码再套参数——两者可以同时出现。
   * 处理完清掉 hash，避免刷新时重复提示。
   */
  function applyHashShare(): void {
    const shared = readRandomFromHash(location.hash);
    const sharedDaily = readDailyFromHash(location.hash);
    const sharedCustom = readCustomFromHash(location.hash);
    let sharedCustomLoaded = false;
    if (sharedCustom) {
      const coeffs = decodeCoeffs(sharedCustom);
      if (coeffs) {
        engine.loadCustomLevel(coeffs, '创作关卡');
        shareNote = '已载入好友分享的创作关卡';
        setTimeout(() => (shareNote = null), 5200);
        sharedCustomLoaded = true;
      }
    }
    if (shared) {
      engine.loadRandomSeed(shared.seed, shared.diff);
      shareNote = '已载入好友分享的随机关卡（邀请码 ' + shared.seed + '）';
      setTimeout(() => (shareNote = null), 5200);
    } else if (sharedDaily) {
      engine.setDifficulty(sharedDaily);
      engine.loadDaily();
      shareNote = '已载入好友分享的每日挑战（' + sharedDaily + '）';
      setTimeout(() => (shareNote = null), 5200);
    } else if (readWeeklyFromHash(location.hash)) {
      engine.loadWeekly();
      shareNote = '已载入好友分享的本周挑战';
      setTimeout(() => (shareNote = null), 5200);
    }
    const code = readArmsFromHash(location.hash);
    if (code && engine.applyArmsCode(code)) {
      // 解法挑战不能静默套参数：好友得知道自己被挑战了、下一步做什么
      shareNote =
        (shared || sharedDaily || sharedCustomLoaded ? '已载入好友分享的关卡，' : '') +
        '好友向你发起解法挑战——参数已装好，点 ▶ 开始旋转试试全清！';
      setTimeout(() => (shareNote = null), 5200);
      history.replaceState(null, '', location.pathname + location.search);
    } else if (shared || sharedDaily || sharedCustomLoaded) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function applyPwaUpdate(): void {
    void import('./main').then((m) => m.applyUpdate());
  }
  // 启动时把存档音量灌进 audio 模块的模块级状态：
  // 模块变量默认满音量，不初始化的话"上次静音"的玩家刷新后会突然有声音
  let volume = $state(initVolumeFromStorage());

  /** 本关已盖朱印数（星 满 准 专）：HUD 上的"精通灯塔" */
  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);

  /**
   * 暂停时的偏差诊断：最该调整的两个频率。
   * 原先画在画布上（y=30），但暂停浮层是 inset:0 + 磨砂不透明，
   * 那段文字**永远看不见**（实测截图确认）——移到浮层里才有意义。
   */
  /** 暂停时的当前进度：收了多少、几星、离下一档还差几点（暂停是决策时刻） */
  const pauseProgress = $derived.by(() => {
    if (engine.phase !== 'paused' || engine.total === 0) return '';
    const got = engine.collectedCount;
    const ratio = got / engine.total;
    const st = starsFor(ratio);
    const parts = ['收集 ' + got + '/' + engine.total, '★'.repeat(st) + '☆'.repeat(3 - st)];
    if (st < 3) {
      // STAR_LEVELS 是降序 [0.9, 0.65, 0.35]：三星线→索引 0，二星线→1，一星线→2
      const nextTier = STAR_LEVELS[2 - st];
      const need = Math.ceil(nextTier * engine.total - 1e-9) - got;
      if (need > 0) parts.push('再收 ' + need + ' 点升 ' + (st + 1) + ' 星');
    }
    return parts.join(' · ');
  });

  let srLive = $state('');
  let srTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * 读屏播报（优先级链）：结算 > 成就解锁 > 过波 > 星级跨档。
   * 多事件同窗口连发时只播报最高优先级的一条——aria-live 会把每次
   * 文本变化排队朗读，高连击场景（星级跨档 + 成就 + 过波同秒）会把
   * 读屏队列塞爆，节奏失控。
   */
  const srMsg = $derived.by(() => {
    if (engine.phase === 'done') {
      if (engine.endless) {
        return (
          '无尽挑战结束，止步第 ' +
          engine.endlessWave +
          ' 波，累计 ' +
          engine.endlessScore +
          ' 分' +
          (engine.endlessNewBest ? '，刷新历史最佳' : '')
        );
      }
      const st = engine.collectedCount / Math.max(1, engine.total);
      return (
        '本局结束，收集 ' +
        engine.collectedCount +
        '/' +
        engine.total +
        '，' +
        starsFor(st) +
        ' 星，得分 ' +
        engine.score
      );
    }
    if (engine.toast) return '解锁成就：' + engine.toast.name;
    if (engine.endless && engine.endlessWave > 1) {
      return (
        '第 ' +
        (engine.endlessWave - 1) +
        ' 波通过，累计 ' +
        engine.endlessScore +
        ' 分，进入第 ' +
        engine.endlessWave +
        ' 波'
      );
    }
    if (engine.starReached > 0) {
      return (
        '已收集 ' +
        engine.collectedCount +
        '/' +
        engine.total +
        '，' +
        engine.starReached +
        ' 星达成'
      );
    }
    return '';
  });

  // 防抖提交：事件串平息 600ms 后才写入 aria-live，读屏只读最终结果
  $effect(() => {
    const msg = srMsg;
    if (!msg) return;
    clearTimeout(srTimer);
    srTimer = setTimeout(() => {
      srLive = msg;
    }, 600);
    return () => clearTimeout(srTimer);
  });

  const pauseGaps = $derived.by(() => {
    if (engine.phase !== 'paused' || engine.collectedCount === 0 || !engine.level) return '';
    const gaps = spectrumGaps(engine.level.spectrum, engine.arms);
    if (gaps.length === 0) return '';
    return gaps
      .map(
        (g) =>
          (g.sign > 0 ? '' : '−') +
          Math.abs(g.k) +
          '× 差 ' +
          Math.round(g.mag) +
          (g.sign > 0 ? '' : '（过量）'),
      )
      .join('　');
  });

  /** 幽灵竞速差值文案：领先/落后上届多少点（无可比对象时为空） */
  const ghostLabel = $derived.by(() => {
    if (!engine.ghostComparable) return '';
    // 只在跑动中显示：结算后由结算卡的"上届同期"接手
    if (engine.phase !== 'running' && engine.phase !== 'paused') return '';
    const d = engine.ghostDelta;
    const vs = engine.raceIsBest ? '最佳' : '上届';
    return d > 0 ? '👻 +' + d + ' 领先' + vs : d < 0 ? '👻 ' + d + ' 落后' + vs : '👻 持平';
  });

  /* ---------- 章节入场卡：第一次进入某一章时介绍这一章教什么 ---------- */

  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));
  /** 当前关卡所属章节 */
  const currentChapter = $derived(
    chapters.find((c) => c.levels.some((l) => l.id === engine.level?.id)) ?? null,
  );
  /** 正在展示的入场卡（null = 不展示） */
  let chapterIntro = $state<ChapterProgress | null>(null);

  $effect(() => {
    const ch = currentChapter;
    // 第一章交给新手引导；已看过的、未解锁的、标题页/引导页期间都不弹
    if (!ch || ch.id === 'basics' || !ch.unlocked) return;
    if (engine.flags['chapterIntro:' + ch.id]) return;
    if (showTitle || !engine.flags['tutorialSeen']) return;
    if (chapterIntro?.id === ch.id) return;
    chapterIntro = ch;
  });

  /** 图鉴里点一格：直接进那一关（未解锁的格子不可点） */
  function playFromDex(id: string): void {
    const def = LEVEL_DEFS.find((d) => d.id === id);
    if (!def) return;
    engine.loadLevel(def);
    showAchv = false;
  }

  function dismissChapterIntro(): void {
    if (chapterIntro) engine.markFlag('chapterIntro:' + chapterIntro.id);
    chapterIntro = null;
  }

  /**
   * 背景音乐跟随游戏状态：指针参数（引擎响应式）变化即刷新声部，
   * 阶段变化即调整动态强度。参数未变时 updateMusic 内部直接返回。
   */
  function syncMusic(): void {
    updateMusic(
      engine.arms,
      musicIntensity(engine.phase, engine.sandbox),
      engine.musicOn,
      volume,
      engine.musicalKey,
      // 指针只在真的转起来时发声（编辑态保持安静，避免长音嗡鸣）
      engine.phase !== 'edit',
    );
  }

  /** 上一次已"抵达"的关卡：切关时给一声柔和的抵达音（Exploring 的仪式感） */
  let arrivedLevelId = '';

  $effect(() => {
    const id = engine.level?.id ?? '';
    if (id !== arrivedLevelId) {
      arrivedLevelId = id;
      if (id) musicLevelArrival(engine.musicalKey);
    }
    syncMusic();
  });

  /** 音量三态循环 1 → 0.5 → 0（静音时同步引擎开关） */
  function cycleVolume(): void {
    const next = volume === 1 ? 0.5 : volume === 0.5 ? 0 : 1;
    volume = next;
    setVolume(next);
    engine.setSound(next > 0);
  }
  const volIcon = $derived(volume === 1 ? '🔊' : volume === 0.5 ? '🔉' : '🔇');

  // 新手引导：首次访问显示（flag 持久化在引擎 flags 里）
  const tutorialSeen = $derived(!!engine.flags['tutorialSeen']);

  // 通关演出出现时给一次较长的触感（移动端）
  $effect(() => {
    if (engine.finale) haptic([24, 70, 24, 70, 48], engine.soundOn);
  });

  // 成就解锁 toast：3 秒后自动消失
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!engine.toast) return;
    achvSound(engine.soundOn);
    haptic([14, 40, 14], engine.soundOn);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => engine.clearToast(), 3000);
  });

  function toggleRun(): void {
    engine.toggleRun();
    beep(engine.phase === 'running' ? 440 : 330, 0.06, 'square', 0.06, engine.soundOn);
  }
  function stopRun(): void {
    engine.fastForward = false;
    const was = engine.phase;
    engine.stopRun();
    if (engine.phase === 'done' && (was === 'running' || was === 'paused')) {
      if (engine.collectedCount === engine.total)
        perfectArpeggio(engine.soundOn, engine.collectScale.slice(0, 8));
      else finishChord(engine.soundOn);
    }
  }
  // $effect：编辑态/结算后确保快进关闭（防止遗留状态）
  $effect(() => {
    if (engine.phase !== 'running' && engine.fastForward) engine.fastForward = false;
  });

  /** 全局按钮点击音（事件委托，业界标准 UI juice） */
  function onGlobalClick(e: MouseEvent): void {
    const el = e.target as HTMLElement;
    if (el.closest('button')) uiClick(engine.soundOn);
  }

  function onKeydown(e: KeyboardEvent): void {
    // 输入框 / 多行文本 / 下拉框 / contenteditable 里都在打字，全局键让路
    if (isTypingTarget(e.target)) return;
    // 有弹层开着（成就/设置/合成器/标题/教程/通关/入境）时：全局键让路，
    // 否则会在玩家看不见的画布后面偷偷重开一局
    if (document.querySelector('.modal, .finale, .ch-intro, .title-screen, .tutorial')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) engine.redoArms();
      else engine.undoArms();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      engine.redoArms();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      if (engine.phase === 'done') {
        // 无尽模式由结算卡按钮推进（过波/重开），空格不偷跑同一波
        if (engine.endless) return;
        engine.resetRun();
        engine.startRun(); // 快速迭代：结算后空格立即重开
      } else {
        toggleRun();
      }
    } else if (e.key === 's' || e.key === 'S') {
      stopRun();
    } else if (e.key === 'r' || e.key === 'R') {
      engine.resetRun();
      beep(300, 0.06, 'square', 0.06, engine.soundOn);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header class="compact">
  <h1>
    <button type="button" class="title-btn" title="查看进度概览" onclick={() => (showTitle = true)}>
      傅立叶指针
    </button>
  </h1>
</header>

<!-- 读屏播报：画布进度对读屏用户不可见，这里用 aria-live 转达 -->
<div class="sr-only" role="status" aria-live="polite">{srLive}</div>

<main data-tab={mobileTab} class:panel-expanded={panelExpanded}>
  <section class="stage-wrap">
    <div class="canvas-box">
      <Stage />
      <div class="hud">
        <span class="lvl">
          {#if engine.endless}
            ♾ 第 {engine.endlessWave} 波 · 累计 {engine.endlessScore} 分
          {:else}
            {engine.level?.name ?? ''}{engine.sandbox ? ' 🧪' : ''}
          {/if}
        </span>
        <div class="hud-right">
          <span
            class="score"
            style="--progress: {engine.total ? (engine.collectedCount / engine.total) * 100 : 0}%"
            >收集 {#key engine.collectedCount}<b class="hud-pulse">{engine.collectedCount}</b
              >{/key}/{engine.total}{#if ghostLabel}<i
                class="ghost-tick"
                style="left: {engine.ghostRatio * 100}%"
              ></i>{/if}</span
          >
          {#if ghostLabel}
            <span
              class="ghost-chip"
              class:ahead={engine.ghostDelta > 0}
              class:behind={engine.ghostDelta < 0}
              title="与{engine.raceIsBest
                ? '个人最佳'
                : '上届'}同一时刻的收集数对比（金色刻度线标在上方进度条上）">{ghostLabel}</span
            >
          {/if}
          {#if engine.level}
            <button
              type="button"
              class="hud-seal"
              title={'本关朱印 ' + sealDone + '/4（星 满 准 专）——点开图鉴与成就'}
              onclick={() => (showAchv = true)}
            >
              印 <b>{sealDone}</b>/4
            </button>
          {/if}
        </div>
      </div>
      {#if engine.phase === 'done' && !engine.resultDismissed}
        {#if engine.endless}
          <EndlessResult />
        {:else}
          <ResultOverlay />
        {/if}
      {/if}

      {#if engine.phase === 'paused' && !engine.sandbox}
        <div class="pause-menu">
          <h3>已暂停</h3>
          <p class="pm-sub">调整策略后继续，或者重新来过</p>
          {#if pauseProgress}
            <p class="pm-prog">{pauseProgress}</p>
          {/if}
          {#if pauseGaps}
            <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">💡 最该调：{pauseGaps}</p>
          {/if}
          <button type="button" class="primary" onclick={() => engine.toggleRun()}
            >▶ 继续旋转</button
          >
          <button
            type="button"
            onclick={() => {
              engine.fastForward = false;
              engine.resetRun();
            }}
          >
            ⟲ 回到调参
          </button>
          <button
            type="button"
            onclick={() => {
              engine.fastForward = false;
              engine.resetRun();
              engine.startRun();
            }}
          >
            ↻ 重新开始
          </button>
        </div>
      {/if}
    </div>
    {#if engine.expertMode}
      <div class="expert-tip">
        💎 <b>专家模式</b>——目标轮廓与预览已隐藏，靠频谱对比和收集反馈来解（全清可得专家认证）
      </div>
    {/if}
    {#if engine.remoteChallenge}
      <div class="remote-tip">
        <span>🎁 <b>好友的解法挑战</b>——参数已载入，点「▶ 开始旋转」试试能不能全清</span>
        <button
          type="button"
          class="rt-close"
          title="关闭提示"
          onclick={() => (engine.remoteChallenge = false)}>✕</button
        >
      </div>
    {/if}
    {#if engine.showFirstGuide}
      <div class="first-guide" class:ok={engine.guideRReady}>
        {#if engine.guideRReady}
          <b>✅ 很好！</b>现在点「▶ 开始旋转」，指针尖端扫过金色点即可收集
        {:else}
          <b>第 1 步</b>：把 ① 的半径调到 <b>120</b>（当前 {engine.arms[0]
            ?.r}）——金色虚线是目标，紫色是你的轨迹
        {/if}
      </div>
    {:else if engine.showEllipseGuide}
      <div class="first-guide" class:ok={engine.guideE2Ready}>
        {#if engine.guideE2Ready}
          <b>✅ 对了！</b>再微调两根的半径与相位，让紫色轨迹贴上金色虚线（细节见 💡 提示）
        {:else}
          <b>椭圆的秘密在"反转"</b>：启用 <b>②</b> 并把它切到 <b>⟲ 反转</b>—— 一顺一反才叠得出椭圆
        {/if}
        <button type="button" class="mini" onclick={() => engine.markFlag('ellipseGuideDone')}>
          知道了
        </button>
      </div>
    {/if}
    <div class="run-row">
      {#if engine.sandbox}
        <button class="primary" onclick={() => engine.exitSandbox()}>⏹ 结束沙盒</button>
        <button
          title="按目标频谱自动解出精确参数（动画演示傅立叶逐项逼近）"
          disabled={engine.autoSolve}
          onclick={() => engine.startAutoSolve()}
        >
          🪄 {engine.autoSolve ? '拟合中…' : '自动拟合'}
        </button>
        <button title="沙盒转速档位" onclick={() => engine.cycleSpeed()}>⚡ {engine.speed}×</button>
        <button onclick={() => engine.resetRun()}>⟲ 重置点</button>
        <span class="run-icons">
          <button
            title="音量（点击循环 全/半/静）"
            aria-label={'音量：' + (volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音')}
            onclick={cycleVolume}
          >
            {volIcon}
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
            title={engine.musicOn
              ? '背景音乐：你的指针正在实时合成和声（频率→音高、半径→音量、相位→左右）'
              : '背景音乐已关闭，点击开启'}
            onclick={() => {
              engine.setMusic(!engine.musicOn);
              uiToggle(engine.soundOn);
            }}>🎵</button
          >
          <button title="成就" aria-label="成就" onclick={() => (showAchv = true)}>🏆</button>
          <button title="设置" aria-label="设置" onclick={() => (showSettings = true)}>⚙️</button>
        </span>
      {:else}
        <button class="primary" onclick={toggleRun}>{engine.runLabel}</button>
        <button
          onclick={stopRun}
          disabled={engine.phase !== 'running' && engine.phase !== 'paused'}
        >
          ⏹ <span class="bt-long">停止结算</span><span class="bt-short">停止</span>
        </button>
        <MoreMenu
          items={[
            {
              label: (engine.fastForward ? '✓ ' : '') + '⏩ 2× 快进',
              title: '跳过等待（不影响得分与连击判定）',
              disabled: engine.phase !== 'running',
              onclick: () => (engine.fastForward = !engine.fastForward),
            },
            { label: '⟲ 重置点', onclick: () => engine.resetRun() },
            {
              label: '📊 结算卡',
              title: '重新打开结算卡（复制战报 / 下一关）',
              disabled: !(engine.phase === 'done' && engine.resultDismissed),
              onclick: () => (engine.resultDismissed = false),
            },
            {
              label: '🧪 沙盒',
              title: engine.endless
                ? '无尽挑战中不能进沙盒——先在结算卡结束本局'
                : '无限时自由旋转，实时调参，成绩不计入记录',
              disabled: engine.phase === 'running' || engine.phase === 'paused' || engine.endless,
              onclick: () => engine.enterSandbox(),
            },
            // 手机端图标行只留音量/音乐（见 app.css）：成就与设置在这里也有入口，
            // 桌面端多两个菜单项不冲突（图标键仍在）
            { label: '🏆 成就', onclick: () => (showAchv = true) },
            { label: '⚙️ 设置', onclick: () => (showSettings = true) },
          ]}
        />
        <span class="run-icons">
          <button
            title="音量（点击循环 全/半/静）"
            aria-label={'音量：' + (volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音')}
            onclick={cycleVolume}
          >
            {volIcon}
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
            title={engine.musicOn
              ? '背景音乐：你的指针正在实时合成和声（频率→音高、半径→音量、相位→左右）'
              : '背景音乐已关闭，点击开启'}
            onclick={() => {
              engine.setMusic(!engine.musicOn);
              uiToggle(engine.soundOn);
            }}>🎵</button
          >
          <button title="成就" aria-label="成就" onclick={() => (showAchv = true)}>🏆</button>
          <button title="设置" aria-label="设置" onclick={() => (showSettings = true)}>⚙️</button>
        </span>
      {/if}
    </div>
  </section>

  {#if panelExpanded}
    <button
      type="button"
      class="sheet-collapse"
      aria-label="收起面板"
      onclick={() => (panelExpanded = false)}
    >
      <i>▾</i>收起面板，回到画布
    </button>
  {/if}

  <div class="sides">
    <aside class="side side-left">
      <LevelPicker />
    </aside>

    <aside class="side side-right">
      <section class="sec-arms">
        <h2>
          指针
          <span class="muted">（本关最多 {engine.level?.armLimit ?? 10} 根）</span>
        </h2>
        <div class="tools-row">
          <!-- 入门只露出"随机参数"；精通工具按进度解锁（专家=过第二关，频谱=卡关或进第三章） -->
          <button title="随机化已启用指针的半径与相位" onclick={() => engine.randomizeArms()}>
            🎲 随机参数
          </button>
          {#if engine.expertUnlocked}
            <button
              title="专家模式：隐藏目标轮廓与预览轨迹，只能靠频谱与收集反馈调参——硬核玩家的证明"
              class:expert={engine.expertMode}
              onclick={() => engine.toggleExpert()}
            >
              💎 专家
            </button>
          {/if}
          {#if engine.spectrumUnlocked}
            <button
              title="在频谱仪上叠加目标曲线的真实频谱（卡关时看清差在哪一项）"
              class:gold={engine.spectrumCompare}
              onclick={() => engine.toggleSpectrumCompare()}
            >
              🔍 频谱对比
            </button>
          {/if}
          <MoreMenu
            items={[
              {
                label: '↶ 撤销',
                title: '撤销上一次调参（Ctrl/Cmd+Z）',
                disabled: engine.armUndoCount === 0,
                onclick: () => engine.undoArms(),
              },
              {
                label: '↷ 重做',
                title: '重做（Ctrl/Cmd+Shift+Z）',
                disabled: engine.armRedoCount === 0,
                onclick: () => engine.redoArms(),
              },
              { label: '⭯ 清零', title: '全部指针清零关闭', onclick: () => engine.clearArms() },
              {
                label: '↺ 复位',
                title: '全部指针复位到默认参数',
                onclick: () => engine.resetAllArms(),
              },
              ...(engine.hasSavedArms()
                ? [
                    {
                      label: '▶ 回放解法',
                      title: '载入上届解法并立即旋转（回放最佳参数的实际效果）',
                      onclick: () => {
                        engine.loadSavedArms();
                        engine.resetRun();
                        engine.startRun();
                      },
                    },
                  ]
                : []),
            ]}
          />
        </div>
        {#if engine.autoSolve}
          <p class="fitting-tip">🪄 自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
        {/if}
        <ArmPanel />
      </section>
    </aside>
  </div>
</main>

<!-- 移动端底部标签栏（桌面隐藏）：画布固定在屏内，面板按需切换 -->
<nav class="mobile-tabs">
  <button
    type="button"
    class:on={mobileTab === 'levels'}
    aria-expanded={mobileTab === 'levels' && panelExpanded}
    onclick={() => onTab('levels')}
  >
    <i>🗺</i><span>{mobileTab === 'levels' && panelExpanded ? '收起' : '关卡'}</span>
  </button>
  <button
    type="button"
    class:on={mobileTab === 'arms'}
    aria-expanded={mobileTab === 'arms' && panelExpanded}
    onclick={() => onTab('arms')}
  >
    <i>🎛</i><span>{mobileTab === 'arms' && panelExpanded ? '收起' : '指针'}</span>
  </button>
</nav>
{#if showTitle}
  <TitleScreen onstart={() => (showTitle = false)} />
{/if}

{#if showAchv}
  <AchievementsModal onclose={() => (showAchv = false)} onplay={playFromDex} />
{/if}
{#if showSettings}
  <SettingsModal onclose={() => (showSettings = false)} {volume} onCycleVolume={cycleVolume} />
{/if}
{#if !tutorialSeen && !showTitle}
  <div class="tutorial">
    <div class="tut-box">
      <h2>怎么玩？</h2>
      <ol>
        <li>在指针面板启用指针并调参——<b>金色虚线</b>是目标曲线，让<b>紫色轨迹</b>贴上去</li>
        <li>点「▶ 开始旋转」，指针尖端每扫过一个点就得分，连收有连击加成</li>
        <li>跑完结算星级；卡关就开「频谱对比」看目标的真实傅立叶系数</li>
      </ol>
      <button
        class="primary"
        onclick={() => {
          engine.markFlag('tutorialSeen');
        }}
      >
        开始挑战
      </button>
    </div>
  </div>
{/if}
{#if chapterIntro}
  <ChapterIntroOverlay chapter={chapterIntro} onclose={dismissChapterIntro} />
{/if}
{#if engine.finale}
  <FinaleOverlay />
{/if}
{#if engine.toast && !showTitle}
  <div class="toast">🏆 解锁成就：{engine.toast.name}</div>
{/if}
{#if shareNote && !showTitle}
  <div class="toast share-note">🔗 {shareNote}</div>
{/if}
{#if updateReady && engine.phase !== 'running'}
  <div class="update-bar">
    <span>✨ 新版本已就绪</span>
    <button type="button" class="mini" onclick={applyPwaUpdate}>立即刷新</button>
    <button type="button" class="mini ghost" onclick={() => (updateReady = false)}>稍后</button>
  </div>
{/if}
