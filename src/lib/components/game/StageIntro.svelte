<script lang="ts">
  /**
   * 关卡入场卡：切换关卡时在画布中央压一张短促的「关卡名 + 一行目标」白卡。
   * 1.4 秒后自动淡出；点一下可提前跳过。纯演出，不拦截操作（pointer-events 只在卡片上）。
   */
  import { CHAPTERS } from '../../game/levels';
  import { engine } from '../../game/engine.svelte';

  /** 当前展示的关卡 id（null = 不展示） */
  let shownId: string | null = $state(null);
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const chapterName = $derived.by(() => {
    if (engine.endless) return '周天无尽 · 演武';
    if (engine.sandbox) return '万象演道 · 沙盒';
    return CHAPTERS.find((c) => c.id === engine.level?.chapter)?.name ?? '周天星图';
  });

  const levelName = $derived(
    engine.endless ? '第 ' + engine.endlessWave + ' 波' : (engine.level?.name ?? '自由星轨'),
  );

  /** 一行目标：说人话，不复述参数（参数由引导条负责） */
  const goalLine = $derived.by(() => {
    if (!engine.level) return '';
    if (engine.endless) return '收集 35% 以上即可过波';
    return '收满 ' + engine.total + ' 个点 · 三星线 90%';
  });

  function dismiss(): void {
    visible = false;
    clearTimeout(timer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (shownId = null), 320);
  }

  function show(): void {
    shownId = engine.level?.id ?? null;
    if (!shownId) return;
    // 新手教程期间不叠加第二张卡，避免两个浮层抢注意力
    if (!engine.flags['tutorialSeen']) return;
    clearTimeout(timer);
    clearTimeout(hideTimer);
    visible = true;
    timer = setTimeout(dismiss, 1400);
  }

  // 关卡切换（含首次进入）时播放一次
  let lastId = '';
  $effect(() => {
    const id = engine.level?.id ?? '';
    if (!id || id === lastId) return;
    lastId = id;
    show();
  });

  $effect(() => () => {
    clearTimeout(timer);
    clearTimeout(hideTimer);
  });
</script>

{#if shownId}
  <div
    class="stage-intro"
    class:visible
    class:reduce={!!engine.flags.reduceMotion}
    role="presentation"
    onclick={dismiss}
    onkeydown={(e) => e.key === 'Escape' && dismiss()}
  >
    <div class="intro-card">
      <span class="intro-chapter">{chapterName}</span>
      <span class="intro-name">{levelName}</span>
      {#if goalLine}
        <span class="intro-goal">{goalLine}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* ============================================================
   * 关卡入场卡 · 白卡居中（第十四轮）
   * 遮罩 = --scrim（深蓝天鹅绒，不是黑）；卡片 = 白卡 + 大圆角 + 硬投影。
   * 不挡操作：整层 pointer-events:none，只有卡片本身可点。
   * ============================================================ */
  .stage-intro {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    background: var(--scrim);
    opacity: 0;
    transition: opacity 0.28s ease;
    z-index: 12;
    pointer-events: none;
  }
  .stage-intro.visible {
    opacity: 1;
  }

  .intro-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 36px;
    border: 3px solid #ffffff;
    border-radius: var(--r-xl);
    background: var(--mat-plate);
    box-shadow: var(--sh-3);
    transform: scale(0.92);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    cursor: pointer;
  }
  .stage-intro.visible .intro-card {
    transform: scale(1);
  }

  /* 章节名：珊瑚小字 + 两侧短线（用小圆头短线代替金属翼） */
  .intro-chapter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-round);
    font-size: var(--fs-sm);
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--coral-edge);
  }
  .intro-chapter::before,
  .intro-chapter::after {
    content: '';
    width: 18px;
    height: 2px;
    border-radius: var(--r-pill);
    background: var(--coral-bright);
  }

  .intro-name {
    font-family: var(--font-round);
    font-size: 28px;
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: 1px;
    color: var(--text);
  }

  /* 一行目标：薄荷药丸 */
  .intro-goal {
    margin-top: 2px;
    padding: 3px 12px;
    border: 2px solid var(--note-edge);
    border-radius: var(--r-pill);
    background: var(--note-bg);
    color: var(--mint-ink);
    font-family: var(--font-round);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  /* 减弱动态效果：只淡入淡出，不做缩放位移 */
  .stage-intro.reduce,
  .stage-intro.reduce .intro-card {
    transform: none;
    transition: opacity 0.2s ease;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .intro-card {
      padding: 18px 24px;
      border-radius: var(--r-lg);
    }
    .intro-name {
      font-size: 24px;
      letter-spacing: 0.5px;
    }
    .intro-goal {
      font-size: var(--fs-xs);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .intro-card {
      transform: none;
      transition: none;
    }
  }
  :global(.reduce-motion) .intro-card {
    transform: none;
    transition: none;
  }
</style>
