<script lang="ts">
  import Icon from './Icon.svelte';
  import { LEVEL_DEFS } from '../game/levels';
  import { engine } from '../game/engine.svelte';

  let { onstart }: { onstart: () => void } = $props();

  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );
  const expertCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.expertClears[d.id] ? 1 : 0), 0),
  );
  const hasProgress = $derived(totalStars > 0 || engine.dailyStreak.streak > 0);
  /** 全局朱印进度（与「本关目标」同一套判定） */
  const seals = $derived(engine.sealSummary);

  function start(): void {
    onstart();
  }
</script>

<div class="title-screen">
  <div class="ts-inner">
    <div class="ts-logo">
      <span class="ts-eyebrow">浑 天 璇 玑 · 傅 立 叶 级 数</span>
      <h1>傅立叶指针<span class="ts-seal" title="朱印：旋">旋</span></h1>
      <p class="ts-sub">转动连杆拟合日月星轨，聆听谐波共鸣之律</p>
    </div>

    {#if hasProgress}
      <div class="ts-progress">
        <div class="p-item"><b>{totalStars}</b><i>/{LEVEL_DEFS.length * 3} 星</i></div>
        <div class="p-item" title="四枚朱印：星 / 满 / 准 / 专">
          <b>{seals.done}</b><i>/{seals.total} 朱印</i>
        </div>
        {#if seals.chapters > 0}
          <div class="p-item" title="章节印：一章四印集齐">
            <b>{seals.chapters}</b><i>/{seals.chaptersTotal} 章节大印</i>
          </div>
        {/if}
        {#if perfectCount > 0}
          <div class="p-item"><b>{perfectCount}</b><i><Icon name="crown" size={12} /> 完美</i></div>
        {/if}
        {#if exactCount > 0}
          <div class="p-item">
            <b>{exactCount}</b><i><Icon name="target" size={12} /> 精确解</i>
          </div>
        {/if}
        {#if expertCount > 0}
          <div class="p-item"><b>{expertCount}</b><i>专家</i></div>
        {/if}
        {#if engine.dailyStreak.streak > 0}
          <div class="p-item">
            <b>{engine.dailyStreak.streak}</b><Icon name="flame" size={12} /><i>连胜</i>
          </div>
        {/if}
      </div>
    {/if}

    <button type="button" class="ts-start" onclick={start}>
      {hasProgress ? '▶ 登台观测' : '✦ 启天动轨 ✦'}
    </button>

    <p class="ts-tips">以旋转指针首尾相连——在天穹画布上绘制谐和曲线，感应天地算法之美</p>
  </div>
</div>

<style>
  .title-screen {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background:
      radial-gradient(circle at 50% 28%, rgba(245, 184, 65, 0.15), transparent 60%),
      radial-gradient(circle at 50% 75%, rgba(0, 245, 212, 0.08), transparent 55%), #06080e;
    animation: ts-in 0.45s ease-out;
  }

  @keyframes ts-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .ts-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    text-align: center;
    max-width: 440px;
  }

  .ts-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ts-eyebrow {
    font-size: var(--fs-xs);
    letter-spacing: 5px;
    font-weight: 600;
    color: var(--gold);
    text-shadow: 0 0 10px rgba(245, 184, 65, 0.35);
  }

  h1 {
    margin: 0;
    font-size: clamp(34px, 9vw, 48px);
    letter-spacing: 8px;
    font-weight: 800;
    background: linear-gradient(135deg, #fff7d6 0%, #ffd166 40%, #f5b841 75%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 6px 26px rgba(245, 184, 65, 0.35));
  }

  /* 朱印：标题旁的方形印章（篆刻样式） */
  h1 .ts-seal {
    display: inline-block;
    vertical-align: 2px;
    margin-left: 10px;
    width: 28px;
    height: 28px;
    line-height: 26px;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0;
    background: linear-gradient(160deg, #d92b2b, #991b1b);
    -webkit-background-clip: initial;
    background-clip: initial;
    color: #ffffff;
    border-radius: 4px;
    border: 1px solid rgba(255, 200, 190, 0.4);
    box-shadow:
      inset 0 0 0 1px #991b1b,
      0 3px 12px rgba(217, 43, 43, 0.45);
    filter: none;
  }

  .ts-sub {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--muted);
    letter-spacing: 1.5px;
  }

  /* 进度概览：成绩徽章 */
  .ts-progress {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .p-item {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 6px 14px;
    border-radius: var(--r-pill);
    background: rgba(14, 20, 34, 0.85);
    border: 1px solid rgba(245, 184, 65, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .p-item b {
    font-size: var(--fs-lg);
    color: var(--gold-bright);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .p-item i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .ts-start {
    min-width: 210px;
    min-height: 50px;
    margin-top: 8px;
    font-size: var(--fs-lg);
    letter-spacing: 3px;
    color: #060911;
    background: linear-gradient(135deg, #ffd166 0%, #f5b841 50%, #d97706 100%);
    border: 1px solid #ffd166;
    border-radius: var(--r-pill);
    font-weight: 800;
    cursor: pointer;
    box-shadow:
      0 10px 32px rgba(245, 184, 65, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
    animation: ts-btn 2.4s ease-in-out infinite;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;
  }

  @keyframes ts-btn {
    0%,
    100% {
      box-shadow: 0 10px 32px rgba(245, 184, 65, 0.38);
    }
    50% {
      box-shadow: 0 10px 44px rgba(245, 184, 65, 0.65);
    }
  }

  .ts-start:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 44px rgba(245, 184, 65, 0.6);
  }

  .ts-tips {
    margin: 24px 0 0;
    font-size: 13px;
    color: rgba(226, 232, 240, 0.65);
    line-height: 1.7;
    letter-spacing: 0.5px;
  }
</style>
