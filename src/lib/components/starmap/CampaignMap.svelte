<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { chapterProgress, isLevelLocked } from '../../game/campaign';
  import { keyForChapter } from '../../game/harmony';
  import type { ChapterSealState } from '../../game/goals';
  import { uiState } from '../../stores/uiState.svelte';

  let { onselect }: { onselect?: () => void } = $props();

  const isLocked = (id: string): boolean => isLevelLocked(LEVEL_DEFS, id, engine.bestStars);
  const chapters = $derived(chapterProgress(LEVEL_DEFS, engine.bestStars));

  const chapterSeals = $derived.by(() => {
    const out: Record<string, ChapterSealState> = {};
    for (const ch of chapters) out[ch.id] = engine.chapterSealsOf(ch.id);
    return out;
  });

  let viewIdx = $state(0);
  const view = $derived(chapters[Math.min(viewIdx, Math.max(0, chapters.length - 1))] ?? null);
  const nextChapter = $derived(chapters[viewIdx + 1] ?? null);
  const canPrev = $derived(viewIdx > 0);
  const canNext = $derived(!!nextChapter?.unlocked);
  const viewLastLevel = $derived(view ? view.levels[view.levels.length - 1] : null);

  /**
   * 解锁演出：新解锁的关卡节点弹一下（1.0→1.06→1.0，260ms）。
   * 抽屉关着时解锁的关先记账，等下次打开抽屉再补演；打开时当前关也弹一下。
   * 只在最前面 4 个上表演，避免一次弹一堆（红线：同时动画 ≤8 个元素）。
   */
  let popIds = $state<string[]>([]);
  const unlockedIds = $derived(LEVEL_DEFS.filter((d) => !isLocked(d.id)).map((d) => d.id));
  const knownUnlocked = new Set<string>();
  const queuedUnlocked = new Set<string>();
  let primed = false;
  $effect(() => {
    const open = uiState.starMapOpen;
    const ids = unlockedIds;
    if (!primed) {
      // 首次（应用启动）只记账，不为历史通关补放动画
      primed = true;
      ids.forEach((id) => knownUnlocked.add(id));
    } else {
      for (const id of ids) {
        if (knownUnlocked.has(id)) continue;
        knownUnlocked.add(id);
        if (!open) queuedUnlocked.add(id);
      }
    }
    if (!open) return;
    const cur = engine.level?.id;
    const list = [...new Set([...(cur ? [cur] : []), ...queuedUnlocked])].slice(0, 4);
    queuedUnlocked.clear();
    if (list.length === 0) return;
    popIds = list;
    const t = setTimeout(() => (popIds = []), 320);
    return () => clearTimeout(t);
  });

  /**
   * 视图跟随：**只在引擎切换关卡时**跳到该关所在章。
   * 原实现在 effect 里读了 viewIdx，等于把「翻章」也变成依赖——
   * 点「下一章」翻过去会被立刻拉回当前关所在章（实测：按钮像坏的）。
   * 这里改成只在关卡 id 变化时同步一次。
   */
  let followedLevelId = '';
  $effect(() => {
    const id = engine.level?.id ?? '';
    if (!id || id === followedLevelId) return;
    followedLevelId = id;
    const idx = chapters.findIndex((c) => c.levels.some((l) => l.id === id));
    if (idx >= 0) viewIdx = idx;
  });
</script>

<div class="campaign-map" class:open={uiState.starMapOpen}>
  <!-- 章节导航栏 -->
  <div class="ch-nav">
    <button
      type="button"
      class="nav-btn g-btn g-btn--icon"
      disabled={!canPrev}
      title="上一章"
      aria-label="上一章"
      onclick={() => (viewIdx = Math.max(0, viewIdx - 1))}
    >
      ◀
    </button>
    <div class="nav-mid">
      <div class="ch-title">
        <b>{view ? view.name : '周天星图'}</b>
        {#if view && chapterSeals[view.id]?.done === 4}
          <span class="ch-seal" title="本章四印全部集齐！">&#x2740;</span>
        {/if}
      </div>
      <span class="ch-summary font-tabular">
        {view ? view.stars : 0}/{view ? view.maxStars : 0} ★
        {#if view}
          &nbsp;· 印 {chapterSeals[view.id]?.done ?? 0}/{chapterSeals[view.id]?.total ?? 0}
        {/if}
        {#if view?.cleared}
          &nbsp;· 全通 ✓
        {/if}
      </span>
    </div>
    <button
      type="button"
      class="nav-btn g-btn g-btn--icon"
      disabled={!canNext}
      title={canNext ? '下一章' : '通关本章后解锁'}
      aria-label="下一章"
      onclick={() => (viewIdx = Math.min(chapters.length - 1, viewIdx + 1))}
    >
      ▶
    </button>
  </div>

  <!-- 章节翻页圆点 -->
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

  <!-- 关卡纵向路线 -->
  {#if view}
    <p class="ch-tag">
      {view.tagline}
      <span class="ch-key" title="本章配乐的调性">♪ {keyForChapter(view.id).name}</span>
    </p>
    <div class="map-list">
      {#each view.levels as def, i (def.id)}
        {@const st = engine.bestStars[def.id] ?? 0}
        {@const locked = isLocked(def.id)}
        <div class="map-row">
          <span class="link" class:hidden={i === 0}></span>
          <button
            type="button"
            class="node"
            class:active={engine.level?.id === def.id}
            class:pop={popIds.includes(def.id)}
            class:locked
            class:done={st === 3}
            class:perfect={!!engine.perfectLevels[def.id]}
            disabled={locked}
            title={locked ? '获得上一关至少 1★ 后解锁' : def.name}
            onclick={() => {
              engine.loadLevel(def);
              onselect?.();
            }}
          >
            <span class="idx">
              {#if locked}
                <Icon name="lock" size={13} />
              {:else}
                {i + 1}
              {/if}
            </span>
            <span class="node-body">
              <span class="nm">
                {def.name}
                {#if engine.perfectLevels[def.id]}
                  <i class="pf"><Icon name="crown" size={11} /></i>
                {/if}
                {#if engine.exactLevels[def.id]}
                  <i class="pf"><Icon name="target" size={11} /></i>
                {/if}
                {#if engine.expertClears[def.id]}
                  <i class="pf"><Icon name="gem" size={11} /></i>
                {/if}
              </span>
              <span class="st" aria-label="{st} 星">
                {locked ? '未解锁' : '★'.repeat(st) + '☆'.repeat(3 - st)}
              </span>
              {#if !locked && st > 0}
                <span class="stats font-tabular">
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

  <!-- 下一章预告 -->
  {#if nextChapter}
    {#if nextChapter.unlocked}
      <button
        type="button"
        class="teaser open"
        onclick={() => (viewIdx = Math.min(chapters.length - 1, viewIdx + 1))}
      >
        <span class="t-ico">▶</span>
        <span class="t-txt"><b>下一章已解锁</b><i>{nextChapter.name}</i></span>
      </button>
    {:else}
      <div class="teaser locked">
        <span class="t-ico"><Icon name="lock" size={14} /></span>
        <span class="t-txt">
          <b>通关《{viewLastLevel?.name ?? '本章'}》后解锁下一章</b>
          <i>{nextChapter.name} · {nextChapter.tagline}</i>
        </span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .campaign-map {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  /* 抽屉打开时整块淡入（与 LevelPicker 的 60ms 错峰对齐：它是第 2 个子块） */
  .campaign-map.open {
    animation: cm-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) 60ms backwards;
  }
  @keyframes cm-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* 章节导航：一行标题 + 左右翻页键，无底座 */
  /* 章节条 = 卷轴段：左右切角 + 上下铜线 */
  .ch-nav {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    clip-path: var(--chamfer-sm);
    background:
      linear-gradient(180deg, rgba(201, 162, 74, 0.16), rgba(0, 0, 0, 0)) padding-box,
      linear-gradient(180deg, #1a2440, #101828);
    box-shadow: inset 0 1px 0 rgba(201, 162, 74, 0.35);
  }
  .ch-nav::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--edge-bronze), transparent);
    pointer-events: none;
  }

  /* 章节翻页键：桌面 30（触屏 42），安静的行内键 */
  /* 翻页键：形与四态交给公共件 .g-btn--icon（键帽） */
  .nav-btn {
    flex: none;
    width: var(--ctl-md);
    height: var(--ctl-md);
    font-size: var(--ctl-font-sm);
    color: var(--gold);
  }
  .nav-btn:hover:not(:disabled) {
    color: var(--gold-bright);
    background: rgba(255, 255, 255, 0.06);
  }
  .nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
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
  .ch-title {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ch-title b {
    font-size: var(--fs-sm);
    color: var(--gold-bright);
    letter-spacing: 1px;
  }

  .ch-seal {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 13px;
    color: #fff;
    background: linear-gradient(160deg, #d92b2b, #991b1b);
    border: 1px solid rgba(255, 200, 200, 0.3);
    box-shadow: 0 2px 10px rgba(217, 43, 43, 0.5);
  }

  .ch-summary {
    font-size: var(--fs-sm);
    color: var(--muted);
    letter-spacing: 0.5px;
  }

  /* 章节翻页圆点：可视点很小，按键本体走统一控件尺寸（桌面 30 / 触屏 42） */
  .dots {
    display: flex;
    justify-content: center;
    /* 窄屏放不下时换行，宁可两行也不缩热区 */
    flex-wrap: wrap;
    gap: 2px;
    margin: 2px 0 4px;
  }
  /* 圆点翻页 = 键帽槽（可视点很小，槽给足热区） */
  .dot {
    appearance: none;
    position: relative;
    width: var(--ctl-md);
    height: var(--ctl-md);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0));
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      background 0.18s ease,
      border-color 0.18s ease;
  }
  .dot::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.6);
    transition:
      width 0.18s ease,
      border-radius 0.18s ease,
      background 0.18s ease,
      box-shadow 0.18s ease;
  }
  .dot:hover:not(:disabled) {
    background: rgba(245, 184, 65, 0.08);
    border-color: var(--edge-soft);
  }
  .dot.on::before {
    width: 24px;
    border-radius: 4px;
    background: var(--gold);
    box-shadow: 0 0 12px rgba(245, 184, 65, 0.6);
  }
  .dot.done::before {
    background: rgba(245, 184, 65, 0.55);
  }
  .dot.done.on::before {
    background: linear-gradient(90deg, var(--gold), var(--cyan));
  }
  .dot.locked::before {
    background: rgba(255, 255, 255, 0.07);
  }
  .dot:disabled {
    cursor: not-allowed;
  }

  .ch-tag {
    margin: 0 0 8px;
    font-size: var(--fs-sm);
    color: var(--muted-2);
    line-height: 1.5;
  }
  .ch-key {
    margin-left: 6px;
    color: rgba(196, 181, 253, 0.85);
  }

  .map-list {
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

  .link {
    position: absolute;
    left: 22px;
    top: 0;
    width: 2px;
    height: 10px;
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.6), rgba(0, 245, 212, 0.35));
    box-shadow: 0 0 6px rgba(245, 184, 65, 0.3);
  }
  .link.hidden {
    display: none;
  }

  /* 星图航段：每一关是一段带倒角的金属板 */
  /* 关卡行：一行一段，靠分隔线分组（无卡片、无描边、无发光） */
  .node {
    appearance: none;
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 4px 6px;
    box-sizing: border-box;
    text-align: left;
    border: none;
    border-bottom: 1px solid var(--edge-faint);
    background: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .node:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }
  /* 当前关：金色左轨 + 淡金底（发光只给这一个选中态） */
  .node.active {
    background: rgba(245, 184, 65, 0.08);
  }
  .node.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--gold);
  }
  /* 抽屉打开时左轨滑入（180ms） */
  .campaign-map.open .node.active::before {
    animation: rail-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  @keyframes rail-in {
    from {
      opacity: 0;
      transform: translateX(-3px) scaleY(0.35);
    }
    to {
      opacity: 1;
      transform: translateX(0) scaleY(1);
    }
  }
  /* 新解锁的关卡弹一下：1.0 → 1.06 → 1.0（260ms） */
  .node.pop {
    animation: node-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes node-pop {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.06);
    }
    100% {
      transform: scale(1);
    }
  }
  .node.active .nm {
    color: var(--gold-bright);
  }
  /* 锁定关：文字保持 --muted 可读，只是不再高亮 */
  .node:disabled {
    cursor: not-allowed;
  }
  .node:disabled .nm {
    color: var(--muted);
    font-weight: 500;
  }
  .node:disabled .st {
    color: var(--muted);
  }

  /* 星位：小圆槽（未达成为暗槽，达成后嵌金宝石） */
  .node .idx {
    flex: 0 0 auto;
    position: relative;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--ctl-font-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    background: radial-gradient(circle at 50% 35%, #1a2440, #070c17 70%);
    box-shadow:
      inset 0 1px 3px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(201, 162, 74, 0.3);
  }
  /* 三星 / 完美：序号点亮成金色，一眼看出已通关 */
  /* 达成：圆槽里嵌一颗金宝石 */
  .node.done .idx {
    color: #2a1700;
    background: var(--face-gold-plate, linear-gradient(180deg, #ffe7a3, #d69214));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.55),
      0 0 0 1px var(--edge-bronze-hot),
      0 0 10px rgba(245, 184, 65, 0.35);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  /* 完美全清：宝石加冕（金环更亮） */
  .node.done.perfect .idx {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 0 0 1px #ffe7a3,
      0 0 12px rgba(255, 209, 102, 0.55);
  }

  .node-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .nm {
    font-weight: 600;
    font-size: var(--fs-sm);
    line-height: 1.25;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nm .pf {
    font-style: normal;
    color: var(--gold-bright);
    display: inline-flex;
  }

  .st {
    font-size: var(--fs-sm);
    line-height: 1.15;
    color: var(--gold);
    letter-spacing: 1px;
  }

  .stats {
    font-size: 12px;
    color: var(--muted);
  }
  .stats b {
    color: var(--gold);
  }
  .stats i {
    font-style: normal;
  }

  /* 下一章：一行提示（解锁时可点，未解锁是安静说明） */
  .teaser {
    margin-top: 4px;
    padding: 8px 8px;
    min-height: 38px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    width: 100%;
    clip-path: var(--chamfer-sm);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.12));
    box-shadow: inset 0 1px 0 rgba(201, 162, 74, 0.28);
  }
  .teaser.open {
    appearance: none;
    cursor: pointer;
    color: var(--cyan);
    background: none;
    border: none;
    transition: color 0.12s ease;
  }
  .teaser.open:hover {
    color: var(--gold-bright);
  }
  .teaser.locked {
    background: none;
    border: none;
    border-top: 1px solid var(--edge-faint);
    color: var(--muted);
  }

  .t-txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .t-txt b {
    font-size: var(--fs-sm);
  }
  .t-txt i {
    font-style: normal;
    font-size: 12px;
    color: var(--muted);
  }

  /* 触屏：关卡行/下一章行补到统一控件高度（命中区 ≥40） */
  @media (pointer: coarse) {
    .node,
    .teaser {
      min-height: var(--ctl-md);
    }
  }

  /* 减弱动态效果：位移/缩放动画关闭 */
  @media (prefers-reduced-motion: reduce) {
    .campaign-map.open,
    .node.pop,
    .campaign-map.open .node.active::before {
      animation: none;
    }
  }
  :global(.reduce-motion) .campaign-map.open,
  :global(.reduce-motion) .node.pop,
  :global(.reduce-motion) .campaign-map.open .node.active::before {
    animation: none;
  }
</style>
