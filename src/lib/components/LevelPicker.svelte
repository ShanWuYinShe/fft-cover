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
  import Icon from './Icon.svelte';

  let showComposer = $state(false);
  /** 当前是否在特殊模式（每日/每周/随机关/无尽/创作）——折叠条上要点亮提示，免得"现在玩的是哪来着" */
  const inSpecialMode = $derived(
    !!engine.level && !engine.level.chapter && !LEVEL_DEFS.some((d) => d.id === engine.level?.id),
  );
  /** 关卡提示：默认收起（先自己试）；玩家展开后钉住；本关卡关 2 次自动展开 */
  let hintPinned = $state(false);
  const hintOpen = $derived(
    hintPinned || !engine.level?.chapter || (engine.failCounts[engine.level?.id ?? ''] ?? 0) >= 2,
  );

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

  /** 战役状态：已通关 / 全三星（👑 留给"完美全清"，避免歧义；徽记统一走 Icon） */
  const campaignBadge = $derived(
    engine.campaign === 'mastered' ? '全三星' : engine.campaign === 'cleared' ? '已通关' : '',
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
  /** 创作关 / 每日关与随机关共用 random 标记，这里显式区分开 */
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
    <!-- 口径合并：总星数只在标题页/结局出现，这里只给战役状态与精通计数 -->
    {#if campaignBadge || perfectCount > 0 || exactCount > 0}
      <span class="muted header-badges">
        {#if campaignBadge}
          <span class="h-badge">{campaignBadge}</span>
        {/if}
        {#if perfectCount > 0}
          <span class="h-badge"><Icon name="crown" size={12} /> 完美 {perfectCount}</span>
        {/if}
        {#if exactCount > 0}
          <span class="h-badge"><Icon name="target" size={12} /> {exactCount}</span>
        {/if}
      </span>
    {/if}
  </h2>
  <!-- 无尽挑战：面板顶部增补本局状态（波次 / 累计分 / 距过波差几点 / 历史最佳）。
       关卡地图**保留**——「载入任何常规关卡即退出无尽」，藏起来会断掉退出路径。 -->
  {#if engine.endless}
    <div class="endless-panel">
      <div class="ep-row">
        <span class="ep-k">本局</span>
        <b class="ep-wave"><Icon name="infinity" size={13} /> 第 {engine.endlessWave} 波</b>
        <b class="ep-score">{engine.endlessScore} 分</b>
      </div>
      <div class="ep-row ep-sub">
        <span>本波收集 {engine.collectedCount}/{engine.total}</span>
        {#if engine.endlessNeed > 0}
          <span class="ep-need">再过 {engine.endlessNeed} 点过关</span>
        {:else}
          <span class="ep-ok">已达标 ✓</span>
        {/if}
      </div>
      <div class="ep-row ep-sub">
        {#if engine.endlessBest.wave > 0}
          <span>历史最佳：第 {engine.endlessBest.wave} 波 · {engine.endlessBest.score} 分</span>
        {:else}
          <span>首次挑战 · 撑得越久越好</span>
        {/if}
      </div>
    </div>
  {/if}
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
            class:perfect={!!engine.perfectLevels[def.id]}
            disabled={locked}
            title={locked ? '获得上一关至少 1★ 后解锁' : def.name}
            onclick={() => engine.loadLevel(def)}
          >
            <span class="idx"
              >{#if locked}<Icon name="lock" size={13} />{:else}{i + 1}{/if}</span
            >
            <span class="body">
              <span class="nm"
                >{def.name}{#if engine.perfectLevels[def.id]}<i class="pf"
                    ><Icon name="crown" size={11} /></i
                  >{/if}{#if engine.exactLevels[def.id]}<i class="pf"
                    ><Icon name="target" size={11} /></i
                  >{/if}{#if engine.expertClears[def.id]}<i class="pf"
                    ><Icon name="gem" size={11} /></i
                  >{/if}</span
              >
              <span class="st" aria-label="{st} 星"
                >{locked ? '未解锁' : '★'.repeat(st) + '☆'.repeat(3 - st)}</span
              >
              {#if !locked && st > 0}
                <!-- 成绩摘要：最佳分 + 最快全清（未通关只给星级，不剧透） -->
                <span class="stats">
                  {#if engine.bestScores[def.id]}<b>{engine.bestScores[def.id]}</b>分{/if}
                  {#if engine.bestClears[def.id]}<i>· {engine.bestClears[def.id].toFixed(1)}s</i
                    >{/if}
                </span>
              {/if}
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
        <span class="t-ico"><Icon name="lock" size={14} /></span>
        <span class="t-txt">
          <b>？？？</b>
          <i>通关「{viewLastLevel?.name ?? '本章最后一关'}」后解锁</i>
        </span>
      </div>
    {/if}
  {/if}

  <!-- 关卡提示默认收起（先自己试试）；卡关 2 次自动展开。
       文案自带 <b>，全部写死在本仓库，用 @html 渲染 -->
  {#if hintOpen}
    <p id="hint">
      {#if engine.level}{@html engine.level.hint}{/if}
    </p>
  {:else}
    <button type="button" class="quiet-btn hint-toggle" onclick={() => (hintPinned = true)}>
      <Icon name="bulb" size={14} /> 看提示
    </button>
  {/if}

  <!-- 更多玩法：默认折叠——入门玩家只需要关卡地图；低频模式收在展开条里 -->
  <div class="more">
    <button
      type="button"
      class="quiet-btn more-toggle"
      class:active={inSpecialMode}
      aria-expanded={!!engine.flags['moreOpen']}
      onclick={() => engine.setFlag('moreOpen', !engine.flags['moreOpen'])}
    >
      <i>{engine.flags['moreOpen'] ? '▾' : '▸'}</i>
      <span class="mt-label">更多玩法</span>
      <span class="mt-status">
        {#if engine.flags['moreOpen']}
          每日 · 每周 · 无尽 · 随机 · 创作
        {:else if engine.todayBest === 0}
          ⏳ 今日挑战 {dailyCountdown.short}
        {:else}
          每日 · 每周 · 无尽 · 随机 · 创作
        {/if}
      </span>
    </button>
    {#if engine.flags['moreOpen']}
      <div class="daily-row">
        <button
          type="button"
          class="more-daily"
          class:active={engine.level?.id === makeDailyId(engine.difficulty)}
          title="按当前随机难度生成今日关卡"
          onclick={() => engine.loadDaily()}
        >
          <span class="md-left"
            ><Icon name="calendar" size={14} /> 每日挑战{#if engine.dailyStreak.streak > 0}<i
                class="fire"><Icon name="flame" size={12} />{engine.dailyStreak.streak}</i
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
      <!-- 无尽挑战：连续随机曲线，逐波爬升，看能撑几波 -->
      <div class="daily-row">
        <button
          type="button"
          class="more-daily"
          class:active={engine.endless}
          title="无尽挑战：连续随机曲线，每波收集 ≥35% 才能进下一波，难度逐波爬升——看你最多撑几波"
          onclick={() => engine.startEndless()}
        >
          <span class="md-left"><Icon name="infinity" size={14} /> 无尽挑战</span>
          <span class="md-right"
            >{engine.endlessBest.wave > 0
              ? '最佳 ' + engine.endlessBest.wave + ' 波 · ' + engine.endlessBest.score + ' 分'
              : '逐波爬升'}</span
          >
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
          <span class="md-left"><Icon name="calendar" size={14} /> 每周挑战</span>
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
          <Icon name="dice" size={14} /> 生成
        </button>
        <button
          class="gen-btn"
          title="用谐波合成器创作自己的关卡"
          onclick={() => (showComposer = true)}
        >
          <Icon name="palette" size={14} /> 创作
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
    {/if}
  </div>
</section>

<style>
  .header-badges {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: var(--fs-xs);
  }
  .h-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }

  /* ---------- 章节翻页 ---------- */
  .ch-nav {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    clip-path: var(--chamfer-sm);
    border: 1px solid rgba(130, 150, 210, 0.24);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    background: linear-gradient(180deg, #131c30 0%, #090e1a 100%);
    box-shadow:
      0 3px 0 #04070d,
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
    color: var(--gold-bright);
    font-weight: 700;
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
  /* 章节印：本章四印集齐才出现的一方朱印 (Imperial Celestial Stamp) */
  .ch-seal {
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
    color: #fff;
    background: linear-gradient(160deg, #d92b2b, #991b1b);
    border: 1px solid rgba(255, 200, 200, 0.3);
    box-shadow: 0 2px 10px rgba(217, 43, 43, 0.5);
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
    background: var(--gold);
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.55);
  }
  .dot.done {
    background: rgba(245, 184, 65, 0.5);
  }
  .dot.done.on {
    background: linear-gradient(90deg, var(--gold), var(--cyan));
  }
  .dot.locked {
    background: rgba(255, 255, 255, 0.07);
    border-color: rgba(255, 255, 255, 0.08);
  }

  /* ---------- 章内关卡路径 ---------- */
  /* 无尽挑战的状态条：替代常规章节导航（无尽与章节进度无关） */
  .endless-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0 0 10px;
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid rgba(245, 184, 65, 0.35);
    background: rgba(245, 184, 65, 0.08);
  }
  .ep-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .ep-k {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .ep-wave {
    color: var(--gold-bright);
    font-weight: 700;
  }
  .ep-score {
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
  .ep-sub {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .ep-need {
    color: var(--gold);
  }
  .ep-ok {
    color: var(--cyan);
  }

  .ch-tag {
    margin: 0 0 8px;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    line-height: 1.5;
  }
  .ch-key {
    margin-left: 6px;
    color: rgba(196, 181, 253, 0.85);
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
  /* 关卡之间的连线：一条走过的星轨路 */
  .map-row .link {
    position: absolute;
    left: 15px;
    top: 0;
    width: 2px;
    height: 10px;
    border-radius: 1px;
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.5), rgba(0, 245, 212, 0.35));
  }
  .map-row .link.hidden {
    display: none;
  }
  .node {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 7px 10px 7px 8px;
    text-align: left;
    clip-path: var(--chamfer-sm);
    background: linear-gradient(180deg, #131c2e 0%, #0a1120 100%);
    border: 1px solid rgba(245, 184, 65, 0.16);
    border-top: 1px solid rgba(245, 184, 65, 0.28);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    transition:
      border-color 0.15s,
      background 0.15s,
      box-shadow 0.15s,
      transform 0.08s;
  }
  .node:hover:not(:disabled) {
    background: linear-gradient(180deg, #1b2742 0%, #0e172a 100%);
    border-color: rgba(245, 184, 65, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
  }
  .node:active:not(:disabled) {
    transform: translateY(1.5px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
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
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(245, 184, 65, 0.2);
    transition: all 0.2s;
  }
  .node.done .idx {
    background: linear-gradient(135deg, rgba(245, 184, 65, 0.35), rgba(180, 83, 9, 0.85));
    border-color: #ffd166;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(245, 184, 65, 0.45);
  }
  .node.done.perfect .idx {
    background: linear-gradient(135deg, #f5b841 0%, #b45309 100%);
    border-color: #ffe699;
    color: #060911;
    box-shadow: 0 0 12px rgba(245, 184, 65, 0.6);
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
    color: var(--text);
  }
  .node .nm .pf {
    font-style: normal;
    font-size: 9px;
    margin-left: 2px;
  }
  /* 关卡行的成绩摘要：最佳分 + 最快全清 */
  .node .stats {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-top: 2px;
    font-size: 10px;
    color: var(--muted-2);
    font-variant-numeric: tabular-nums;
  }
  .node .stats b {
    color: var(--gold);
    font-weight: 600;
  }
  .node .stats i {
    font-style: normal;
  }

  .node .st {
    font-size: var(--fs-xs);
    letter-spacing: 1px;
    color: var(--gold);
  }
  .node.active {
    border-color: rgba(245, 184, 65, 0.6);
    border-left: 3px solid var(--gold);
    color: var(--gold-bright);
    background: linear-gradient(90deg, rgba(245, 184, 65, 0.16) 0%, rgba(14, 22, 38, 0.95) 100%);
    box-shadow: 0 4px 18px rgba(245, 184, 65, 0.2);
    padding-left: 5px;
  }
  .node.active .idx {
    color: #060911;
    background: var(--gold);
    border-color: #ffd166;
  }
  .node.done .idx {
    color: var(--gold);
    border-color: rgba(245, 184, 65, 0.45);
  }
  .node.locked {
    /* 0.5 时「未解锁」在深底只剩 ~2.4:1（WCAG 失败，评审高优先级）；
       对比度全量扫描实测 0.85 仍 4.34:1，提到 0.92 后 ≥4.5:1 */
    opacity: 0.92;
  }
  .node.locked .st {
    color: var(--muted-2);
    letter-spacing: 0;
  }
  .node.locked .idx {
    color: var(--muted-2);
    border-color: rgba(130, 138, 160, 0.35);
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
  /* 基础语言来自全局 .quiet-btn；这里只留位置 */
  .hint-toggle {
    margin-top: 11px;
    width: 100%;
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
  /* 折叠开关：基础语言来自全局 .quiet-btn；active = 特殊模式进行中 */
  .more-toggle {
    width: 100%;
  }
  .more-toggle.active {
    border-color: rgba(79, 209, 197, 0.55);
    color: var(--text);
    box-shadow: inset 3px 0 0 var(--cyan);
  }
  .more-toggle i {
    font-style: normal;
    width: 14px;
    flex: none;
  }
  /* 标题必须整行不折。此前它是 flex 容器里的裸文本节点（默认
     flex-shrink:1），右侧状态变长时会被挤成「更多玩 / 法」两行（实测
     行盒 y=518.5 与 535.5）。改用带类名的 span 显式 flex:none + nowrap，
     缩短全部由右侧状态承担。 */
  .more-toggle .mt-label {
    flex: none;
    white-space: nowrap;
  }
  .more-toggle .mt-status {
    margin-left: auto;
    font-size: var(--fs-xs);
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  /* 自定义边框之外再给键盘用户一圈明确轮廓（outline:none 关掉了默认框） */
  .seed-input:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
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
    /* 热区 40px 但不再紧贴：gap:0 时 8 个点连成一条金色粗带（手机端观感
       混乱的主因）。收热区到 34px 并留 2px 间隙，视觉仍是细点。 */
    .dots {
      gap: 2px;
    }
    /* 特异性要对齐基础规则（.dot.done / .dot.locked 是 0,2,0）：
       只写 .dot 会被基础规则的金色背景盖回来（实测本体仍是 34px 金块）。 */
    .dot,
    .dot.on,
    .dot.done,
    .dot.locked,
    .dot.done.on {
      position: relative;
      width: 34px;
      height: 34px;
      min-height: 34px;
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
      background: rgba(251, 191, 36, 0.42);
    }
    .dot.done.on::after {
      background: linear-gradient(90deg, var(--cyan), var(--gold));
    }
    .dot.locked::after {
      background: rgba(255, 255, 255, 0.07);
    }
    .nav {
      width: 44px;
      min-height: 44px;
    }
    .diff-chip {
      min-height: 44px;
    }
    .gen-btn {
      min-height: 44px;
    }
    .mini {
      min-height: 44px;
      min-width: 44px;
    }
    .daily-share {
      min-width: 44px;
    }
    /* 章节圆点视觉 34 不变,::after 把可点区补到 44(hud-seal 同款手法) */
    .dot {
      position: relative;
    }
    .dot::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
    }
  }
</style>
