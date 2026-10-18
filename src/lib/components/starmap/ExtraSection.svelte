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
    class="endless-trigger-btn g-btn"
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
            class="diff-chip g-btn"
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
        class="action-btn g-btn"
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
        class="action-btn g-btn"
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
          <button
            type="button"
            class="mini-btn g-btn g-btn--icon"
            title="复制邀请码"
            onclick={copySeed}
          >
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

  /* 无尽入口：一行（左标题 / 右战绩），无卡片 */
  .endless-trigger-btn {
    width: 100%;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: var(--ctl-font-sm);
    border-bottom: 1px solid var(--edge-faint);
    /* 形与四态交给公共件 .g-btn / .g-btn--icon：本地只保留布局与字号 */
  }
  .endless-trigger-btn:hover,
  .endless-trigger-btn.active {
    color: var(--gold-bright);
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
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }

  /* 随机星轨：小标题 + 两个动作键（无卡片） */
  .gen-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--edge-faint);
  }

  .gen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .gen-label {
    font-size: var(--fs-sm);
    color: var(--gold-bright);
    font-weight: 700;
    letter-spacing: 1.5px;
    white-space: nowrap;
  }
  .diff-chips {
    display: flex;
    gap: 6px;
    flex: none;
  }
  .diff-chip {
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    /* 形与四态交给公共件 .g-btn / .g-btn--icon：本地只保留布局与字号 */
  }
  .diff-chip:hover {
    color: var(--text);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }
  .diff-chip.active {
    color: var(--gold-bright);
    border-color: var(--gold);
    background: rgba(245, 184, 65, 0.1);
    font-weight: 700;
  }

  .gen-actions {
    display: flex;
    gap: var(--space-2);
  }
  .action-btn {
    flex: 1;
    min-height: var(--ctl-md);
    padding: 0 8px;
    cursor: pointer;
    color: var(--text);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    /* 形与四态交给公共件 .g-btn / .g-btn--icon：本地只保留布局与字号 */
  }
  .action-btn:hover {
    border-color: var(--edge);
    color: var(--gold-bright);
    background: rgba(255, 255, 255, 0.05);
  }

  .seed-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0 0;
  }

  .invite-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .invite-code {
    font-size: var(--fs-sm);
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
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--edge-faint);
    border-radius: 8px;
    padding: 0 10px;
    height: var(--ctl-md);
    font-size: var(--ctl-font-sm);
    color: var(--text);
  }
  .seed-input::placeholder {
    color: var(--muted-2);
  }
  .seed-input:focus {
    border-color: var(--cyan);
    outline: none;
  }

  /* 载入 / 复制 / 分享：安静小键 */
  .load-btn,
  .mini-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    white-space: nowrap;
    padding: 0 10px;
    height: var(--ctl-md);
    /* 形与四态交给公共件 .g-btn / .g-btn--icon：本地只保留布局与字号 */
  }
  .load-btn:hover,
  .mini-btn:hover {
    color: var(--gold-bright);
    border-color: var(--edge);
    background: rgba(255, 255, 255, 0.05);
  }

  /* 触屏：无尽入口行补到统一控件高度 */
  @media (pointer: coarse) {
    .endless-trigger-btn {
      min-height: var(--ctl-md);
    }
  }

  /* 其余高度全部由 --ctl-* 按指针类型自动切换（桌面 30 / 触屏 42） */
</style>
