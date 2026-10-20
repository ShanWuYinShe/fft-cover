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

<!-- 指针调参台：本关槽位 + 核心参数白卡，其他精度工具折进 ArmEditor 的「高级调谐」 -->
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
          <span class="slot-lamp" aria-hidden="true"></span>
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
   * 指针调参台 · 厚卡纸（第十四轮）
   * 底板 = 浅蓝卡纸（白边 + 硬投影），里面才是白色参数卡；
   * 槽位 = 圆形厚按键：白面浅蓝边 → 选中变珊瑚面并压下去；
   * 未通电整体降饱和，通电靠薄荷小灯点题。
   * 没有回纹 / 铆钉 / 切角 / 发光。
   * ============================================================ */
  .deck {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1 0 auto;
    padding: 12px 14px 14px;
    border: 3px solid #ffffff;
    border-radius: var(--r-lg);
    background: var(--bg-chassis);
    box-shadow: var(--mat-block-shadow);
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
  /* 段头：珊瑚圆点 + 珊瑚深字（不用金属铭牌） */
  .deck-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    font-family: var(--font-round);
    font-size: var(--fs-lg);
    font-weight: 900;
    letter-spacing: 0.5px;
    /* 16px 正文级：coral-edge 4.45:1 压线，改 coral-text 5.55:1 */
    color: var(--coral-text);
    white-space: nowrap;
  }
  .deck-title::before {
    content: '';
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--coral);
    box-shadow: 0 2px 0 var(--coral-edge);
  }
  .deck-hint {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--muted);
    white-space: nowrap;
  }

  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }

  /* ---------- 槽位：圆形厚实体（白面 + 浅蓝边 + 4px 硬侧壁） ---------- */
  .slot {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--ctl-lg);
    height: var(--ctl-lg);
    padding: 0;
    border: 3px solid var(--line);
    border-radius: 50%;
    background: #ffffff;
    color: var(--muted);
    cursor: pointer;
    box-shadow: 0 4px 0 var(--mat-frame-line);
    transition:
      color 120ms ease,
      background 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 120ms ease;
  }
  .slot:hover:not(.active) {
    border-color: var(--line-bright);
    color: var(--text);
    transform: translateY(-1px);
  }
  .slot:focus-visible {
    outline: 3px solid var(--sky-deep);
    outline-offset: 3px;
  }
  /* 未通电：降饱和（仍可点，点一下就通电） */
  .slot:not(.on) {
    filter: saturate(0.25);
    opacity: 0.82;
  }

  /* 选中：珊瑚填充 + 白边 + 下沉感（侧壁变薄、内影加深、整体压 2px） */
  .slot.active {
    border-color: #ffffff;
    background: var(--plate-brass);
    color: var(--coral-ink);
    box-shadow:
      0 2px 0 var(--coral-edge),
      inset 0 3px 8px rgba(150, 40, 10, 0.26);
    transform: translateY(2px);
  }
  .slot:active:not(.active) {
    box-shadow: 0 1px 0 var(--mat-frame-line);
    transform: translateY(2px);
  }

  .slot-no {
    font-family: var(--font-round);
    font-size: 18px;
    font-weight: 900;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }

  /* 小灯：右下角一颗糖果点。断电 = 浅蓝，通电 = 薄荷 */
  .slot-lamp {
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    background: var(--line-bright);
  }
  .slot.on .slot-lamp {
    background: var(--mint);
    box-shadow: 0 1px 0 var(--mint-edge);
  }

  /* 引导态：珊瑚描边呼吸（不用发光毛边） */
  .slot.guide {
    animation: slot-guide-pulse 1.6s ease-in-out infinite;
  }
  @keyframes slot-guide-pulse {
    0%,
    100% {
      outline: 3px solid var(--coral);
      outline-offset: 2px;
    }
    50% {
      outline: 3px solid var(--coral-bright);
      outline-offset: 4px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .slot.guide,
    .deck {
      animation: none;
    }
    .slot {
      transition: none;
    }
    .slot:hover:not(.active),
    .slot.active,
    .slot:active:not(.active) {
      transform: none;
    }
  }
  :global(.reduce-motion) .slot.guide,
  :global(.reduce-motion) .deck {
    animation: none;
  }
  :global(.reduce-motion) .slot {
    transition: none;
  }
  :global(.reduce-motion) .slot:hover:not(.active),
  :global(.reduce-motion) .slot.active,
  :global(.reduce-motion) .slot:active:not(.active) {
    transform: none;
  }
</style>
