<script lang="ts">
  import Icon from '../Icon.svelte';
  import ComposerModal from '../ComposerModal.svelte';
  import { engine } from '../../game/engine.svelte';
  import { decodeCoeffs } from '../../game/levels';
  import { buildCustomUrl, buildRandomUrl, parseInvite } from '../../game/share';

  let { onselect }: { onselect?: () => void } = $props();

  let showComposer = $state(false);
  let seedInput = $state('');
  let shareCopied = $state(false);

  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;

  const isCustom = $derived(!!engine.level?.custom);
  const isDaily = $derived(!!engine.level?.id.startsWith('daily-'));
  const seed = $derived(
    engine.level?.random && !isCustom && !isDaily ? engine.level.id.replace('random-', '') : '',
  );
  const customCode = $derived(
    isCustom
      ? (engine.level?.id ?? '').replace('custom-', '').replaceAll('_', ',').replaceAll('-', ':')
      : '',
  );
  const dailyDiff = $derived(isDaily ? ((engine.level?.id ?? '').split('-').pop() ?? '') : '');
  const inviteCode = $derived(seed || customCode || dailyDiff);

  async function copySeed(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteCode);
    } catch {
      /* 忽略 */
    }
  }

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
      /* 忽略 */
    }
  }

  function loadSeed(): void {
    const parsed = parseInvite(seedInput);
    if (!parsed) return;
    seedInput = '';
    if (parsed.kind === 'custom') {
      const coeffs = decodeCoeffs(parsed.code);
      if (coeffs) {
        engine.loadCustomLevel(coeffs, '创作关卡');
        onselect?.();
      }
      return;
    }
    if (parsed.kind === 'daily') {
      engine.setDifficulty(parsed.diff);
      engine.loadDaily();
      onselect?.();
      return;
    }
    engine.loadRandomSeed(parsed.seed);
    onselect?.();
  }
</script>

<div class="extra-section">
  <!-- 无尽挑战入口 -->
  <button
    type="button"
    class="endless-trigger-btn"
    class:active={engine.endless}
    title="无尽挑战：每波收集 ≥35% 进下一波，难度逐波爬升"
    onclick={() => {
      engine.startEndless();
      onselect?.();
    }}
  >
    <span class="et-left"><Icon name="infinity" size={14} /> 周天无尽</span>
    <span class="et-right font-tabular">
      {engine.endlessBest.wave > 0
        ? '最佳 ' + engine.endlessBest.wave + ' 波 · ' + engine.endlessBest.score + ' 分'
        : '逐波爬升'}
    </span>
  </button>

  <!-- 随机生成与创作关卡 -->
  <div class="gen-box">
    <div class="gen-header">
      <span class="gen-label">随机星轨</span>
      <div class="diff-chips" role="group" aria-label="随机星轨难度">
        {#each DIFFS as d (d.id)}
          <button
            type="button"
            class="diff-chip"
            class:active={engine.difficulty === d.id}
            aria-pressed={engine.difficulty === d.id}
            onclick={() => engine.setDifficulty(d.id)}
          >
            {d.nm}
          </button>
        {/each}
      </div>
    </div>

    <div class="gen-actions">
      <button
        type="button"
        class="action-btn"
        title="按当前难度生成随机关卡"
        onclick={() => {
          engine.loadRandom();
          onselect?.();
        }}
      >
        <Icon name="dice" size={14} /> 生成星轨
      </button>
      <button
        type="button"
        class="action-btn"
        title="用谐波合成器创作自己的关卡"
        onclick={() => (showComposer = true)}
      >
        <Icon name="palette" size={14} /> 创作星轨
      </button>
    </div>
  </div>

  <!-- 邀请码与分享 -->
  <div class="seed-box">
    {#if inviteCode && !isDaily}
      <div class="invite-header">
        <span class="invite-code font-tabular">邀请码 <b>{inviteCode}</b></span>
        <div class="invite-btns">
          <button type="button" class="mini-btn" title="复制邀请码" onclick={copySeed}>
            <Icon name="link" size={11} /> 复制
          </button>
          <button type="button" class="mini-btn" title="分享链接" onclick={shareLevel}>
            {#if shareCopied}<Icon name="check" size={11} /> 已复制{:else}<Icon
                name="share"
                size={11}
              /> 分享{/if}
          </button>
        </div>
      </div>
    {/if}

    <div class="seed-input-row">
      <input
        class="seed-input"
        placeholder="粘贴邀请码 / 种子 / 难度"
        bind:value={seedInput}
        onkeydown={(e) => e.key === 'Enter' && loadSeed()}
      />
      <button type="button" class="load-btn" onclick={loadSeed}>载入</button>
    </div>
  </div>
</div>

{#if showComposer}
  <ComposerModal onclose={() => (showComposer = false)} />
{/if}

<style>
  .extra-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .endless-trigger-btn {
    appearance: none;
    width: 100%;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 12px;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: var(--fs-xs);
    border-radius: 9px;
    background: linear-gradient(180deg, var(--metal-3) 0%, var(--metal) 60%, #070c16 100%);
    border: 1px solid var(--edge);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  .endless-trigger-btn:hover {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    background: var(--face-metal-hover);
    box-shadow:
      var(--bevel-top),
      0 3px 0 rgba(0, 0, 0, 0.5),
      0 0 18px rgba(245, 184, 65, 0.3);
  }
  .endless-trigger-btn:active {
    transform: translateY(2px);
  }
  .endless-trigger-btn.active {
    border-color: var(--gold-bright);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.24), rgba(245, 184, 65, 0.05));
    box-shadow:
      var(--bevel-top),
      0 0 20px rgba(245, 184, 65, 0.35);
  }
  .et-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--gold-bright);
    white-space: nowrap;
  }
  .et-right {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }

  .gen-box {
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 60%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    box-shadow: var(--bevel-top);
  }

  .gen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .gen-label {
    font-size: var(--fs-xs);
    color: var(--gold-bright);
    font-weight: 700;
    letter-spacing: 1.5px;
    white-space: nowrap;
  }
  .diff-chips {
    display: flex;
    gap: 4px;
    flex: none;
    padding: 3px;
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.9), rgba(8, 12, 22, 0.75));
    border: 1px solid var(--edge-faint);
    border-radius: 9px;
    box-shadow: var(--bevel-inset);
  }
  .diff-chip {
    appearance: none;
    min-height: 30px;
    padding: 0 9px;
    cursor: pointer;
    color: var(--muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
    border-radius: 6px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow: var(--bevel-top);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .diff-chip:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .diff-chip:active {
    transform: translateY(2px);
  }
  .diff-chip.active {
    color: #1a1002;
    border-color: #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -2px 0 rgba(140, 80, 0, 0.5),
      0 2px 0 #7a4d05;
  }

  .gen-actions {
    display: flex;
    gap: var(--space-2);
  }
  .action-btn {
    flex: 1;
    appearance: none;
    min-height: 42px;
    padding: 0 8px;
    cursor: pointer;
    color: var(--text);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 1px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border-radius: 8px;
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
  .action-btn:hover {
    border-color: var(--edge);
    color: var(--gold-bright);
    background: var(--face-metal-hover);
  }
  .action-btn:active {
    transform: translateY(2px);
  }

  .seed-box {
    background: linear-gradient(180deg, rgba(8, 12, 22, 0.92), rgba(4, 7, 13, 0.9));
    border: 1px solid var(--edge-faint);
    border-radius: 10px;
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    box-shadow: var(--bevel-inset);
  }

  .invite-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .invite-code {
    font-size: var(--fs-xs);
    color: var(--muted);
    white-space: nowrap;
  }
  .invite-code b {
    color: var(--gold-bright);
    letter-spacing: 1px;
  }
  .invite-btns {
    display: flex;
    gap: 4px;
  }

  .seed-input-row {
    display: flex;
    gap: 6px;
  }
  .seed-input {
    flex: 1;
    min-width: 0;
    background: var(--metal-deep);
    border: 1px solid var(--edge-faint);
    border-radius: 8px;
    padding: 0 10px;
    height: 38px;
    font-size: var(--fs-xs);
    color: var(--text);
    box-shadow: var(--bevel-inset);
  }
  .seed-input::placeholder {
    color: var(--muted-2);
  }
  .seed-input:focus {
    border-color: var(--cyan);
    outline: none;
    box-shadow:
      var(--bevel-inset),
      0 0 0 1px rgba(0, 245, 212, 0.35);
  }

  /* 载入 / 复制 / 分享：金属小键 */
  .load-btn,
  .mini-btn {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    color: var(--text);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
    padding: 0 10px;
    height: 38px;
    border-radius: 8px;
    border: 1px solid var(--edge-soft);
    background: var(--face-metal);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
    transition:
      transform 0.09s ease,
      color 0.12s ease,
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .load-btn:hover,
  .mini-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: var(--face-metal-hover);
  }
  .load-btn:active,
  .mini-btn:active {
    transform: translateY(2px);
  }

  /* 触屏：热区补到 44 */
  @media (pointer: coarse), (max-width: 640px) {
    .action-btn {
      min-height: 46px;
    }
    .load-btn,
    .mini-btn,
    .seed-input {
      height: 44px;
    }
    .diff-chip {
      min-height: 40px;
    }
  }
</style>
