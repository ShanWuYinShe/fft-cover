<script lang="ts">
  /**
   * 关卡入场卡：切换关卡时在画布中央压一张短促的「关卡名 + 一行目标」铭牌。
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
      <span class="intro-name font-celestial">{levelName}</span>
      {#if goalLine}
        <span class="intro-goal">{goalLine}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* 覆盖画布但不挡操作：只有卡片本身可点（点一下跳过） */
  .stage-intro {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(3, 6, 12, 0.72), transparent 70%);
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
    gap: 6px;
    padding: 14px 28px;
    border-radius: var(--r-md);
    /* 器物铭牌：青铜边 + 顶部金箔发丝（不再有铆钉，第七轮改右上角包角） */
    background: var(--mat-plate);
    border: none;
    box-shadow:
      inset 0 0 0 1px var(--edge-bronze-hot),
      inset 0 2px 0 -1px rgba(255, 209, 102, 0.5),
      var(--sh-game-lg);
    transform: scale(0.92);
    transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    cursor: pointer;
  }
  .stage-intro.visible .intro-card {
    transform: scale(1);
  }

  .intro-chapter {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    letter-spacing: 3px;
    color: var(--gold);
    font-weight: 700;
  }
  /* 铭牌两侧的云翼短线 */
  .intro-chapter::before,
  .intro-chapter::after {
    content: '';
    width: 16px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--edge-bronze-hot), transparent);
  }

  .intro-name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #fff;
    line-height: 1.1;
    text-shadow: 0 0 18px rgba(245, 184, 65, 0.35);
  }

  .intro-goal {
    padding: 2px 10px;
    border-radius: 3px;
    background: var(--face-jade);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #9df0d8;
    font-size: var(--ctl-font-sm);
    letter-spacing: 1px;
  }

  /* 减弱动态效果：只淡入淡出，不做缩放位移 */
  .stage-intro.reduce .intro-card {
    transform: none;
    transition: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .intro-card {
      padding: 14px 24px;
    }
    .intro-name {
      font-size: 26px;
      letter-spacing: 3px;
    }
    .intro-goal {
      font-size: 12px;
    }
  }
</style>
