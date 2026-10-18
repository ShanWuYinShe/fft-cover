<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { chapterProgress, isLevelLocked } from '../../game/campaign';
  import { keyForChapter } from '../../game/harmony';
  import type { ChapterSealState } from '../../game/goals';

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

  // 切到关卡时视图跟随
  $effect(() => {
    const id = engine.level?.id;
    if (!id) return;
    const idx = chapters.findIndex((c) => c.levels.some((l) => l.id === id));
    if (idx >= 0 && idx !== viewIdx) viewIdx = idx;
  });
</script>

<div class="campaign-map">
  <!-- 章节导航栏 -->
  <div class="ch-nav">
    <button
      type="button"
      class="nav-btn"
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
      class="nav-btn"
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

  .ch-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    clip-path: var(--chamfer-sm);
    border: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, var(--metal-3) 0%, var(--metal) 55%, #070c16 100%);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.55);
  }

  /* 章节翻页键：方形金属键，热区 44 */
  .nav-btn {
    appearance: none;
    flex: none;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-sm);
    color: var(--muted);
    border-radius: 9px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .nav-btn:hover:not(:disabled) {
    border-color: var(--edge);
    color: var(--gold-bright);
    background: var(--face-metal-hover);
  }
  .nav-btn:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: var(--bevel-top);
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
    font-size: var(--fs-xs);
    color: var(--muted);
    letter-spacing: 0.5px;
  }

  /* 章节翻页圆点：可视点很小，但按键本体给足 44×44 热区 */
  .dots {
    display: flex;
    justify-content: center;
    /* 窄屏（320px 级）放不下 7×44 时换行，宁可两行也不缩热区 */
    flex-wrap: wrap;
    gap: 2px;
    margin: 2px 0 6px;
  }
  .dot {
    appearance: none;
    position: relative;
    width: 44px;
    height: 44px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: transparent;
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
  .dot.on {
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
    font-size: var(--fs-xs);
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
  .node {
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 7px 10px 7px 8px;
    box-sizing: border-box;
    text-align: left;
    clip-path: var(--chamfer-sm);
    background: linear-gradient(180deg, var(--metal-3) 0%, var(--metal) 60%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.09s ease,
      box-shadow 0.15s ease;
  }
  .node:hover:not(:disabled) {
    background: var(--face-metal-hover);
    border-color: var(--edge);
    transform: translateY(-1px);
    box-shadow:
      var(--bevel-top),
      0 5px 0 rgba(0, 0, 0, 0.5),
      0 0 18px rgba(245, 184, 65, 0.2);
  }
  .node:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: var(--bevel-top);
  }
  /* 选中航段：金色包边 + 发光（不再是青色细描边） */
  .node.active {
    border-color: var(--gold-bright);
    background: linear-gradient(
      180deg,
      rgba(245, 184, 65, 0.2),
      rgba(245, 184, 65, 0.04) 60%,
      #0a1120
    );
    box-shadow:
      var(--bevel-top),
      0 0 0 1px rgba(245, 184, 65, 0.45),
      0 0 22px rgba(245, 184, 65, 0.35);
  }
  /* 锁定航段：暗金属，不可点 */
  .node:disabled {
    opacity: 0.55;
    filter: grayscale(0.5);
    cursor: not-allowed;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .node .idx {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--fs-sm);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    background: linear-gradient(180deg, rgba(6, 9, 16, 0.9), rgba(12, 18, 30, 0.9));
    border: 1px solid var(--edge-soft);
    box-shadow: var(--bevel-inset);
  }
  .node.done .idx {
    background: linear-gradient(180deg, #f5c05a, #b45309);
    border-color: #ffd166;
    color: #1a1002;
    box-shadow:
      var(--bevel-top),
      0 0 12px rgba(245, 184, 65, 0.5);
  }
  .node.done.perfect .idx {
    background: var(--face-gold);
    border-color: #ffe699;
    color: #1a1002;
    box-shadow:
      var(--bevel-top),
      0 0 16px rgba(245, 184, 65, 0.7);
  }

  .node-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nm {
    font-weight: 600;
    font-size: var(--fs-sm);
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
    font-size: var(--fs-xs);
    color: var(--gold);
    letter-spacing: 1px;
  }

  .stats {
    font-size: 10px;
    color: var(--muted-2);
  }
  .stats b {
    color: var(--gold);
  }
  .stats i {
    font-style: normal;
  }

  .teaser {
    margin-top: 10px;
    padding: 9px 12px;
    min-height: 48px;
    box-sizing: border-box;
    border-radius: 9px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    width: 100%;
  }
  .teaser.open {
    appearance: none;
    cursor: pointer;
    color: var(--cyan);
    background: linear-gradient(180deg, rgba(0, 245, 212, 0.12), rgba(0, 245, 212, 0.03));
    border: 1px solid rgba(0, 245, 212, 0.35);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.09s ease;
  }
  .teaser.open:hover {
    background: linear-gradient(180deg, rgba(0, 245, 212, 0.2), rgba(0, 245, 212, 0.06));
    border-color: var(--cyan);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 0 18px rgba(0, 245, 212, 0.3);
  }
  .teaser.open:active {
    transform: translateY(2px);
  }
  .teaser.locked {
    background: linear-gradient(180deg, rgba(10, 14, 24, 0.9), rgba(5, 8, 15, 0.9));
    border: 1px solid var(--edge-faint);
    color: var(--muted);
  }

  .t-txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .t-txt b {
    font-size: var(--fs-xs);
  }
  .t-txt i {
    font-style: normal;
    font-size: 10px;
    color: var(--muted-2);
  }
</style>
