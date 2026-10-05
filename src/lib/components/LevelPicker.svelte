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
  /** 已达成精确解认证的关卡数（方法层面的精通进度） */
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );

  /** 已完美全清的关卡数（三星之上的顶端追求进度） */
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );

  // 每日倒计时（30 秒刷新）
  let now = $state(Date.now());
  const makeDailyId = (diff: string) => 'daily-' + todayKey() + '-' + diff;
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
      if (coeffs) engine.loadCustomLevel(coeffs, '创作关卡');
      seedInput = '';
      return;
    }
    const n = Math.abs(Math.floor(Number(raw)));
    if (Number.isFinite(n)) engine.loadRandomSeed(n);
    seedInput = '';
  }
</script>

<section>
  <h2>
    关卡
    <span class="muted"
      >总星数 {totalStars} / {LEVEL_DEFS.length * 3}{#if perfectCount > 0}&nbsp;· 👑 {perfectCount}{/if}{#if exactCount > 0}&nbsp;·
        🎯 {exactCount}{/if}</span
    >
  </h2>
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
        <span class="nm"
          >{def.name}{#if isLocked(i)}<i class="lock">🔒</i
            >{/if}{#if engine.perfectLevels[def.id]}<i class="pf">👑</i>{/if}</span
        >
        <span class="st">{isLocked(i) ? '' : bestOf(def.id)}</span>
      </button>
    {/each}
    <button
      class="lv"
      class:active={engine.level?.id === makeDailyId(engine.difficulty)}
      title="按当前随机难度生成今日关卡"
      onclick={() => engine.loadDaily()}
    >
      <span class="nm"
        >📅 每日{engine.difficulty === 'easy'
          ? '·易'
          : engine.difficulty === 'hard'
            ? '·难'
            : ''}</span
      >
      <span class="st">
        {engine.todayBest > 0 ? engine.todayBest + ' 分 · ' : ''}{dailyCountdown}
      </span>
    </button>
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
    padding: 7px 11px;
    font-size: var(--fs-sm);
    border-radius: var(--r-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    min-width: 60px;
    background: rgba(255, 255, 255, 0.02);
  }
  .lv .nm {
    font-weight: 600;
    white-space: nowrap;
  }
  .lv .st {
    font-size: 9px;
    letter-spacing: 0.5px;
    color: var(--gold);
    min-height: 11px;
  }
  .lv.active {
    border-color: rgba(79, 209, 197, 0.7);
    color: var(--cyan);
    background: var(--cyan-dim);
    box-shadow: 0 0 14px rgba(79, 209, 197, 0.18);
  }
  .lv.locked {
    opacity: 0.5;
    background: rgba(255, 255, 255, 0.012);
  }
  .lv.locked .nm {
    color: var(--muted-2);
    font-weight: 500;
  }
  .lv .pf {
    font-style: normal;
    font-size: 9px;
    margin-left: 1px;
  }
  .lv .lock {
    font-style: normal;
    font-size: 9px;
    margin-left: 2px;
    opacity: 0.75;
  }
  .lv.locked .st {
    color: var(--muted-2);
    font-size: 8.5px;
    letter-spacing: 0;
  }
  /* 生成区：难度 + 生成 + 创作，独立一行 */
  .gen-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 9px;
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
    flex: 1;
  }
  .diff-chip {
    font-size: var(--fs-xs);
    padding: 3px 10px;
    min-height: 24px;
    border-radius: 999px;
    color: var(--muted);
    flex: 1;
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
</style>
