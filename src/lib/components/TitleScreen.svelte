<script lang="ts">
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

  function start(): void {
    onstart();
  }
</script>

<div class="title-screen">
  <div class="ts-inner">
    <div class="ts-logo">
      <span class="ts-eyebrow">傅立叶级数 · 旋转连杆</span>
      <h1>傅立叶指针<span class="ts-seal" title="朱印：旋">旋</span></h1>
      <p class="ts-sub">转动指针，让指尖的轨迹贴合目标曲线</p>
    </div>

    {#if hasProgress}
      <div class="ts-progress">
        <div class="p-item"><b>{totalStars}</b><i>/{LEVEL_DEFS.length * 3} 星</i></div>
        <div class="p-item"><b>{perfectCount}</b><i>👑 完美</i></div>
        <div class="p-item"><b>{exactCount}</b><i>🎯 精确解</i></div>
        {#if expertCount > 0}
          <div class="p-item"><b>{expertCount}</b><i>💎 专家</i></div>
        {/if}
        {#if engine.dailyStreak.streak > 0}
          <div class="p-item"><b>🔥{engine.dailyStreak.streak}</b><i>连胜</i></div>
        {/if}
      </div>
    {/if}

    <button type="button" class="ts-start" onclick={start}>
      {hasProgress ? '▶ 继续游戏' : '▶ 开始游戏'}
    </button>

    <p class="ts-tips">把最多 10 根旋转指针首尾相连——它们的合成就是一条傅立叶级数曲线</p>
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
      radial-gradient(circle at 50% 32%, rgba(79, 209, 197, 0.13), transparent 58%),
      radial-gradient(circle at 50% 78%, rgba(167, 139, 250, 0.1), transparent 55%), #070912;
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
    max-width: 420px;
  }

  .ts-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .ts-eyebrow {
    font-size: var(--fs-xs);
    letter-spacing: 4px;
    color: var(--muted-2);
  }

  h1 {
    margin: 0;
    font-size: clamp(34px, 9vw, 48px);
    letter-spacing: 8px;
    font-weight: 700;
    background: linear-gradient(135deg, #8ff2e6, var(--cyan) 45%, #c4b5fd);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 6px 26px rgba(79, 209, 197, 0.28));
  }

  /* 朱印：标题旁的方形印章（篆刻样式）。h1 用了 background-clip:text，
     印面必须显式还原背景与字色，否则会跟着标题一起变透明 */
  h1 .ts-seal {
    display: inline-block;
    vertical-align: 2px;
    margin-left: 10px;
    width: 26px;
    height: 26px;
    line-height: 24px;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    -webkit-background-clip: initial;
    background-clip: initial;
    color: #fdece7;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(192, 57, 43, 0.45);
    filter: none;
  }

  .ts-sub {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--muted);
    letter-spacing: 1px;
  }

  /* 进度概览：老玩家一眼看到自己的成绩 */
  .ts-progress {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .p-item {
    display: flex;
    align-items: baseline;
    gap: 3px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid var(--line);
  }

  .p-item b {
    font-size: var(--fs-lg);
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }

  .p-item i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .ts-start {
    min-width: 200px;
    min-height: 48px;
    font-size: var(--fs-lg);
    letter-spacing: 3px;
    color: #06121a;
    background: linear-gradient(135deg, #8ff2e6, var(--cyan));
    border: none;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 32px rgba(79, 209, 197, 0.3);
    animation: ts-btn 2.4s ease-in-out infinite;
  }

  @keyframes ts-btn {
    0%,
    100% {
      box-shadow: 0 10px 32px rgba(79, 209, 197, 0.28);
    }
    50% {
      box-shadow: 0 10px 40px rgba(79, 209, 197, 0.48);
    }
  }

  .ts-start:hover {
    transform: translateY(-1px);
  }

  .ts-tips {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    line-height: 1.7;
  }
</style>
