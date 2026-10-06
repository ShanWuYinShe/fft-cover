<script lang="ts">
  import { onMount } from 'svelte';
  import Stage from './lib/components/Stage.svelte';
  import ArmPanel from './lib/components/ArmPanel.svelte';
  import TitleScreen from './lib/components/TitleScreen.svelte';
  import { readArmsFromHash } from './lib/game/share';
  import LevelPicker from './lib/components/LevelPicker.svelte';
  import ScorePanel from './lib/components/ScorePanel.svelte';
  import ResultOverlay from './lib/components/ResultOverlay.svelte';
  import AchievementsModal from './lib/components/AchievementsModal.svelte';
  import { engine } from './lib/game/engine.svelte';
  import {
    achvSound,
    beep,
    finishChord,
    perfectArpeggio,
    setVolume,
    getVolume,
    uiClick,
    uiToggle,
  } from './lib/game/audio';
  import { musicIntensity } from './lib/game/harmony';
  import { setMusicSuspended, startMusic, updateMusic } from './lib/game/music';

  let showAchv = $state(false);
  /** 开始画面：首次访问显示（老玩家直接进游戏，点标题可再看） */
  let showTitle = $state(false);
  /** 移动端底部标签：关卡 / 指针 / 成绩（桌面端忽略，全部 section 同屏显示） */
  let mobileTab: 'levels' | 'arms' | 'score' = $state('levels');
  /** PWA：有新版本等待接管（main.ts 在 SW 进入 waiting 时派发 pwa-update） */
  let updateReady = $state(false);
  onMount(() => {
    // 首次访问显示开始画面（有分享码时直接进游戏，避免挡住挑战链接）
    if (!engine.flags.seenTitle && !readArmsFromHash(location.hash)) {
      showTitle = true;
      engine.markFlag('seenTitle');
    }
    // 好友解法挑战：从 URL hash 载入参数并清除 hash（避免刷新重复提示）
    const code = readArmsFromHash(location.hash);
    if (code && engine.applyArmsCode(code)) {
      history.replaceState(null, '', location.pathname + location.search);
    }
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
      window.removeEventListener('pwa-update', onUpdate);
      document.removeEventListener('click', onUiClick, true);
      document.removeEventListener('pointerdown', onFirstGesture, true);
      document.removeEventListener('keydown', onFirstGesture, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
  function applyPwaUpdate(): void {
    void import('./main').then((m) => m.applyUpdate());
  }
  let volume = $state(getVolume());

  /**
   * 背景音乐跟随游戏状态：指针参数（引擎响应式）变化即刷新声部，
   * 阶段变化即调整动态强度。参数未变时 updateMusic 内部直接返回。
   */
  /** 幽灵竞速差值文案：领先/落后上届多少点（无可比对象时为空） */
  const ghostLabel = $derived.by(() => {
    if (!engine.ghostComparable) return '';
    // 只在跑动中显示：结算后由结算卡的"上届同期"接手
    if (engine.phase !== 'running' && engine.phase !== 'paused') return '';
    const d = engine.ghostDelta;
    return d > 0 ? '👻 +' + d + ' 领先' : d < 0 ? '👻 ' + d + ' 落后' : '👻 持平';
  });

  function syncMusic(): void {
    updateMusic(engine.arms, musicIntensity(engine.phase, engine.sandbox), engine.musicOn, volume);
  }

  $effect(() => {
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

  // 成就解锁 toast：3 秒后自动消失
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!engine.toast) return;
    achvSound(engine.soundOn);
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
      if (engine.collectedCount === engine.total) perfectArpeggio(engine.soundOn);
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
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;
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

<header>
  <h1>
    <button type="button" class="title-btn" title="查看进度概览" onclick={() => (showTitle = true)}>
      傅立叶指针
    </button>
  </h1>
  <p class="sub">旋转指针 · 合成曲线 · 收集目标点</p>
</header>

<main data-tab={mobileTab}>
  <section class="stage-wrap">
    <div class="canvas-box">
      <Stage />
      <div class="hud">
        <span class="lvl">{engine.level?.name ?? ''}{engine.sandbox ? ' 🧪' : ''}</span>
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
              title="与上届同一时刻的收集数对比（金色刻度线标在上方进度条上）">{ghostLabel}</span
            >
          {/if}
        </div>
      </div>
      {#if engine.phase === 'done' && !engine.resultDismissed}
        <ResultOverlay />
      {/if}

      {#if engine.phase === 'paused' && !engine.sandbox}
        <div class="pause-menu">
          <h3>已暂停</h3>
          <p class="pm-sub">调整策略后继续，或者重新来过</p>
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
          <button title="音量（点击循环 全/半/静）" onclick={cycleVolume}>
            {volIcon}
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            title={engine.musicOn
              ? '背景音乐：你的指针正在实时合成和声（频率→音高、半径→音量、相位→左右）'
              : '背景音乐已关闭，点击开启'}
            onclick={() => {
              engine.setMusic(!engine.musicOn);
              uiToggle(engine.soundOn);
            }}>🎵</button
          >
          <button title="成就" onclick={() => (showAchv = true)}>🏆</button>
        </span>
      {:else}
        <button class="primary" onclick={toggleRun}>{engine.runLabel}</button>
        <button
          onclick={stopRun}
          disabled={engine.phase !== 'running' && engine.phase !== 'paused'}
        >
          ⏹ <span class="bt-long">停止结算</span><span class="bt-short">停止</span>
        </button>
        <button
          title="2× 快进：跳过等待（不影响得分与连击判定）"
          class:gold={engine.fastForward}
          disabled={engine.phase !== 'running'}
          onclick={() => (engine.fastForward = !engine.fastForward)}
        >
          ⏩ 2×
        </button>
        <button onclick={() => engine.resetRun()}
          >⟲ <span class="bt-long">重置点</span><span class="bt-short">重置</span></button
        >
        <button
          title="无限时自由旋转，实时调参，成绩不计入记录"
          disabled={engine.phase === 'running' || engine.phase === 'paused'}
          onclick={() => engine.enterSandbox()}
        >
          🧪 沙盒
        </button>
        <span class="run-icons">
          <button title="音量（点击循环 全/半/静）" onclick={cycleVolume}>
            {volIcon}
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            title={engine.musicOn
              ? '背景音乐：你的指针正在实时合成和声（频率→音高、半径→音量、相位→左右）'
              : '背景音乐已关闭，点击开启'}
            onclick={() => {
              engine.setMusic(!engine.musicOn);
              uiToggle(engine.soundOn);
            }}>🎵</button
          >
          <button title="成就" onclick={() => (showAchv = true)}>🏆</button>
        </span>
      {/if}
    </div>
  </section>

  <div class="sides">
    <aside class="side side-left">
      <LevelPicker />
      <ScorePanel />
    </aside>

    <aside class="side side-right">
      <section class="sec-arms">
        <h2>
          指针
          <span class="muted">（本关最多 {engine.level?.armLimit ?? 10} 根）</span>
        </h2>
        <div class="tools-row">
          <button
            title="撤销上一次调参（Ctrl/Cmd+Z）"
            disabled={engine.armUndoCount === 0}
            onclick={() => engine.undoArms()}
          >
            ↶ 撤销
          </button>
          <button
            title="重做（Ctrl/Cmd+Shift+Z）"
            disabled={engine.armRedoCount === 0}
            onclick={() => engine.redoArms()}
          >
            ↷ 重做
          </button>
          <button
            title="专家模式：隐藏目标轮廓与预览轨迹，只能靠频谱与收集反馈调参——硬核玩家的证明"
            class:expert={engine.expertMode}
            onclick={() => engine.toggleExpert()}
          >
            💎 专家
          </button>
          <button
            title="在频谱仪上叠加目标曲线的真实频谱（教学用）"
            class:gold={engine.spectrumCompare}
            onclick={() => engine.toggleSpectrumCompare()}
          >
            🔍 频谱对比
          </button>
          <button title="随机化已启用指针的半径与相位" onclick={() => engine.randomizeArms()}>
            🎲 随机参数
          </button>
          <button title="全部指针清零关闭" onclick={() => engine.clearArms()}>⭯ 清零</button>
          <button title="全部指针复位到默认参数" onclick={() => engine.resetAllArms()}
            >↺ 复位</button
          >
          {#if engine.hasSavedArms()}
            <button
              title="载入上届解法并立即旋转（回放最佳参数的实际效果）"
              onclick={() => {
                engine.loadSavedArms();
                engine.resetRun();
                engine.startRun();
              }}
            >
              ▶ 回放解法
            </button>
          {/if}
        </div>
        {#if engine.autoSolve}
          <p class="fitting-tip">🪄 自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
        {/if}
        <ArmPanel />
      </section>
      <section class="tips sec-tips">
        <p class="kb-only">
          快捷键：<kbd>空格</kbd> 开始/暂停 · <kbd>S</kbd> 停止结算 · <kbd>R</kbd> 重置
        </p>
        <p>
          原理：指针尖端位置 = Σ rₖ·e<sup>i(ωₖt+φₖ)</sup
          >。你调的每一根指针，都是目标曲线傅立叶展开中的一项——旋转玩法的背后就是傅立叶变换。
        </p>
      </section>
    </aside>
  </div>
</main>

<!-- 移动端底部标签栏（桌面隐藏）：画布固定在屏内，面板按需切换 -->
<nav class="mobile-tabs">
  <button type="button" class:on={mobileTab === 'levels'} onclick={() => (mobileTab = 'levels')}>
    <i>🗺</i><span>关卡</span>
  </button>
  <button type="button" class:on={mobileTab === 'arms'} onclick={() => (mobileTab = 'arms')}>
    <i>🎛</i><span>指针</span>
  </button>
  <button type="button" class:on={mobileTab === 'score'} onclick={() => (mobileTab = 'score')}>
    <i>🏆</i><span>成绩</span>
  </button>
</nav>
{#if showTitle}
  <TitleScreen onstart={() => (showTitle = false)} />
{/if}

{#if showAchv}
  <AchievementsModal onclose={() => (showAchv = false)} />
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
{#if engine.toast && !showTitle}
  <div class="toast">🏆 解锁成就：{engine.toast.name}</div>
{/if}
{#if updateReady && engine.phase !== 'running'}
  <div class="update-bar">
    <span>✨ 新版本已就绪</span>
    <button type="button" class="mini" onclick={applyPwaUpdate}>立即刷新</button>
    <button type="button" class="mini ghost" onclick={() => (updateReady = false)}>稍后</button>
  </div>
{/if}
