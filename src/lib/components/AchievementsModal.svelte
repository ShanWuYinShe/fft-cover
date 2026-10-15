<script lang="ts">
  import Icon from './Icon.svelte';
  import { LEVEL_DEFS } from '../game/levels';
  import { chapterProgress, isLevelLocked } from '../game/campaign';
  import { levelGoals } from '../game/goals';
  import { shapePoints } from '../game/shapes';
  import { ACHIEVEMENTS, ACHV_GROUPS, achievementProgress } from '../game/achievements';
  import { clearSave, exportSave, importSave } from '../game/save';
  import { engine } from '../game/engine.svelte';

  let { onclose, onplay }: { onclose: () => void; onplay?: (id: string) => void } = $props();

  const unlockedCount = $derived(Object.keys(engine.achievements).length);
  /** 可量化成就的进度（锁着的显示"还差多少"）；单位 → 中文 */
  const UNIT_CN: Record<string, string> = {
    stars: '星',
    levels: '关',
    seals: '方',
    days: '天',
    points: '分',
  };
  const progressOf = (id: string) => engine.achievementProgressOf(id);

  /** 按分组统计成就（分组展示 + 每组进度条） */
  const achvGroups = $derived(
    ACHV_GROUPS.map((g) => {
      const items = ACHIEVEMENTS.filter((a) => a.group === g.id);
      const got = items.filter((a) => engine.achievements[a.id]).length;
      return { ...g, items, got, total: items.length };
    }),
  );
  const totalStars = $derived(
    LEVEL_DEFS.reduce((sum, d) => sum + (engine.bestStars[d.id] ?? 0), 0),
  );

  /* ---------- 图鉴：每关轮廓的缩略 SVG（与结局面板共用 shapes.ts） ---------- */
  /** 每日打卡日历（最近 5 周，按周一对齐） */
  const calendar = $derived(engine.dailyCalendar(5));

  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));
  /** 已点亮（拿到过星）的关卡数 */
  const litLevels = $derived(LEVEL_DEFS.filter((d) => (engine.bestStars[d.id] ?? 0) > 0).length);
  const isLocked = (id: string): boolean => isLevelLocked(LEVEL_DEFS, id, engine.bestStars);

  /* ---------- 存档（备份/恢复/清空） ---------- */
  let tab: 'achv' | 'dex' | 'stats' | 'save' = $state('achv');

  /* ---------- 统计 ---------- */
  /** 各关明细：局数、最佳分、星数、最近趋势（用于迷你火花线） */
  const perLevel = $derived(
    LEVEL_DEFS.map((def) => {
      const list = engine.history[def.id] ?? [];
      return {
        id: def.id,
        name: def.name,
        plays: list.length,
        best: engine.bestScores[def.id] ?? 0,
        stars: engine.bestStars[def.id] ?? 0,
        perfect: !!engine.perfectLevels[def.id],
        exact: !!engine.exactLevels[def.id],
        trend: list.slice(-12).map((e) => e.score),
      };
    }),
  );
  const totalPlays = $derived(perLevel.reduce((s, l) => s + l.plays, 0));
  const totalCollected = $derived(
    Object.values(engine.history)
      .flat()
      .reduce((s, e) => s + e.collected, 0),
  );
  const playedLevels = $derived(perLevel.filter((l) => l.plays > 0).length);
  const perfectLevels = $derived(perLevel.filter((l) => l.stars === 3).length);
  /** 精通进度：完美全清 / 精确解认证 */
  const perfectClears = $derived(perLevel.filter((l) => l.perfect).length);
  const exactClears = $derived(perLevel.filter((l) => l.exact).length);

  /** 火花线：把一组分数映射成 SVG 折线点串 */
  function spark(pts: number[], w = 64, h = 18): string {
    if (pts.length === 0) return '';
    const max = Math.max(...pts, 1);
    const min = Math.min(...pts, 0);
    const span = Math.max(max - min, 1);
    const step = pts.length > 1 ? (w - 4) / (pts.length - 1) : 0;
    return pts
      .map((v, i) => {
        const x = 2 + i * step;
        const y = h - 2 - ((v - min) / span) * (h - 4);
        return x.toFixed(1) + ',' + y.toFixed(1);
      })
      .join(' ');
  }
  let saveText = $state('');
  let importText = $state('');
  let msg: { ok: boolean; text: string } | null = $state(null);
  let confirmClear = $state(false);

  function doExport(): void {
    saveText = exportSave();
    msg = { ok: true, text: '已生成存档，复制下面这段文本保存好即可' };
  }
  async function copySave(): Promise<void> {
    if (!saveText) doExport();
    try {
      await navigator.clipboard.writeText(saveText);
      msg = { ok: true, text: '已复制到剪贴板' };
    } catch {
      msg = { ok: true, text: '请手动复制下面的文本' };
    }
  }
  function doImport(): void {
    const res = importSave(importText);
    if (res.ok) {
      msg = { ok: true, text: res.detail + '，正在刷新…' };
      setTimeout(() => location.reload(), 700);
    } else {
      msg = { ok: false, text: res.detail };
    }
  }
  function doClear(): void {
    if (!confirmClear) {
      confirmClear = true;
      return;
    }
    clearSave();
    msg = { ok: true, text: '已清空进度，正在刷新…' };
    setTimeout(() => location.reload(), 700);
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') onclose();
  }}
/>

<div
  class="modal"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onclose();
  }}
>
  <div class="box">
    <h2>
      {#if tab === 'dex'}
        <Icon name="map" size={16} /> 图鉴
        <span class="muted">{litLevels} / {LEVEL_DEFS.length} 关已点亮</span>
      {:else}
        <Icon name="trophy" size={16} /> 成就
        <span class="muted">{unlockedCount} / {ACHIEVEMENTS.length}</span>
      {/if}
    </h2>
    <div class="tabs">
      <button type="button" class:on={tab === 'achv'} onclick={() => (tab = 'achv')}>成就</button>
      <button type="button" class:on={tab === 'dex'} onclick={() => (tab = 'dex')}>图鉴</button>
      <button type="button" class:on={tab === 'stats'} onclick={() => (tab = 'stats')}>统计</button>
      <button type="button" class:on={tab === 'save'} onclick={() => (tab = 'save')}>存档</button>
    </div>
    {#if tab === 'dex'}
      <div class="dex">
        {#each chapters as ch (ch.id)}
          {@const seal = engine.chapterSealsOf(ch.id)}
          <div class="dex-ch">
            <div class="dex-ch-head">
              <b>{ch.unlocked ? ch.name : '？？？'}</b>
              {#if ch.unlocked}
                <span class="dex-count">{seal.done}/{seal.total} 印</span>
                {#if seal.sealed}
                  <span class="dex-ch-seal" title={'章节印「' + ch.seal + '」'}>{ch.seal}</span>
                {/if}
              {:else}
                <span class="dex-count">通关上一章后解锁</span>
              {/if}
            </div>
            <div class="dex-grid">
              {#each ch.levels as lv (lv.id)}
                {@const locked = !ch.unlocked || isLocked(lv.id)}
                {@const stars = engine.bestStars[lv.id] ?? 0}
                <button
                  type="button"
                  class="dex-item"
                  class:locked
                  class:dim={!locked && stars === 0}
                  disabled={locked}
                  title={locked ? '尚未解锁' : '玩「' + lv.name + '」'}
                  onclick={() => onplay?.(lv.id)}
                >
                  <svg class="dex-shape" viewBox="0 0 640 640" aria-hidden="true">
                    {#if locked}
                      <text x="320" y="420" text-anchor="middle" class="dex-q">？</text>
                    {:else}
                      <polyline points={shapePoints(lv.id)} />
                    {/if}
                  </svg>
                  <span class="dex-nm">{locked ? '？？？' : lv.name}</span>
                  <span class="dex-st"
                    >{locked ? '' : '★'.repeat(stars) + '☆'.repeat(3 - stars)}</span
                  >
                  <span class="dex-seals">
                    {#each levelGoals(engine.goalStateOf(lv.id)) as g (g.id)}
                      <i class:on={g.done} title={g.name}>{g.seal}</i>
                    {/each}
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
    {#if tab === 'stats'}
      <div class="stats">
        <!-- 每日打卡墙：最近 5 周（比 7 日格更能看出长期习惯） -->
        <div class="cal">
          <div class="cal-head">
            <b>每日打卡</b>
            <span class="cal-stat">累计 <i>{engine.dailyDaysTotal}</i> 天</span>
            <span class="cal-stat">当前连续 <i>{engine.dailyStreak.streak}</i> 天</span>
            <span class="cal-stat">最长 <i>{engine.longestDailyStreak}</i> 天</span>
            {#if engine.dailyStreak.streak >= 30}
              <span class="cal-stat goal done"><Icon name="trophy" size={12} /> 月月有余已达成</span
              >
            {:else}
              <span class="cal-stat goal"
                >距「月月有余」还差 <i>{30 - engine.dailyStreak.streak}</i> 天</span
              >
            {/if}
          </div>
          <div class="cal-grid">
            {#each ['一', '二', '三', '四', '五', '六', '日'] as w (w)}
              <span class="cal-dow">{w}</span>
            {/each}
            {#each calendar as row, ri (ri)}
              {#each row as c (c.date)}
                <span
                  class="cal-cell"
                  class:done={c.done}
                  class:today={c.today}
                  class:future={c.future}
                  title={c.date + (c.done ? ' · 已完成' : c.future ? ' · 还没到' : ' · 未完成')}
                  >{c.day}</span
                >
              {/each}
            {/each}
          </div>
        </div>
        <div class="cards">
          <div class="card"><span class="k">总对局</span><span class="v">{totalPlays}</span></div>
          <div class="card">
            <span class="k">总收集点</span><span class="v">{totalCollected}</span>
          </div>
          <div class="card">
            <span class="k">玩过的关卡</span><span class="v"
              >{playedLevels}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k">三星关卡</span><span class="v"
              >{perfectLevels}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k"><Icon name="crown" size={13} /> 完美全清</span><span class="v"
              >{perfectClears}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k"><Icon name="target" size={13} /> 精确解</span><span class="v"
              >{exactClears}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
        </div>
        <div class="lvl-list">
          {#each perLevel as l (l.id)}
            <div class="lvl-row" class:dim={l.plays === 0}>
              <span class="nm"
                >{l.name}{#if l.perfect}<i class="badge"><Icon name="crown" size={11} /></i
                  >{/if}{#if l.exact}<i class="badge"><Icon name="target" size={11} /></i
                  >{/if}</span
              >
              <span class="st">{'★'.repeat(l.stars)}{'☆'.repeat(3 - l.stars)}</span>
              {#if l.trend.length > 1}
                <svg
                  class="spark"
                  viewBox="0 0 64 18"
                  width="64"
                  height="18"
                  aria-label="{l.name} 成绩趋势"
                >
                  <polyline
                    points={spark(l.trend)}
                    fill="none"
                    stroke="rgba(79,209,197,.7)"
                    stroke-width="1.4"
                  />
                </svg>
              {:else}
                <span class="spark-empty"></span>
              {/if}
              <span class="meta">{l.plays} 局</span>
              <span class="best">{l.best > 0 ? l.best : '—'}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if tab === 'save'}
      <div class="save">
        <p class="desc">
          进度保存在本机浏览器里。换设备或清理浏览器数据前，先导出备份。<br />
          备份含：星级 / 最佳分 / 最快全清 / 完美与精确认证 / 每日成绩与连胜 / 成就与标记 / 解法存档 /
          节奏记录 / 卡关次数 / 合成器草稿 / 音量音效音乐偏好。
        </p>
        <button type="button" class="mini" onclick={copySave}>📋 导出并复制存档</button>
        {#if saveText}
          <textarea class="io" readonly rows="3" value={saveText}></textarea>
        {/if}
        <textarea
          class="io"
          rows="3"
          placeholder="粘贴存档文本（FFTP1:…）后点导入"
          bind:value={importText}></textarea>
        <div class="row">
          <button type="button" class="mini" disabled={!importText.trim()} onclick={doImport}
            >⬆ 导入并恢复</button
          >
          <button type="button" class="mini danger" onclick={doClear}
            >{confirmClear ? '确认清空？' : '🗑 清空进度'}</button
          >
        </div>
        {#if msg}
          <p class="msg" class:bad={!msg.ok}>{msg.text}</p>
        {/if}
      </div>
    {/if}
    <div class="list" class:hide={tab !== 'achv'}>
      {#each achvGroups as g (g.id)}
        <div class="ag-head">
          <b>{g.name}</b>
          <span class="ag-count">{g.got}/{g.total}</span>
          <span class="ag-bar"><i style="width: {g.total ? (g.got / g.total) * 100 : 0}%"></i></span
          >
        </div>
        {#each g.items as a (a.id)}
          {@const got = !!engine.achievements[a.id]}
          <div class="item" class:got>
            <span class="icon"><Icon name={got ? 'trophy' : 'lock'} size={15} /></span>
            <div class="txt">
              <div class="nm">{a.name}</div>
              <div class="desc">{a.desc}</div>
              {#if !got}
                {@const p = progressOf(a.id)}
                {#if p}
                  <div class="prog">
                    <span class="prog-txt">{p.have} / {p.need} {UNIT_CN[p.unit] ?? p.unit}</span>
                    <span class="prog-bar"
                      ><i style="width: {Math.min(100, (p.have / p.need) * 100)}%"></i></span
                    >
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      {/each}
    </div>
    <div class="hint">当前总星数 {totalStars} / {LEVEL_DEFS.length * 3}（随机关不计星）</div>
    <button class="primary" onclick={onclose}>关 闭</button>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 14, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
  .box {
    width: min(92vw, 380px);
    /* 矮屏（手机横屏 ~390px 高）里弹层必须能滚：否则顶部标签栏与底部按钮都够不着 */
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    background: #10152a;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 17px;
    letter-spacing: 2px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 0;
  }
  /* ---------- 图鉴 ---------- */
  .dex {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
    max-height: 46vh;
    overflow-y: auto;
    text-align: left;
  }
  .dex-ch-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 5px;
    font-size: 11px;
    color: var(--muted);
  }
  .dex-ch-head b {
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--text);
  }
  .dex-count {
    font-variant-numeric: tabular-nums;
  }
  .dex-ch-seal {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
  }
  .dex-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .dex-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 5px 4px 6px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .dex-item:not(:disabled):hover {
    border-color: rgba(79, 209, 197, 0.55);
    transform: translateY(-1px);
  }
  .dex-item:disabled {
    cursor: default;
  }
  /* 只压暗锁定的图形与问号，关名保持可读（整卡 opacity 会把 11px
     关名压到 3.93:1，「？？？」本身是信息，不该一并变糊）。 */
  .dex-item.locked .dex-shape,
  .dex-item.locked .dex-q {
    opacity: 0.5;
  }
  .dex-shape {
    width: 100%;
    height: 60px;
  }
  .dex-shape polyline {
    fill: none;
    stroke: rgba(79, 209, 197, 0.9);
    stroke-width: 7;
    stroke-linejoin: round;
  }
  .dex-item.dim .dex-shape polyline {
    stroke: rgba(150, 170, 200, 0.4);
  }
  .dex-q {
    fill: var(--muted);
    font-size: 180px;
  }
  .dex-nm {
    font-size: 11px;
    color: var(--text);
  }
  .dex-st {
    font-size: 10px;
    color: var(--gold);
    letter-spacing: 1px;
    min-height: 12px;
  }
  .dex-seals {
    display: flex;
    gap: 2px;
  }
  .dex-seals i {
    width: 13px;
    height: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    border: 1px solid var(--line-2);
    font-style: normal;
    font-size: 9px;
    line-height: 1;
    color: var(--muted);
  }
  .dex-seals i.on {
    border-color: rgba(192, 57, 43, 0.6);
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    color: #fdece7;
  }

  /* 可量化成就的进度条（锁着的显示"还差多少"） */
  .prog {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 5px;
  }
  .prog-txt {
    font-size: var(--fs-xs);
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .prog-bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .prog-bar i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--cyan), var(--gold));
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    max-height: 46vh;
    overflow-y: auto;
    text-align: left;
  }
  /* 成就分组标题：组名 + 计数 + 细进度条 */
  .ag-head {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 6px 0 1px;
    font-size: 11px;
    color: var(--muted);
  }
  .ag-head:first-child {
    margin-top: 0;
  }
  .ag-head b {
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--cyan);
  }
  .ag-count {
    font-variant-numeric: tabular-nums;
  }
  .ag-bar {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
  }
  .ag-bar i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, rgba(79, 209, 197, 0.7), rgba(251, 191, 36, 0.75));
  }
  .item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }
  /* 未解锁降级只动装饰与标题，描述保持 --muted 实色。
     整卡 opacity 会把 12px 描述压到 2.38:1（实测远低于 AA 4.5:1）。 */
  .item:not(.got) .icon {
    opacity: 0.45;
  }
  .item:not(.got) .nm {
    color: var(--muted);
    font-weight: 500;
  }
  .item.got {
    border-color: rgba(251, 191, 36, 0.45);
    background: rgba(251, 191, 36, 0.05);
    box-shadow: 0 0 10px rgba(251, 191, 36, 0.12);
  }
  .icon {
    font-size: 20px;
  }
  .nm {
    font-size: 14px;
    font-weight: 600;
  }
  .desc {
    font-size: 12px;
    color: var(--muted);
  }
  .hint {
    font-size: 11.5px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  /* 分区切换 */
  .tabs {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-bottom: 12px;
  }
  .tabs button {
    font-size: var(--fs-sm);
    padding: 4px 16px;
    min-height: 28px;
    border-radius: 999px;
    color: var(--muted);
  }
  .tabs button.on {
    border-color: rgba(79, 209, 197, 0.7);
    color: var(--cyan);
    background: var(--cyan-dim);
  }
  .list.hide {
    display: none;
  }
  /* 精通标记（关卡行内小徽章） */
  .lvl-row .badge {
    font-style: normal;
    font-size: 10px;
    margin-left: 3px;
  }
  /* 统计区 */
  .stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
    text-align: left;
  }
  /* 每日打卡墙：7 列（周一 → 周日）× 5 行 */
  .cal {
    padding: 9px 10px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }
  .cal-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 7px;
    font-size: 11px;
    color: var(--muted);
  }
  .cal-head b {
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--cyan);
  }
  .cal-stat i {
    font-style: normal;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
  .cal-stat.goal {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba(251, 191, 36, 0.28);
    background: rgba(251, 191, 36, 0.08);
    color: var(--muted);
  }
  .cal-stat.goal.done {
    border-color: rgba(47, 158, 127, 0.5);
    background: rgba(47, 158, 127, 0.12);
    color: #7fe3c4;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }
  .cal-dow {
    text-align: center;
    font-size: 9px;
    color: var(--muted);
    padding-bottom: 1px;
  }
  .cal-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.02);
    font-size: var(--fs-xs);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .cal-cell.done {
    border-color: rgba(192, 57, 43, 0.6);
    background: linear-gradient(160deg, rgba(192, 57, 43, 0.5), rgba(142, 42, 31, 0.42));
    color: #fdece7;
  }
  .cal-cell.today {
    border-color: rgba(79, 209, 197, 0.9);
    box-shadow: 0 0 0 1px rgba(79, 209, 197, 0.4);
    color: var(--text);
  }
  /* 未来日期只需"不可点/未到"的弱提示，不该淡到读不出数字
     （0.35 → 实测 1.79:1）。0.6 配合 --muted 仍低于已过日期，层级不变。 */
  .cal-cell.future {
    opacity: 0.6;
  }
  .stats .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }
  .stats .card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 11px;
    border-radius: var(--r-md);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line-2);
  }
  .stats .card .k {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .stats .card .v {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .stats .card .v i {
    font-style: normal;
    font-size: var(--fs-xs);
    font-weight: 400;
    color: var(--muted-2);
  }
  .lvl-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 240px;
    overflow-y: auto;
  }
  .lvl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--r-sm);
    font-size: var(--fs-sm);
    background: rgba(255, 255, 255, 0.02);
  }
  /* 未玩过的关卡行：只压暗星级与火花图，文字（.nm/.meta/.best）保持实色。
     整行 opacity 会把 12px .meta 压到 2.03:1（实测）。 */
  .lvl-row.dim .st,
  .lvl-row.dim .spark,
  .lvl-row.dim .spark-empty {
    opacity: 0.45;
  }
  .lvl-row .nm {
    width: 62px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lvl-row .st {
    color: var(--gold);
    font-size: var(--fs-xs);
    letter-spacing: 0.5px;
    width: 42px;
  }
  .lvl-row .spark {
    flex: 1;
    min-width: 0;
  }
  .lvl-row .spark-empty {
    flex: 1;
  }
  .lvl-row .meta {
    font-size: var(--fs-xs);
    color: var(--muted-2);
    width: 40px;
    text-align: right;
  }
  .lvl-row .best {
    font-size: var(--fs-xs);
    color: var(--gold);
    width: 52px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* 存档区 */
  .save {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    text-align: left;
  }
  .save .desc {
    font-size: var(--fs-xs);
    color: var(--muted);
    margin: 0;
    line-height: 1.6;
  }
  .save .io {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    background: #0f1428;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    padding: 7px 9px;
    font-size: var(--fs-xs);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;
    word-break: break-all;
  }
  .save .io:focus {
    border-color: rgba(79, 209, 197, 0.6);
  }
  /* 同上：键盘焦点必须可见 */
  .save .io:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }
  .save .row {
    display: flex;
    gap: 8px;
  }
  .save .row .mini {
    flex: 1;
  }
  .mini {
    font-size: var(--fs-sm);
    padding: 6px 12px;
    min-height: 32px;
    border-radius: var(--r-sm);
  }
  /* 触屏：标签页与迷你按钮的热区补够 */
  @media (pointer: coarse), (max-width: 640px) {
    /* 实测 390×844 下 Tab 只有 58×38，低于 44 下限 */
    .tabs button {
      min-height: 44px;
      padding: 8px 16px;
    }
    .mini {
      min-height: 44px;
    }
  }
  .mini.danger:hover:not(:disabled) {
    border-color: rgba(248, 113, 113, 0.7);
    color: #f87171;
    box-shadow: none;
  }
  .msg {
    font-size: var(--fs-xs);
    color: var(--cyan);
    margin: 0;
  }
  .msg.bad {
    color: #f87171;
  }
</style>
