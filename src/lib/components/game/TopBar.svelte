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
      <Icon name="trophy" size={17} />
    </button>
    <button
      type="button"
      class="hud-quiet-btn icon-only"
      title="设置"
      aria-label="设置"
      onclick={() => (uiState.showSettings = true)}
    >
      <Icon name="gear" size={17} />
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
    padding: 0 14px 0 12px;
    box-sizing: border-box;
    /* 顶栏 = 器物上沿：青铜底边 + 回纹发丝 + 中央一道金箔高光 */
    background-color: rgba(9, 14, 25, 0.96);
    background-image: var(--pattern-hui-soft);
    background-repeat: repeat-x;
    background-position: 0 center;
    border-bottom: 1px solid var(--edge-bronze);
    box-shadow:
      inset 0 -1px 0 rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
    gap: 10px;
    min-width: 0;
    flex: 1 1 0;
  }

  /* ---------- 安静按键：金属面 + 细描边，没有发光 ---------- */
  .hud-quiet-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: var(--ctl-md);
    padding: 0 10px 0 8px;
    border-radius: 0;
    clip-path: var(--chamfer-sm);
    background: var(--face-plate);
    border: none;
    box-shadow:
      inset 0 0 0 1px var(--edge-bronze),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    color: var(--text);
    font-size: var(--ctl-font);
    font-weight: 600;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .hud-quiet-btn:hover {
    background: rgba(30, 42, 66, 0.85);
    border-color: var(--edge);
    color: var(--gold-bright);
  }
  .hud-quiet-btn:active {
    transform: translateY(1px);
  }
  .hud-quiet-btn:hover {
    background: var(--face-plate-hot);
    color: var(--gold-bright);
  }
  .hud-quiet-btn.icon-only {
    width: var(--ctl-md);
    padding: 0;
    justify-content: center;
    color: var(--muted);
  }
  .hud-quiet-btn.active {
    background: rgba(245, 184, 65, 0.16);
    border-color: var(--edge);
    color: var(--gold-bright);
  }

  .btn-ico {
    display: inline-flex;
    color: var(--gold);
  }

  .hud-stars {
    font-size: var(--ctl-font-sm);
    color: #9df0d8;
    font-weight: 700;
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.1);
    border-radius: 5px;
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
    width: 22px;
    height: 22px;
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
    gap: 8px;
    padding: 4px 10px;
    border-radius: var(--ctl-radius);
    border: 1px solid transparent;
    transition: all 0.12s ease;
  }
  .brand-btn:hover {
    border-color: var(--edge-soft);
    background: rgba(245, 184, 65, 0.05);
  }
  .title-brand {
    font-size: 15px;
    font-weight: 700;
    color: rgba(241, 245, 249, 0.85);
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
    color: #ffffff;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    padding: 2px 5px;
    border-radius: 3px;
    letter-spacing: 1px;
    line-height: 1.2;
  }

  .hud-right-actions {
    display: flex;
    align-items: center;
    gap: 8px;
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
