<script lang="ts">
  import Drawer from '../base/Drawer.svelte';
  import Icon from '../Icon.svelte';
  import LevelPicker from '../LevelPicker.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { uiState } from '../../stores/uiState.svelte';

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const maxStars = LEVEL_DEFS.length * 3;

  function onLevelSelect(): void {
    uiState.closeStarmap();
    if (uiState.mobileTab === 'levels') {
      uiState.mobileTab = 'arms';
    }
  }
</script>

<Drawer
  open={uiState.starMapOpen}
  side="left"
  width="min(440px, 94vw)"
  showClose={true}
  onclose={() => uiState.closeStarmap()}
>
  {#snippet title()}
    <span class="sm-title">
      <span class="sm-ico" aria-hidden="true"><Icon name="compass" size={15} /></span>
      <span class="sm-name">周 天 星 宿 谱</span>
      <span class="sm-count font-tabular"><b>{totalStars}</b>/{maxStars}★</span>
    </span>
  {/snippet}

  <div class="starmap-body">
    <LevelPicker onselect={onLevelSelect} />
  </div>
</Drawer>

<style>
  .sm-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 2px;
    text-shadow: 0 0 16px rgba(245, 184, 65, 0.3);
  }

  /* 图标格：与 Modal 头部的图标格同一语言 */
  .sm-ico {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--gold-bright);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.2), rgba(245, 184, 65, 0.05));
    border: 1px solid var(--edge);
    border-radius: 7px;
    box-shadow:
      var(--bevel-top),
      0 0 12px rgba(245, 184, 65, 0.18);
  }

  .sm-name {
    white-space: nowrap;
  }

  /* 星数读数：等宽大号 */
  .sm-count {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0;
    white-space: nowrap;
  }
  .sm-count b {
    font-size: var(--fs-md);
    color: var(--gold-bright);
    text-shadow: 0 0 10px rgba(245, 184, 65, 0.45);
  }

  .starmap-body {
    padding-bottom: var(--space-4);
  }
</style>
