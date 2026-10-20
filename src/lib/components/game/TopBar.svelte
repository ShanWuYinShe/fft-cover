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
   * 顶栏（第十四轮）：白卡厚条 + 三颗独立药丸，不做通栏底色
   * ============================================================ */
  .game-hud-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: 100%;
    width: 100%;
    padding: 8px 4px;
    box-sizing: border-box;
    background: transparent;
  }
  .game-hud-bar::after {
    content: none;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1 1 0;
  }

  /* ---------- 药丸键：白卡 + 3px 白边 + 硬投影 ---------- */
  .hud-quiet-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: var(--ctl-md);
    padding: 0 16px 0 12px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 3px 0 #d6ecf9,
      0 10px 20px rgba(56, 116, 150, 0.14);
    color: var(--text);
    font-family: var(--font-round);
    font-size: var(--ctl-font);
    font-weight: 800;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition:
      transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1),
      background 120ms ease;
  }
  .hud-quiet-btn:hover {
    background: #ffffff;
  }
  .hud-quiet-btn:active {
    transform: translateY(2px);
  }
  .hud-quiet-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }
  .hud-quiet-btn.active {
    background: var(--face-gold-plate);
    border-color: #ffffff;
    color: #ffffff;
    box-shadow: 0 3px 0 var(--coral-edge);
  }

  .hud-quiet-btn.icon-only {
    width: var(--ctl-md);
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }

  .btn-ico {
    display: inline-flex;
    color: var(--coral-text);
  }
  .hud-quiet-btn.active .btn-ico {
    color: #ffffff;
  }

  .btn-text {
    white-space: nowrap;
  }

  /* 星数：珊瑚数字 + 浅蓝总数 */
  .hud-stars {
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-size: var(--ctl-font);
    font-weight: 900;
    color: var(--coral-text);
    letter-spacing: 0;
  }
  .hud-stars i {
    font-style: normal;
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    color: var(--muted-2);
  }
  .hud-quiet-btn.active .hud-stars,
  .hud-quiet-btn.active .hud-stars i {
    color: #ffffff;
  }

  /* ---------- 中间品牌：白药丸，圆体大字 ---------- */
  .hud-center-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 1 auto;
    min-width: 0;
  }

  .brand-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: var(--ctl-md);
    padding: 0 18px;
    border-radius: var(--r-pill);
    background: var(--mat-block);
    border: 3px solid #ffffff;
    box-shadow:
      0 3px 0 #d6ecf9,
      0 10px 20px rgba(56, 116, 150, 0.14);
    cursor: pointer;
    transition: transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .brand-btn:hover {
    background: #ffffff;
  }
  .brand-btn:active {
    transform: translateY(2px);
  }
  .brand-btn:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 2px;
  }

  .brand-ring {
    display: inline-flex;
    color: var(--coral-text);
  }

  .title-brand {
    font-family: var(--font-round);
    font-size: var(--ctl-font);
    font-weight: 900;
    letter-spacing: 3px;
    color: var(--text);
    white-space: nowrap;
  }

  .brand-seal {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: var(--r-pill);
    background: var(--coral-solid);
    color: #ffffff;
    font-size: var(--fs-xs);
    font-weight: 900;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .hud-right-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    flex: 1 1 0;
    min-width: 0;
  }

  @media (max-width: 1024px) {
    .title-brand {
      font-size: var(--ctl-font-sm);
      letter-spacing: 2px;
    }
    .brand-seal {
      display: none;
    }
  }
</style>
