<script lang="ts">
  import Stage from '../Stage.svelte';
  import ArmPanel from '../ArmPanel.svelte';
  import ResultOverlay from '../ResultOverlay.svelte';
  import EndlessResult from '../EndlessResult.svelte';
  import Icon from '../Icon.svelte';
  import MoreMenu from '../MoreMenu.svelte';
  import TopBar from './TopBar.svelte';
  import MobileNav from './MobileNav.svelte';
  import StarmapDrawer from './StarmapDrawer.svelte';
  import { CHAPTERS } from '../../game/levels';
  import { spectrumGaps, starsFor } from '../../game/scoring';
  import { STAR_LEVELS } from '../../game/constants';
  import { engine } from '../../game/engine.svelte';
  import { levelGoals } from '../../game/goals';
  import { uiState } from '../../stores/uiState.svelte';
  import { audioController } from '../../stores/audioController.svelte';
  import { screenReader } from '../../stores/screenReader.svelte';
  import { toggleRun, stopRun } from '../../stores/keyboardHandler';

  const curChapter = $derived(CHAPTERS.find((c) => c.id === engine.level?.chapter));
  const curChapterName = $derived(
    engine.endless
      ? '周天无尽 · 演武'
      : engine.sandbox
        ? '万象演道 · 沙盒'
        : (curChapter?.name ?? '周天星图'),
  );
  const curStars = $derived(engine.level?.id ? (engine.bestStars[engine.level.id] ?? 0) : 0);
  const onArmCount = $derived(engine.arms.filter((a) => a.on).length);
  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);

  /** 暂停时的当前进度：收了多少、几星、离下一档还差几点 */
  const pauseProgress = $derived.by(() => {
    if (engine.phase !== 'paused' || engine.total === 0) return '';
    const got = engine.collectedCount;
    const ratio = got / engine.total;
    const st = starsFor(ratio);
    const parts = ['收集 ' + got + '/' + engine.total, '★'.repeat(st) + '☆'.repeat(3 - st)];
    if (st < 3) {
      const nextTier = STAR_LEVELS[2 - st];
      const need = Math.ceil(nextTier * engine.total - 1e-9) - got;
      if (need > 0) parts.push('再收 ' + need + ' 点升 ' + (st + 1) + ' 星');
    }
    return parts.join(' · ');
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

  /** 幽灵竞速差值文案：领先/落后上届多少点 */
  const ghostLabel = $derived.by(() => {
    if (!engine.ghostComparable) return '';
    if (engine.phase !== 'running' && engine.phase !== 'paused') return '';
    const d = engine.ghostDelta;
    const vs = engine.raceIsBest ? '最佳' : '上届';
    return d > 0 ? '👻 +' + d + ' 领先' + vs : d < 0 ? '👻 ' + d + ' 落后' + vs : '👻 持平';
  });
</script>

<!-- 深曜苍穹背景光环 -->
<div class="celestial-deep-cosmos" aria-hidden="true">
  <div class="armillary-meridian-ring ring-1"></div>
  <div class="armillary-meridian-ring ring-2"></div>
</div>

<!-- 顶部座舱天穹 HUD -->
<TopBar />

<!-- 读屏实时播报 -->
<div class="sr-only" role="status" aria-live="polite">{screenReader.srLive}</div>

<!-- 游戏主舞台与操作台 -->
<main
  data-tab={uiState.mobileTab}
  class:panel-expanded={uiState.panelExpanded}
  class:panel-hidden={engine.phase === 'running'}
  class:starmap-open={uiState.starMapOpen}
>
  <section class="stage-wrap">
    <!-- 关卡天冠顶饰 (Level Crown Banner) -->
    <div class="stage-crown-bezel">
      <div class="crown-level-badge">
        <span class="crown-eyebrow font-celestial">{curChapterName}</span>
        <h1 class="crown-title font-celestial">
          {#if engine.endless}
            周天无尽 · 第 {engine.endlessWave} 宿
          {:else}
            {engine.level?.name ?? '自由星轨'}
          {/if}
        </h1>
      </div>

      {#if !engine.sandbox && engine.level}
        <div class="crown-star-sockets" title="本关星级进度（收集 35% / 65% / 90%）">
          <div
            class="star-gem-socket"
            class:lit={curStars >= 1}
            class:active={engine.starReached >= 1}
          >
            <span class="gem-star">★</span>
          </div>
          <div
            class="star-gem-socket"
            class:lit={curStars >= 2}
            class:active={engine.starReached >= 2}
          >
            <span class="gem-star">★</span>
          </div>
          <div
            class="star-gem-socket"
            class:lit={curStars >= 3}
            class:active={engine.starReached >= 3}
          >
            <span class="gem-star">★</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="canvas-box">
      <span class="stage-bracket tl" aria-hidden="true"></span>
      <span class="stage-bracket tr" aria-hidden="true"></span>
      <span class="stage-bracket bl" aria-hidden="true"></span>
      <span class="stage-bracket br" aria-hidden="true"></span>
      <Stage />
      <div class="hud">
        <button
          type="button"
          class="mobile-lvl-btn"
          title="切换关卡"
          onclick={() => {
            uiState.mobileTab = uiState.mobileTab === 'levels' ? 'arms' : 'levels';
            uiState.panelExpanded = true;
          }}
        >
          <span class="lvl-icon">☰</span>
          <span class="lvl-name">
            {#if engine.endless}
              第 {engine.endlessWave} 波
            {:else}
              {engine.level?.name ?? '自由'}
            {/if}
          </span>
          <span class="lvl-caret">▾</span>
        </button>
        <span class="lvl desktop-lvl">
          {#if engine.endless}
            <Icon name="infinity" size={13} /> 第 {engine.endlessWave} 波 · 累计 {engine.endlessScore}
            分
          {:else}
            {engine.level?.name ?? ''}{#if engine.sandbox}&nbsp;<Icon name="flask" size={13} />{/if}
          {/if}
        </span>
        <div class="hud-right">
          <span
            class="score"
            style="--progress: {engine.total ? (engine.collectedCount / engine.total) * 100 : 0}%"
            >收集 {#key engine.collectedCount}<b class="hud-pulse font-tabular">{engine.collectedCount}</b
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
              title="与{engine.raceIsBest ? '个人最佳' : '上届'}同一时刻的收集数对比"
            >
              {ghostLabel}
            </span>
          {/if}
          {#if engine.level}
            <button
              type="button"
              class="hud-seal font-celestial"
              title={'本关朱印 ' + sealDone + '/4（星 满 准 专）——点开图鉴与成就'}
              onclick={() => (uiState.showAchv = true)}
            >
              印 <b>{sealDone}</b>/4
            </button>
          {/if}
          <button
            type="button"
            class="hud-settings-btn mobile-only-btn"
            title="设置"
            aria-label="设置"
            onclick={() => (uiState.showSettings = true)}
          >
            <Icon name="gear" size={13} />
          </button>
        </div>
      </div>

      <!-- 画布底缘悬浮操作区（移动端主控） -->
      <div class="canvas-fire-bar">
        <div class="cf-left">
          {#if engine.hasSavedArms()}
            <button
              type="button"
              class="cf-btn cf-best"
              title="载入最佳解法"
              onclick={() => engine.loadSavedArms()}
            >
              ★ 最佳
            </button>
          {/if}
          {#if engine.collectedCount === 0 && !engine.sandbox}
            <span class="cf-preview">
              <span class="cf-dot"></span> 满分预览
            </span>
          {/if}
        </div>
        <div class="cf-right">
          {#if engine.phase === 'running' || engine.phase === 'paused'}
            <button type="button" class="cf-btn cf-danger" onclick={stopRun}>
              <Icon name="stop" size={12} /> 停止
            </button>
            <button
              type="button"
              class="cf-btn cf-ff"
              class:gold={engine.fastForward}
              title="2× 快进"
              onclick={() => (engine.fastForward = !engine.fastForward)}
            >
              ⏩ {engine.fastForward ? '2×' : '1×'}
            </button>
          {:else}
            <button
              type="button"
              class="cf-btn cf-reset"
              title="重置本局已收集点与指针"
              onclick={() => engine.resetRun()}
            >
              ⟲
            </button>
            <button type="button" class="cf-btn cf-primary" onclick={toggleRun}>
              <span class="cf-play">▶</span>
              {engine.runLabel}
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
          <h3 class="font-celestial">已暂停</h3>
          <p class="pm-sub">调整策略后继续，或者重新来过</p>
          {#if pauseProgress}
            <p class="pm-prog font-tabular">{pauseProgress}</p>
          {/if}
          {#if pauseGaps}
            <p class="pm-gaps" title="当前拟合最需要补/削的两个频率">
              <Icon name="bulb" size={13} /> 最该调：{pauseGaps}
            </p>
          {/if}
          <button type="button" class="primary" onclick={() => engine.toggleRun()}>
            ▶ 继续旋转
          </button>
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

      {#if engine.expertMode}
        <div class="expert-tip">
          <Icon name="gem" size={14} />
          <b>专家模式</b>——目标轮廓与预览已隐藏，靠频谱对比和收集反馈来解（全清可得专家认证）
        </div>
      {/if}

      {#if engine.remoteChallenge}
        <div class="remote-tip">
          <span>
            <Icon name="share" size={14} /> <b>好友的解法挑战</b>——参数已载入，点「▶ 开始旋转」试试能不能全清
          </span>
          <button
            type="button"
            class="rt-close"
            title="关闭提示"
            onclick={() => (engine.remoteChallenge = false)}
          >
            ✕
          </button>
        </div>
      {/if}

      {#if engine.showFirstGuide && engine.phase === 'edit'}
        <div class="first-guide" class:ok={engine.guideRReady}>
          {#if engine.guideRReady}
            <b><Icon name="check" size={13} /> 很好！</b>现在点「开始旋转」，指针尖端扫过金色点即可收集
          {:else}
            <b>第 1 步</b>：把 ① 的半径调到 <b>120</b>（当前 {engine.arms[0]?.r}）——金色虚线是目标，紫色是你的轨迹
          {/if}
        </div>
      {:else if engine.showEllipseGuide && engine.phase === 'edit'}
        <div class="first-guide" class:ok={engine.guideE2Ready}>
          {#if engine.guideE2Ready}
            <b><Icon name="check" size={13} /> 对了！</b>再微调两根的半径与相位，让紫色轨迹贴上金色虚线（细节见提示）
          {:else}
            <b>椭圆的秘密在"反转"</b>：启用 <b>②</b> 并把它切到 <b>⟲ 反转</b>—— 一顺一反才叠得出椭圆
          {/if}
          <button type="button" class="mini" onclick={() => engine.markFlag('ellipseGuideDone')}>
            知道了
          </button>
        </div>
      {/if}
    </div>

    <!-- 运行主控制栏 (桌面端) -->
    <div class="run-row">
      {#if engine.sandbox}
        <button class="primary" onclick={() => engine.exitSandbox()}>
          <Icon name="stop" size={13} /> 结束沙盒
        </button>
        <button
          title="按目标频谱自动解出精确参数（动画演示傅立叶逐项逼近）"
          disabled={engine.autoSolve}
          onclick={() => engine.startAutoSolve()}
        >
          🪄 {engine.autoSolve ? '拟合中…' : '自动拟合'}
        </button>
        <button title="沙盒转速档位" onclick={() => engine.cycleSpeed()}>
          ⚡ {engine.speed}×
        </button>
        <button onclick={() => engine.resetRun()}>⟲ 重置点</button>
        <span class="run-icons">
          <button
            class:music-off={audioController.volume === 0}
            title="音量（点击循环 全/半/静）"
            aria-label={'音量：' + (audioController.volume === 1 ? '100%' : audioController.volume === 0.5 ? '50%' : '静音')}
            onclick={() => audioController.cycleVolume()}
          >
            <Icon name={audioController.volIconName} size={16} />
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
            title={engine.musicOn ? '背景音乐：你的指针正在实时合成和声' : '背景音乐已关闭，点击开启'}
            onclick={() => engine.setMusic(!engine.musicOn)}
          >
            <Icon name="music" size={16} />
          </button>
          <button title="成就" aria-label="成就" onclick={() => (uiState.showAchv = true)}>
            <Icon name="trophy" size={16} />
          </button>
          <button title="设置" aria-label="设置" onclick={() => (uiState.showSettings = true)}>
            <Icon name="gear" size={16} />
          </button>
        </span>
      {:else}
        {#if engine.phase === 'running' || engine.phase === 'paused'}
          <button class="danger run-btn-main arcade-ignition-btn brake" onclick={stopRun}>
            <span class="btn-core-ring" aria-hidden="true"></span>
            <Icon name="stop" size={14} />
            <span class="bt-long font-celestial">⏹ 止 轨 结 算</span>
            <span class="bt-short">⏹ 止轨</span>
          </button>
          <button
            class="run-btn-aux overdrive-btn"
            class:gold={engine.fastForward}
            title="2× 超频加速"
            onclick={() => (engine.fastForward = !engine.fastForward)}
          >
            <span class="ff-flash" aria-hidden="true">⚡</span>
            ⏩ {engine.fastForward ? '2×' : '1×'}
          </button>
        {:else}
          <button class="primary run-btn-main arcade-ignition-btn ignite" onclick={toggleRun}>
            <span class="btn-core-ring" aria-hidden="true"></span>
            <span class="ignite-spark" aria-hidden="true">✦</span>
            <span class="bt-long font-celestial">
              {engine.phase === 'edit' ? '▶ 启 天 动 轨' : engine.runLabel}
            </span>
            <span class="bt-short">{engine.runLabel}</span>
          </button>
          <button
            class="run-btn-aux rewind-btn"
            title="重置本局已收集点与指针"
            onclick={() => engine.resetRun()}
          >
            ⟲ 重置
          </button>
        {/if}

        <MoreMenu
          items={[
            {
              label: (engine.fastForward ? '✓ ' : '') + '⏩ 2× 快进',
              title: '跳过等待（不影响得分与连击判定）',
              disabled: engine.phase !== 'running',
              onclick: () => (engine.fastForward = !engine.fastForward),
            },
            { label: '⟲ 重置点', onclick: () => engine.resetRun() },
            ...(engine.hasSavedArms()
              ? [
                  {
                    label: '▶ 回放上届解法',
                    icon: 'play',
                    title: '载入上届解法并立即旋转（回放最佳参数的实际效果）',
                    onclick: () => {
                      engine.loadSavedArms();
                      engine.resetRun();
                      engine.startRun();
                    },
                  },
                ]
              : []),
            {
              label: '⭯ 全部指针清零',
              title: '全部指针清零关闭',
              onclick: () => engine.clearArms(),
            },
            {
              label:
                '音量：' +
                (audioController.volume === 1
                  ? '100%'
                  : audioController.volume === 0.5
                    ? '50%'
                    : '静音'),
              icon: 'volume-high',
              onclick: () => audioController.cycleVolume(),
            },
            {
              label: '背景音乐：' + (engine.musicOn ? '开' : '关'),
              icon: 'music',
              onclick: () => engine.setMusic(!engine.musicOn),
            },
            {
              label: '结算卡',
              icon: 'chart',
              title: '重新打开结算卡（复制战报 / 下一关）',
              disabled: !(engine.phase === 'done' && engine.resultDismissed),
              onclick: () => (engine.resultDismissed = false),
            },
            {
              label: '沙盒',
              icon: 'flask',
              title: engine.endless
                ? '无尽挑战中不能进沙盒——先在结算卡结束本局'
                : '无限时自由旋转，实时调参，成绩不计入记录',
              disabled: engine.phase === 'running' || engine.phase === 'paused' || engine.endless,
              onclick: () => engine.enterSandbox(),
            },
            { label: '成就', icon: 'trophy', onclick: () => (uiState.showAchv = true) },
            { label: '设置', icon: 'gear', onclick: () => (uiState.showSettings = true) },
          ]}
        />

        <span class="run-icons">
          <button
            class:music-off={audioController.volume === 0}
            title="音量（点击循环 全/半/静）"
            aria-label={'音量：' + (audioController.volume === 1 ? '100%' : audioController.volume === 0.5 ? '50%' : '静音')}
            onclick={() => audioController.cycleVolume()}
          >
            <Icon name={audioController.volIconName} size={16} />
          </button>
          <button
            class:music-off={!engine.musicOn}
            class:gold={engine.musicOn}
            aria-pressed={engine.musicOn}
            aria-label={engine.musicOn ? '背景音乐：开' : '背景音乐：关'}
            title={engine.musicOn ? '背景音乐：你的指针正在实时合成和声' : '背景音乐已关闭，点击开启'}
            onclick={() => engine.setMusic(!engine.musicOn)}
          >
            <Icon name="music" size={16} />
          </button>
          <button title="成就" aria-label="成就" onclick={() => (uiState.showAchv = true)}>
            <Icon name="trophy" size={16} />
          </button>
          <button title="设置" aria-label="设置" onclick={() => (uiState.showSettings = true)}>
            <Icon name="gear" size={16} />
          </button>
        </span>
      {/if}
    </div>
  </section>

  <!-- 侧边栏与操舵台中枢 -->
  <div class="sides" class:starmap-open={uiState.starMapOpen}>
    <aside class="side side-right arm-console-wing">
      <section class="sec-arms console-deck">
        <div class="console-deck-header">
          <div class="deck-title-wrap">
            <span class="deck-badge font-celestial">璇玑中枢</span>
            <h2 class="deck-title font-celestial">十方星宿律柱</h2>
          </div>
          <div
            class="deck-capacity-pips"
            title="本关最多启用 {engine.level?.armLimit ?? 10} 根指针"
          >
            {#each Array(engine.level?.armLimit ?? 10) as _, idx}
              <span class="cap-pip" class:filled={idx < onArmCount}>◆</span>
            {/each}
            <span class="cap-num font-tabular">{onArmCount}/{engine.level?.armLimit ?? 10}</span>
          </div>
        </div>
        {#if engine.autoSolve}
          <p class="fitting-tip">🪄 自动拟合中——直接调整任意指针即可接管它；点击画布可打断</p>
        {/if}
        <ArmPanel />
      </section>
    </aside>
  </div>
</main>

<!-- 周天星图抽屉 -->
<StarmapDrawer />

<!-- 移动端底部切换条 -->
<MobileNav />
