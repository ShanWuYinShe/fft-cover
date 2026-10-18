<script lang="ts">
  import Icon from './Icon.svelte';
  import { engine } from '../game/engine.svelte';
  import { CHAPTERS, LEVEL_DEFS } from '../game/levels';
  import { shapePoints } from '../game/shapes';

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
  /** 从战利品墙点选一关：关掉演出、直接载入那一关再玩 */
  function playLevel(id: string): void {
    const def = LEVEL_DEFS.find((d) => d.id === id);
    if (!def) return;
    engine.loadLevel(def);
    engine.dismissFinale();
  }

  /** 全局朱印与章节印（与「本关目标」同一套判定） */
  const seals = $derived(engine.sealSummary);

  /** 战利品墙：全部关卡的真实轮廓 + 星数，按章分组（idx 用于逐关点亮的错峰动画） */
  const wall = $derived.by(() => {
    let idx = 0;
    return CHAPTERS.map((ch) => ({
      id: ch.id,
      short: ch.name.split('·').pop()?.trim() ?? ch.name,
      seal: ch.seal,
      sealed: engine.chapterSealsOf(ch.id).sealed,
      levels: LEVEL_DEFS.filter((d) => (d.chapter ?? 'basics') === ch.id).map((d) => ({
        id: d.id,
        name: d.name,
        stars: engine.bestStars[d.id] ?? 0,
        idx: idx++,
      })),
    }));
  });

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
  <!-- 完结演出：外框承载四角包边，内层卡片滚动 -->
  <div class="card-wrap">
    <span class="g-corner tl" aria-hidden="true"></span>
    <span class="g-corner tr" aria-hidden="true"></span>
    <span class="g-corner bl" aria-hidden="true"></span>
    <span class="g-corner br" aria-hidden="true"></span>
    <div class="card">
      <span class="g-scanlines card-scan" aria-hidden="true"></span>
      <div class="glow" aria-hidden="true"></div>
      <!-- 顶部铭牌 -->
      <div class="card-rail">
        <span class="g-label">周 天 完 结</span>
        <span class="rail-lv">{mastered ? '三星精通' : '首次通关'}</span>
      </div>
      <!-- 落款朱印：书画收尾的那一方印 -->
      <div class="seal" aria-hidden="true">{mastered ? '大成' : '通关'}</div>
      <div class="burst"><Icon name={mastered ? 'crown' : 'flag'} size={30} /></div>
      <h2>{mastered ? '谐波大师' : '通关！'}</h2>
      <p class="sub">
        {#if mastered}
          全部 {LEVEL_DEFS.length} 关三星——任意周期曲线，你都能反解出它的傅立叶系数
        {:else}
          {CHAPTERS.length} 个章节、{LEVEL_DEFS.length} 关全部走完——从一根指针画圆，到七根齐发的团花与古钟
        {/if}
      </p>
      <span class="g-divider card-div" aria-hidden="true"></span>

      <div class="grid">
        <div class="cell">
          <b class="g-num g-num--gold">{totalStars}<i>/{maxStars}</i></b><span>总星数</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{cleared}<i>/{LEVEL_DEFS.length}</i></b><span>已通关</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{perfectCount}<i>/{LEVEL_DEFS.length}</i></b><span
            ><Icon name="crown" size={13} /> 完美全清</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{exactCount}<i>/{LEVEL_DEFS.length}</i></b><span
            ><Icon name="target" size={13} /> 精确解</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{expertCount}<i>/{LEVEL_DEFS.length}</i></b><span
            ><Icon name="gem" size={13} /> 专家全清</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{seals.done}<i>/{seals.total}</i></b><span
            >朱印（星/满/准/专）</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{seals.chapters}<i>/{seals.chaptersTotal}</i></b><span
            >章节印</span
          >
        </div>
      </div>

      <!-- 战利品墙：这一路画过的曲线全在这里，拿过星的点亮 -->
      <div class="wall" aria-label="全部关卡的曲线">
        {#each wall as ch (ch.id)}
          <div class="wall-ch">
            <span class="wall-name">{ch.short}</span>
            {#each ch.levels as lv (lv.id)}
              <button
                type="button"
                class="wall-item"
                class:lit={lv.stars > 0}
                class:full={lv.stars === 3}
                style="animation-delay: {0.15 + lv.idx * 0.055}s"
                title={'再玩「' + lv.name + '」'}
                onclick={() => playLevel(lv.id)}
              >
                <svg viewBox="0 0 640 640" aria-hidden="true">
                  <polyline points={shapePoints(lv.id)} />
                </svg>
                <span class="wall-st">{'★'.repeat(lv.stars)}{'☆'.repeat(3 - lv.stars)}</span>
                <!-- 悬停/聚焦才显示关卡名：静态堆 21 个名字会挤成一团 -->
                <span class="wall-tip" aria-hidden="true">{lv.name}</span>
              </button>
            {/each}
            {#if ch.sealed}
              <span class="wall-seal" title={'章节印「' + ch.seal + '」'}>{ch.seal}</span>
            {/if}
          </div>
        {/each}
      </div>

      <p class="note">
        {#if mastered}
          接下来：随机关（困难档含有超过 10× 的分量）· 每日挑战连胜 ·
          用谐波合成器创作关卡分享给朋友。
        {:else}
          每一关都还留着更高的目标：完美全清（100% 收集）· 精确解认证（参数与傅立叶分解一致）·
          专家模式全清（不显示轮廓）——四枚朱印集齐后，章头还会盖上该章的章节印。
        {/if}
      </p>

      <div class="foot">
        <button type="button" class="primary" onclick={() => engine.dismissFinale()}>
          继 续 挑 战
        </button>
      </div>
    </div>
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

  /* 外框：承载四角包边，本身不滚动 */
  .card-wrap {
    position: relative;
    width: min(94vw, 430px);
    max-height: calc(100dvh - 24px);
    display: flex;
  }

  .card {
    position: relative;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 24px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    background: linear-gradient(180deg, var(--metal-2) 0%, var(--metal) 45%, #070c16 100%);
    border: 1px solid var(--edge-soft);
    border-radius: var(--radius-md);
    box-shadow:
      var(--sh-game-lg),
      var(--bevel-top),
      inset 0 0 70px rgba(245, 184, 65, 0.07);
    animation: fin-pop 0.5s cubic-bezier(0.34, 1.44, 0.64, 1);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.35) transparent;
  }
  .card::before {
    content: '';
    position: absolute;
    inset: -1px -1px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--edge-hot) 14%,
      var(--edge-hot) 86%,
      transparent
    );
    opacity: 0.8;
    pointer-events: none;
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

  .card-scan {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0.65;
  }

  /* 顶部铭牌：通栏 */
  .card-rail {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 0 -24px 2px;
    padding: 10px 14px 9px;
    border-bottom: 1px solid var(--edge-soft);
    background: linear-gradient(180deg, rgba(245, 184, 65, 0.12), rgba(245, 184, 65, 0.02));
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.5);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }
  .rail-lv {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text);
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .card-div {
    width: 100%;
    margin: 0;
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

  /* 落款朱印：竖排两字，微斜，盖上时有"啪"的一下（下移，避开右上角包边） */
  .seal {
    position: absolute;
    top: 48px;
    right: 12px;
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
    border: 1px solid rgba(255, 255, 255, 0.25);
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
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    background: linear-gradient(96deg, var(--gold-bright) 10%, #fff7ed 50%, var(--purple) 96%);
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
    gap: 3px;
    padding: 9px 6px;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.88), rgba(8, 12, 22, 0.72));
    border: 1px solid var(--edge-faint);
    box-shadow: var(--bevel-inset);
  }
  .cell b {
    font-size: 22px;
    line-height: 1.15;
  }
  .cell b i {
    font-style: normal;
    font-size: var(--fs-xs);
    color: var(--muted-2);
    font-weight: 400;
    text-shadow: none;
  }
  .cell span {
    font-size: var(--fs-xs);
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  /* 战利品墙：按章排列全部曲线的缩略轮廓（嵌进面板的凹槽） */
  .wall {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    box-sizing: border-box;
    margin: 4px 0 2px;
    padding: 10px 10px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--edge-faint);
    background: linear-gradient(180deg, rgba(3, 5, 10, 0.9), rgba(7, 11, 20, 0.85));
    box-shadow: var(--bevel-inset);
  }
  .wall-ch {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  /* 战利品墙的格子是按钮：点一下直接载入那一关再玩（reset 掉按钮默认外观） */
  .wall-item {
    appearance: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .wall-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .wall-item:focus-visible {
    outline: 2px solid rgba(79, 209, 197, 0.65);
    outline-offset: 1px;
  }
  /* 逐关点亮：错峰淡入（opacity 放在子元素上，避免与"未点亮"状态打架） */
  .wall-item {
    animation: wall-in 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
  }
  @keyframes wall-in {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.72);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .wall-item svg,
  .wall-item .wall-st {
    opacity: 0.42;
  }
  .wall-item.lit svg,
  .wall-item.lit .wall-st {
    opacity: 1;
  }
  .wall-name {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--muted);
    white-space: nowrap;
  }
  .wall-item svg {
    width: 46px;
    height: 46px;
  }
  .wall-item polyline {
    fill: none;
    stroke: rgba(150, 170, 200, 0.6);
    stroke-width: 8;
    stroke-linejoin: round;
  }
  .wall-item.lit polyline {
    stroke: rgba(79, 209, 197, 0.9);
  }
  .wall-item.full polyline {
    stroke: rgba(251, 191, 36, 0.95);
    filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
  }
  .wall-st {
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--gold);
    line-height: 1;
  }
  /* 悬停/键盘聚焦时冒出关卡名（否则 18 个名字会把墙挤成一团） */
  .wall-tip {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 3px);
    transform: translateX(-50%) translateY(2px);
    padding: 1px 6px;
    border-radius: 5px;
    border: 1px solid rgba(130, 150, 210, 0.35);
    background: #171d33;
    color: var(--text);
    font-size: 10px;
    line-height: 16px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.15s,
      transform 0.15s;
    z-index: 3;
  }
  .wall-item:hover .wall-tip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .wall-seal {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
  }

  .note {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, rgba(14, 10, 28, 0.9), rgba(8, 6, 18, 0.88));
    border: 1px solid rgba(167, 139, 250, 0.35);
    box-shadow: var(--bevel-inset);
    font-size: var(--fs-xs);
    color: var(--muted);
    line-height: 1.8;
    text-align: left;
  }

  /* 动作常驻：21 关战利品墙 + 结算统计在矮屏会滚，主按钮不能掉到首屏之外 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 0 -24px;
    padding: 10px 24px 18px;
    background: linear-gradient(
      180deg,
      rgba(9, 13, 22, 0) 0,
      rgba(9, 13, 22, 0.96) 16px,
      #090d16 100%
    );
  }

  /* 主按钮：金色厚键（与 .g-btn--primary .g-btn--lg 同规格） */
  button.primary {
    appearance: none;
    width: 100%;
    min-height: 52px;
    padding: 0 24px;
    border-radius: 12px;
    cursor: pointer;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: 4px;
    color: #1a1002;
    border: 1px solid #ffe7a3;
    background: var(--face-gold);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
    box-shadow:
      var(--bevel-top),
      inset 0 -3px 0 rgba(140, 80, 0, 0.55),
      0 4px 0 #7a4d05,
      0 10px 26px rgba(245, 184, 65, 0.35);
    -webkit-tap-highlight-color: transparent;
    transition:
      transform 0.09s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }
  button.primary:hover {
    background: var(--face-gold-hover);
  }
  button.primary:active {
    transform: translateY(3px);
    box-shadow:
      var(--bevel-top),
      inset 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  /* 精通结局：金色更重，边框更亮 */
  .mastered .card {
    border-color: rgba(245, 184, 65, 0.6);
    box-shadow:
      var(--sh-game-lg),
      var(--bevel-top),
      inset 0 0 90px rgba(245, 184, 65, 0.12);
  }

  /* 矮屏：收紧密度 */
  @media (max-height: 520px) {
    .card {
      gap: 8px;
      padding: 0 16px 0;
    }
    .card-rail {
      margin: 0 -16px 0;
      padding: 8px 12px;
    }
    .foot {
      margin: 0 -16px;
      padding: 8px 16px 14px;
    }
  }
</style>
