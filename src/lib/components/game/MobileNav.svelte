<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';

  const armsActive = $derived(uiState.mobileTab === 'arms');
  const levelsActive = $derived(uiState.mobileTab === 'levels');
</script>

<nav class="mobile-tabs" class:hide-in-run={engine.phase === 'running'}>
  <button
    type="button"
    class="tab-btn"
    class:on={armsActive}
    class:expanded={armsActive && uiState.panelExpanded}
    aria-expanded={armsActive && uiState.panelExpanded}
    onclick={() => uiState.onTab('arms')}
  >
    <span class="tab-ico"><Icon name="sliders" size={18} /></span>
    <span class="tab-text">指针调参</span>
    <span class="tab-caret" aria-hidden="true">
      {armsActive && uiState.panelExpanded ? '▾' : '▴'}
    </span>
  </button>

  <button
    type="button"
    class="tab-btn"
    class:on={levelsActive}
    class:expanded={levelsActive && uiState.panelExpanded}
    aria-expanded={levelsActive && uiState.panelExpanded}
    onclick={() => uiState.onTab('levels')}
  >
    <span class="tab-ico"><Icon name="map" size={18} /></span>
    <span class="tab-text">星图关卡</span>
    <span class="tab-caret" aria-hidden="true">›</span>
  </button>
</nav>

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    /* 机箱底部的两个大按键：不再是漂浮的小胶囊 */
    .mobile-tabs {
      display: flex;
      align-items: stretch;
      gap: 8px;
      width: 100%;
      height: 100%;
      padding: 6px 10px calc(6px + env(safe-area-inset-bottom));
      box-sizing: border-box;
      background: linear-gradient(180deg, rgba(10, 15, 27, 0.96) 0%, rgba(4, 7, 13, 0.99) 100%);
      border-top: 1px solid var(--edge);
      box-shadow: 0 -8px 22px rgba(0, 0, 0, 0.55);
      transition:
        transform 0.22s ease,
        opacity 0.18s ease;
    }

    .mobile-tabs.hide-in-run {
      display: none;
    }

    .tab-btn {
      flex: 1 1 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 44px;
      border-radius: 10px;
      background: var(--face-metal);
      border: 1px solid var(--edge-soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      white-space: nowrap;
      box-shadow:
        var(--bevel-top),
        var(--bevel-bottom),
        0 2px 0 rgba(0, 0, 0, 0.5);
      transition: all 0.12s ease;
    }

    .tab-btn:active {
      transform: translateY(2px);
      box-shadow: var(--bevel-inset);
    }

    .tab-ico {
      display: flex;
      align-items: center;
      line-height: 1;
    }

    .tab-caret {
      font-size: 10px;
      opacity: 0.6;
    }

    .tab-btn.on {
      background: var(--face-gold);
      border-color: #ffe7a3;
      color: #1a1002;
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
      box-shadow:
        var(--bevel-top),
        inset 0 -3px 0 rgba(140, 80, 0, 0.5),
        0 2px 0 #7a4d05,
        0 0 18px rgba(245, 184, 65, 0.35);
    }

    .tab-btn.on .tab-caret {
      opacity: 0.8;
    }
  }
</style>
