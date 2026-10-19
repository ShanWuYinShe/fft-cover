<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { CIRCLED } from '../game/constants';
  import ArmEditor from './ArmEditor.svelte';
  import { pluck } from '../game/audio';
  import { haptic } from '../game/haptics';

  /** 当前编辑的指针序号（点击槽位切换） */
  let selected = $state(0);

  const cur = $derived(engine.arms[selected]);
  const armLimit = $derived(engine.level?.armLimit ?? 10);
  /** 椭圆关引导进行中：高亮「指针 ②」的启用键，引导结束即消失 */
  const ellipseGuide = $derived(engine.showEllipseGuide && engine.phase === 'edit');

  const CELESTIAL_NAMES = [
    '天枢',
    '天璇',
    '天玑',
    '天权',
    '玉衡',
    '开阳',
    '摇光',
    '洞明',
    '隐元',
    '紫微',
  ];

  function pick(i: number): void {
    if (i >= armLimit) return;
    if (!engine.arms[i].on) engine.setArm(i, { on: true });
    selected = i;
    pluck(261.6 + i * 36, engine.soundOn);
    haptic(12, engine.soundOn);
  }
</script>

<!-- 指针调参台：默认只露本关槽位 + 核心参数，其他折进 ArmEditor 的「高级调谐」 -->
<section class="deck" aria-label="指针调参">
  <div class="deck-head">
    <h2 class="deck-title">指针</h2>
    <span class="deck-hint">点一下选中并通电</span>
  </div>

  <!-- 槽位数量按本关上限（第一关只有 1 个） -->
  <div class="slots" role="tablist" aria-label="指针通道选择">
    {#each engine.arms as arm, i (i)}
      {#if i < armLimit}
        {@const isSelected = selected === i}
        {@const isCCW = arm.freq < 0}
        <button
          type="button"
          role="tab"
          aria-selected={isSelected}
          class="slot"
          class:active={isSelected}
          class:on={arm.on}
          class:guide={ellipseGuide && i === 1}
          aria-label={`指针 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）${arm.on ? '已通电' : '未通电'}`}
          title={arm.on
            ? `指针 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）：半径 ${arm.r}px · ${Math.abs(arm.freq)}×${isCCW ? '逆' : '顺'} · 相位 ${Math.round((arm.phase * 180) / Math.PI)}°`
            : `点击启通指针 ${CIRCLED[i]}（${CELESTIAL_NAMES[i]}）`}
          onclick={() => pick(i)}
        >
          <!-- 内嵌律柱：柱槽 + 自下而上的通电能量柱（纯装饰层） -->
          <span class="slot-fill" aria-hidden="true"></span>
          <span class="slot-no g-num">{CIRCLED[i]}</span>
          <span class="g-lamp slot-lamp" aria-hidden="true"></span>
        </button>
      {/if}
    {/each}
  </div>

  <hr class="g-divider" />

  {#if cur}
    <ArmEditor index={selected} arm={cur} />
  {/if}
</section>

<style>
  /* ============================================================
   * 指针调参台 · 器物化（第五轮）
   * 面板：青铜边 + 金属面 + 内暗线；段头：3px 金铭牌块；
   * 槽位：青铜切角插槽（切角写法 = 外层铜色 + ::before 内缩 1px 当槽腔）
   *       + 内嵌可通电律柱 + 菱形宝石灯；选中 = 金边 + 金宝石。
   * 不发光（宝石灯自身是唯一例外）；动效沿用前几轮。
   * ============================================================ */
  .deck {
    display: flex;
    flex-direction: column;
    min-width: 0;
    /* 机坞比面板高时把面板撑满（第六轮：消灭机坞下半屏死区） */
    flex: 1 0 auto;
    padding: 8px 10px 10px;
    border-radius: var(--radius-md);
    border: 1px solid var(--edge-bronze);
    background: var(--face-plate);
    box-shadow:
      var(--bevel-top),
      inset 0 0 0 1px rgba(0, 0, 0, 0.55),
      0 3px 8px rgba(0, 0, 0, 0.42);
    /* 区块首次出现：上移 6px 淡入；只在挂载时播一次，重复渲染不重播 */
    animation: deck-in 300ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  @keyframes deck-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .deck-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  /* 段头铭牌：左侧 3px 金块 + 金色铭文字 */
  .deck-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: var(--ctl-font);
    font-weight: 700;
    letter-spacing: 1.2px;
    color: var(--gold-bright);
    white-space: nowrap;
  }
  .deck-title::before {
    content: '';
    flex: none;
    width: 3px;
    height: 13px;
    background: var(--face-gold-plate);
    clip-path: var(--chamfer-sm);
  }
  .deck-hint {
    font-size: var(--ctl-font-sm);
    color: var(--muted);
    white-space: nowrap;
  }

  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  /* 插槽：外层 = 1px 青铜边（切角），::before = 内缩的凹槽腔 */
  .slot {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 42px;
    min-height: var(--ctl-md);
    padding: 0 5px;
    border: none;
    clip-path: var(--chamfer-sm);
    background: var(--edge-bronze);
    color: var(--muted);
    cursor: pointer;
    transition:
      color 120ms ease,
      background 120ms ease,
      filter 120ms ease,
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .slot::before {
    content: '';
    position: absolute;
    inset: 1px;
    z-index: -1;
    clip-path: var(--chamfer-sm);
    background: linear-gradient(180deg, #0a1222 0%, #05080f 100%);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.85);
  }
  .slot:hover {
    color: var(--text);
    background: var(--edge-bronze-hot);
  }
  .slot.on {
    color: var(--text);
  }
  .slot.on::before {
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.8),
      inset 0 0 0 1px rgba(0, 245, 212, 0.16);
  }
  /* 选中：金边（只换边色，不加外发光） */
  .slot.active {
    color: var(--gold-bright);
    background: var(--edge-bronze-hot);
  }
  .slot.active::before {
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.8),
      inset 0 0 0 1px rgba(245, 184, 65, 0.32);
  }
  /* 按下：面下沉 1px + 内阴影加深（第五轮四态；桌面不整块缩放） */
  .slot:active:not(:disabled)::before {
    inset: 2px 1px 1px;
    box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.9);
  }

  /* 内嵌律柱：竖直柱槽；通电时能量柱自下而上填充（开 240ms / 关 140ms 反向） */
  .slot-fill {
    position: relative;
    z-index: 1;
    flex: none;
    width: 7px;
    height: calc(var(--ctl-md) - 12px);
    border-radius: 2px;
    border: 1px solid rgba(201, 162, 74, 0.4);
    background: #04070c;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9);
    overflow: hidden;
    pointer-events: none;
    transition: border-color 240ms ease;
  }
  .slot-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: scaleY(0);
    transform-origin: bottom center;
    background: linear-gradient(180deg, #9cf8e6 0%, #2fd8bb 45%, #0a7a68 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    transition: transform 140ms ease-out;
  }
  .slot.on .slot-fill {
    border-color: rgba(0, 245, 212, 0.55);
  }
  .slot.on .slot-fill::after {
    transform: scaleY(1);
    transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .slot-no {
    position: relative;
    z-index: 1;
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0;
    text-shadow: none;
  }
  /* 宝石灯：菱形小石。通电 = 青宝石，选中 = 金宝石（唯一允许的发光处） */
  .slot .slot-lamp {
    position: relative;
    z-index: 1;
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 1px;
    transform: rotate(45deg);
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .slot.on .slot-lamp {
    background: radial-gradient(circle at 35% 30%, #dffff7 0%, #00f5d4 60%, #065f52 100%);
    box-shadow: 0 0 4px rgba(0, 245, 212, 0.65);
  }
  .slot.active .slot-lamp {
    background: radial-gradient(circle at 35% 30%, #fffbe8 0%, #ffd166 60%, #a86b00 100%);
    box-shadow: 0 0 5px rgba(255, 209, 102, 0.75);
  }

  /* 引导态专属高亮：clip-path 会切掉 outline，改用沿切角形状的金色描边光晕 */
  .slot.guide {
    animation: slot-guide-pulse 1.6s ease-in-out infinite;
  }
  @keyframes slot-guide-pulse {
    0%,
    100% {
      filter: drop-shadow(0 0 2px var(--gold-bright)) drop-shadow(0 0 1px var(--gold-bright));
    }
    50% {
      filter: drop-shadow(0 0 2px rgba(245, 184, 65, 0.3));
    }
  }

  /* 触屏：按下保留缩放回弹（桌面用下沉） */
  @media (pointer: coarse) {
    .slot:active:not(:disabled) {
      transform: scale(0.97);
      transition-timing-function: ease-out;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .slot.guide,
    .deck {
      animation: none;
    }
    .slot,
    .slot-fill,
    .slot-fill::after {
      transition: none;
    }
    .slot.guide {
      filter: drop-shadow(0 0 1px var(--gold-bright));
    }
    .slot:active:not(:disabled) {
      transform: none;
    }
    .slot:active:not(:disabled)::before {
      inset: 1px;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.85);
    }
    .slot.on .slot-fill::after {
      transform: scaleY(1);
    }
  }
  :global(.reduce-motion) .slot.guide,
  :global(.reduce-motion) .deck {
    animation: none;
  }
  :global(.reduce-motion) .slot,
  :global(.reduce-motion) .slot-fill,
  :global(.reduce-motion) .slot-fill::after {
    transition: none;
  }
  :global(.reduce-motion) .slot.guide {
    filter: drop-shadow(0 0 1px var(--gold-bright));
  }
  :global(.reduce-motion) .slot:active:not(:disabled) {
    transform: none;
  }
  :global(.reduce-motion) .slot:active:not(:disabled)::before {
    inset: 1px;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.85);
  }
</style>
