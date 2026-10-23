<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { levelGoals } from '../../game/goals';
  import { uiState } from '../../stores/uiState.svelte';
  import { RUN_DUR, STAR_LEVELS } from '../../game/constants';
  import { starsFor } from '../../game/scoring';

  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);

  /* ---- 运行态信息（第九轮补：原来主游戏屏 95% 是空白，得分/进度/连击都没常驻显示）---- */
  const running = $derived(engine.phase === 'running' || engine.phase === 'paused');

  /* 单位注意：engine.t 与 RUN_DUR 都是**秒**（advance 收到的 dt 已是秒），
     所以这里不能 /1000——第九轮第一版写成毫秒，时间条恒显示 0s。 */
  /** 本局剩余时间（秒） */
  const timeLeft = $derived(engine.sandbox ? 0 : Math.max(0, Math.ceil(RUN_DUR - engine.t)));
  /** 进度百分比（时间） */
  const timePct = $derived(engine.sandbox ? 0 : Math.min(100, (engine.t / RUN_DUR) * 100));

  /** 当前星级（按收集比例） */
  const starNow = $derived(engine.total ? starsFor(engine.collectedCount / engine.total) : 0);

  /** 距下一颗星还差几个点（已满三星则为 0） */
  const nextStarGap = $derived.by(() => {
    if (!engine.total || starNow >= 3) return 0;
    // 下一档门槛：0→1 星 35%，1→2 星 65%，2→3 星 90%
    const need = STAR_LEVELS[2 - starNow]; // starNow=0 → 35%, 1 → 65%, 2 → 90%
    const needCount = Math.ceil(need * engine.total);
    return Math.max(0, needCount - engine.collectedCount);
  });

  /** 连击：COMBO_WINDOW 内连续收集的倍数（combo=0 表示无连击） */
  const comboNow = $derived(engine.combo > 0 ? engine.combo + 1 : 0);

  /** 启用指针数 / 上限：机坞收起后这是唯一能看到它的地方 */
  const armOn = $derived(engine.arms.filter((a) => a.on).length);
  const armMax = $derived(engine.level?.armLimit ?? 10);

  /** 幽灵竞速差值文案：领先/落后上届多少点 */
  const ghostLabel = $derived.by(() => {
    if (!engine.ghostComparable) return '';
    if (engine.phase !== 'running' && engine.phase !== 'paused') return '';
    const d = engine.ghostDelta;
    const vs = engine.raceIsBest ? '最佳' : '上届';
    return d > 0 ? '👻 +' + d + ' 领先' + vs : d < 0 ? '👻 ' + d + ' 落后' + vs : '👻 持平';
  });
</script>

<!-- 画布内 HUD：四角贴边读数，中间留给星域 -->
<div class="hud">
  <!-- 得分：顶部居中（游戏惯例位置）。引擎 engine.score 原来只在结算时可见 -->
  {#if !engine.sandbox}
    <div class="stat-chip stat-score hud-score-top" title="本局得分（连击越高单点得分越高）">
      <span class="stat-label">得分</span>
      <b class="stat-value font-tabular">{engine.score.toLocaleString()}</b>
    </div>
  {/if}

  <div class="hud-tl">
    <!-- 指针数：机坞默认收起，这里必须常驻（原来只在机坞标题里） -->
    {#if !engine.sandbox}
      <div class="stat-chip stat-arms" title="已启用的指针数 / 本关上限（点右下「调参」可编辑）">
        <span class="stat-label">指针</span>
        <b class="stat-value font-tabular">{armOn}<i class="stat-sub">/{armMax}</i></b>
      </div>
    {/if}

    <!-- 连击：当前连击倍数，断连即归零 -->
    {#if running && comboNow > 1}
      <div class="stat-chip stat-combo" title="连击：1.2 秒内连续收集，倍数越高单点分越高">
        <span class="stat-label">连击</span>
        <b class="stat-value font-tabular">×{comboNow}</b>
      </div>
    {/if}

    {#if ghostLabel}
      <span
        class="ghost-chip font-tabular"
        class:ahead={engine.ghostDelta > 0}
        class:behind={engine.ghostDelta < 0}
        title="与{engine.raceIsBest ? '个人最佳' : '上届'}同一时刻的收集数对比"
      >
        {ghostLabel}
      </span>
    {/if}
  </div>

  <div class="hud-tr">
    <div
      class="collect-readout"
      style="--progress: {engine.total ? (engine.collectedCount / engine.total) * 100 : 0}%"
      title="本局已收集 / 目标总数"
    >
      <span class="collect-label">收集</span>
      <span class="collect-value">
        {#key engine.collectedCount}
          <b class="hud-pulse font-tabular">{engine.collectedCount}</b>
        {/key}
        <i class="collect-total font-tabular">/{engine.total}</i>
      </span>
      <span class="collect-bar" aria-hidden="true"></span>
      {#if ghostLabel}
        <i class="ghost-tick" style="left: {engine.ghostRatio * 100}%"></i>
      {/if}
    </div>

    <!-- 星级进度：三星 / 二星 / 一星门槛可视化（原来只在结算卡看得到） -->
    {#if !engine.sandbox && engine.total}
      <div class="star-meter" title="星级门槛：35% 一星 / 65% 二星 / 90% 三星">
        <div class="star-meter-track" aria-hidden="true">
          {#each STAR_LEVELS as lv}
            <i class="star-meter-tick" style="left: {lv * 100}%"></i>
          {/each}
          <i class="star-meter-fill" style="width: {(engine.collectedCount / engine.total) * 100}%"
          ></i>
        </div>
        <div class="star-meter-legend font-tabular">
          <span class="star-meter-stars" aria-label={'当前 ' + starNow + ' 星'}>
            {#each [1, 2, 3] as n}
              <i class="star-dot" class:on={starNow >= n} aria-hidden="true">★</i>
            {/each}
          </span>
          {#if nextStarGap > 0}
            <span class="star-meter-gap">再 {nextStarGap} 点升星</span>
          {:else}
            <span class="star-meter-gap max">已满三星</span>
          {/if}
        </div>
      </div>
    {/if}

    <div class="hud-tr-row">
      {#if engine.level && !engine.endless}
        <button
          type="button"
          class="hud-goal"
          title={'本关目标：星 · 满 · 准 · 专（已完成 ' + sealDone + '/4）——点开成就查看'}
          onclick={() => (uiState.showAchv = true)}
        >
          本关目标 <b class="font-tabular">{sealDone}</b>/4
        </button>
      {/if}

      <button
        type="button"
        class="hud-settings-btn"
        title="设置"
        aria-label="设置"
        onclick={() => (uiState.showSettings = true)}
      >
        <Icon name="gear" size={15} />
      </button>
    </div>
  </div>

  <!-- 底部：本局剩余时间条（单局 RUN_DUR 秒，sandbox 不显示） -->
  {#if !engine.sandbox && (running || engine.phase === 'edit')}
    <div class="time-bar" class:urgent={timeLeft <= 3 && engine.phase === 'running'}>
      <div class="time-bar-fill" style="width: {timePct}%"></div>
      <span class="time-bar-label font-tabular">
        {#if running}
          <!-- {#key}：只在最后 3 秒内随秒数换键重挂载，数字每秒弹一下（其余时间静止不抢戏） -->
          {#key timeLeft <= 3 && engine.phase === 'running' ? timeLeft : 'steady'}
            <span class="time-count" class:urgent={timeLeft <= 3 && engine.phase === 'running'}>
              {timeLeft}s</span
            >
          {/key}
        {:else}
          本局 {RUN_DUR}s
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  /* ============================================================
   * 画布 HUD（第十四轮）：四角厚卡读数 + 顶部居中得分
   * 视觉：白卡 + 3px 白边 + 硬投影；大号 tabular 数字；珊瑚主数字
   * ============================================================ */
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: calc(var(--hud-h) + 10px) max(14px, var(--safe-l)) 14px max(14px, var(--safe-r));
    padding-right: max(14px, var(--safe-r));
    z-index: 8;
  }
  .hud > * {
    pointer-events: auto;
  }

  .hud-tl {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 46%;
  }

  .hud-tr {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    max-width: 52%;
  }

  /* ---------- 通用读数卡 ---------- */
  .stat-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 16px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 4px 0 #d6ecf9,
      0 12px 22px rgba(56, 116, 150, 0.16);
  }
  .stat-label {
    font-size: var(--fs-xs);
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--muted);
  }
  .stat-value {
    font-family: var(--font-round);
    font-variant-numeric: tabular-nums;
    font-size: 22px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-text);
  }
  .stat-sub {
    font-style: normal;
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--muted-2);
  }

  /* 顶部居中得分：不进 flex 流 */
  .hud-score-top {
    position: absolute;
    top: calc(var(--hud-h) + 12px);
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 24px;
    gap: 10px;
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 5px 0 #d6ecf9,
      0 14px 26px rgba(56, 116, 150, 0.18);
  }
  .hud-score-top .stat-value {
    font-size: 30px;
    color: var(--coral-text);
  }
  .hud-score-top .stat-label {
    font-size: var(--fs-sm);
  }

  /* ---------- 收集大读数：珊瑚厚卡 ---------- */
  .collect-readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    min-width: 132px;
    padding: 10px 20px 12px;
    border-radius: var(--r-md);
    background: var(--plate-brass);
    border: 3px solid #ffffff;
    box-shadow: var(--plate-brass-shadow);
    overflow: hidden;
    position: relative;
  }
  .collect-label {
    font-size: var(--fs-xs);
    font-weight: 800;
    letter-spacing: 1.5px;
    /* 珊瑚面上的文字用深棕（白字只有 2.6:1） */
    color: var(--coral-ink);
  }
  .collect-value {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    font-family: var(--font-round);
  }
  .collect-value b {
    font-size: 34px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-ink);
    text-shadow: 0 2px 0 rgba(255, 255, 255, 0.45);
    font-variant-numeric: tabular-nums;
  }
  .collect-total {
    font-style: normal;
    font-size: 16px;
    font-weight: 900;
    color: rgba(74, 26, 0, 0.72);
  }
  /* 收集进度的底部小条：白底半透明 */
  .collect-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    width: var(--progress, 0%);
    height: 5px;
    background: var(--coral-ink);
    opacity: 0.85;
    border-radius: 0 3px 3px 0;
    transition: width 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hud-pulse {
    display: inline-block;
    animation: hud-pop 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes hud-pop {
    0% {
      transform: scale(1);
    }
    55% {
      transform: scale(1.18);
    }
    100% {
      transform: scale(1);
    }
  }

  /* ---------- 星级进度卡 ---------- */
  .star-meter {
    display: flex;
    flex-direction: column;
    gap: 7px;
    align-items: flex-end;
    min-width: 196px;
    padding: 10px 16px;
    border-radius: var(--r-md);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 4px 0 #d6ecf9,
      0 12px 22px rgba(56, 116, 150, 0.16);
  }
  .star-meter-track {
    position: relative;
    width: 100%;
    height: 10px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    overflow: visible;
  }
  .star-meter-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: var(--r-pill);
    background: linear-gradient(90deg, var(--coral-bright), var(--coral));
    transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .star-meter-tick {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 14px;
    background: #ffffff;
    border-radius: 2px;
  }
  .star-meter-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
  }
  .star-meter-stars {
    display: inline-flex;
    gap: 3px;
  }
  .star-dot {
    font-style: normal;
    font-size: 16px;
    /* 未获得星也要 ≥3:1（原 --line-bright 只有 1.8:1） */
    color: #6f96ab;
    transition: color 180ms ease;
  }
  .star-dot.on {
    color: var(--coral-text);
  }
  .star-meter-gap {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--muted);
    white-space: nowrap;
  }
  .star-meter-gap.max {
    color: var(--mint-deep);
  }

  /* ---------- 本关目标 / 设置：白药丸键 ---------- */
  .hud-tr-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hud-goal,
  .hud-settings-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: var(--ctl-sm);
    padding: 0 14px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow: 0 3px 0 #d6ecf9;
    color: var(--muted);
    font-family: var(--font-round);
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    cursor: pointer;
    transition: transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .hud-goal b {
    color: var(--coral-text);
    font-size: var(--ctl-font);
  }
  .hud-settings-btn {
    width: var(--ctl-sm);
    padding: 0;
    justify-content: center;
    color: var(--coral-text);
    border-radius: 50%;
  }
  .hud-goal:active,
  .hud-settings-btn:active {
    transform: translateY(2px);
  }
  .hud-goal:focus-visible,
  .hud-settings-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  /* 幽灵竞速芯片 */
  .ghost-chip {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: var(--r-pill);
    background: var(--grape-dim);
    border: 2px solid var(--grape);
    color: var(--grape-deep);
    font-size: var(--fs-xs);
    font-weight: 800;
  }
  .ghost-chip.ahead {
    background: var(--mint-dim);
    border-color: var(--mint);
    color: var(--mint-edge);
  }
  .ghost-chip.behind {
    background: var(--danger-dim);
    border-color: var(--danger);
    color: var(--danger-deep);
  }

  /* ---------- 底部时间条 ---------- */
  .time-bar {
    position: absolute;
    left: 50%;
    bottom: calc(var(--cmd-h) + var(--cmd-pad-b) + 10px);
    transform: translateX(-50%);
    width: min(440px, 60vw);
    height: 16px;
    border-radius: var(--r-pill);
    /* 轨道用浅蓝内凹：0% 时也能看出这是进度条，而不是一块白板 */
    background: var(--groove-bg);
    border: 3px solid #ffffff;
    box-shadow:
      0 4px 0 #d6ecf9,
      var(--groove-shadow);
    pointer-events: none;
    overflow: hidden;
  }
  .time-bar-fill {
    height: 100%;
    border-radius: var(--r-pill);
    background: linear-gradient(90deg, var(--mint-bright), var(--mint));
    transition: width 120ms linear;
  }
  .time-bar.urgent .time-bar-fill {
    background: linear-gradient(90deg, #ff9d7a, var(--danger));
  }
  .time-bar-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-round);
    font-size: 12px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: 0.5px;
  }
  /* 终局倒计时：数字每秒弹跳 + 轨道警示红心跳环（rgba 即 --danger 的 28%，
     时间条自带的演出，不新增控件；暂停时回到静止，不无限闪） */
  .time-count {
    display: inline-block;
  }
  .time-count.urgent {
    color: var(--danger-deep);
    animation: count-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes count-pop {
    from {
      transform: scale(1.5);
    }
    to {
      transform: scale(1);
    }
  }
  .time-bar.urgent {
    animation: bar-heartbeat 1s ease-in-out infinite;
  }
  @keyframes bar-heartbeat {
    0%,
    100% {
      box-shadow:
        0 4px 0 #d6ecf9,
        var(--groove-shadow);
    }
    45% {
      box-shadow:
        0 4px 0 #d6ecf9,
        var(--groove-shadow),
        0 0 0 4px rgba(224, 71, 58, 0.28);
    }
  }

  :global(.reduce-motion) .time-count.urgent,
  :global(.reduce-motion) .time-bar.urgent {
    animation: none;
  }

  /* ---------- 响应式 ---------- */
  @media (max-width: 900px) {
    .hud {
      padding: calc(var(--hud-h) + 8px) 12px 10px;
    }
    .hud-score-top {
      top: calc(var(--hud-h) + 6px);
      padding: 8px 18px;
    }
    .hud-score-top .stat-value {
      font-size: 24px;
    }
    .collect-value b {
      font-size: 28px;
    }
    .star-meter {
      min-width: 168px;
      padding: 8px 12px;
    }
    .stat-chip {
      padding: 6px 12px;
    }
    .stat-value {
      font-size: 18px;
    }
  }

  /* 手机竖屏：顶栏隐藏 → HUD 直接贴顶 */
  @media (max-width: 640px) and (orientation: portrait) {
    .hud {
      padding: calc(10px + var(--safe-t)) 12px 10px;
    }
    .hud-score-top {
      top: calc(10px + var(--safe-t));
      left: 12px;
      transform: none;
    }
    .hud-tl {
      max-width: 100%;
      flex-direction: row;
      margin-top: 52px;
    }
    .hud-tr {
      max-width: 58%;
    }
    .star-meter {
      min-width: 0;
      width: 100%;
    }
    .time-bar {
      width: min(320px, 76vw);
      bottom: calc(var(--tab-h) + var(--safe-b) + var(--cmd-h) + 22px);
    }
  }

  /* 手机横屏：更紧凑 */
  @media (max-width: 900px) and (orientation: landscape) {
    .hud {
      padding: calc(8px + var(--safe-t)) 10px 8px;
    }
    .hud-score-top {
      top: calc(8px + var(--safe-t));
    }
    .star-meter {
      display: none;
    }
    .time-bar {
      width: min(300px, 40vw);
      bottom: calc(var(--ctl-lg) + 26px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hud-pulse {
      animation: none;
    }
    .star-meter-fill,
    .collect-bar {
      transition: none;
    }
  }
  :global(.reduce-motion) .hud-pulse {
    animation: none;
  }
</style>
