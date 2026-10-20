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
                {#if locked}
                  未解锁
                {:else}
                  <i class="st-on">{'★'.repeat(st)}</i><i class="st-off">{'☆'.repeat(3 - st)}</i>
                {/if}
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
    gap: 10px;
  }

  /* 抽屉打开时整块淡入（与 LevelPicker 的 60ms 错峰对齐） */
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

  /* 章节导航：白卡条 */
  .ch-nav {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  /* 章节翻页键：白面圆键（形与四态交给公共件 .g-btn--icon） */
  .nav-btn {
    flex: none;
    color: var(--muted);
    font-size: var(--ctl-font-sm);
  }

  .nav-btn:hover:not(:disabled) {
    color: var(--coral-text);
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
    gap: 2px;
    text-align: center;
  }

  .ch-title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ch-title b {
    font-size: 16px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: 0.5px;
  }

  .ch-seal {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-sm);
    font-size: 13px;
    font-weight: 900;
    color: var(--coral-ink);
    background: var(--face-gold-plate);
    box-shadow: 0 2px 0 var(--coral-edge);
  }

  .ch-summary {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.3px;
    font-variant-numeric: tabular-nums;
  }

  /* 章节翻页圆点：可视点很小，按键本体给足热区 */
  .dots {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0 0 2px;
  }

  .dot {
    appearance: none;
    position: relative;
    width: var(--ctl-md);
    height: var(--ctl-xs);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-pill);
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .dot::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--line-bright);
    transition:
      width 0.18s ease,
      background 0.18s ease,
      box-shadow 0.18s ease;
  }

  .dot:hover:not(:disabled)::before {
    background: var(--mint-bright);
  }

  .dot.on::before {
    width: 24px;
    background: var(--mint);
    box-shadow: 0 2px 0 var(--mint-edge);
  }

  .dot.done::before {
    background: var(--mint-bright);
  }

  .dot.done.on::before {
    background: var(--mint);
  }

  .dot.locked::before {
    background: var(--line);
  }

  .dot:disabled {
    cursor: not-allowed;
  }

  /* 章节标语：自己的白卡信息条（不把文字直接铺在抽屉底上） */
  .ch-tag {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 2px 0 #d9eefb;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
    line-height: 1.55;
  }

  .ch-key {
    margin-left: 6px;
    color: var(--grape-deep);
    font-weight: 800;
  }

  .map-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .map-row {
    position: relative;
  }

  /* 关卡之间的糖果连接线 */
  .link {
    position: absolute;
    left: 22px;
    top: -8px;
    width: 4px;
    height: 8px;
    border-radius: var(--r-pill);
    background: var(--line-bright);
  }

  .link.hidden {
    display: none;
  }

  /* 星图航段：每一关都是自己的白卡 */
  .node {
    appearance: none;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 10px 12px;
    box-sizing: border-box;
    text-align: left;
    border: 2px solid var(--line);
    border-radius: var(--r-md);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      transform 0.12s ease;
  }

  .node:hover:not(:disabled) {
    border-color: var(--coral-bright);
  }

  .node:active:not(:disabled) {
    transform: translateY(1px);
  }

  /* 当前关：薄荷描边 + 薄荷左侧轨 */
  .node.active {
    border-color: var(--mint);
    background: linear-gradient(180deg, #ffffff 0%, #eafbf5 100%);
    box-shadow:
      0 4px 0 rgba(15, 148, 132, 0.28),
      0 12px 22px rgba(15, 148, 132, 0.16);
  }

  .node.active::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 14px;
    bottom: 14px;
    width: 5px;
    border-radius: var(--r-pill);
    background: var(--mint);
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

  /* 新解锁的关卡弹一下：1.0 → 1.05 → 1.0（260ms） */
  .node.pop {
    animation: node-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes node-pop {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  /* 锁定关：灰底灰字，但仍然可读 */
  .node:disabled,
  .node.locked {
    background: var(--line-quiet);
    border-color: var(--line);
    box-shadow: none;
    cursor: not-allowed;
  }

  .node:disabled .nm {
    color: var(--muted-2);
    font-weight: 700;
  }

  .node:disabled .st {
    color: var(--muted-2);
  }

  /* 星位：小圆槽（未达成浅蓝，达成薄荷糖果） */
  .node .idx {
    flex: 0 0 auto;
    position: relative;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--ctl-font-sm);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    background: var(--bg-bay-inset);
    box-shadow: inset 0 2px 3px rgba(90, 150, 190, 0.18);
  }

  .node.done .idx,
  .node.active .idx {
    color: var(--mint-ink);
    background: var(--face-jade);
    box-shadow: 0 2px 0 var(--mint-edge);
  }

  /* 完美全清：薄荷槽外加一枚珊瑚环 */
  .node.done.perfect .idx {
    box-shadow:
      0 0 0 3px var(--coral-dim),
      0 2px 0 var(--mint-edge);
  }

  .node-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nm {
    font-weight: 700;
    font-size: 15px;
    line-height: 1.3;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .nm .pf {
    font-style: normal;
    color: var(--coral-text);
    display: inline-flex;
  }

  .st {
    font-size: var(--fs-sm);
    font-weight: 800;
    line-height: 1.2;
    color: var(--coral-text);
    letter-spacing: 1px;
  }

  .st i {
    font-style: normal;
  }

  .st-on {
    color: var(--coral-text);
  }

  .st-off {
    color: var(--line-bright);
  }

  .stats {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .stats b {
    color: var(--coral-edge);
    font-weight: 900;
  }

  .stats i {
    font-style: normal;
  }

  /* 下一章：白卡提示条 */
  .teaser {
    margin-top: 2px;
    padding: 12px;
    min-height: 52px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    width: 100%;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .teaser.open {
    appearance: none;
    cursor: pointer;
    color: var(--mint-edge);
    border-color: var(--mint-bright);
    transition: border-color 0.12s ease;
  }

  .teaser.open:hover {
    border-color: var(--mint);
  }

  .teaser.locked {
    color: var(--muted);
    background: var(--line-quiet);
    box-shadow: none;
  }

  .t-ico {
    flex: none;
    display: inline-flex;
    color: inherit;
  }

  .t-txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .t-txt b {
    font-size: 14px;
    font-weight: 800;
  }

  .t-txt i {
    font-style: normal;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
  }

  /* 触屏：关卡行/下一章行补到统一控件高度 */
  @media (pointer: coarse) {
    .node,
    .teaser {
      min-height: calc(var(--ctl-md) + 8px);
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
