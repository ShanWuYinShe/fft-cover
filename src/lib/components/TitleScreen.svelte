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

  /** 主命令：无进度时启天动轨，有进度时继续观测 */
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

<!-- 游戏主菜单：背景演出 + 座舱面板（品牌区 → 菜单 → 战绩 → 页脚） -->
<div class="title-screen">
  <!-- 背景演出：三层缓慢旋转的浑天环 + 星点 + 扫描线（纯 CSS，无外部资源） -->
  <div class="ts-sky" aria-hidden="true">
    <span class="ts-ring ts-ring--ticks"></span>
    <span class="ts-ring ts-ring--outer"></span>
    <span class="ts-ring ts-ring--inner"></span>
    <span class="ts-glow"></span>
    <span class="ts-stars"></span>
    <span class="ts-veil g-scanlines"></span>
    <span class="ts-vignette"></span>
  </div>

  <div class="ts-scroll">
    <div class="ts-console g-corners">
      <span class="g-corner tl" aria-hidden="true"></span>
      <span class="g-corner tr" aria-hidden="true"></span>
      <span class="g-corner bl" aria-hidden="true"></span>
      <span class="g-corner br" aria-hidden="true"></span>

      <!-- 座舱状态条：装饰性铭牌，切分面板顶部（纯装饰，不进读屏） -->
      <div class="ts-rail" aria-hidden="true">
        <span class="ts-rail-left">
          <span class="g-lamp g-lamp--cyan"></span>
          <span class="g-label ts-rail-text">浑天座舱</span>
        </span>
        <span class="g-label g-label--dim ts-rail-text">就绪</span>
      </div>

      <!-- 品牌区 -->
      <header class="ts-brand">
        <span class="ts-eyebrow g-label">浑天璇玑 · 傅立叶级数</span>
        <h1 class="ts-name">
          傅立叶指针<span class="ts-seal" title="朱印：旋">旋</span>
        </h1>
        <p class="ts-sub">转动连杆拟合日月星轨，聆听谐波共鸣之律</p>
        <span class="g-divider ts-rule"></span>
      </header>

      <!-- 主菜单：四行整宽按键，主命令金色 -->
      <nav class="ts-menu" aria-label="主菜单">
        <button type="button" class="g-btn g-btn--primary ts-item ts-item--main" onclick={start}>
          <span class="ts-glyph"><Icon name="play" size={18} /></span>
          <span class="ts-label">{hasProgress ? '继续观测' : '启天动轨'}</span>
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

      <!-- 机务提示：保留原有玩法引导文案，改成座舱提示条 -->
      <p class="ts-hint">
        <span class="ts-hint-icon"><Icon name="bulb" size={13} /></span>
        以旋转指针首尾相连——在天穹画布上绘制谐和曲线，感应天地算法之美
      </p>

      <!-- 战绩：无进度时整行隐藏（沿用原有逻辑） -->
      {#if hasProgress}
        <div class="ts-record" role="group" aria-label="战绩统计">
          <div class="ts-chip">
            <b class="g-num g-num--gold">{totalStars}</b>
            <i class="g-label g-label--dim">/{LEVEL_DEFS.length * 3} 星</i>
          </div>
          <div class="ts-chip" title="四枚朱印：星 / 满 / 准 / 专">
            <span class="ts-chip-icon"><Icon name="gem" size={13} /></span>
            <b class="g-num g-num--gold">{seals.done}</b>
            <i class="g-label g-label--dim">/{seals.total} 朱印</i>
          </div>
          {#if seals.chapters > 0}
            <div class="ts-chip" title="章节印：一章四印集齐">
              <b class="g-num g-num--gold">{seals.chapters}</b>
              <i class="g-label g-label--dim">/{seals.chaptersTotal} 章节大印</i>
            </div>
          {/if}
          {#if perfectCount > 0}
            <div class="ts-chip">
              <span class="ts-chip-icon"><Icon name="crown" size={13} /></span>
              <b class="g-num g-num--gold">{perfectCount}</b>
              <i class="g-label g-label--dim">完美</i>
            </div>
          {/if}
          {#if exactCount > 0}
            <div class="ts-chip">
              <span class="ts-chip-icon"><Icon name="target" size={13} /></span>
              <b class="g-num g-num--gold">{exactCount}</b>
              <i class="g-label g-label--dim">精确解</i>
            </div>
          {/if}
          {#if expertCount > 0}
            <div class="ts-chip">
              <span class="ts-chip-icon"><Icon name="flag" size={13} /></span>
              <b class="g-num g-num--gold">{expertCount}</b>
              <i class="g-label g-label--dim">专家</i>
            </div>
          {/if}
          {#if engine.dailyStreak.streak > 0}
            <div class="ts-chip">
              <span class="ts-chip-icon"><Icon name="flame" size={13} /></span>
              <b class="g-num g-num--gold">{engine.dailyStreak.streak}</b>
              <i class="g-label g-label--dim">连胜</i>
            </div>
          {/if}
        </div>
      {/if}

      <!-- 页脚：版本号铭牌 -->
      <footer class="ts-foot">
        <span class="g-lamp g-lamp--cyan"></span>
        <span class="ts-ver">v{version} · 浑天璇玑 © 2026 傅立叶级数工坊</span>
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
    animation: ts-in 0.45s ease-out;
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

  /* ---------- 背景演出层（固定，不随内容滚动） ---------- */
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
    border-radius: 50%;
    transform: translate(-50%, -50%);
    will-change: transform;
  }

  /* 外环：刻度圈（mask 挖空中心，得到环形刻度带） */
  .ts-ring--ticks {
    width: min(152vmin, 1240px);
    height: min(152vmin, 1240px);
    background: repeating-conic-gradient(
      from 0deg,
      rgba(245, 184, 65, 0.34) 0deg 0.3deg,
      transparent 0.3deg 3deg
    );
    -webkit-mask: radial-gradient(
      circle,
      transparent 65.4%,
      #000 65.6%,
      #000 66.4%,
      transparent 66.6%
    );
    mask: radial-gradient(circle, transparent 65.4%, #000 65.6%, #000 66.4%, transparent 66.6%);
    animation: ts-orbit 150s linear infinite;
  }

  /* 中环：暗金虚线圆 */
  .ts-ring--outer {
    width: min(112vmin, 900px);
    height: min(112vmin, 900px);
    border: 1px dashed rgba(245, 184, 65, 0.22);
    box-shadow: 0 0 60px rgba(245, 184, 65, 0.06) inset;
    animation: ts-orbit-rev 120s linear infinite;
  }

  /* 内环：青色能量圈 */
  .ts-ring--inner {
    width: min(74vmin, 600px);
    height: min(74vmin, 600px);
    border: 1px solid rgba(0, 245, 212, 0.14);
    box-shadow:
      0 0 80px rgba(0, 245, 212, 0.08),
      0 0 40px rgba(245, 184, 65, 0.06) inset;
    animation: ts-orbit 90s linear infinite;
  }

  @keyframes ts-orbit {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  @keyframes ts-orbit-rev {
    from {
      transform: translate(-50%, -50%) rotate(360deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(0deg);
    }
  }

  /* 中心金雾 */
  .ts-glow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(120vmin, 900px);
    height: min(120vmin, 900px);
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      rgba(245, 184, 65, 0.14) 0%,
      rgba(245, 184, 65, 0.05) 38%,
      transparent 68%
    );
  }

  /* 星点：多层 radial-gradient 铺底，缓慢呼吸 */
  .ts-stars {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(1.4px 1.4px at 12% 22%, rgba(255, 255, 255, 0.7), transparent),
      radial-gradient(1.2px 1.2px at 28% 68%, rgba(245, 184, 65, 0.6), transparent),
      radial-gradient(1px 1px at 44% 14%, rgba(255, 255, 255, 0.5), transparent),
      radial-gradient(1.6px 1.6px at 62% 78%, rgba(0, 245, 212, 0.5), transparent),
      radial-gradient(1px 1px at 78% 34%, rgba(255, 255, 255, 0.55), transparent),
      radial-gradient(1.3px 1.3px at 88% 62%, rgba(245, 184, 65, 0.5), transparent),
      radial-gradient(1px 1px at 8% 84%, rgba(255, 255, 255, 0.4), transparent),
      radial-gradient(1.2px 1.2px at 52% 46%, rgba(255, 255, 255, 0.35), transparent),
      radial-gradient(1px 1px at 70% 8%, rgba(255, 255, 255, 0.45), transparent);
    animation: ts-twinkle 7s ease-in-out infinite alternate;
  }

  @keyframes ts-twinkle {
    from {
      opacity: 0.45;
    }
    to {
      opacity: 0.95;
    }
  }

  .ts-veil {
    position: absolute;
    inset: 0;
    opacity: 0.6;
  }

  .ts-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 48%, transparent 38%, rgba(0, 0, 0, 0.72) 100%);
  }

  /* ---------- 可滚动居中容器（矮视口下不裁切内容） ---------- */
  .ts-scroll {
    position: relative;
    z-index: 1;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

  /* ---------- 座舱面板 ---------- */
  .ts-console {
    position: relative;
    width: min(520px, 100%);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 14px 24px 16px;
    background: linear-gradient(180deg, rgba(11, 18, 32, 0.94) 0%, rgba(5, 8, 15, 0.97) 100%);
    border: 1px solid var(--edge-soft);
    border-radius: 16px;
    box-shadow:
      var(--sh-game-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.07);
    animation: ts-console-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ts-console-in {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  /* 顶部状态条 */
  .ts-rail {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--edge-faint);
  }

  .ts-rail-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* 铭牌字距靠 letter-spacing，避免 DOM 里塞空格影响读屏 */
  .ts-rail-text {
    letter-spacing: 3px;
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
    letter-spacing: 5px;
    text-shadow: 0 0 10px rgba(245, 184, 65, 0.35);
  }

  .ts-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0;
    font-size: clamp(32px, 8vw, 50px);
    line-height: 1.15;
    letter-spacing: 8px;
    font-weight: 800;
    white-space: nowrap;
    background: linear-gradient(135deg, #fff7d6 0%, #ffd166 40%, #f5b841 75%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 6px 26px rgba(245, 184, 65, 0.35));
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
    box-shadow:
      inset 0 0 0 1px #991b1b,
      0 3px 12px rgba(217, 43, 43, 0.45);
    filter: none;
  }

  .ts-sub {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--muted);
    letter-spacing: 1.5px;
  }

  .ts-rule {
    width: 100%;
    margin: 6px 0 0;
  }

  /* ---------- 菜单：机箱凹槽里的四枚厚按键 ---------- */
  .ts-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.9), rgba(8, 12, 22, 0.72));
    border: 1px solid var(--edge-faint);
    box-shadow: var(--bevel-inset);
  }

  .ts-menu .ts-item {
    width: 100%;
    min-height: 54px;
    justify-content: flex-start;
    gap: 12px;
    padding: 0 14px;
    font-size: 15px;
    letter-spacing: 3px;
  }

  .ts-menu .ts-item--main {
    min-height: 58px;
    font-size: 17px;
    letter-spacing: 4px;
    animation: ts-main-pulse 2.8s ease-in-out infinite;
  }

  @keyframes ts-main-pulse {
    0%,
    100% {
      filter: drop-shadow(0 0 0 rgba(245, 184, 65, 0));
    }
    50% {
      filter: drop-shadow(0 0 14px rgba(245, 184, 65, 0.55));
    }
  }

  /* 左侧图标格：嵌进按键的方槽 */
  .ts-glyph {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    color: var(--gold);
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.5), rgba(255, 255, 255, 0.03));
    border: 1px solid var(--edge-faint);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .ts-item--main .ts-glyph {
    color: #4a2c02;
    background: linear-gradient(180deg, rgba(60, 32, 0, 0.22), rgba(255, 255, 255, 0.22));
    border-color: rgba(90, 50, 0, 0.45);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
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
    color: var(--gold-bright);
    opacity: 0.7;
    transition:
      transform 0.12s ease,
      opacity 0.12s ease;
  }

  .ts-item:hover .ts-arrow {
    opacity: 1;
    transform: translateX(3px);
  }

  .ts-item--main .ts-arrow {
    color: #4a2c02;
    opacity: 0.85;
  }

  .ts-item:focus-visible {
    outline: 2px solid var(--edge-hot);
    outline-offset: 3px;
  }

  /* ---------- 机务提示条 ---------- */
  .ts-hint {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    padding: 8px 10px;
    font-size: var(--fs-sm);
    line-height: 1.6;
    color: rgba(226, 232, 240, 0.68);
    letter-spacing: 0.5px;
    border-radius: 8px;
    background: rgba(0, 245, 212, 0.04);
    border: 1px solid rgba(0, 245, 212, 0.12);
  }

  .ts-hint-icon {
    flex: 0 0 auto;
    display: inline-flex;
    margin-top: 2px;
    color: var(--cyan);
  }

  /* ---------- 战绩徽章行 ---------- */
  .ts-record {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 8px;
  }

  .ts-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(9, 14, 24, 0.95), rgba(4, 7, 13, 0.95));
    border: 1px solid var(--edge-faint);
    box-shadow:
      var(--bevel-top),
      0 2px 0 rgba(0, 0, 0, 0.5);
  }

  .ts-chip b {
    font-size: 17px;
  }

  .ts-chip i {
    font-size: 10px;
    letter-spacing: 1px;
  }

  .ts-chip-icon {
    display: inline-flex;
    align-self: center;
    color: var(--gold);
  }

  /* ---------- 页脚 ---------- */
  .ts-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--edge-faint);
  }

  .ts-ver {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--muted-2);
    white-space: nowrap;
  }

  /* ---------- 移动端：收紧密度，保证四行菜单完整可见 ---------- */
  @media (max-width: 640px) {
    .ts-scroll {
      padding: 16px 12px;
    }

    .ts-console {
      padding: 12px 14px 14px;
      gap: 12px;
      border-radius: 14px;
    }

    .ts-eyebrow {
      letter-spacing: 4px;
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
      padding: 8px;
    }

    .ts-menu .ts-item {
      min-height: 50px;
      font-size: 14px;
      letter-spacing: 1.5px;
      gap: 10px;
      padding: 0 10px;
    }

    .ts-menu .ts-item--main {
      min-height: 54px;
      font-size: 16px;
      letter-spacing: 2px;
    }

    .ts-glyph {
      width: 30px;
      height: 30px;
    }

    .ts-chip b {
      font-size: 15px;
    }
  }

  /* 矮视口（横屏手机 / 小窗）：进一步压缩，靠滚动兜底 */
  @media (max-height: 700px) {
    .ts-console {
      gap: 10px;
      padding-top: 10px;
    }

    .ts-sub {
      display: none;
    }

    .ts-menu .ts-item {
      min-height: 46px;
    }

    .ts-menu .ts-item--main {
      min-height: 50px;
    }

    .ts-hint {
      display: none;
    }
  }

  /* 尊重「减弱动态效果」 */
  @media (prefers-reduced-motion: reduce) {
    .title-screen,
    .ts-console,
    .ts-ring,
    .ts-stars,
    .ts-menu .ts-item--main {
      animation: none;
    }
  }

  :global(.reduce-motion) .ts-ring,
  :global(.reduce-motion) .ts-stars,
  :global(.reduce-motion) .ts-console,
  :global(.reduce-motion) .ts-item--main {
    animation: none;
  }
</style>
