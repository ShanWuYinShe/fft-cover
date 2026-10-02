<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { LEVEL_DEFS } from '../game/levels';

  const bestOf = (id: string): string => {
    const st = engine.bestStars[id];
    return st ? '★'.repeat(st) : '';
  };

  /** 线性解锁：前一关 ≥1★ 才能进入（随机关不受限） */
  const isLocked = (i: number): boolean =>
    i > 0 && (engine.bestStars[LEVEL_DEFS[i - 1].id] ?? 0) < 1;
</script>

<section>
  <h2>关卡</h2>
  <div class="levels">
    {#each LEVEL_DEFS as def, i (def.id)}
      <button
        class="lv"
        class:active={engine.level?.id === def.id}
        class:locked={isLocked(i)}
        disabled={isLocked(i)}
        title={isLocked(i) ? '获得前一关至少 1★ 后解锁' : ''}
        onclick={() => engine.loadLevel(def)}
      >
        <span class="nm">{isLocked(i) ? '🔒' : def.name}</span>
        <span class="st">{isLocked(i) ? '' : bestOf(def.id)}</span>
      </button>
    {/each}
    <button class="lv" class:active={engine.level?.random} onclick={() => engine.loadRandom()}>
      <span class="nm">🎲 随机</span>
      <span class="st">无限</span>
    </button>
  </div>
  <p id="hint">
    {#if engine.level}{engine.level.hint}{/if}
  </p>
</section>

<style>
  .levels {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .lv {
    padding: 6px 10px;
    font-size: 12.5px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    align-items: center;
    min-width: 58px;
  }
  .lv .nm {
    font-weight: 600;
  }
  .lv .st {
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--gold);
    min-height: 11px;
  }
  .lv.active {
    border-color: var(--cyan);
    color: var(--cyan);
    box-shadow: 0 0 12px rgba(79, 209, 197, 0.2);
  }
  .lv.locked {
    opacity: 0.5;
  }
  #hint {
    margin: 10px 0 0;
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.6;
  }
  #hint :global(b) {
    color: var(--purple);
  }
</style>
