<script lang="ts">
  import { LEVEL_DEFS } from '../game/levels';
  import { ACHIEVEMENTS } from '../game/scoring';
  import { engine } from '../game/engine.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const unlockedCount = $derived(Object.keys(engine.achievements).length);
  const totalStars = $derived(
    LEVEL_DEFS.reduce((sum, d) => sum + (engine.bestStars[d.id] ?? 0), 0),
  );
</script>

<div class="modal">
  <div class="box">
    <h2>
      🏆 成就 <span class="muted">{unlockedCount} / {ACHIEVEMENTS.length}</span>
    </h2>
    <div class="list">
      {#each ACHIEVEMENTS as a (a.id)}
        {@const got = !!engine.achievements[a.id]}
        <div class="item" class:got>
          <span class="icon">{got ? '🏆' : '🔒'}</span>
          <div class="txt">
            <div class="nm">{a.name}</div>
            <div class="desc">{a.desc}</div>
          </div>
        </div>
      {/each}
    </div>
    <div class="hint">当前总星数 {totalStars} / {LEVEL_DEFS.length * 3}（随机关不计星）</div>
    <button class="primary" onclick={onclose}>关 闭</button>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 14, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
  .box {
    width: min(92vw, 380px);
    background: #10152a;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 17px;
    letter-spacing: 2px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    max-height: 46vh;
    overflow-y: auto;
    text-align: left;
  }
  .item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    opacity: 0.5;
  }
  .item.got {
    opacity: 1;
    border-color: rgba(251, 191, 36, 0.45);
    background: rgba(251, 191, 36, 0.05);
  }
  .icon {
    font-size: 20px;
  }
  .nm {
    font-size: 14px;
    font-weight: 600;
  }
  .desc {
    font-size: 12px;
    color: var(--muted);
  }
  .hint {
    font-size: 11.5px;
    color: var(--muted);
    margin-bottom: 12px;
  }
</style>
