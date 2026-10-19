<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { uiState } from '../../stores/uiState.svelte';

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const maxStars = LEVEL_DEFS.length * 3;
  /** 星图开关状态：开时入口高亮 */
  const smOpen = $derived(uiState.starMapOpen);
</script>

<!--
  顶部 HUD：只保留三件事——「去星图」「回到主菜单」「成就 / 设置」。
  本关朱印进度在画布 HUD（贴近玩法），章节星数在星图入口上，不在这里重复。
-->
<header class="game-hud-bar">
  <div class="hud-left">
    <button
      type="button"
      class="hud-quiet-btn"
      class:active={smOpen}
      title="打开/收起关卡星图"
      onclick={() => uiState.toggleStarmap()}
    >
      <span class="btn-ico"><Icon name="map" size={16} /></span>
      <span class="btn-text">关卡</span>
      <span class="hud-stars font-tabular">★ {totalStars}<i>/{maxStars}</i></span>
    </button>
  </div>

  <div class="hud-center-brand">
    <button
      type="button"
      class="brand-btn"
      title="回到主菜单"
      onclick={() => (uiState.showTitle = true)}
    >
      <span class="brand-ring" aria-hidden="true"><Icon name="ring" size={15} /></span>
      <span class="title-brand font-celestial">浑 天 璇 玑</span>
      <span class="brand-seal">傅立叶</span>
    </button>
  </div>

  <div class="hud-right-actions">
    <button
      type="button"
      class="hud-quiet-btn icon-only"
      title="成就与图鉴"
      aria-label="成就"
      onclick={() => (uiState.showAchv = true)}
    >
      <Icon name="trophy" size={16} />
    </button>
    <button
      type="button"
      class="hud-quiet-btn icon-only"
      title="设置"
      aria-label="设置"
      onclick={() => (uiState.showSettings = true)}
    >
      <Icon name="gear" size={16} />
    </button>
  </div>
</header>

<style>
  /* ============================================================
   * 顶栏：通栏但不抢戏——安静的面，只有「去星图」是按键
   * ============================================================ */
  .game-hud-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 100%;
    width: 100%;
    /* 左右内边距对称：三段贴边距离一致 */
    padding: 0 var(--space-3);
    box-sizing: border-box;
    /* 顶栏 = 天穹铜梁：装甲板面料 + 底部一道内框发丝线 */
    background: var(--mat-plate);
    border-bottom: 1px solid var(--mat-frame-line);
    box-shadow: var(--mat-plate-shadow);
  }
  .game-hud-bar::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -1px;
    width: 34%;
    height: 1px;
    transform: translateX(-50%);
    background: linear-gradient(90deg, transparent, var(--edge-bronze-hot), transparent);
    pointer-events: none;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1 1 0;
  }

  /* ---------- 安静按键：凹槽面 + 细铜边，没有发光 ---------- */
  .hud-quiet-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: var(--ctl-md);
    padding: 0 10px 0 8px;
    border-radius: var(--ctl-radius);
    background: var(--groove-bg);
    border: 1px solid var(--edge-bronze);
    box-shadow: var(--groove-shadow);
    color: var(--muted);
    font-size: var(--ctl-font);
    font-weight: 600;
    transition:
      background 0.12s ease,
      box-shadow 0.12s ease,
      color 0.12s ease;
  }
  .hud-quiet-btn:hover {
    background: var(--face-plate-hot);
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }
  .hud-quiet-btn:active {
    transform: translateY(1px);
  }
  .hud-quiet-btn:focus-visible {
    background: var(--face-plate-hot);
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }
  .hud-quiet-btn.icon-only {
    width: var(--ctl-md);
    padding: 0;
    justify-content: center;
    /* 与左端「关卡」入口的图标同色同尺寸，三段视觉重量一致 */
    color: var(--gold);
  }
  .hud-quiet-btn.icon-only:hover,
  .hud-quiet-btn.icon-only:focus-visible {
    color: var(--gold-bright);
  }
  .hud-quiet-btn.active {
    background: var(--gold-dim);
    border-color: var(--edge-bronze-hot);
    color: var(--gold-bright);
  }

  .btn-ico {
    display: inline-flex;
    color: var(--gold);
  }

  .hud-stars {
    font-size: var(--ctl-font-sm);
    color: var(--gold-bright);
    font-weight: 700;
    background: var(--gold-dim);
    border-radius: var(--r-sm);
    padding: 2px 7px;
  }
  .hud-stars i {
    font-style: normal;
    opacity: 0.6;
    font-weight: 600;
  }

  /* ---------- 中央品牌：只是回家的入口，不再发光 ---------- */
  .brand-ring {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ctl-xs);
    height: var(--ctl-xs);
    color: var(--bronze-bright);
  }

  .hud-center-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 1 auto;
  }
  .brand-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    /* 与左右两端的按键同高：三段在顶栏里是同一层级的入口 */
    min-height: var(--ctl-md);
    padding: 0 10px;
    border-radius: var(--ctl-radius);
    border: 1px solid transparent;
    transition:
      border-color 0.12s ease,
      background 0.12s ease;
  }
  .brand-btn:hover {
    border-color: var(--edge-bronze);
    background: var(--gold-dim);
  }
  .title-brand {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
    letter-spacing: 3px;
    white-space: nowrap;
  }
  .brand-btn:hover .title-brand {
    color: var(--gold-bright);
  }
  .brand-seal {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    color: var(--text);
    background: var(--face-seal);
    padding: 2px 5px;
    border-radius: 3px;
    letter-spacing: 1px;
    line-height: 1.2;
  }

  .hud-right-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1 1 0;
    justify-content: flex-end;
  }

  /* 中等宽度：收起文字，只留图标 */
  @media (max-width: 1000px) {
    .btn-text {
      display: none;
    }
    .title-brand {
      font-size: 14px;
      letter-spacing: 2px;
    }
  }

  /* 手机（竖屏/横屏）走画布内 HUD，顶栏让位给画布 */
  @media (max-width: 640px) and (orientation: portrait) {
    .game-hud-bar {
      display: none;
    }
  }
  @media (max-width: 900px) and (orientation: landscape) {
    .game-hud-bar {
      display: none;
    }
  }
</style>
