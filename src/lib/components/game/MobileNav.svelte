<script lang="ts">
  import Icon from '../Icon.svelte';
  import { engine } from '../../game/engine.svelte';
  import { uiState } from '../../stores/uiState.svelte';
</script>

<nav class="mobile-tabs" class:hide-in-run={engine.phase === 'running'}>
  <button
    type="button"
    class:on={uiState.mobileTab === 'arms'}
    class:expanded={uiState.mobileTab === 'arms' && uiState.panelExpanded}
    aria-expanded={uiState.mobileTab === 'arms' && uiState.panelExpanded}
    onclick={() => uiState.onTab('arms')}
  >
    <i class="tab-icon"><Icon name="sliders" size={17} /></i>
    <span>{uiState.mobileTab === 'arms' && uiState.panelExpanded ? '指针调参 ▾' : '指针调参'}</span>
  </button>
  <button
    type="button"
    class:on={uiState.mobileTab === 'levels'}
    class:expanded={uiState.mobileTab === 'levels' && uiState.panelExpanded}
    aria-expanded={uiState.mobileTab === 'levels' && uiState.panelExpanded}
    onclick={() => uiState.onTab('levels')}
  >
    <i class="tab-icon"><Icon name="map" size={17} /></i>
    <span
      >{uiState.mobileTab === 'levels' && uiState.panelExpanded ? '星图关卡 ▾' : '星图关卡'}</span
    >
  </button>
</nav>

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    .mobile-tabs {
      display: flex;
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: calc(8px + env(safe-area-inset-bottom));
      z-index: 30;
      width: auto;
      min-width: 220px;
      max-width: 280px;
      padding: 3px 6px;
      gap: 6px;
      background: rgba(8, 12, 22, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(245, 184, 65, 0.3);
      border-radius: var(--radius-pill);
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.6),
        0 0 15px rgba(245, 184, 65, 0.1);
      transition:
        transform 0.25s ease,
        opacity 0.2s ease;
    }

    .mobile-tabs.hide-in-run {
      transform: translate(-50%, 120%);
      opacity: 0;
      pointer-events: none;
    }

    .mobile-tabs button {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 0 12px;
      min-height: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: var(--radius-pill);
      color: var(--muted);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mobile-tabs button.on {
      background: linear-gradient(180deg, #f5b841 0%, #d97706 100%);
      color: #060911;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(245, 184, 65, 0.35);
    }

    .tab-icon {
      font-style: normal;
      display: flex;
      align-items: center;
      line-height: 1;
    }
  }
</style>
