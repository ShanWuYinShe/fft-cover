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
          <span class="slot-no">{CIRCLED[i]}</span>
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
   * 指针调参台 · 一层盒子
   * 标题 + 槽位行 + 核心参数（ArmEditor）；
   * 无英文副标题、无容器外发光、字号 ≥12px
   * ============================================================ */
  .deck {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 10px 12px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--edge-faint);
    background: linear-gradient(180deg, rgba(12, 18, 30, 0.82), rgba(6, 10, 18, 0.9));
    box-shadow: var(--bevel-inset);
  }

  .deck-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .deck-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--gold-bright);
    white-space: nowrap;
  }
  .deck-hint {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }

  /* 槽位：安静的方块，只有选中态加金边与微光 */
  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 58px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.04);
    color: var(--muted);
    cursor: pointer;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      color 0.12s ease;
  }
  .slot:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .slot.on {
    color: var(--text);
  }
  .slot.active {
    border-color: var(--gold-bright);
    color: var(--gold-bright);
    background: rgba(245, 184, 65, 0.08);
    box-shadow: 0 0 8px rgba(245, 184, 65, 0.25);
  }
  /* 引导态专属描边：静态一层，不加发光；引导结束立即消失 */
  .slot.guide {
    outline: 2px solid var(--gold-bright);
    outline-offset: 2px;
    animation: slot-guide-pulse 1.6s ease-in-out infinite;
  }
  @keyframes slot-guide-pulse {
    0%,
    100% {
      outline-color: var(--gold-bright);
    }
    50% {
      outline-color: rgba(245, 184, 65, 0.35);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slot.guide {
      animation: none;
    }
  }
  :global(.reduce-motion) .slot.guide {
    animation: none;
  }

  .slot-no {
    font-family: 'STKaiti', 'KaiTi', 'Kaiti SC', serif;
    font-size: 15px;
    line-height: 1;
  }
  .slot .slot-lamp {
    width: 7px;
    height: 7px;
    background: #1b2334;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .slot.on .slot-lamp {
    background: var(--cyan);
    box-shadow: none;
  }
  .slot.active.on .slot-lamp {
    background: var(--gold-bright);
  }
</style>
