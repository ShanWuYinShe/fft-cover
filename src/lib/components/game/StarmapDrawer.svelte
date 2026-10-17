<script lang="ts">
  import Drawer from '../base/Drawer.svelte';
  import LevelPicker from '../LevelPicker.svelte';
  import { engine } from '../../game/engine.svelte';
  import { LEVEL_DEFS } from '../../game/levels';
  import { uiState } from '../../stores/uiState.svelte';

  const totalStars = $derived(
    LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0),
  );
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
      <span class="sm-dot">✦</span>
      <span>周 天 星 宿 谱</span>
      <span class="sm-count font-tabular">({totalStars}/{maxStars}★)</span>
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
    gap: var(--space-2);
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 2px;
  }

  .sm-dot {
    font-size: 14px;
    color: var(--gold);
  }

  .sm-count {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-weight: 400;
    letter-spacing: 0;
  }

  .starmap-body {
    padding-bottom: var(--space-4);
  }
</style>
