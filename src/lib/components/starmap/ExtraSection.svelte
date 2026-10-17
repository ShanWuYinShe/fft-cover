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
            🔗 复制
          </button>
          <button type="button" class="mini-btn" title="分享链接" onclick={shareLevel}>
            {shareCopied ? '✓ 已复制' : '📤 分享'}
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, #182236 0%, #0d1524 100%);
    border: 1px solid rgba(245, 184, 65, 0.35);
    color: var(--text);
    cursor: pointer;
    font-size: var(--fs-xs);
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .endless-trigger-btn:hover {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    box-shadow: 0 0 12px rgba(245, 184, 65, 0.25);
  }
  .endless-trigger-btn.active {
    border-color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.15);
  }
  .et-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--gold-bright);
  }
  .et-right {
    font-size: 11px;
    color: var(--muted);
  }

  .gen-box {
    background: linear-gradient(180deg, #131c2e 0%, #0a1120 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .gen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .gen-label {
    font-size: var(--fs-xs);
    color: var(--gold-bright);
    font-weight: 700;
  }
  .diff-chips {
    display: flex;
    gap: 4px;
  }
  .diff-chip {
    appearance: none;
    padding: 2px 7px;
    font-size: 10px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line);
    color: var(--muted);
    cursor: pointer;
  }
  .diff-chip.active {
    background: var(--gold);
    color: #060911;
    font-weight: 700;
    border-color: var(--gold-bright);
  }

  .gen-actions {
    display: flex;
    gap: var(--space-2);
  }
  .action-btn {
    flex: 1;
    appearance: none;
    height: 30px;
    background: linear-gradient(180deg, #1c2842 0%, #10192e 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: var(--fs-xs);
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .action-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }

  .seed-box {
    background: linear-gradient(180deg, #101726 0%, #080d17 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .invite-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .invite-code {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .invite-code b {
    color: var(--gold);
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
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0 8px;
    height: 28px;
    font-size: var(--fs-xs);
    color: var(--text);
  }
  .seed-input:focus {
    border-color: var(--cyan);
    outline: none;
  }

  .load-btn,
  .mini-btn {
    appearance: none;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 10px;
    padding: 0 8px;
    height: 28px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .load-btn:hover,
  .mini-btn:hover {
    background: rgba(255, 255, 255, 0.16);
  }
</style>
