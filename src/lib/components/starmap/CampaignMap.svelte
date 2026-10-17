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

  .nav-btn {
    appearance: none;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--line);
    color: var(--text);
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: var(--fs-xs);
    transition: all 0.15s ease;
  }
  .nav-btn:hover:not(:disabled) {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.12);
  }
  .nav-btn:disabled {
    opacity: 0.3;
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
  }

  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 4px 0 8px;
  }
  .dot {
    appearance: none;
    width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.18s ease;
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
    left: 15px;
    top: 0;
    width: 2px;
    height: 10px;
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.5), rgba(0, 245, 212, 0.35));
  }
  .link.hidden {
    display: none;
  }

  .node {
    appearance: none;
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
    cursor: pointer;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .node:hover:not(:disabled) {
    background: linear-gradient(180deg, #1b2742 0%, #0e172a 100%);
    border-color: rgba(245, 184, 65, 0.45);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
  }
  .node.active {
    border-color: var(--cyan);
    box-shadow: 0 0 12px rgba(0, 245, 212, 0.4);
  }
  .node:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    box-sizing: border-box;
    width: 100%;
  }
  .teaser.open {
    appearance: none;
    cursor: pointer;
    background: rgba(0, 245, 212, 0.08);
    border: 1px solid rgba(0, 245, 212, 0.3);
    color: var(--cyan);
  }
  .teaser.open:hover {
    background: rgba(0, 245, 212, 0.15);
    border-color: var(--cyan);
  }
  .teaser.locked {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
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
