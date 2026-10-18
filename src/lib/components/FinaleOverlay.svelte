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

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  /** 战绩数字：0 → 终值 count-up（600ms easeOut，结束帧取终值保证与引擎一致） */
  const statTargets = $derived([
    totalStars,
    cleared,
    perfectCount,
    exactCount,
    expertCount,
    seals.done,
    seals.chapters,
  ]);
  let shown = $state<number[]>([0, 0, 0, 0, 0, 0, 0]);
  $effect(() => {
    const targets = statTargets;
    if (reduceMotion) {
      shown = targets.slice();
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 600;
    const tick = (now: number): void => {
      const p = Math.min((now - t0) / dur, 1);
      if (p >= 1) {
        shown = targets.slice();
        return;
      }
      const e = 1 - Math.pow(1 - p, 3);
      shown = targets.map((t) => Math.round(t * e));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<svelte:window onkeydown={onKey} />

<div
  class="finale"
  class:mastered
  role="dialog"
  aria-modal="true"
  aria-label={mastered ? '全部关卡三星达成' : '通关达成'}
>
  <!-- 完结演出：一块平板 + 落款朱印；内层滚动，主操作常驻 -->
  <div class="card-wrap">
    <div class="card g-rivets">
      <div class="card-rail">
        <span class="g-label">周天完结</span>
        <span class="rail-lv">{mastered ? '三星精通' : '首次通关'}</span>
      </div>
      <!-- 落款朱印：书画收尾的那一方印 -->
      <div class="seal g-seal" aria-hidden="true">{mastered ? '大成' : '通关'}</div>
      <div class="burst"><Icon name={mastered ? 'crown' : 'flag'} size={28} /></div>
      <h2>{mastered ? '谐波大师' : '通关！'}</h2>
      <p class="sub">
        {#if mastered}
          全部 {LEVEL_DEFS.length} 关三星——任意周期曲线，你都能反解出它的傅立叶系数
        {:else}
          {CHAPTERS.length} 个章节、{LEVEL_DEFS.length} 关全部走完——从一根指针画圆，到七根齐发的团花与古钟
        {/if}
      </p>

      <!-- 战绩：一行行文字读数（不做卡片阵列） -->
      <div class="stats">
        <div class="cell">
          <b class="g-num g-num--gold">{shown[0]}<i>/{maxStars}</i></b><span>总星数</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[1]}<i>/{LEVEL_DEFS.length}</i></b><span>已通关</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[2]}<i>/{LEVEL_DEFS.length}</i></b><span>完美全清</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[3]}<i>/{LEVEL_DEFS.length}</i></b><span>精确解</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[4]}<i>/{LEVEL_DEFS.length}</i></b><span>专家全清</span
          >
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[5]}<i>/{seals.total}</i></b><span>本关目标</span>
        </div>
        <div class="cell">
          <b class="g-num g-num--gold">{shown[6]}<i>/{seals.chaptersTotal}</i></b><span>章节印</span
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
          专家模式全清（不显示轮廓）——四枚目标集齐后，章头还会盖上该章的章节印。
        {/if}
      </p>

      <div class="foot">
        <button
          type="button"
          class="primary g-btn g-btn--primary g-btn--lg"
          onclick={() => engine.dismissFinale()}
        >
          继续挑战
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
    background: rgba(4, 6, 12, 0.88);
    backdrop-filter: blur(5px);
    animation: fin-fade 0.35s ease-out;
  }
  @keyframes fin-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* 外框：限高，内层滚动 */
  .card-wrap {
    position: relative;
    width: min(94vw, 440px);
    max-height: calc(100dvh - 24px);
    display: flex;
  }

  .card {
    position: relative;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    background: var(--metal);
    border: 1px solid var(--edge-soft);
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    animation: fin-pop 0.45s cubic-bezier(0.34, 1.3, 0.64, 1);
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 184, 65, 0.3) transparent;
  }
  @keyframes fin-pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .card-rail {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 0 -20px 2px;
    padding: 10px 14px 8px;
    border-bottom: 1px solid var(--edge-faint);
    border-radius: 10px 10px 0 0;
  }
  .rail-lv {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }

  /* 落款朱印：竖排两字（避开右上角） */
  .seal {
    position: absolute;
    top: 46px;
    right: 12px;
    width: 36px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    writing-mode: vertical-rl;
    text-orientation: upright;
    letter-spacing: 2px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 16px;
    font-weight: 700;
    color: #fdece7;
    background: linear-gradient(160deg, #c0392b, #8e2a1f);
    border-radius: 5px;
    animation: seal-stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s backwards;
  }
  @keyframes seal-stamp {
    from {
      opacity: 0;
      transform: rotate(-8deg) scale(1.3);
    }
    to {
      opacity: 1;
      transform: rotate(-6deg) scale(1);
    }
  }

  .burst {
    margin-top: 22px;
    color: var(--gold-bright);
    line-height: 1;
    animation: fin-burst 0.6s cubic-bezier(0.34, 1.5, 0.64, 1);
  }
  @keyframes fin-burst {
    0% {
      transform: scale(0.6) rotate(-8deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.06) rotate(2deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0);
    }
  }

  h2 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 5px;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    color: var(--gold-bright);
  }

  .sub {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.75;
  }

  /* 战绩读数：两列文本 + 分隔线 */
  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 22px;
    width: 100%;
    margin-top: 4px;
    text-align: left;
  }
  .cell {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px solid var(--edge-faint);
  }
  .cell b {
    font-size: 20px;
    order: 2;
  }
  .cell b i {
    font-style: normal;
    font-size: var(--fs-sm);
    color: var(--muted-2);
    font-weight: 400;
    text-shadow: none;
  }
  .cell span {
    font-size: var(--fs-sm);
    color: var(--muted);
    order: 1;
  }

  /* 战利品墙：按章排列全部曲线的缩略轮廓（无外框） */
  .wall {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    margin: 6px 0 2px;
    padding: 12px 0;
    border-top: 1px solid var(--edge-faint);
    border-bottom: 1px solid var(--edge-faint);
  }
  .wall-ch {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
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
    animation: wall-in 0.4s cubic-bezier(0.34, 1.3, 0.64, 1) backwards;
  }
  .wall-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .wall-item:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 1px;
  }
  @keyframes wall-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .wall-item svg,
  .wall-item .wall-st {
    opacity: 0.45;
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
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }
  .wall-item svg {
    width: 38px;
    height: 38px;
  }
  .wall-item polyline {
    fill: none;
    stroke: rgba(150, 170, 200, 0.6);
    stroke-width: 8;
    stroke-linejoin: round;
  }
  .wall-item.lit polyline {
    stroke: rgba(0, 245, 212, 0.9);
  }
  .wall-item.full polyline {
    stroke: rgba(245, 184, 65, 0.95);
  }
  .wall-st {
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--gold);
    line-height: 1;
  }
  /* 悬停/键盘聚焦时冒出关卡名 */
  .wall-tip {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 3px);
    transform: translateX(-50%) translateY(2px);
    padding: 2px 8px;
    border-radius: 5px;
    border: 1px solid var(--edge-faint);
    background: var(--metal-3);
    color: var(--text);
    font-size: 12px;
    line-height: 18px;
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
    width: 20px;
    height: 20px;
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
    font-size: var(--fs-sm);
    color: var(--muted);
    line-height: 1.7;
    text-align: left;
  }

  /* 主操作常驻：战利品墙在矮屏会滚，按钮不能掉出首屏 */
  .foot {
    position: sticky;
    bottom: 0;
    align-self: stretch;
    display: flex;
    justify-content: center;
    margin: 0 -20px;
    padding: 12px 20px 16px;
    background: linear-gradient(
      180deg,
      rgba(11, 17, 30, 0) 0,
      rgba(11, 17, 30, 0.96) 16px,
      #0b111e
    );
  }

  button.primary {
    width: 100%;
    min-height: var(--ctl-lg);
    padding: 0 20px;
    cursor: pointer;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 2px;
    -webkit-tap-highlight-color: transparent;
    /* 形与四态交给公共件 .g-btn--primary（牌匾）：本地只保留布局与字号 */
  }
  button.primary:hover {
    background: var(--face-gold-hover);
  }
  button.primary:active {
    transform: translateY(2px);
  }

  /* 精通结局：标题更亮，不加额外装饰 */
  .mastered h2 {
    color: var(--gold-bright);
  }

  /* 减弱动态效果：位移/缩放动画关闭（颜色/透明度保留） */
  @media (prefers-reduced-motion: reduce) {
    .card,
    .seal,
    .burst,
    .wall-item {
      animation: none;
    }
  }
  :global(.reduce-motion) .card,
  :global(.reduce-motion) .seal,
  :global(.reduce-motion) .burst,
  :global(.reduce-motion) .wall-item {
    animation: none;
  }

  /* 矮屏：收紧密度 */
  @media (max-height: 520px) {
    .card {
      gap: 9px;
      padding: 0 16px;
    }
    .card-rail {
      margin: 0 -16px 0;
      padding: 9px 12px;
    }
    .foot {
      margin: 0 -16px;
      padding: 10px 16px 14px;
    }
    .wall {
      gap: 5px;
      padding: 8px 0;
    }
  }
</style>
