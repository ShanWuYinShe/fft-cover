<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import Modal from './base/Modal.svelte';
  import Button from './base/Button.svelte';
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
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(confirmTimer)); // 弹层关闭即卸载，别让定时器敲在卸载的组件上

  function doClear(): void {
    if (!confirmClear) {
      confirmClear = true;
      // 武装态 4 秒后自动解除：防止"点一下走开，回来再点"的误触清空
      // （数据安全控制的标准做法；第二十六轮实测补上）
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => (confirmClear = false), 4000);
      return;
    }
    clearTimeout(confirmTimer);
    clearSave();
    msg = { ok: true, text: '已清空进度，正在刷新…' };
    setTimeout(() => location.reload(), 700);
  }
</script>

<Modal
  title={tab === 'dex' ? '图鉴' : tab === 'stats' ? '统计' : tab === 'save' ? '存档管理' : '成就'}
  icon={tab === 'dex' ? 'map' : tab === 'stats' ? 'chart' : 'trophy'}
  subtitle={tab === 'dex'
    ? `${litLevels} / ${LEVEL_DEFS.length} 关已点亮`
    : tab === 'achv'
      ? `${unlockedCount} / ${ACHIEVEMENTS.length} 解锁`
      : undefined}
  size="md"
  {onclose}
>
  <!-- 分区切换：浅蓝凹槽 + 白药丸（选中 = 薄荷） -->
  <div class="tabs" role="tablist" aria-label="成就面板分区">
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'achv'}
      class:on={tab === 'achv'}
      onclick={() => (tab = 'achv')}>成就</button
    >
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'dex'}
      class:on={tab === 'dex'}
      onclick={() => (tab = 'dex')}>图鉴</button
    >
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'stats'}
      class:on={tab === 'stats'}
      onclick={() => (tab = 'stats')}>统计</button
    >
    <button
      type="button"
      role="tab"
      aria-selected={tab === 'save'}
      class:on={tab === 'save'}
      onclick={() => (tab = 'save')}>存档</button
    >
  </div>

  <div class="achv-body">
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
                  <span class="dex-st">
                    {#if !locked}
                      <i class="st-on">{'★'.repeat(stars)}</i><i class="st-off"
                        >{'☆'.repeat(3 - stars)}</i
                      >
                    {/if}
                  </span>
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
          <div class="card">
            <span class="k">总对局</span><span class="v g-num g-num--gold">{totalPlays}</span>
          </div>
          <div class="card">
            <span class="k">总收集点</span><span class="v g-num g-num--gold">{totalCollected}</span>
          </div>
          <div class="card">
            <span class="k">玩过的关卡</span><span class="v g-num g-num--gold"
              >{playedLevels}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k">三星关卡</span><span class="v g-num g-num--gold"
              >{perfectLevels}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k"><Icon name="crown" size={13} /> 完美全清</span><span
              class="v g-num g-num--gold">{perfectClears}<i>/{LEVEL_DEFS.length}</i></span
            >
          </div>
          <div class="card">
            <span class="k"><Icon name="target" size={13} /> 精确解</span><span
              class="v g-num g-num--gold">{exactClears}<i>/{LEVEL_DEFS.length}</i></span
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
              <span class="st"
                ><i class="st-on">{'★'.repeat(l.stars)}</i><i class="st-off"
                  >{'☆'.repeat(3 - l.stars)}</i
                ></span
              >
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
                    stroke="rgba(47, 199, 155, 0.8)"
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
        <button type="button" class="mini" onclick={copySave}>
          <Icon name="link" size={13} /> 导出并复制存档
        </button>
        {#if saveText}
          <textarea class="io" readonly rows="3" value={saveText}></textarea>
        {/if}
        <textarea
          class="io"
          rows="3"
          placeholder="粘贴存档文本（FFTP1:…）后点导入"
          bind:value={importText}></textarea>
        <div class="row">
          <button type="button" class="mini" disabled={!importText.trim()} onclick={doImport}>
            <Icon name="refresh" size={13} /> 导入并恢复
          </button>
          <button type="button" class="mini danger" onclick={doClear}>
            {confirmClear ? '确认清空？' : '清空进度'}
          </button>
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
  </div>

  {#snippet footer()}
    <div class="hint font-tabular">
      当前总星数 {totalStars} / {LEVEL_DEFS.length * 3}（随机关不计星）
    </div>
    <Button variant="primary" size="md" onclick={onclose}>关 闭</Button>
  {/snippet}
</Modal>

<style>
  .achv-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .hint {
    margin-bottom: 6px;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
    text-align: center;
  }

  /* ---------- 分区切换：浅蓝凹槽 + 白药丸，选中 = 薄荷 ---------- */
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    padding: 4px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
  }

  .tabs button {
    flex: 1 1 0;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: calc(var(--ctl-md) - 4px);
    padding: 0 8px;
    font-family: var(--font-round);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    color: var(--muted);
    background: transparent;
    border: none;
    border-radius: var(--r-pill);
    -webkit-tap-highlight-color: transparent;
    transition:
      color 0.12s ease,
      background 0.12s ease;
  }

  .tabs button:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.75);
  }

  .tabs button.on {
    color: var(--mint-ink);
    background: var(--face-jade);
    box-shadow: 0 2px 0 var(--mint-edge);
  }

  /* ---------- 图鉴 ---------- */
  .dex {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 12px;
    text-align: left;
  }

  /* 每一章 = 自己的白卡面 */
  .dex-ch {
    padding: 10px 12px 12px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .dex-ch-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .dex-ch-head b {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .dex-count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .dex-ch-seal {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-sm);
    font-size: 13px;
    font-weight: 900;
    line-height: 1;
    color: var(--coral-ink);
    background: var(--face-gold-plate);
  }

  .dex-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  /* 每一关 = 白卡小格 */
  .dex-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 6px;
    border: 2px solid var(--line);
    border-radius: var(--r-md);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
      border-color 0.14s ease,
      transform 0.12s ease;
  }

  .dex-item:not(:disabled):hover {
    border-color: var(--mint-bright);
  }

  .dex-item:not(:disabled):active {
    transform: translateY(1px);
  }

  .dex-item:disabled {
    cursor: default;
    background: var(--line-quiet);
    border-color: var(--line);
    box-shadow: none;
  }

  .dex-item.locked .dex-shape {
    opacity: 0.4;
  }

  .dex-shape {
    width: 100%;
    height: 56px;
  }

  .dex-shape polyline {
    fill: none;
    stroke: var(--mint);
    stroke-width: 7;
    stroke-linejoin: round;
  }

  .dex-item.dim .dex-shape polyline {
    stroke: var(--line-bright);
  }

  .dex-q {
    fill: var(--muted-2);
    font-size: 180px;
  }

  .dex-nm {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text);
  }

  .dex-item.locked .dex-nm {
    color: var(--muted-2);
  }

  .dex-st {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--coral-text);
    letter-spacing: 1px;
    min-height: 14px;
  }

  .dex-st i,
  .lvl-row .st i {
    font-style: normal;
  }

  .st-on {
    color: var(--coral-text);
  }

  .st-off {
    color: var(--line-bright);
  }

  .dex-seals {
    display: flex;
    gap: 4px;
  }

  .dex-seals i {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1px solid var(--line);
    background: var(--line-quiet);
    font-style: normal;
    font-size: var(--fs-xs);
    font-weight: 700;
    line-height: 1;
    color: var(--muted-2);
  }

  .dex-seals i.on {
    border-color: var(--coral-text);
    background: var(--face-gold-plate);
    color: var(--coral-ink);
  }

  /* ---------- 成就列表 ---------- */
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }

  .list.hide {
    display: none;
  }

  /* 分组标题：白卡条 + 珊瑚进度 */
  .ag-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0 2px;
    padding: 8px 12px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .ag-head:first-child {
    margin-top: 0;
  }

  .ag-head b {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .ag-count {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .ag-bar {
    flex: 1;
    min-width: 40px;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    overflow: hidden;
  }

  .ag-bar i {
    display: block;
    height: 100%;
    border-radius: var(--r-pill);
    background: var(--mint);
  }

  /* 成就条目：自己的白卡面 */
  .item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 11px 13px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .item.got {
    border-color: var(--mint-bright);
  }

  /* 左侧奖章槽 */
  .icon {
    flex: none;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    position: relative;
    color: var(--muted-2);
    background: var(--groove-bg);
    box-shadow: inset 0 2px 3px rgba(90, 150, 190, 0.18);
  }

  .item.got .icon {
    color: var(--mint-ink);
    background: var(--face-jade);
    box-shadow: 0 2px 0 var(--mint-edge);
  }

  .item.got .icon::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--mint);
    border: 2px solid #ffffff;
  }

  .nm {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }

  .item:not(.got) .nm {
    color: var(--muted);
  }

  .item.got .nm {
    color: var(--mint-edge);
  }

  .desc {
    margin-top: 2px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--muted);
  }

  .prog {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .prog-txt {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--mint-edge);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .prog-bar {
    flex: 1;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    overflow: hidden;
  }

  .prog-bar i {
    display: block;
    height: 100%;
    border-radius: var(--r-pill);
    background: var(--mint);
  }

  /* ---------- 统计 ---------- */
  .stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
    text-align: left;
  }

  .cal {
    padding: 12px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .cal-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
  }

  .cal-head b {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: var(--text);
  }

  .cal-stat i {
    font-style: normal;
    font-weight: 800;
    color: var(--coral-edge);
    font-variant-numeric: tabular-nums;
  }

  .cal-stat.goal {
    margin-left: auto;
    color: var(--muted);
  }

  .cal-stat.goal.done {
    color: var(--mint-edge);
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .cal-dow {
    text-align: center;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--muted-2);
    padding-bottom: 2px;
  }

  .cal-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-sm);
    border: 1px solid var(--line);
    background: var(--bg-bay-inset);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .cal-cell.done {
    border-color: var(--mint-edge);
    background: var(--face-jade);
    color: var(--mint-ink);
  }

  .cal-cell.today {
    border-color: var(--coral-text);
    box-shadow: 0 0 0 2px var(--coral-dim);
    color: var(--text);
  }

  .cal-cell.future {
    color: var(--muted-2);
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* 统计数字：每格自己的白卡面 */
  .card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .card .k {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }

  .card .v {
    font-size: 26px;
    font-weight: 900;
    line-height: 1.1;
    color: var(--coral-text);
    font-variant-numeric: tabular-nums;
  }

  .card .v i {
    font-style: normal;
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--muted-2);
  }

  .lvl-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lvl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .lvl-row .nm {
    width: 66px;
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text);
  }

  .lvl-row .badge {
    font-style: normal;
    font-size: var(--fs-xs);
    margin-left: 3px;
    color: var(--coral-text);
  }

  .lvl-row .st {
    color: var(--coral-text);
    font-size: var(--fs-sm);
    letter-spacing: 0.5px;
    width: 44px;
  }

  .lvl-row.dim .st,
  .lvl-row.dim .spark,
  .lvl-row.dim .spark-empty {
    opacity: 0.45;
  }

  .lvl-row .spark {
    flex: 1;
    min-width: 0;
  }

  .lvl-row .spark-empty {
    flex: 1;
  }

  .lvl-row .meta {
    font-size: var(--fs-sm);
    color: var(--muted-2);
    width: 42px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .lvl-row .best {
    font-size: 13.5px;
    font-weight: 800;
    color: var(--coral-edge);
    width: 54px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* ---------- 存档 ---------- */
  .save {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
    text-align: left;
  }

  .save .desc {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--note-edge);
    background: var(--note-bg);
    font-size: var(--fs-sm);
    font-weight: 600;
    line-height: 1.6;
    color: var(--muted);
  }

  .save .io {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    border-radius: var(--r-sm);
    border: 2px solid var(--line-bright);
    background: var(--groove-bg);
    color: var(--text);
    padding: 8px 10px;
    font-size: var(--ctl-font-sm);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    box-shadow: var(--groove-shadow);
    outline: none;
    word-break: break-all;
  }

  .save .io:focus {
    border-color: var(--coral-text);
  }

  .save .io:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  .save .row {
    display: flex;
    gap: 8px;
  }

  .save .row .mini {
    flex: 1;
  }

  /* 存档动作键：白卡厚键 */
  .mini {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--ctl-md);
    padding: 0 14px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 3px 0 #d9eefb;
    color: var(--text);
    font-family: var(--font-round);
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    transition:
      color 0.12s ease,
      border-color 0.12s ease,
      transform 0.1s ease;
  }

  .mini:hover:not(:disabled) {
    color: var(--coral-edge);
    border-color: var(--coral-text);
  }

  .mini:active:not(:disabled) {
    transform: translateY(1px);
  }

  .mini:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .mini.danger {
    color: var(--danger-deep);
    border-color: var(--danger);
    background: var(--danger-dim);
    box-shadow: 0 3px 0 var(--danger-edge);
  }

  .mini.danger:hover:not(:disabled) {
    color: var(--danger-edge);
    border-color: var(--danger-edge);
  }

  .msg {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--r-sm);
    background: var(--note-bg);
    border: 2px solid var(--note-edge);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--mint-edge);
  }

  .msg.bad {
    color: var(--danger-deep);
    background: var(--danger-dim);
    border-color: var(--danger);
  }

  @media (max-width: 640px) {
    .dex-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .cards {
      grid-template-columns: 1fr;
    }
    .cal {
      padding: 10px;
    }
  }
</style>
