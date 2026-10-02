<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { decodeCoeffs, LEVEL_DEFS, todayKey } from '../game/levels';
  import ComposerModal from './ComposerModal.svelte';

  let showComposer = $state(false);

  const bestOf = (id: string): string => {
    const st = engine.bestStars[id];
    return st ? '★'.repeat(st) : '';
  };

  /** 线性解锁：前一关 ≥1★ 才能进入（随机关不受限） */
  const isLocked = (i: number): boolean =>
    i > 0 && (engine.bestStars[LEVEL_DEFS[i - 1].id] ?? 0) < 1;

  let seedInput = $state('');
  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;
  const seed = $derived(engine.level?.random ? engine.level.id.replace('random-', '') : '');

  /** 全关卡总星数（满 30，随 10 关） */
  const totalStars = $derived(
    LEVEL_DEFS.reduce((sum, d) => sum + (engine.bestStars[d.id] ?? 0), 0),
  );

  // 每日倒计时（30 秒刷新）
  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(timer);
  });
  const dailyCountdown = $derived.by(() => {
    const t = new Date(now);
    t.setHours(24, 0, 0, 0);
    const ms = t.getTime() - now;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h + ' 时 ' + m + ' 分';
  });

  async function copySeed(): Promise<void> {
    try {
      await navigator.clipboard.writeText(seed);
    } catch {
      /* 剪贴板不可用则忽略 */
    }
  }

  function loadSeed(): void {
    const raw = seedInput.trim();
    if (raw === '' || raw === '0') return;
    // 系数串（含 ':'）= 玩家创作的合成关卡
    if (raw.includes(':')) {
      const coeffs = decodeCoeffs(raw);
      if (coeffs) engine.loadCustomLevel(coeffs, '创作 ' + raw.slice(0, 14));
      seedInput = '';
      return;
    }
    const n = Math.abs(Math.floor(Number(raw)));
    if (Number.isFinite(n)) engine.loadRandomSeed(n);
    seedInput = '';
  }
</script>

<section>
  <h2>关卡 <span class="muted">总星数 {totalStars} / {LEVEL_DEFS.length * 3}</span></h2>
  {#if showComposer}
    <ComposerModal onclose={() => (showComposer = false)} />
  {/if}
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
    <button
      class="lv"
      class:active={engine.level?.id === 'daily-' + todayKey()}
      onclick={() => engine.loadDaily()}
    >
      <span class="nm">📅 每日</span>
      <span class="st">
        {engine.todayBest > 0 ? engine.todayBest + ' 分 · ' : ''}{dailyCountdown}
      </span>
    </button>
    <div class="diff-row">
      <span class="diff-label">随机难度</span>
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
    <button
      class="lv"
      class:active={engine.level?.random}
      onclick={() => engine.loadRandom()}
      title="生成随机关卡"
    >
      <span class="nm"
        >🎲 随机 · {engine.difficulty === 'easy'
          ? '简单'
          : engine.difficulty === 'hard'
            ? '困难'
            : '普通'}</span
      >
      <span class="st">无限</span>
    </button>
    <button class="lv" onclick={() => (showComposer = true)}>
      <span class="nm">🎨 创作</span>
      <span class="st">合成器</span>
    </button>
  </div>
  {#if engine.level?.random}
    <div class="seed-row">
      <span>邀请码 <b>{seed}</b></span>
      <button class="mini" title="复制邀请码——好友载入后生成同一关卡" onclick={copySeed}>
        🔗 复制
      </button>
      <input
        class="seed-input"
        placeholder="输入邀请码"
        bind:value={seedInput}
        onkeydown={(e) => e.key === 'Enter' && loadSeed()}
      />
      <button class="mini" onclick={loadSeed}>载入</button>
    </div>
  {/if}
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
  .diff-row {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0 0 8px;
    font-size: 11.5px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .diff-chip {
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 999px;
  }
  .diff-chip.active {
    border-color: var(--purple);
    color: var(--purple);
    background: rgba(167, 139, 250, 0.08);
  }
  .seed-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .seed-row b {
    color: var(--gold);
  }
  .mini {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .seed-input {
    width: 110px;
    background: #141a2e;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
    padding: 4px 6px;
    font-family: inherit;
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
