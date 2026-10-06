<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { LEVEL_DEFS } from '../game/levels';

  /** 本次达成的是"全三星精通"还是"首次通关" */
  const mastered = $derived(engine.finale === 'mastered');
  const totalStars = $derived(LEVEL_DEFS.reduce((s, d) => s + (engine.bestStars[d.id] ?? 0), 0));
  const maxStars = LEVEL_DEFS.length * 3;
  const cleared = $derived(LEVEL_DEFS.filter((d) => (engine.bestStars[d.id] ?? 0) >= 1).length);
  const perfectCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.perfectLevels[d.id] ? 1 : 0), 0),
  );
  const exactCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.exactLevels[d.id] ? 1 : 0), 0),
  );
  const expertCount = $derived(
    LEVEL_DEFS.reduce((n, d) => n + (engine.expertClears[d.id] ? 1 : 0), 0),
  );
  /** 全局朱印与章节印（与「本关目标」同一套判定） */
  const seals = $derived(engine.sealSummary);

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') engine.dismissFinale();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="finale"
  class:mastered
  role="dialog"
  aria-modal="true"
  aria-label={mastered ? '全部关卡三星达成' : '通关达成'}
>
  <div class="card">
    <div class="glow"></div>
    <!-- 落款朱印：书画收尾的那一方印 -->
    <div class="seal" aria-hidden="true">{mastered ? '大成' : '通关'}</div>
    <div class="burst">{mastered ? '👑' : '🏁'}</div>
    <h2>{mastered ? '谐波大师' : '通关！'}</h2>
    <p class="sub">
      {#if mastered}
        全部 {LEVEL_DEFS.length} 关三星——任意周期曲线，你都能反解出它的傅立叶系数
      {:else}
        五个章节、{LEVEL_DEFS.length} 关全部走完——从一根指针画圆，到八根指针拼出心形与阴阳鱼
      {/if}
    </p>

    <div class="grid">
      <div class="cell">
        <b>{totalStars}<i>/{maxStars}</i></b><span>总星数</span>
      </div>
      <div class="cell">
        <b>{cleared}<i>/{LEVEL_DEFS.length}</i></b><span>已通关</span>
      </div>
      <div class="cell">
        <b>{perfectCount}<i>/{LEVEL_DEFS.length}</i></b><span>👑 完美全清</span>
      </div>
      <div class="cell">
        <b>{exactCount}<i>/{LEVEL_DEFS.length}</i></b><span>🎯 精确解</span>
      </div>
      <div class="cell">
        <b>{expertCount}<i>/{LEVEL_DEFS.length}</i></b><span>💎 专家全清</span>
      </div>
      <div class="cell">
        <b>{seals.done}<i>/{seals.total}</i></b><span>朱印（星/满/准/专）</span>
      </div>
      <div class="cell">
        <b>{seals.chapters}<i>/{seals.chaptersTotal}</i></b><span>章节印</span>
      </div>
    </div>

    <p class="note">
      {#if mastered}
        接下来：🎲 随机关（困难档含有超过 10× 的分量）· 📅 每日挑战连胜 · 🎨
        用谐波合成器创作关卡分享给朋友。
      {:else}
        每一关都还留着更高的目标：👑 完美全清（100% 收集）· 🎯 精确解认证（参数与傅立叶分解一致）·
        💎 专家模式全清（不显示轮廓）——四枚朱印集齐后，章头还会盖上该章的章节印。
      {/if}
    </p>

    <button type="button" class="primary" onclick={() => engine.dismissFinale()}> 继续挑战 </button>
  </div>
</div>

<style>
  .finale {
    position: fixed;
    inset: 0;
    z-index: 75;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background:
      radial-gradient(circle at 50% 40%, rgba(251, 191, 36, 0.13), transparent 60%),
      rgba(5, 7, 14, 0.86);
    backdrop-filter: blur(5px);
    animation: fin-fade 0.4s ease-out;
  }
  @keyframes fin-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .card {
    position: relative;
    overflow: hidden;
    width: min(94vw, 430px);
    max-height: 92vh;
    overflow-y: auto;
    padding: 26px 24px 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    border-radius: 22px;
    background: linear-gradient(170deg, rgba(26, 32, 60, 0.98), rgba(11, 15, 30, 0.99));
    border: 1px solid rgba(251, 191, 36, 0.34);
    box-shadow:
      0 26px 70px rgba(0, 0, 0, 0.66),
      0 0 60px rgba(251, 191, 36, 0.09) inset;
    animation: fin-pop 0.5s cubic-bezier(0.34, 1.44, 0.64, 1);
  }
  @keyframes fin-pop {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.92);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* 顶部光晕：通关是这一局的终点，值得一点排场 */
  .glow {
    position: absolute;
    top: -70px;
    width: 260px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.35), transparent 68%);
    pointer-events: none;
    animation: fin-glow 3.2s ease-in-out infinite;
  }
  @keyframes fin-glow {
    0%,
    100% {
      opacity: 0.55;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.12);
    }
  }

  /* 落款朱印：竖排两字，微斜，盖上时有"啪"的一下 */
  .seal {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 44px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 3px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 17px;
    font-weight: 700;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(192, 57, 43, 0.45);
    animation: seal-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.55s backwards;
  }
  @keyframes seal-stamp {
    from {
      opacity: 0;
      transform: rotate(-16deg) scale(1.6);
    }
    to {
      opacity: 1;
      transform: rotate(-6deg) scale(1);
    }
  }

  .burst {
    font-size: 44px;
    line-height: 1;
    filter: drop-shadow(0 6px 20px rgba(251, 191, 36, 0.4));
    animation: fin-burst 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes fin-burst {
    0% {
      transform: scale(0.3) rotate(-18deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.16) rotate(4deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0);
    }
  }

  h2 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 6px;
    background: linear-gradient(96deg, var(--gold) 10%, #ffe6a8 50%, var(--purple) 96%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .sub {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.75;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
    gap: 7px;
    width: 100%;
    margin-top: 2px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 6px;
    border-radius: var(--r-sm);
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid var(--line-2);
  }
  .cell b {
    font-size: var(--fs-lg);
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
  }
  .cell b i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    font-weight: 400;
  }
  .cell span {
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .note {
    margin: 0;
    padding: 9px 12px;
    border-radius: var(--r-sm);
    background: rgba(167, 139, 250, 0.09);
    border: 1px dashed rgba(167, 139, 250, 0.38);
    font-size: var(--fs-xs);
    color: var(--muted);
    line-height: 1.8;
    text-align: left;
  }

  button.primary {
    width: 100%;
    min-height: 44px;
    font-size: var(--fs-md);
    letter-spacing: 2px;
  }

  /* 精通结局：金色更重，边框更亮 */
  .mastered .card {
    border-color: rgba(251, 191, 36, 0.6);
    box-shadow:
      0 26px 76px rgba(0, 0, 0, 0.7),
      0 0 80px rgba(251, 191, 36, 0.14) inset;
  }
</style>
