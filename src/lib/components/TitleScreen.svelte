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

<!-- 游戏主菜单（降噪版 + 入场编排）：背景只留一层浑天环，前景只有主按钮呼吸光
     入场：logo 1.15→1 收缩 → 菜单四项逐条上移 8px 淡入（60ms 错峰）→ 三步上手 → 页脚
     动效只走 transform / opacity，振幅 ≤8px、缩放 ≤1.15（仅 logo 一次性入场） -->
<div class="title-screen">
  <!-- 背景演出：单层缓慢旋转的浑天环（无星点/扫描线/暗角堆料） -->
  <div class="ts-sky" aria-hidden="true">
    <span class="ts-ring"></span>
  </div>

  <div class="ts-scroll">
    <div class="ts-console g-chamfer g-rivets">
      <!-- 回纹发丝标题条（纯装饰，左侧小方块铭牌用 ::before 画） -->
      <span class="ts-bar g-pattern-bar" aria-hidden="true"></span>

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
    padding: var(--space-6) var(--space-4);
  }

  /* ---------- 面板：只有一层描边，安静的重心 ---------- */
  /* 器物面板：切角铜边由 .g-chamfer 画（本体=铜边、::before=金属面），
     这里只管布局与内容安全边距 */
  /* 卡片内纵向节奏：全部走 --space-4（块间）/ --space-3（发丝线到文字）/
     --space-1（块内）/ --space-2（菜单行距），不留零散 px */
  .ts-console {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: min(500px, 100%);
    padding: var(--space-4) 22px var(--space-4);
  }

  /* 回纹发丝标题条：左侧一枚小方块铭牌 */
  .ts-bar {
    position: relative;
    display: block;
    height: 12px;
    opacity: 0.9;
  }

  .ts-bar::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3px;
    width: 6px;
    height: 6px;
    background: var(--bronze-bright);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  }

  /* ---------- 品牌区 ---------- */
  .ts-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
    /* 入场：logo 1.15 → 1 收缩 */
    animation: ts-logo-in 500ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  @keyframes ts-logo-in {
    from {
      opacity: 0;
      transform: scale(1.15);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .ts-menu .ts-item {
    animation: ts-item-in 300ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
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

  /* 朱印：真印面（.g-seal 给朱砂面 + 1px 亮边 + -2° 旋转），这里只把它压成方印 */
  /* 印面加深一档 + 字放大到 16px：原来 13px 白字在印面渐变最亮处只有 3.75:1，
     且字太小、笔画被抗锯齿糊掉；加深后印面全段 ≥4.5，字也占满印面更像真印 */
  .ts-name .ts-seal {
    flex: 0 0 auto;
    width: var(--ctl-xs);
    height: var(--ctl-xs);
    min-height: 0;
    padding: 0;
    justify-content: center;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: calc(var(--fs-lg) + 1px);
    letter-spacing: 0;
    line-height: 1;
    background: linear-gradient(180deg, #c8382c 0%, #a52218 55%, #7d120c 100%);
  }

  /* 副标题铭牌：两侧云翼短线（clip-path 三角翼，无新增 DOM/文案） */
  .ts-sub {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0;
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    letter-spacing: 1.5px;
    white-space: nowrap;
  }

  .ts-sub::before,
  .ts-sub::after {
    content: '';
    flex: 0 0 auto;
    width: 26px;
    height: 5px;
    background: linear-gradient(90deg, transparent, var(--bronze-bright));
    clip-path: polygon(0 50%, 100% 0, 100% 100%);
  }

  .ts-sub::after {
    transform: scaleX(-1);
  }

  /* ---------- 菜单：不再套凹槽盒子，靠间距分组 ---------- */
  .ts-menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .ts-menu .ts-item {
    position: relative;
    width: 100%;
    /* 桌面 42 / 触屏 48：主项比非主项高一档，统一由 --ctl-menu 派生 */
    min-height: calc(var(--ctl-menu) - 4px);
    justify-content: flex-start;
    gap: 10px;
    padding: 0 14px;
    font-size: var(--ctl-font);
    letter-spacing: 1px;
    /* 面/边/四态全部交给公共件 .g-btn（铜板键），这里只管排版与悬停位移 */
    transition: transform 90ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* 主按钮：牌匾（金箔面 + 右端宝石灯，全页唯一金光）——外观全部来自公共件 */
  .ts-menu .ts-item--main {
    min-height: var(--ctl-menu);
    font-size: calc(var(--ctl-font) + 2px);
    letter-spacing: 1.5px;
  }

  /* 牌匾右端宝石灯（公共件 .g-btn--primary::after）做唯一呼吸：只加 opacity 动画，
     不改它的位置/颜色，避免盖掉公共件 */
  .ts-menu .ts-item--main::after {
    animation: ts-breathe 2.8s ease-in-out infinite;
  }

  @keyframes ts-breathe {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
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

  /* 左侧图标：嵌在 .g-socket 键槽里（尺寸/内凹/描边都来自公共件） */
  .ts-glyph {
    flex: 0 0 auto;
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
    color: #4a2c02;
    opacity: 0.9;
  }

  /* 键盘焦点：不用 outline（会被 clip-path 切掉），走公共件的铜边变金 + 面提亮 */

  /* ---------- 三步上手：一行一步，不带盒子 ---------- */
  /* 对齐语言统一为「居中」：卡片其余部分（品牌区、菜单、页脚）都以卡片中线为轴，
     这里也把小标题与清单块居中；清单文字本身仍左对齐——步骤句长短不一，
     文字居中会让换行后的行首参差，块居中则既对齐重心又保住可读性 */
  .ts-steps {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    border-top: 1px solid var(--edge-faint);
  }

  .ts-steps-title {
    margin: var(--space-3) 0 var(--space-1);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    color: var(--gold);
  }

  .ts-steps-list {
    margin: 0;
    padding-left: 1.5em;
    /* 清单块按最长一行收窄并居中，换行时仍从同一左边缘起排 */
    width: fit-content;
    max-width: 100%;
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
    padding-top: var(--space-3);
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
  /* 上间距与「三步上手」的发丝线同档（--space-3），两处节奏一致 */
  .ts-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: var(--space-3);
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
      padding: 14px 16px 14px;
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
    }

    .ts-sub {
      font-size: 12px;
      letter-spacing: 1px;
    }

    .ts-menu {
      gap: 6px;
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
  }

  /* ---------- 减弱动态效果：位移/缩放/循环动画全关（元素回落到最终态） ---------- */
  @media (prefers-reduced-motion: reduce) {
    .title-screen,
    .ts-ring,
    .ts-brand,
    .ts-menu .ts-item,
    .ts-steps,
    .ts-record,
    .ts-foot,
    .ts-menu .ts-item--main::after {
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
  :global(.reduce-motion) .ts-foot,
  :global(.reduce-motion) .ts-menu .ts-item--main::after {
    animation: none;
  }

  :global(.reduce-motion) .ts-menu .ts-item,
  :global(.reduce-motion) .ts-glyph,
  :global(.reduce-motion) .ts-label,
  :global(.reduce-motion) .ts-arrow {
    transition: none;
  }
</style>
