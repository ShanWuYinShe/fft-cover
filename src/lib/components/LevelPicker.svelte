<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { decodeCoeffs, LEVEL_DEFS } from '../game/levels';
  import { daysLeftInWeek, todayKey } from '../game/dates';
  import { buildCustomUrl, parseInvite } from '../game/share';
  import { chapterProgress, isLevelLocked } from '../game/campaign';
  import type { ChapterSealState } from '../game/goals';
  import { keyForChapter } from '../game/harmony';
  import { buildDailyUrl, buildRandomUrl } from '../game/share';
  import ComposerModal from './ComposerModal.svelte';

  let showComposer = $state(false);

  /** 线性解锁：前一关 ≥1★ 才能进入（规则集中在 campaign.ts） */
  const isLocked = (id: string): boolean => isLevelLocked(LEVEL_DEFS, id, engine.bestStars);

  /** 战役章节进度（章内星数 / 满星 / 解锁 / 全通） */
  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));

  /** 每章朱印进度与"章节印"（本章四印集齐）：把精通变成地图上看得见的一条进度 */
  const chapterSeals = $derived.by(() => {
    const out: Record<string, ChapterSealState> = {};
    for (const ch of chapters) out[ch.id] = engine.chapterSealsOf(ch.id);
    return out;
  });

  /** 战役状态：🏁 已通关 / 🏆 全三星（👑 已用于"完美全清"，换图标避免歧义） */
  const campaignBadge = $derived(
    engine.campaign === 'mastered' ? '🏆 全三星' : engine.campaign === 'cleared' ? '🏁 已通关' : '',
  );

  let seedInput = $state('');
  /** 分享链接已复制（按钮短暂反馈） */
  let shareCopied = $state(false);
  /** 每日挑战分享链接已复制 */
  let dailyShared = $state(false);
  /** 最近 7 天全部完成（本周全勤） */
  const weekFull = $derived(engine.dailyWeek.every((d) => d.done));
  /** 连胜处于风险：有连胜但今天还没打——过了今天就会断 */
  const streakAtRisk = $derived(
    engine.dailyStreak.streak > 0 && !engine.dailyWeek.some((d) => d.today && d.done),
  );
  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;
  const isCustom = $derived(!!engine.level?.custom);
  const isDaily = $derived(!!engine.level?.id.startsWith('daily-'));
  const seed = $derived(
    engine.level?.random && !isCustom && !isDaily ? engine.level.id.replace('random-', '') : '',
  );
  /** 创作关的邀请码：id 里的 k-mag-deg 还原成 k:mag:deg */
  const customCode = $derived(
    isCustom
      ? (engine.level?.id ?? '').replace('custom-', '').replaceAll('_', ',').replaceAll('-', ':')
      : '',
  );
  const dailyDiff = $derived(isDaily ? ((engine.level?.id ?? '').split('-').pop() ?? '') : '');

  /** 全关卡总星数 */
  const totalStars = $derived(
    LEVEL_DEFS.reduce((sum, d) => sum + (engine.bestStars[d.id] ?? 0), 0),
  );
  const expertCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.expertClears[d.id] ? 1 : 0), 0),
  );
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );

  /* ---------- 章节翻页：关卡表一次只展开一章 ---------- */

  /** 当前查看的章节下标 */
  let viewIdx = $state(0);
  const view = $derived(chapters[Math.min(viewIdx, Math.max(0, chapters.length - 1))] ?? null);
  const nextChapter = $derived(chapters[viewIdx + 1] ?? null);
  const canPrev = $derived(viewIdx > 0);
  const canNext = $derived(!!nextChapter?.unlocked);
  /** 本章最后一关的名字（下一章解锁条件提示用） */
  const viewLastLevel = $derived(view ? view.levels[view.levels.length - 1] : null);

  /**
   * 切到别的关卡时关卡表跟着走。
   * 用非响应式的 followedLevelId 做边界：用户手动翻页时不会被拽回去。
   */
  let followedLevelId = '';
  $effect(() => {
    const id = engine.level?.id ?? '';
    if (id === followedLevelId) return;
    followedLevelId = id;
    const idx = chapters.findIndex((c) => c.levels.some((d) => d.id === id));
    if (idx >= 0) viewIdx = idx;
  });

  // 每日倒计时（30 秒刷新）
  let now = $state(Date.now());
  const makeDailyId = (diff: string) => 'daily-' + todayKey() + '-' + diff;
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });
  /** 今日剩余时间（小时/分钟），短格式给按钮用，长格式给 title 提示 */
  const dailyCountdown = $derived.by(() => {
    const t = new Date(now);
    t.setHours(24, 0, 0, 0);
    const ms = t.getTime() - now;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return {
      short: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'),
      long: h + ' 时 ' + m + ' 分',
    };
  });

  /** 本关邀请码：随机关是种子、创作关是系数串、每日关是难度 */
  const inviteCode = $derived(seed || customCode || dailyDiff);

  async function copySeed(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      /* 剪贴板不可用则忽略 */
    }
  }

  /** 分享今日每日挑战：每日关由日期+难度决定，链接里只需难度 */
  async function shareDaily(): Promise<void> {
    const url = buildDailyUrl(location.origin + location.pathname, engine.difficulty);
    const text = '今日《傅立叶指针》每日挑战，来比比谁收得多？';
    try {
      if (navigator.share) {
        await navigator.share({ title: '傅立叶指针 · 每日挑战', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        dailyShared = true;
        setTimeout(() => (dailyShared = false), 1800);
      }
    } catch {
      /* 取消分享 / 剪贴板不可用：忽略 */
    }
  }

  /** 分享本关链接：随机关带邀请码+难度、创作关带系数串、每日关带难度 */
  async function shareLevel(): Promise<void> {
    const page = location.origin + location.pathname;
    let url = '';
    let text = '';
    let title = '傅立叶指针 · 关卡挑战';
    if (isCustom) {
      if (!customCode) return;
      url = buildCustomUrl(page, customCode);
      text = '我在《傅立叶指针》合成了一条曲线，来试试能不能全清？';
      title = '傅立叶指针 · 创作关挑战';
    } else if (isDaily) {
      url = buildDailyUrl(page, engine.difficulty);
      text = '今日《傅立叶指针》每日挑战，来比比谁收得多？';
      title = '傅立叶指针 · 每日挑战';
    } else {
      const n = Number(seed);
      if (!Number.isFinite(n) || seed === '') return;
      url = buildRandomUrl(page, n, engine.randomDiff);
      text = '我在《傅立叶指针》生成了一条随机曲线，来试试能不能全清？';
      title = '傅立叶指针 · 随机关挑战';
    }
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        shareCopied = true;
        setTimeout(() => (shareCopied = false), 1800);
      }
    } catch {
      /* 取消分享 / 剪贴板不可用：忽略 */
    }
  }

  function loadSeed(): void {
    const parsed = parseInvite(seedInput);
    if (!parsed) return;
    seedInput = '';
    if (parsed.kind === 'custom') {
      const coeffs = decodeCoeffs(parsed.code);
      if (coeffs) engine.loadCustomLevel(coeffs, '创作关卡');
      return;
    }
    if (parsed.kind === 'daily') {
      // 每日关由"日期 + 难度"决定，邀请码只带难度——打开的就是今天那一关
      engine.setDifficulty(parsed.diff);
      engine.loadDaily();
      return;
    }
    engine.loadRandomSeed(parsed.seed);
  }
</script>

<section>
  <h2>
    关卡
    <span class="muted"
      >总星数 {totalStars} / {LEVEL_DEFS.length * 3}{#if campaignBadge}&nbsp;· {campaignBadge}{/if}{#if perfectCount > 0}&nbsp;·
        👑
        {perfectCount}{/if}{#if exactCount > 0}&nbsp;· 🎯 {exactCount}{/if}</span
    >
  </h2>
  {#if showComposer}
    <ComposerModal onclose={() => (showComposer = false)} />
  {/if}

  <!-- 章节翻页：一次只展开一章，后面的章节保持"未知" -->
  <div class="ch-nav">
    <button
      type="button"
      class="nav"
      disabled={!canPrev}
      title="上一章"
      aria-label="上一章"
      onclick={() => (viewIdx = Math.max(0, viewIdx - 1))}>◀</button
    >
    <div class="nav-mid">
      <div class="ch-title">
        <b>{view?.name ?? ''}</b>
        {#if view && chapterSeals[view.id]?.sealed}
          <span class="ch-seal" title={'本章朱印集齐 · 章节印「' + view.seal + '」'}
            >{view.seal}</span
          >
        {/if}
      </div>
      <span>
        {view ? view.stars : 0}/{view ? view.maxStars : 0} ★{#if view}&nbsp;· 印
          {chapterSeals[view.id]?.done ?? 0}/{chapterSeals[view.id]?.total ??
            0}{/if}{#if view?.cleared}
          &nbsp;· 全通 ✓{/if}</span
      >
    </div>
    <button
      type="button"
      class="nav"
      disabled={!canNext}
      title={canNext ? '下一章' : '通关本章后解锁'}
      aria-label="下一章"
      onclick={() => (viewIdx = Math.min(chapters.length - 1, viewIdx + 1))}>▶</button
    >
  </div>
  <div class="dots">
    {#each chapters as c, i (c.id)}
      <button
        type="button"
        class="dot"
        class:on={i === viewIdx}
        class:locked={!c.unlocked}
        class:done={c.cleared}
        disabled={!c.unlocked}
        title={c.unlocked ? c.name : '尚未解锁'}
        aria-label={c.unlocked ? c.name : '尚未解锁的章节'}
        onclick={() => (viewIdx = i)}
      ></button>
    {/each}
  </div>

  <!-- 关卡路径：章内一关一节点，纵向连线 -->
  {#if view}
    <p class="ch-tag">
      {view.tagline}<span class="ch-key" title="本章配乐的调性：切章即转调，指针声部与收集音一起变"
        >♪ {keyForChapter(view.id).name}</span
      >
    </p>
    <div class="map">
      {#each view.levels as def, i (def.id)}
        {@const st = engine.bestStars[def.id] ?? 0}
        {@const locked = isLocked(def.id)}
        <div class="map-row">
          <span class="link" class:hidden={i === 0}></span>
          <button
            type="button"
            class="node"
            class:active={engine.level?.id === def.id}
            class:locked
            class:done={st === 3}
            disabled={locked}
            title={locked ? '获得上一关至少 1★ 后解锁' : def.name}
            onclick={() => engine.loadLevel(def)}
          >
            <span class="idx">{locked ? '🔒' : i + 1}</span>
            <span class="body">
              <span class="nm"
                >{def.name}{#if engine.perfectLevels[def.id]}<i class="pf">👑</i
                  >{/if}{#if engine.exactLevels[def.id]}<i class="pf">🎯</i
                  >{/if}{#if engine.expertClears[def.id]}<i class="pf">💎</i>{/if}</span
              >
              <span class="st" aria-label="{st} 星"
                >{locked ? '未解锁' : '★'.repeat(st) + '☆'.repeat(3 - st)}</span
              >
            </span>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- 下一章：锁着就只给"未知"预告，不剧透后面的内容 -->
  {#if nextChapter}
    {#if nextChapter.unlocked}
      <button
        type="button"
        class="teaser open"
        onclick={() => (viewIdx = Math.min(chapters.length - 1, viewIdx + 1))}
      >
        <span class="t-ico">▶</span>
        <span class="t-txt"><b>下一章已解锁</b><i>{nextChapter.name}</i></span>
        <span class="t-arrow">→</span>
      </button>
    {:else}
      <div class="teaser">
        <span class="t-ico">🔒</span>
        <span class="t-txt">
          <b>？？？</b>
          <i>通关「{viewLastLevel?.name ?? '本章最后一关'}」后解锁</i>
        </span>
      </div>
    {/if}
  {/if}

  <!-- 关卡提示自带 <b> 强调；文案全部写死在本仓库（内置关卡与生成关卡都不含
       用户输入），所以用 @html 渲染而不是转义成字面标签 -->
  <p id="hint">
    {#if engine.level}{@html engine.level.hint}{/if}
  </p>

  <!-- 更多玩法：每日 / 随机 / 创作 -->
  <div class="more">
    <div class="daily-row">
      <button
        type="button"
        class="more-daily"
        class:active={engine.level?.id === makeDailyId(engine.difficulty)}
        title="按当前随机难度生成今日关卡"
        onclick={() => engine.loadDaily()}
      >
        <span class="md-left"
          >📅 每日挑战{#if engine.dailyStreak.streak > 0}<i class="fire"
              >🔥{engine.dailyStreak.streak}</i
            >{/if}</span
        >
        <span class="md-right" title={'今日挑战剩余 ' + dailyCountdown.long}
          >{engine.todayBest > 0 ? engine.todayBest + ' 分 · ' : ''}{dailyCountdown.short}</span
        >
      </button>
      <button
        type="button"
        class="mini daily-share"
        title="分享今日挑战——好友打开即玩同一天的关卡"
        aria-label="分享每日挑战"
        onclick={shareDaily}
      >
        {dailyShared ? '✓' : '📤'}
      </button>
    </div>
    <!-- 本周挑战：固定困难档，一周一条曲线，慢慢磨 -->
    <div class="daily-row">
      <button
        type="button"
        class="more-daily"
        class:active={engine.level?.id.startsWith('weekly-')}
        style={daysLeftInWeek() === 1 && engine.weeklyBest === 0
          ? 'box-shadow: 0 0 0 1px rgba(240, 183, 107, 0.55)'
          : ''}
        title="本周挑战：固定困难档，一周里慢慢磨（还剩最后一天，记得来打）"
        onclick={() => engine.loadWeekly()}
      >
        <span class="md-left">🗓 每周挑战</span>
        <span class="md-right"
          >{engine.weeklyBest > 0 ? engine.weeklyBest + ' 分 · ' : ''}还剩 {daysLeftInWeek()} 天</span
        >
      </button>
    </div>
    <!-- 最近 7 天：完成的格子填朱砂，今天描边——连胜变成看得见的一排 -->
    <div class="dweek" aria-label="最近 7 天的每日挑战">
      {#each engine.dailyWeek as d (d.date)}
        <span
          class="dcell"
          class:done={d.done}
          class:today={d.today}
          title={d.date + (d.done ? ' · 已完成' : ' · 未完成')}
        >
          <i>{d.label}</i>
          {#if d.done}<b>✓</b>{/if}
        </span>
      {/each}
      <span class="dweek-cap" class:full={weekFull} class:atrisk={streakAtRisk}>
        {#if weekFull}
          🎉 本周全勤
        {:else if streakAtRisk}
          ⚠️ 今天不打，连胜就断
        {:else if engine.dailyStreak.streak > 0}
          连续 {engine.dailyStreak.streak} 天
        {:else}
          每天一练
        {/if}
      </span>
    </div>
    <div class="gen-row">
      <span class="gen-label">随机生成</span>
      <div class="diff-chips">
        {#each DIFFS as d (d.id)}
          <button
            type="button"
            class="diff-chip"
            class:active={engine.difficulty === d.id}
            onclick={() => engine.setDifficulty(d.id)}
          >
            {d.nm}
          </button>
        {/each}
      </div>
      <button class="gen-btn" title="按当前难度生成随机关卡" onclick={() => engine.loadRandom()}>
        🎲 生成
      </button>
      <button
        class="gen-btn"
        title="用谐波合成器创作自己的关卡"
        onclick={() => (showComposer = true)}
      >
        🎨 创作
      </button>
    </div>

    <!--
    邀请码行常驻：输入框是"用别人的码进关"的唯一入口，原先只在随机关才渲染，
    导致收到创作关系数串 / 每日难度码的玩家根本找不到地方粘贴。
    「复制 / 分享」只对随机关有意义（每日关有自己的分享按钮），单独用条件包起来。
  -->
    <div class="seed-row">
      {#if inviteCode}
        <span>邀请码 <b>{inviteCode}</b></span>
        {#if !isDaily}
          <button class="mini" title="复制邀请码——好友载入后进入同一关" onclick={copySeed}>
            🔗 复制
          </button>
          <button class="mini" title="分享链接——好友打开直接进入这一关" onclick={shareLevel}>
            {shareCopied ? '✓ 已复制' : '📤 分享'}
          </button>
        {/if}
      {:else}
        <span class="seed-label">邀请码</span>
      {/if}
      <input
        class="seed-input"
        placeholder="邀请码 / 种子 / 难度"
        bind:value={seedInput}
        onkeydown={(e) => e.key === 'Enter' && loadSeed()}
      />
      <button class="mini" onclick={loadSeed}>载入</button>
    </div>
  </div>
</section>

<style>
  /* ---------- 章节翻页 ---------- */
  .ch-nav {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    border-radius: var(--r-md);
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.025);
  }
  .nav {
    width: 30px;
    min-height: 30px;
    padding: 0;
    border-radius: var(--r-sm);
    font-size: var(--fs-sm);
    line-height: 1;
  }
  .nav-mid {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    text-align: center;
  }
  .nav-mid b {
    font-size: var(--fs-sm);
    letter-spacing: 1px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .nav-mid span {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .ch-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    max-width: 100%;
    min-width: 0;
  }
  /* 章节印：本章四印集齐才出现的一方朱印 */
  .ch-seal {
    flex: none;
    width: 20px;
    height: 20px;
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
    box-shadow: 0 1px 8px rgba(192, 57, 43, 0.45);
    animation: ch-seal-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  }
  @keyframes ch-seal-stamp {
    from {
      opacity: 0;
      transform: scale(1.8) rotate(-16deg);
    }
    60% {
      opacity: 1;
      transform: scale(0.92) rotate(3deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0);
    }
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 8px 0 9px;
  }
  .dot {
    width: 8px;
    height: 8px;
    min-height: 0;
    padding: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid transparent;
    transition:
      width 0.18s,
      background 0.18s;
  }
  .dot.on {
    width: 20px;
    border-radius: 4px;
    background: var(--cyan);
    box-shadow: 0 0 10px rgba(79, 209, 197, 0.5);
  }
  .dot.done {
    background: rgba(251, 191, 36, 0.6);
  }
  .dot.done.on {
    background: linear-gradient(90deg, var(--cyan), var(--gold));
  }
  .dot.locked {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.08);
  }

  /* ---------- 章内关卡路径 ---------- */
  .ch-tag {
    margin: 0 0 8px;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    line-height: 1.5;
  }
  .ch-key {
    margin-left: 6px;
    color: rgba(196, 181, 253, 0.8);
    white-space: nowrap;
  }
  .map {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .map-row {
    position: relative;
    padding-top: 10px;
  }
  .map-row:first-child {
    padding-top: 0;
  }
  /* 关卡之间的连线：一条走过的路 */
  .map-row .link {
    position: absolute;
    left: 15px;
    top: 0;
    width: 2px;
    height: 10px;
    border-radius: 1px;
    background: linear-gradient(180deg, rgba(79, 209, 197, 0.5), rgba(167, 139, 250, 0.35));
  }
  .map-row .link.hidden {
    display: none;
  }
  .node {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 10px 7px 7px;
    text-align: left;
    border-radius: var(--r-md);
    background: rgba(255, 255, 255, 0.02);
  }
  .node .idx {
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line);
  }
  .node .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .node .nm {
    font-weight: 600;
    font-size: var(--fs-sm);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .node .nm .pf {
    font-style: normal;
    font-size: 9px;
    margin-left: 2px;
  }
  .node .st {
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--gold);
  }
  .node.active {
    border-color: rgba(79, 209, 197, 0.7);
    color: var(--cyan);
    background: var(--cyan-dim);
    box-shadow: 0 0 14px rgba(79, 209, 197, 0.18);
  }
  .node.active .idx {
    color: #06121a;
    background: var(--cyan);
    border-color: transparent;
  }
  .node.done .idx {
    color: var(--gold);
    border-color: rgba(251, 191, 36, 0.45);
  }
  .node.locked {
    opacity: 0.5;
  }
  .node.locked .st {
    color: var(--muted-2);
    letter-spacing: 0;
  }

  /* 下一章：解锁了就提示，没解锁只给"未知" */
  .teaser {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    margin-top: 9px;
    padding: 8px 11px;
    border-radius: var(--r-md);
    border: 1px dashed var(--line);
    background: rgba(255, 255, 255, 0.014);
    text-align: left;
  }
  .teaser.open {
    border-style: solid;
    border-color: rgba(79, 209, 197, 0.4);
    background: var(--cyan-dim);
    cursor: pointer;
  }
  .teaser .t-ico {
    font-size: var(--fs-md);
    opacity: 0.85;
  }
  .teaser .t-txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .teaser .t-txt b {
    font-size: var(--fs-sm);
    color: var(--text);
    letter-spacing: 1px;
  }
  .teaser .t-txt i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .teaser .t-arrow {
    color: var(--cyan);
  }

  #hint {
    margin: 11px 0 0;
    padding-left: 9px;
    border-left: 2px solid rgba(167, 139, 250, 0.35);
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.7;
  }
  #hint :global(b) {
    color: var(--purple);
  }

  /* ---------- 更多玩法 ---------- */
  .more {
    margin-top: 11px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  /* 每日挑战一行：主按钮 + 分享按钮 */
  .daily-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .daily-row .more-daily {
    flex: 1;
    min-width: 0;
  }
  .daily-share {
    flex: none;
    width: 34px;
    font-size: 14px;
    line-height: 1;
  }
  .more-daily {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 8px 11px;
    border-radius: var(--r-md);
    font-size: var(--fs-sm);
  }
  .more-daily .md-left {
    font-weight: 600;
    color: var(--text);
  }
  .more-daily .md-right {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .more-daily.active {
    border-color: rgba(79, 209, 197, 0.7);
    color: var(--cyan);
    background: var(--cyan-dim);
  }
  .more-daily .fire {
    font-style: normal;
    font-size: 9px;
    margin-left: 3px;
    color: var(--gold);
  }
  /* 最近 7 天：小方格 + 连续天数说明 */
  .dweek {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 2px;
  }
  .dcell {
    position: relative;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.02);
    font-size: 10px;
    color: var(--muted-2, var(--muted));
  }
  .dcell i {
    font-style: normal;
  }
  .dcell.done {
    border-color: rgba(192, 57, 43, 0.6);
    background: linear-gradient(160deg, rgba(192, 57, 43, 0.5), rgba(142, 42, 31, 0.45));
    color: #fdece7;
  }
  .dcell.done b {
    position: absolute;
    right: 1px;
    bottom: 0;
    font-size: 8px;
    color: #fdece7;
  }
  .dcell.today {
    border-color: rgba(79, 209, 197, 0.85);
    box-shadow: 0 0 0 1px rgba(79, 209, 197, 0.35);
    color: var(--text);
  }
  .dweek-cap {
    margin-left: 3px;
    font-size: var(--fs-xs);
    color: var(--muted);
    white-space: nowrap;
  }
  .dweek-cap.full {
    color: var(--gold);
    font-weight: 600;
  }
  .dweek-cap.atrisk {
    color: var(--gold);
  }
  .gen-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.022);
    border: 1px solid var(--line-2);
    flex-wrap: wrap;
  }
  .gen-label {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    letter-spacing: 1px;
  }
  .diff-chips {
    display: flex;
    gap: 4px;
    flex: 0 0 auto;
  }
  .diff-chip {
    font-size: var(--fs-xs);
    padding: 3px 10px;
    min-height: 24px;
    border-radius: 999px;
    color: var(--muted);
    /* 不给压缩：两字标签被压到 33px 就会逐字竖排（窄视口经典坑），
       宁可让后面的生成/创作按钮换行 */
    flex: 0 0 auto;
    min-width: 46px;
    white-space: nowrap;
  }
  .diff-chip.active {
    border-color: rgba(167, 139, 250, 0.7);
    color: var(--purple);
    background: var(--purple-dim);
    box-shadow: 0 0 10px rgba(167, 139, 250, 0.15);
  }
  .gen-btn {
    font-size: var(--fs-sm);
    padding: 4px 11px;
    min-height: 28px;
    border-radius: var(--r-sm);
    white-space: nowrap;
  }
  /* 邀请码行 */
  .seed-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 9px;
    padding: 7px 9px;
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line-2);
    font-size: var(--fs-sm);
    color: var(--muted);
    flex-wrap: wrap;
  }
  .seed-row b {
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
  .mini {
    font-size: var(--fs-xs);
    padding: 3px 9px;
    min-height: 26px;
    border-radius: var(--r-sm);
  }
  .seed-label {
    color: var(--muted-2);
  }
  .seed-input {
    width: 108px;
    background: #121829;
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    color: var(--text);
    font-size: var(--fs-sm);
    padding: 5px 8px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  .seed-input:focus {
    border-color: rgba(79, 209, 197, 0.6);
  }
  .seed-input::placeholder {
    color: var(--muted-2);
  }

  /* 窄屏：难度 chips 独占一行，生成/创作按钮平分 */
  @media (max-width: 640px) {
    .gen-label {
      order: 1;
    }
    .diff-chips {
      flex-basis: 100%;
      order: 2;
    }
    .gen-btn {
      flex: 1;
      order: 3;
    }
  }

  /**
   * 触屏：热区补够（视觉可以小，点得中才行）。
   * 章节圆点原本是 8×8 的按钮本体，手机上根本点不中——把按钮撑成 40×40，
   * 圆点改由 ::after 画，视觉尺寸不变。
   * 放在样式块最后：媒体查询里的规则要与基础规则同特异性，靠顺序取胜。
   */
  @media (pointer: coarse), (max-width: 640px) {
    .dots {
      gap: 0;
    }
    .dot,
    .dot.on {
      position: relative;
      width: 40px;
      height: 40px;
      min-height: 40px;
      background: transparent;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
    .dot::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 8px;
      height: 8px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      transition:
        width 0.18s,
        background 0.18s;
    }
    .dot.on::after {
      width: 20px;
      border-radius: 4px;
      background: var(--cyan);
      box-shadow: 0 0 10px rgba(79, 209, 197, 0.5);
    }
    .dot.done::after {
      background: rgba(251, 191, 36, 0.6);
    }
    .dot.done.on::after {
      background: linear-gradient(90deg, var(--cyan), var(--gold));
    }
    .dot.locked::after {
      background: rgba(255, 255, 255, 0.07);
    }
    .nav {
      width: 40px;
      min-height: 40px;
    }
    .diff-chip {
      min-height: 40px;
    }
    .gen-btn {
      min-height: 40px;
    }
    .mini {
      min-height: 38px;
    }
    .daily-share {
      min-width: 40px;
    }
  }
</style>
