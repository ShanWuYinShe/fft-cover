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
      background: var(--mat-plate);
      border-top: 1px solid var(--edge-bronze);
      box-shadow: var(--mat-plate-shadow);
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
      /* 命中区下限走令牌：真机安全区（home 指示条）会吃掉导航槽的padding，
         这里保证被挤压时按键仍 ≥--ctl-md（触屏 42px） */
      min-height: var(--ctl-md);
      padding: 0 8px;
      /* 斜边标签页 → 圆角键帽（D：切角一律退场，改雕刻凹槽 + 键帽面料） */
      border-radius: var(--r-sm);
      background: var(--mat-block);
      box-shadow:
        inset 0 0 0 1px var(--plate-brass-line),
        var(--bevel-top),
        var(--groove-shadow);
      color: var(--muted);
      font-size: var(--ctl-font-sm);
      font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
    }
    .tab-btn:hover {
      color: var(--text);
    }
    /* 焦点用「铜边变金 + 面提亮」表达（不再依赖会被切掉的外描边） */
    .tab-btn:focus-visible {
      background: var(--mat-plate);
      box-shadow:
        inset 0 0 0 1px var(--edge-bronze-hot),
        var(--bevel-top);
      color: var(--gold-bright);
    }
    .tab-btn:active {
      background: var(--groove-bg);
      transform: translateY(2px);
      box-shadow: var(--groove-shadow);
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

    /* 选中：金箔键帽（全屏唯一的金色面） */
    .tab-btn.on {
      background: var(--face-gold-plate);
      color: #241300;
      text-shadow:
        0 1px 0 rgba(255, 255, 255, 0.5),
        0 -1px 0 rgba(120, 70, 0, 0.35);
      box-shadow:
        inset 0 0 0 1px #ffe7a3,
        inset 0 -2px 0 rgba(140, 80, 0, 0.45),
        var(--sh-glow-hot);
    }

    .tab-btn.on .tab-caret {
      opacity: 0.8;
    }

    /* 选中的标签页本身就是金色面：焦点再提亮一档边线 */
    .tab-btn.on:focus-visible {
      box-shadow:
        inset 0 0 0 1px #fff6d8,
        inset 0 -2px 0 rgba(140, 80, 0, 0.45),
        var(--sh-glow-hot);
    }
  }
</style>
