<script lang="ts">
  import Icon from '../Icon.svelte';
  import ComposerModal from '../ComposerModal.svelte';
  import { engine } from '../../game/engine.svelte';
  import { decodeCoeffs } from '../../game/levels';
  import { buildCustomUrl, buildRandomUrl, parseInvite } from '../../game/share';
  import { uiState } from '../../stores/uiState.svelte';

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
      uiState.setShareNote('复制失败，请重试');
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
        return;
      }
    } catch {
      /* 桌面 Chrome 常见：有 navigator.share 但没有分享目标 → 回退剪贴板
         （原实现 catch 忽略——分享失败时无提示、无剪贴板，什么都没发生） */
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = false;
    }
    if (ok) {
      shareCopied = true;
      setTimeout(() => (shareCopied = false), 1800);
    } else {
      uiState.setShareNote('复制失败，请重试');
    }
  }

  function loadSeed(): void {
    const raw = seedInput.trim();
    if (!raw) return;
    const parsed = parseInvite(raw);
    if (!parsed) {
      // 无效邀请码的静默失败会让玩家困惑（实测 2026-10-24）——
      // 反馈走全局 shareNote toast（与挑战链接同一通道）
      uiState.setShareNote('邀请码无法识别，请检查后重试');
      return;
    }
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
            class="mini-btn g-btn g-btn--sm"
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
    gap: 8px;
    margin-top: 0;
  }

  /* 无尽入口：整行白卡 */
  .endless-trigger-btn {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    box-sizing: border-box;
    cursor: pointer;
    color: var(--text);
    font-size: 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
    transition: border-color 0.12s ease;
  }

  .endless-trigger-btn::before {
    content: none;
  }

  .endless-trigger-btn:hover,
  .endless-trigger-btn.active {
    border-color: var(--mint-bright);
  }

  .et-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 900;
    letter-spacing: 0.3px;
    color: var(--mint-edge);
    white-space: nowrap;
  }

  .et-right {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* 随机星轨：白卡 + 两枚动作键 */
  .gen-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .gen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .gen-label {
    font-size: 14px;
    font-weight: 900;
    color: var(--text);
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  .diff-chips {
    display: flex;
    gap: 6px;
    flex: none;
  }

  .diff-chip {
    min-height: var(--ctl-sm);
    padding: 0 12px;
    cursor: pointer;
    font-size: var(--fs-xs);
    font-weight: 800;
    white-space: nowrap;
  }

  .diff-chip.active {
    background: var(--mint-edge);
    color: var(--mint-ink);
  }

  .diff-chip.active::before {
    background: var(--face-jade);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.45),
      inset 0 -2px 0 rgba(10, 119, 107, 0.25);
  }

  .gen-actions {
    display: flex;
    gap: var(--space-2);
  }

  .action-btn {
    flex: 1;
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    color: var(--text);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .seed-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: var(--mat-block-shadow);
  }

  .invite-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .invite-code {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }

  .invite-code b {
    color: var(--coral-edge);
    font-weight: 900;
    letter-spacing: 1px;
  }

  .invite-btns {
    display: flex;
    gap: 6px;
  }

  .seed-input-row {
    display: flex;
    gap: 8px;
  }

  .seed-input {
    flex: 1;
    min-width: 0;
    height: var(--ctl-md);
    padding: 0 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--line-bright);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
    font-size: var(--ctl-font-sm);
    font-weight: 600;
    color: var(--text);
  }

  .seed-input::placeholder {
    color: var(--muted-2);
  }

  .seed-input:focus {
    border-color: var(--coral-text);
    outline: none;
  }

  /* 载入：白面厚键 */
  .load-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    padding: 0 14px;
    height: var(--ctl-md);
    border-radius: var(--r-sm);
    border: 2px solid var(--line);
    background: var(--mat-block);
    box-shadow: 0 3px 0 #d9eefb;
    color: var(--text);
    transition:
      color 0.12s ease,
      border-color 0.12s ease;
  }

  .load-btn:hover {
    color: var(--coral-edge);
    border-color: var(--coral-text);
  }

  /* 复制 / 分享：小号白面药丸（形态来自 .g-btn） */
  .mini-btn {
    min-height: var(--ctl-md);
    padding: 0 10px;
    cursor: pointer;
    font-size: var(--fs-xs);
    font-weight: 800;
    white-space: nowrap;
  }

  @media (pointer: coarse) {
    .endless-trigger-btn {
      min-height: var(--ctl-md);
    }
  }
</style>
