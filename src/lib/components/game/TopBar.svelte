<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { levelGoals } from '../../game/goals';
  import { uiState } from '../../stores/uiState.svelte';

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const maxStars = LEVEL_DEFS.length * 3;
  const sealDone = $derived(levelGoals(engine.levelGoalState).filter((x) => x.done).length);
</script>

<header class="game-hud-bar">
  <div class="hud-left">
    <button
      type="button"
      class="hud-starmap-btn"
      class:active={uiState.starMapOpen}
      title="打开/收起周天星图"
      onclick={() => uiState.toggleStarmap()}
    >
      <span class="starmap-ico"><Icon name="map" size={15} /></span>
      <span class="starmap-label font-celestial">周天星图</span>
      <span class="starmap-stars font-tabular">★ {totalStars}/{maxStars}</span>
      <span class="starmap-caret">{uiState.starMapOpen ? '◂' : '▾'}</span>
    </button>
  </div>

  <div class="hud-center-brand">
    <button
      type="button"
      class="title-btn"
      title="查看游戏题序与浑天典仪"
      onclick={() => (uiState.showTitle = true)}
    >
      <span class="title-brand font-celestial">
        ✦ 浑 天 璇 玑 ✦ <span class="brand-seal">傅立叶</span>
      </span>
    </button>
  </div>

  <div class="hud-right-actions">
    {#if engine.level}
      <button
        type="button"
        class="hud-seal-badge font-celestial"
        title="本关朱印成就（星·满·准·专）"
        onclick={() => (uiState.showAchv = true)}
      >
        ◈ 朱印 {sealDone}/4
      </button>
    {/if}
    <button
      type="button"
      class="hud-action-btn"
      title="成就与图鉴"
      aria-label="成就"
      onclick={() => (uiState.showAchv = true)}
    >
      <Icon name="trophy" size={15} />
    </button>
    <button
      type="button"
      class="hud-action-btn"
      title="设置"
      aria-label="设置"
      onclick={() => (uiState.showSettings = true)}
    >
      <Icon name="gear" size={15} />
    </button>
  </div>
</header>

<style>
  .game-hud-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-5);
    height: 52px;
    max-width: 1260px;
    margin: 10px auto 0;
    background: linear-gradient(180deg, rgba(16, 24, 42, 0.92) 0%, rgba(8, 12, 22, 0.95) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(245, 184, 65, 0.3);
    border-radius: var(--radius-lg);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.65),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 20px rgba(245, 184, 65, 0.08);
    position: relative;
    z-index: 20;
    width: calc(100% - 24px);
    box-sizing: border-box;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .hud-starmap-btn {
    appearance: none;
    background: linear-gradient(180deg, #22324f 0%, #10192e 100%);
    border: 1px solid rgba(245, 184, 65, 0.45);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: var(--fs-md);
    font-weight: 700;
    padding: 6px 12px;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow:
      0 3px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  .hud-starmap-btn:hover {
    background: linear-gradient(180deg, #2e4369 0%, #172440 100%);
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    box-shadow:
      0 4px 14px rgba(0, 0, 0, 0.5),
      0 0 16px rgba(245, 184, 65, 0.3);
    transform: translateY(-1px);
  }
  .hud-starmap-btn.active {
    background: linear-gradient(180deg, #d97706 0%, #92400e 100%);
    border-color: #ffd700;
    color: #fff;
    box-shadow: 0 0 16px rgba(245, 184, 65, 0.5);
  }

  .starmap-ico {
    color: var(--gold-bright);
    display: inline-flex;
  }
  .starmap-label {
    letter-spacing: 1.5px;
    font-size: 14px;
  }
  .starmap-stars {
    font-size: var(--fs-xs);
    color: #ffd700;
    background: rgba(245, 184, 65, 0.15);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid rgba(245, 184, 65, 0.3);
  }
  .starmap-caret {
    font-size: 10px;
    color: var(--muted);
  }

  .hud-center-brand {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .title-btn {
    appearance: none;
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }
  .title-brand {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 3px;
    text-shadow: 0 0 16px rgba(245, 184, 65, 0.35);
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
  }
  .title-btn:hover .title-brand {
    color: var(--gold-bright);
    text-shadow: 0 0 20px rgba(245, 184, 65, 0.7);
  }

  .brand-seal {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 8px;
    letter-spacing: 1px;
    line-height: 1.2;
    box-shadow: 0 2px 8px rgba(192, 57, 43, 0.5);
  }

  .hud-right-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .hud-seal-badge {
    appearance: none;
    background: rgba(192, 57, 43, 0.15);
    border: 1px solid rgba(192, 57, 43, 0.5);
    border-radius: var(--radius-sm);
    color: #fca5a5;
    font-size: var(--fs-sm);
    font-weight: 700;
    padding: 4px 10px;
    cursor: pointer;
    letter-spacing: 1px;
    white-space: nowrap;
    transition: all 0.15s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }
  .hud-seal-badge:hover {
    background: rgba(192, 57, 43, 0.28);
    border-color: rgba(192, 57, 43, 0.8);
    color: #fff;
    box-shadow: 0 0 12px rgba(192, 57, 43, 0.5);
  }

  .hud-action-btn {
    appearance: none;
    background: linear-gradient(180deg, #202b40 0%, #101726 100%);
    border: 1px solid rgba(245, 184, 65, 0.28);
    border-radius: var(--radius-sm);
    color: var(--muted);
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.15s ease;
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .hud-action-btn:hover {
    color: var(--gold-bright);
    border-color: rgba(245, 184, 65, 0.6);
    background: linear-gradient(180deg, #2b3955 0%, #172136 100%);
    box-shadow: 0 0 14px rgba(245, 184, 65, 0.3);
    transform: translateY(-1px);
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .game-hud-bar {
      display: none !important;
    }
  }
  @media (max-width: 900px) and (orientation: landscape) {
    .game-hud-bar {
      display: none !important;
    }
  }
</style>
