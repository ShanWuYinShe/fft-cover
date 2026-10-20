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
    <div class="time-bar" class:urgent={timeLeft <= 3 && running}>
      <div class="time-bar-fill" style="width: {timePct}%"></div>
      <span class="time-bar-label font-tabular">
        {#if running}
          {timeLeft}s
        {:else}
          本局 {RUN_DUR}s
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  /* 画布 HUD：浮在铺满的画布上。
     顶部要避开顶栏（--hud-h）与左上角缎带，否则读数会被压在下面。 */
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    /* 顶部要避开两样东西：顶栏（--hud-h）与浮在左上角的关卡缎带（约 34px） */
    padding: calc(var(--hud-h) + 44px) 12px 12px;
    z-index: 8;
  }
  .hud > * {
    pointer-events: auto;
  }

  .hud-tl {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    max-width: 60%;
  }

  /* ---------- 右上：收集读数是这里唯一的大数字 ---------- */
  .hud-tr {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  /* 收集读数 = 画布上唯一的大数字，装在一块小铜牌里 */
  .collect-readout {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0;
    min-width: 108px;
    padding: 6px 12px 9px;
    border-radius: var(--r-sm);
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    box-shadow: var(--plate-brass-shadow);
    overflow: hidden;
  }
  .collect-label {
    font-size: 11px;
    letter-spacing: 3px;
    color: var(--muted);
  }
  .collect-value {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
  }
  .collect-value b {
    font-size: 30px;
    font-weight: 900;
    line-height: 1;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    display: inline-block;
    animation: collect-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  /* 每次收集数字弹一下（key 块重建时重播），让「收到东西了」有手感 */
  @keyframes collect-pop {
    0% {
      transform: scale(1.32);
      color: #ffe7a3;
    }
    100% {
      transform: scale(1);
      color: var(--text);
    }
  }
  :global(.reduce-motion) .collect-value b {
    animation: none;
  }
  .collect-total {
    font-style: normal;
    font-size: 14px;
    font-weight: 700;
    color: var(--muted);
  }
  .collect-bar {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    width: var(--progress, 0%);
    background: linear-gradient(90deg, #10b981 0%, #00f5d4 50%, #f5b841 100%);
    transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ghost-tick {
    position: absolute;
    bottom: 0;
    width: 2px;
    height: 8px;
    margin-left: -1px;
    background: var(--gold);
  }

  .ghost-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--groove-shadow);
    font-size: 12px;
    color: var(--gold);
  }
  .ghost-chip.ahead {
    border-color: rgba(0, 245, 212, 0.55);
    color: var(--cyan);
  }
  .ghost-chip.behind {
    border-color: rgba(248, 113, 113, 0.55);
    color: #f87171;
  }

  .hud-tr-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* 本关目标：小铜牌（与机坞铭牌同一种面），读数不抢收集数字 */
  .hud-goal {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: var(--ctl-sm);
    padding: 0 8px;
    border-radius: var(--r-sm);
    background: var(--plate-brass);
    border: 1px solid var(--plate-brass-line);
    box-shadow: var(--plate-brass-shadow);
    color: var(--text);
    font-size: var(--ctl-font-sm);
    transition:
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .hud-goal b {
    color: var(--gold-bright);
    font-weight: 800;
  }
  .hud-goal:hover {
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  /* 设置键：凹槽小方键（原冷蓝胶囊 + 切角已取消） */
  .hud-settings-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ctl-sm);
    height: var(--ctl-sm);
    border-radius: var(--ctl-radius);
    background: var(--groove-bg);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--groove-shadow);
    color: var(--muted);
  }
  .hud-settings-btn:hover {
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  /* ---------- 触屏：所有可点件 ≥40px ---------- */

  @media (max-width: 640px) and (orientation: portrait) {
    .hud {
      padding: 6px 8px;
    }
    /* 竖屏画布小：收集读数改成单行「收集 0/24」，把压住画布的高度从 ~75px 收到 ~34px */
    .collect-readout {
      flex-direction: row;
      align-items: baseline;
      gap: 5px;
      min-width: 0;
      padding: 3px 10px 7px;
    }
    .collect-label {
      letter-spacing: 1px;
    }
    .hud-goal {
      font-size: 11px;
    }
    .collect-value b {
      font-size: 24px;
    }
    .hud-goal {
      font-size: 11px;
      padding: 0 8px;
    }
  }

  /* 矮屏：收起次要读数，给画布让路 */
  @media (max-width: 640px) and (orientation: portrait) and (max-height: 700px) {
    .hud-goal {
      display: none;
    }
  }
  @media (orientation: landscape) and (max-height: 700px) {
    .hud-goal {
      display: none;
    }
  }

  /* ============================================================
   * 运行态信息组（第九轮）：得分 / 连击 / 星级进度 / 剩余时间
   * 原来主游戏屏只有「收集 x/y」，95% 是空白——引擎里的得分、连击、
   * 进度、星级门槛全都有，但一个都没常驻显示。
   * ============================================================ */

  /* 通用读数芯片 */
  .stat-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--r-sm);
    background: rgba(8, 12, 20, 0.62);
    border: 1px solid var(--edge-faint);
    backdrop-filter: blur(6px);
  }
  .stat-label {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .stat-value {
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.1;
  }
  .stat-score .stat-value {
    color: var(--gold-bright);
  }
  .stat-sub {
    font-style: normal;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  /* 顶部居中得分：不进 flex 流，避免与左侧缎带、右上收集牌打架 */
  .hud-score-top {
    position: absolute;
    top: calc(var(--hud-h) + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 5px 14px;
    background: rgba(8, 12, 20, 0.72);
    border-color: var(--edge-bronze);
  }
  .hud-score-top .stat-value {
    font-size: 20px;
  }
  .stat-combo {
    border-color: var(--edge-bronze-hot);
    background: rgba(60, 40, 12, 0.7);
  }
  .stat-combo .stat-value {
    color: var(--gold-bright);
    font-size: 19px;
  }

  /* 星级进度：一条轨道 + 三个门槛刻度 + 当前星数 */
  .star-meter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
    min-width: 168px;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    background: rgba(8, 12, 20, 0.62);
    border: 1px solid var(--edge-faint);
    backdrop-filter: blur(6px);
  }
  .star-meter-track {
    position: relative;
    width: 100%;
    height: 5px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.5);
    overflow: visible;
  }
  .star-meter-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--bronze-bright), var(--gold-bright));
    transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .star-meter-tick {
    position: absolute;
    top: -2px;
    width: 1px;
    height: 9px;
    background: rgba(255, 255, 255, 0.35);
  }
  .star-meter-legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    font-size: 11px;
  }
  .star-meter-stars {
    display: inline-flex;
    gap: 2px;
  }
  .star-dot {
    font-style: normal;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
    transition: color 200ms ease;
  }
  .star-dot.on {
    color: var(--gold-bright);
    text-shadow: 0 0 6px rgba(255, 209, 102, 0.5);
  }
  .star-meter-gap {
    color: var(--muted);
  }
  .star-meter-gap.max {
    color: var(--gold-bright);
  }

  /* 底部剩余时间条：贴在指令栏上方，横贯画布底部 */
  .time-bar {
    position: absolute;
    left: 50%;
    bottom: calc(var(--cmd-h) + 34px);
    transform: translateX(-50%);
    width: min(420px, 62vw);
    height: 6px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid var(--edge-faint);
    pointer-events: none;
    overflow: visible;
  }
  .time-bar-fill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--bronze), var(--gold-bright));
    transition: width 120ms linear;
  }
  .time-bar.urgent .time-bar-fill {
    background: linear-gradient(90deg, #d97706, #fca5a5);
  }
  .time-bar-label {
    position: absolute;
    right: 0;
    top: -16px;
    font-size: 11px;
    color: var(--muted);
  }
  .time-bar.urgent .time-bar-label {
    color: #fca5a5;
  }

  /* 小屏（手机竖屏）：读数组缩小一档，避免压住星盘 */
  @media (max-width: 640px) {
    .stat-chip {
      padding: 3px 8px;
    }
    .stat-value {
      font-size: 15px;
    }
    .stat-combo .stat-value {
      font-size: 17px;
    }
    .star-meter {
      min-width: 132px;
      padding: 5px 8px;
    }
    .time-bar {
      width: min(280px, 72vw);
      bottom: calc(var(--cmd-h) + var(--tab-h) + 20px);
    }
  }
</style>
