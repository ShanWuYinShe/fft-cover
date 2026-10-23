<script lang="ts">
  import Icon from './Icon.svelte';
  import { LEVEL_DEFS } from '../game/levels';
  import { engine } from '../game/engine.svelte';
  import { uiState } from '../stores/uiState.svelte';
  /** 页脚版本号与 package.json 同源，避免手写字面量漂移 */
  import { version } from '../../../package.json';

  let { onstart }: { onstart: () => void } = $props();

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );
  const expertCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.expertClears[d.id] ? 1 : 0), 0),
  );
  const hasProgress = $derived(totalStars > 0 || engine.dailyStreak.streak > 0);
  /** 全局朱印进度（与「本关目标」同一套判定） */
  const seals = $derived(engine.sealSummary);

  /** 关闭标题页统一走 App 传入的 onstart（即 uiState.showTitle = false） */
  function closeTitle(): void {
    onstart();
  }

  /** 主命令：进入游戏（文案人话化，不再用「启天动轨」） */
  function start(): void {
    closeTitle();
  }

  /** 周天星图：开抽屉并收起标题页 */
  function openStarMap(): void {
    uiState.starMapOpen = true;
    closeTitle();
  }

  /** 成就与图鉴 */
  function openAchv(): void {
    uiState.showAchv = true;
    closeTitle();
  }

  /** 浑天典仪（设置） */
  function openSettings(): void {
    uiState.showSettings = true;
    closeTitle();
  }
</script>

<!-- 游戏主菜单（糖果星域版）：天空场景 + 贴纸标题 + 白卡菜单
     入场：logo 1.06→1 收缩 → 菜单四项逐条上移 8px 淡入（60ms 错峰）→ 三步上手 → 页脚
     动效只走 transform / opacity，振幅 ≤8px、缩放 ≤1.08 -->
<div class="title-screen">
  <!-- 背景演出：糖果星球 + 缓慢旋转的珊瑚轨道（无扫描线/暗角堆料） -->
  <div class="ts-sky" aria-hidden="true">
    <span class="ts-ring"></span>
  </div>

  <div class="ts-scroll">
    <div class="ts-console">
      <!-- 品牌区 -->
      <header class="ts-brand">
        <span class="ts-eyebrow">浑天璇玑 · 傅立叶级数</span>
        <h1 class="ts-name">
          傅立叶指针<span class="g-seal ts-seal" title="朱印：旋">旋</span>
        </h1>
        <p class="ts-sub">转动连杆拟合日月星轨，聆听谐波共鸣之律</p>
      </header>

      <!-- 主菜单：第一项是唯一的金色主按钮，其余安静 -->
      <nav class="ts-menu" aria-label="主菜单">
        <button type="button" class="g-btn g-btn--primary ts-item ts-item--main" onclick={start}>
          <span class="ts-glyph g-socket"><Icon name="play" size={16} /></span>
          <span class="ts-label">进入游戏</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openStarMap}>
          <span class="ts-glyph g-socket"><Icon name="map" size={16} /></span>
          <span class="ts-label">周天星图 · 关卡选择</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openAchv}>
          <span class="ts-glyph g-socket"><Icon name="trophy" size={16} /></span>
          <span class="ts-label">成就与图鉴</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openSettings}>
          <span class="ts-glyph g-socket"><Icon name="gear" size={16} /></span>
          <span class="ts-label">浑天典仪 · 设置</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>
      </nav>

      <!-- 三步上手：一行一步，让第一次玩的人 3 秒看懂。
           有进度（星/连胜）的回访玩家看下方战绩行，不再看新手三步 -->
      {#if !hasProgress}
        <section class="ts-steps" aria-labelledby="ts-steps-title">
          <h2 class="ts-steps-title" id="ts-steps-title">三步上手</h2>
          <ol class="ts-steps-list">
            <li>调半径，让紫色轨迹贴上金色虚线</li>
            <li>点「开始旋转」，指针扫过点就能收</li>
            <li>收得越多，结算的星越多</li>
          </ol>
        </section>
      {/if}

      <!-- 战绩：无进度时整行隐藏（沿用原有逻辑），纯文字不套盒子 -->
      {#if hasProgress}
        <div class="ts-record" role="group" aria-label="战绩统计">
          <span class="ts-stat"><b>{totalStars}</b>/{LEVEL_DEFS.length * 3} 星</span>
          <span class="ts-stat" title="四枚朱印：星 / 满 / 准 / 专">
            <Icon name="gem" size={12} /><b>{seals.done}</b>/{seals.total} 朱印
          </span>
          {#if seals.chapters > 0}
            <span class="ts-stat">{seals.chapters}/{seals.chaptersTotal} 章节大印</span>
          {/if}
          {#if perfectCount > 0}
            <span class="ts-stat"><Icon name="crown" size={12} /><b>{perfectCount}</b> 完美</span>
          {/if}
          {#if exactCount > 0}
            <span class="ts-stat"><Icon name="target" size={12} /><b>{exactCount}</b> 精确解</span>
          {/if}
          {#if expertCount > 0}
            <span class="ts-stat"><Icon name="flag" size={12} /><b>{expertCount}</b> 专家</span>
          {/if}
          {#if engine.dailyStreak.streak > 0}
            <span class="ts-stat">
              <Icon name="flame" size={12} /><b>{engine.dailyStreak.streak}</b> 连胜
            </span>
          {/if}
        </div>
      {/if}

      <!-- 页脚：版本号铭牌 -->
      <footer class="ts-foot">
        <span class="ts-ver">v{version} · 浑天璇玑 © 2026</span>
      </footer>
    </div>
  </div>
</div>

<style>
  /* ============================================================
   * 标题页：天空场景 + 糖果贴纸标题 + 白卡菜单
   * 背景是 body 同款天空渐变（TitleScreen 盖在游戏层之上，必须自带底色）
   * ============================================================ */
  .title-screen {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--bg);
    background-image:
      var(--tex-nebula), linear-gradient(178deg, #bfe3ff 0%, #d9f0ff 52%, #fff6de 100%);
    background-attachment: fixed;
    animation: ts-in 0.35s ease-out;
  }

  @keyframes ts-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ---------- 背景：一层缓慢旋转的珊瑚轨道 + 两颗糖果星球 ---------- */
  .ts-sky {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .ts-sky::before {
    content: '';
    position: absolute;
    top: max(-14vmin, -160px);
    right: max(-10vmin, -110px);
    width: min(48vmin, 460px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 36% 32%, #fffbe8 0%, #ffe3ae 52%, #ffc98a 100%);
    opacity: 0.9;
  }

  .ts-sky::after {
    content: '';
    position: absolute;
    left: max(-6vmin, -70px);
    bottom: max(8vmin, 40px);
    width: min(22vmin, 220px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 30%, #d8fff2 0%, #6fe0bf 56%, #2fc79b 100%);
    opacity: 0.55;
  }

  .ts-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(112vmin, 900px);
    height: min(112vmin, 900px);
    border: 2px dashed rgba(255, 122, 69, 0.28);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: ts-orbit 150s linear infinite;
  }

  @keyframes ts-orbit {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  /* ---------- 居中容器（矮视口靠滚动兜底，不裁切） ---------- */
  .ts-scroll {
    position: relative;
    z-index: 1;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px 40px;
  }

  .ts-console {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 22px;
    width: min(680px, 100%);
  }

  /* ---------- 品牌区：贴纸标题 ---------- */
  .ts-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    animation: ts-logo-in 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes ts-logo-in {
    from {
      opacity: 0;
      transform: scale(1.06);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .ts-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 6px 16px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 2px solid #ffffff;
    box-shadow: var(--sh-1);
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 2px;
    color: var(--coral-edge);
  }

  .ts-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 0;
    font-family: var(--font-round);
    font-size: clamp(44px, 9vw, 72px);
    line-height: 1.05;
    letter-spacing: 2px;
    font-weight: 900;
    color: var(--text);
    white-space: nowrap;
    text-shadow:
      0 4px 0 #ffffff,
      0 10px 20px rgba(56, 116, 150, 0.18);
  }

  /* 珊瑚方印：标题右侧的糖果印章 */
  .ts-name .ts-seal {
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-height: 0;
    padding: 0;
    font-family: var(--font-round);
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1;
    color: var(--coral-ink);
    background: var(--face-gold-plate);
    border: 3px solid #ffffff;
    border-radius: var(--r-sm);
    box-shadow: 0 4px 0 var(--coral-edge);
    transform: rotate(-8deg);
  }

  /* 副标题：白药丸，两侧糖果短线 */
  .ts-sub {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0;
    padding: 9px 20px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    box-shadow: var(--sh-1);
    font-size: 15px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .ts-sub::before,
  .ts-sub::after {
    content: '';
    flex: 0 0 auto;
    width: 22px;
    height: 3px;
    border-radius: 2px;
    background: var(--line-bright);
  }

  /* ---------- 菜单：白卡大按键，主操作是唯一珊瑚块 ---------- */
  .ts-menu {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ts-menu .ts-item {
    position: relative;
    width: 100%;
    min-height: calc(var(--ctl-menu) + 6px);
    justify-content: flex-start;
    gap: 12px;
    padding: 0 18px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.5px;
    border-radius: var(--r-lg);
    box-shadow: var(--sh-2);
    animation: ts-item-in 300ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .ts-menu .ts-item::before {
    border-radius: calc(var(--r-lg) - 2px);
  }

  .ts-menu .ts-item--main {
    min-height: calc(var(--ctl-menu) + 12px);
    font-size: 18px;
    letter-spacing: 1px;
    box-shadow: 0 14px 28px rgba(226, 85, 42, 0.26);
    animation-delay: 0ms;
  }

  /* 菜单四项逐条上移淡入：60ms 错峰 */
  .ts-menu .ts-item:nth-child(1) {
    animation-delay: 120ms;
  }
  .ts-menu .ts-item:nth-child(2) {
    animation-delay: 180ms;
  }
  .ts-menu .ts-item:nth-child(3) {
    animation-delay: 240ms;
  }
  .ts-menu .ts-item:nth-child(4) {
    animation-delay: 300ms;
  }

  @keyframes ts-item-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .ts-steps {
    animation: ts-late-in 320ms cubic-bezier(0.16, 1, 0.3, 1) 400ms backwards;
  }

  .ts-record {
    animation: ts-late-in 320ms cubic-bezier(0.16, 1, 0.3, 1) 460ms backwards;
  }

  .ts-foot {
    animation: ts-late-in 320ms cubic-bezier(0.16, 1, 0.3, 1) 520ms backwards;
  }

  @keyframes ts-late-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .ts-glyph,
  .ts-label {
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ts-item:hover .ts-glyph,
  .ts-item:hover .ts-label {
    transform: translateX(1px);
  }

  /* 按下：桌面用公共件的「面下沉 1px」，触屏额外给整块缩放反馈 */
  @media (pointer: coarse) {
    .ts-menu .ts-item:active:not(:disabled) {
      transform: scale(0.985);
    }
  }

  /* 左侧图标：嵌在 .g-socket 键槽里（尺寸/内凹来自公共件） */
  .ts-glyph {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }

  .ts-item--main .ts-glyph {
    background: rgba(255, 255, 255, 0.22);
    box-shadow: none;
    color: #ffffff;
  }

  .ts-label {
    flex: 1 1 auto;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ts-arrow {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    color: var(--muted);
    opacity: 0.8;
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ts-item:hover .ts-arrow {
    transform: translateX(2px);
  }

  .ts-item--main .ts-arrow {
    color: #ffffff;
    opacity: 0.9;
  }

  /* ---------- 三步上手：一张白卡说明面 ---------- */
  .ts-steps {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 16px 20px 18px;
    background: var(--mat-block);
    border: 3px solid #ffffff;
    border-radius: var(--r-lg);
    box-shadow: var(--sh-2);
  }

  .ts-steps-title {
    margin: 0;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 1px;
    color: var(--coral-edge);
  }

  .ts-steps-list {
    margin: 0;
    padding-left: 1.4em;
    width: 100%;
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.7;
    list-style: decimal;
  }

  .ts-steps-list li::marker {
    color: var(--coral-text);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
  }

  /* ---------- 战绩：白卡读数条 ---------- */
  .ts-record {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px 16px;
    padding: 12px 16px;
    background: var(--mat-block);
    border: 2px solid #ffffff;
    border-radius: var(--r-lg);
    box-shadow: var(--sh-1);
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .ts-stat {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-variant-numeric: tabular-nums;
  }

  .ts-stat b {
    font-size: 15px;
    font-weight: 900;
    color: var(--coral-edge);
  }

  /* 图标由 Icon 子组件渲染，需用 :global 才能染色 */
  .ts-stat :global(svg) {
    color: var(--coral-text);
  }

  /* ---------- 页脚 ---------- */
  .ts-foot {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ts-ver {
    font-size: 12px;
    letter-spacing: 0.5px;
    color: var(--muted);
    white-space: nowrap;
  }

  /* ---------- 移动端：收紧密度，保证三步上手也完整可见 ---------- */
  @media (max-width: 640px) {
    .ts-scroll {
      padding: 20px 12px 28px;
    }

    .ts-console {
      gap: 16px;
    }

    .ts-brand {
      gap: 10px;
    }

    .ts-eyebrow {
      font-size: 12px;
      letter-spacing: 1.5px;
    }

    .ts-name {
      font-size: clamp(38px, 10vw, 52px);
      letter-spacing: 1px;
      gap: 10px;
    }

    .ts-name .ts-seal {
      width: 34px;
      height: 34px;
      font-size: 18px;
    }

    .ts-sub {
      font-size: 13.5px;
      padding: 8px 14px;
    }

    .ts-menu {
      gap: 10px;
    }

    .ts-menu .ts-item {
      min-height: calc(var(--ctl-menu) + 2px);
      padding: 0 14px;
      font-size: 15px;
    }

    .ts-menu .ts-item--main {
      font-size: 16.5px;
    }

    .ts-steps {
      padding: 14px 16px 16px;
    }

    .ts-steps-list {
      font-size: 13.5px;
    }

    .ts-record {
      gap: 4px 12px;
      padding: 10px 12px;
    }
  }

  /* 矮视口（横屏手机 / 小窗）：压缩留白，靠滚动兜底 */
  @media (max-height: 700px) {
    .ts-console {
      gap: 14px;
    }

    .ts-sub {
      display: none;
    }
  }

  /* ---------- 减弱动态效果：位移/缩放/循环动画全关 ---------- */
  @media (prefers-reduced-motion: reduce) {
    .title-screen,
    .ts-ring,
    .ts-brand,
    .ts-menu .ts-item,
    .ts-steps,
    .ts-record,
    .ts-foot {
      animation: none;
    }

    .ts-menu .ts-item,
    .ts-glyph,
    .ts-label,
    .ts-arrow {
      transition: none;
    }

    .ts-menu .ts-item:active:not(:disabled) {
      transform: none;
    }

    .ts-item:hover .ts-glyph,
    .ts-item:hover .ts-label,
    .ts-item:hover .ts-arrow {
      transform: none;
    }
  }

  :global(.reduce-motion) .ts-ring,
  :global(.reduce-motion) .title-screen,
  :global(.reduce-motion) .ts-brand,
  :global(.reduce-motion) .ts-menu .ts-item,
  :global(.reduce-motion) .ts-steps,
  :global(.reduce-motion) .ts-record,
  :global(.reduce-motion) .ts-foot {
    animation: none;
  }

  :global(.reduce-motion) .ts-menu .ts-item,
  :global(.reduce-motion) .ts-glyph,
  :global(.reduce-motion) .ts-label,
  :global(.reduce-motion) .ts-arrow {
    transition: none;
  }
</style>
