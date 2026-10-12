<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import ArmRow from './ArmRow.svelte';
  import ArmEditor from './ArmEditor.svelte';

  /** 当前编辑的指针序号（点击列表行切换） */
  let selected = $state(0);

  const cur = $derived(engine.arms[selected]);
  const onCount = $derived(engine.arms.filter((a) => a.on).length);

  function pick(i: number): void {
    // 选中即启用（点一行就是"我要编辑并使用这根"）
    if (!engine.arms[i].on) engine.setArm(i, { on: true });
    selected = i;
  }
</script>

<div class="arm-panel">
  <div class="list-hd">
    <span>指针配置</span>
    <span class="cnt">已启用 <b>{onCount}</b>/{engine.level?.armLimit ?? 10}</span>
  </div>
  <!-- 编辑区放在列表之前：手机上 10 根指针是 5 行网格，编辑区若在末尾
       每次调参都要先滚过整个列表（实测痛点）。 -->
  {#if cur}
    <ArmEditor index={selected} arm={cur} />
  {/if}
  <div class="arm-list">
    {#each engine.arms as arm, i (i)}
      <ArmRow {arm} index={i} selected={selected === i} onselect={() => pick(i)} />
    {/each}
  </div>
</div>

<style>
  .arm-panel {
    display: flex;
    flex-direction: column;
  }
  .list-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: var(--fs-xs);
    color: var(--muted-2);
  }
  .list-hd .cnt b {
    color: var(--cyan);
    font-variant-numeric: tabular-nums;
  }
  /* 两列紧凑列表：10 根指针 5 行即可总览 */
  .arm-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
    margin-top: 8px; /* 编辑区上移后与列表拉开一点 */
  }
  @media (max-width: 359px) {
    .arm-list {
      grid-template-columns: 1fr;
    }
  }
</style>
