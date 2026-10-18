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

<!-- 游戏主菜单（降噪版）：背景只留一层浑天环，前景只有主按钮发光
     结构：品牌区 → 菜单 → 三步上手 → 战绩 → 页脚 -->
<div class="title-screen">
  <!-- 背景演出：单层缓慢旋转的浑天环（无星点/扫描线/暗角堆料） -->
  <div class="ts-sky" aria-hidden="true">
    <span class="ts-ring"></span>
  </div>

  <div class="ts-scroll">
    <div class="ts-console">
      <!-- 品牌区 -->
      <header class="ts-brand">
        <span class="ts-eyebrow">浑天璇玑 · 傅立叶级数</span>
        <h1 class="ts-name">
          傅立叶指针<span class="ts-seal" title="朱印：旋">旋</span>
        </h1>
        <p class="ts-sub">转动连杆拟合日月星轨，聆听谐波共鸣之律</p>
      </header>

      <!-- 主菜单：第一项是唯一的金色主按钮，其余安静 -->
      <nav class="ts-menu" aria-label="主菜单">
        <button type="button" class="g-btn g-btn--primary ts-item ts-item--main" onclick={start}>
          <span class="ts-glyph"><Icon name="play" size={18} /></span>
          <span class="ts-label">进入游戏</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openStarMap}>
          <span class="ts-glyph"><Icon name="map" size={17} /></span>
          <span class="ts-label">周天星图 · 关卡选择</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openAchv}>
          <span class="ts-glyph"><Icon name="trophy" size={17} /></span>
          <span class="ts-label">成就与图鉴</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>

        <button type="button" class="g-btn ts-item" onclick={openSettings}>
          <span class="ts-glyph"><Icon name="gear" size={17} /></span>
          <span class="ts-label">浑天典仪 · 设置</span>
          <span class="ts-arrow" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
        </button>
      </nav>

      <!-- 三步上手：一行一步，让第一次玩的人 3 秒看懂 -->
      <section class="ts-steps" aria-labelledby="ts-steps-title">
        <h2 class="ts-steps-title" id="ts-steps-title">三步上手</h2>
        <ol class="ts-steps-list">
          <li>调半径，让紫色轨迹贴上金色虚线</li>
          <li>点「开始旋转」，指针扫过点就能收</li>
          <li>收得越多，结算的星越多</li>
        </ol>
      </section>

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
  .title-screen {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow-x: hidden;
    overflow-y: auto;
    background: #04060c;
    animation: ts-in 0.35s ease-out;
    overscroll-behavior: contain;
  }

  @keyframes ts-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ---------- 背景：只留一层浑天环 ---------- */
  .ts-sky {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .ts-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(112vmin, 900px);
    height: min(112vmin, 900px);
    border: 1px dashed rgba(245, 184, 65, 0.2);
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
    padding: 24px 16px;
  }

  /* ---------- 面板：只有一层描边，安静的重心 ---------- */
  .ts-console {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: min(500px, 100%);
    padding: 22px 24px 18px;
    background: linear-gradient(180deg, #0c1424 0%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: 14px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.45);
  }

  /* ---------- 品牌区 ---------- */
  .ts-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }

  .ts-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    color: var(--gold);
  }

  .ts-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0;
    font-size: clamp(32px, 8vw, 48px);
    line-height: 1.15;
    letter-spacing: 8px;
    font-weight: 800;
    white-space: nowrap;
    background: linear-gradient(135deg, #fff7d6 0%, #ffd166 40%, #f5b841 75%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* 朱印：标题旁的方形印章（篆刻样式） */
  .ts-name .ts-seal {
    flex: 0 0 auto;
    width: 30px;
    height: 30px;
    line-height: 28px;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    background: linear-gradient(160deg, #d92b2b, #991b1b);
    -webkit-background-clip: initial;
    background-clip: initial;
    color: #ffffff;
    border-radius: 4px;
    border: 1px solid rgba(255, 200, 190, 0.4);
    box-shadow: inset 0 0 0 1px #991b1b;
  }

  .ts-sub {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--muted);
    letter-spacing: 1px;
  }

  /* ---------- 菜单：不再套凹槽盒子，靠间距分组 ---------- */
  .ts-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ts-menu .ts-item {
    width: 100%;
    min-height: 50px;
    justify-content: flex-start;
    gap: 12px;
    padding: 0 14px;
    font-size: 15px;
    letter-spacing: 2px;
    border-radius: 10px;
    /* 降噪：只留上高光 + 硬投影，去掉外发光 */
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 0 rgba(0, 0, 0, 0.5);
  }

  /* 主按钮：整页唯一的金光（一级元素） */
  .ts-menu .ts-item--main {
    min-height: 58px;
    font-size: 17px;
    letter-spacing: 4px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -3px 0 rgba(140, 80, 0, 0.5),
      0 3px 0 #7a4d05,
      0 6px 16px rgba(245, 184, 65, 0.32);
  }

  .ts-menu .ts-item:hover:not(.ts-item--main) {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      0 2px 0 rgba(0, 0, 0, 0.5);
  }

  .ts-menu .ts-item--main:hover {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -3px 0 rgba(140, 80, 0, 0.45),
      0 3px 0 #7a4d05,
      0 8px 20px rgba(245, 184, 65, 0.42);
  }

  .ts-menu .ts-item:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
  }

  /* 左侧图标：直接显示，不再套一格描边方槽 */
  .ts-glyph {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: var(--gold);
  }

  .ts-item--main .ts-glyph {
    color: #4a2c02;
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
    transition: transform 0.12s ease;
  }

  .ts-item:hover .ts-arrow {
    transform: translateX(2px);
  }

  .ts-item--main .ts-arrow {
    color: #4a2c02;
    opacity: 0.9;
  }

  .ts-item:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 3px;
  }

  /* ---------- 三步上手：一行一步，不带盒子 ---------- */
  .ts-steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-top: 1px solid var(--edge-faint);
  }

  .ts-steps-title {
    margin: 12px 0 2px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    color: var(--gold);
  }

  .ts-steps-list {
    margin: 0;
    padding-left: 1.5em;
    /* 三步上手是「怎么玩」的一级信息，用正文色而不是次要色 */
    color: var(--text);
    font-size: var(--fs-md);
    line-height: 1.65;
    list-style: decimal;
  }

  .ts-steps-list li::marker {
    color: var(--gold);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ---------- 战绩：纯文字行，不套芯片盒子 ---------- */
  .ts-record {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 14px;
    padding-top: 12px;
    border-top: 1px solid var(--edge-faint);
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .ts-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }

  .ts-stat b {
    font-size: 15px;
    font-weight: 800;
    color: var(--gold-bright);
  }

  /* 图标由 Icon 子组件渲染，需用 :global 才能染色 */
  .ts-stat :global(svg) {
    color: var(--gold);
  }

  /* ---------- 页脚 ---------- */
  .ts-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 10px;
    border-top: 1px solid var(--edge-faint);
  }

  .ts-ver {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--muted);
    white-space: nowrap;
  }

  /* ---------- 移动端：收紧密度，保证三步上手也完整可见 ---------- */
  @media (max-width: 640px) {
    .ts-scroll {
      padding: 16px 12px;
    }

    .ts-console {
      gap: 14px;
      padding: 16px 16px 14px;
      border-radius: 12px;
    }

    .ts-eyebrow {
      letter-spacing: 3px;
    }

    .ts-name {
      font-size: clamp(28px, 9.5vw, 40px);
      letter-spacing: 5px;
      gap: 8px;
    }

    .ts-name .ts-seal {
      width: 26px;
      height: 26px;
      line-height: 24px;
      font-size: 14px;
    }

    .ts-sub {
      font-size: 12px;
      letter-spacing: 1px;
    }

    .ts-menu {
      gap: 6px;
    }

    .ts-menu .ts-item {
      min-height: 46px;
      font-size: 14px;
      letter-spacing: 1px;
    }

    .ts-menu .ts-item--main {
      min-height: 52px;
      font-size: 16px;
      letter-spacing: 2px;
    }

    .ts-steps-list {
      font-size: var(--fs-sm);
      line-height: 1.6;
    }

    .ts-record {
      gap: 4px 10px;
    }
  }

  /* 矮视口（横屏手机 / 小窗）：压缩留白，靠滚动兜底 */
  @media (max-height: 700px) {
    .ts-console {
      gap: 10px;
      padding-top: 14px;
    }

    .ts-sub {
      display: none;
    }

    .ts-menu .ts-item {
      min-height: 44px;
    }

    .ts-menu .ts-item--main {
      min-height: 48px;
    }
  }

  /* 尊重「减弱动态效果」 */
  @media (prefers-reduced-motion: reduce) {
    .title-screen,
    .ts-ring {
      animation: none;
    }
  }

  :global(.reduce-motion) .ts-ring,
  :global(.reduce-motion) .title-screen {
    animation: none;
  }
</style>
