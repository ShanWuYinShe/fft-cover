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
    <span class="tab-ico"><Icon name="sliders" size={20} /></span>
    <span class="tab-text">指针调参</span>
    <span class="tab-caret" aria-hidden="true">
      <Icon name={armsActive && uiState.panelExpanded ? 'chevron-down' : 'chevron-up'} size={12} />
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
    <span class="tab-ico"><Icon name="map" size={20} /></span>
    <span class="tab-text">星图关卡</span>
    <span class="tab-caret" aria-hidden="true"><Icon name="chevron-right" size={12} /></span>
  </button>
</nav>

<style>
  .mobile-tabs {
    display: none;
  }

  @media (max-width: 640px) and (orientation: portrait) {
    /* 底部导航 = 一条白卡，按键是药丸（选中项珊瑚底） */
    .mobile-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      padding: 8px 10px calc(8px + var(--safe-b));
      box-sizing: border-box;
      background: var(--bg-2);
      border-top: 3px solid #ffffff;
      box-shadow: 0 -4px 0 var(--mat-frame-line);
      transition:
        transform 0.22s ease,
        opacity 0.18s ease;
    }

    .mobile-tabs.hide-in-run {
      display: none;
    }

    .tab-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1 1 0;
      min-width: 0;
      min-height: var(--ctl-md);
      padding: 0 10px;
      border: none;
      border-radius: var(--r-pill);
      background: transparent;
      color: var(--muted);
      font-family: var(--font-round);
      font-size: var(--fs-xs);
      font-weight: 800;
      letter-spacing: 0.5px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition:
        background 120ms ease,
        color 120ms ease,
        box-shadow 120ms ease,
        transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .tab-btn:hover {
      color: var(--text);
      background: var(--bg-chassis);
    }
    .tab-btn:focus-visible {
      outline: 3px solid var(--sky-deep);
      outline-offset: 2px;
    }
    .tab-btn:active {
      transform: translateY(2px);
    }

    .tab-ico {
      display: flex;
      align-items: center;
      line-height: 1;
      color: var(--mint-deep);
    }

    .tab-caret {
      display: inline-flex;
      align-items: center;
      opacity: 0.6;
    }

    /* 选中：珊瑚药丸 + 白色内描边 + 底部硬边 + 深棕字 */
    .tab-btn.on {
      background: var(--plate-brass);
      color: var(--coral-ink);
      box-shadow:
        inset 0 0 0 3px #ffffff,
        0 3px 0 var(--coral-edge);
    }
    .tab-btn.on .tab-ico {
      color: var(--coral-ink);
    }
    .tab-btn.on .tab-caret {
      opacity: 0.85;
    }
    .tab-btn.on:active {
      transform: translateY(2px);
      box-shadow:
        inset 0 0 0 3px #ffffff,
        0 1px 0 var(--coral-edge);
    }

    @media (prefers-reduced-motion: reduce) {
      .mobile-tabs,
      .tab-btn {
        transition: none;
      }
      .tab-btn:active,
      .tab-btn.on:active {
        transform: none;
      }
    }
  }
</style>
