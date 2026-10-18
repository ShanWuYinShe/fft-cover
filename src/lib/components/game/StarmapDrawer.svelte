<script lang="ts">
  import Drawer from '../base/Drawer.svelte';
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
      <span class="sm-name">星图</span>
      <span class="sm-count font-tabular"><b>{totalStars}</b>/{maxStars} ★</span>
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
    gap: 10px;
    min-width: 0;
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 2px;
  }

  .sm-name {
    white-space: nowrap;
  }

  /* 星数读数：等宽小字，安静地跟在标题后面 */
  .sm-count {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0;
    white-space: nowrap;
  }
  .sm-count b {
    color: var(--gold-bright);
  }

  .starmap-body {
    padding-bottom: var(--space-4);
  }
</style>
