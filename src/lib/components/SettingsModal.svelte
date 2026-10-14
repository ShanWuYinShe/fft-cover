<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import Icon from './Icon.svelte';

  let {
    onclose,
    volume,
    onCycleVolume,
  }: { onclose: () => void; volume: number; onCycleVolume: () => void } = $props();

  const reduceMotion = $derived(!!engine.flags.reduceMotion);

  const DIFFS = [
    { id: 'easy', nm: '简单' },
    { id: 'normal', nm: '普通' },
    { id: 'hard', nm: '困难' },
  ] as const;

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="modal"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) onclose();
  }}
>
  <div class="box">
    <h2><Icon name="gear" size={16} /> 设置</h2>

    <div class="rows">
      <div class="row">
        <span class="k">音效</span>
        <button
          type="button"
          class="sw"
          class:on={engine.soundOn}
          aria-pressed={engine.soundOn}
          onclick={() => engine.setSound(!engine.soundOn)}
        >
          {engine.soundOn ? '开' : '关'}
        </button>
      </div>
      <div class="row">
        <span class="k">背景音乐</span>
        <button
          type="button"
          class="sw"
          class:on={engine.musicOn}
          aria-pressed={engine.musicOn}
          onclick={() => engine.setMusic(!engine.musicOn)}
        >
          {engine.musicOn ? '开' : '关'}
        </button>
      </div>
      <div class="row">
        <span class="k">音量</span>
        <button type="button" class="sw" onclick={onCycleVolume}>
          {volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音'}
        </button>
      </div>
      <div class="row">
        <span class="k">专家模式</span>
        <button
          type="button"
          class="sw"
          class:on={engine.expertMode}
          aria-pressed={engine.expertMode}
          onclick={() => engine.toggleExpert()}
        >
          {engine.expertMode ? '开' : '关'}
        </button>
      </div>
      <div class="row">
        <span class="k">随机 / 每日难度</span>
        <span class="chips">
          {#each DIFFS as d (d.id)}
            <button
              type="button"
              class="chip"
              class:on={engine.difficulty === d.id}
              onclick={() => engine.setDifficulty(d.id)}
            >
              {d.nm}
            </button>
          {/each}
        </span>
      </div>
      <div class="row">
        <span class="k">减少动画</span>
        <button
          type="button"
          class="sw"
          class:on={reduceMotion}
          aria-pressed={reduceMotion}
          onclick={() => engine.setFlag('reduceMotion', !reduceMotion)}
        >
          {reduceMotion ? '开' : '关'}
        </button>
      </div>
    </div>

    <p class="desc keys">
      专家模式会隐藏目标轮廓与预览，只靠频谱与收集反馈推导参数。减少动画会关掉抖动、弹动与错峰入场（系统开启了"减弱动态效果"时默认打开）。
    </p>
    <p class="desc keys">
      快捷键：空格 开始 / 暂停（结算后立即重开）· S 停止结算 · R 重置 · ⌘/Ctrl+Z 撤销 ·
      ⌘/Ctrl+Shift+Z 或 ⌘/Ctrl+Y 重做 · Esc 关闭面板
    </p>
    <p class="desc">
      原理：指针尖端位置 = Σ rₖ·e^(i(ωₖt+φₖ))——你调的每一根指针，都是目标曲线傅立叶展开中的一项。
    </p>
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
    z-index: 55;
  }
  .box {
    width: min(92vw, 380px);
    /* 矮屏（手机横屏 ~390px 高）里弹层必须能滚 */
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    /* 深海毛玻璃：模态弹出时游戏已停，属安全区；blur ≤12（复查 C-3）且带回退 */
    background: linear-gradient(170deg, rgba(20, 26, 48, 0.95), rgba(13, 17, 34, 0.94));
    @supports (backdrop-filter: blur(12px)) {
      background: linear-gradient(170deg, rgba(20, 26, 48, 0.88), rgba(13, 17, 34, 0.86));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    padding: 18px 20px;
    text-align: center;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  }
  h2 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 0 0 14px;
    font-size: 17px;
    letter-spacing: 2px;
  }
  /* Icon 是子组件,其 svg 带 Svelte scope 类,需 :global 才能命中 */
  h2 :global(svg) {
    color: var(--muted);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
  }
  .k {
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .sw {
    min-width: 62px;
    min-height: 30px;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    font-size: var(--fs-sm);
    cursor: pointer;
  }
  .sw.on {
    border-color: rgba(79, 209, 197, 0.6);
    background: var(--cyan-dim);
    color: var(--cyan);
  }
  .chips {
    display: inline-flex;
    gap: 4px;
  }
  .chip {
    min-height: 30px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--line-2);
    background: rgba(255, 255, 255, 0.03);
    color: var(--muted);
    font-size: var(--fs-xs);
    cursor: pointer;
  }
  .chip.on {
    border-color: rgba(79, 209, 197, 0.6);
    background: var(--cyan-dim);
    color: var(--cyan);
  }
  .desc {
    margin: 12px 0 0;
    font-size: var(--fs-xs);
    color: var(--muted);
    line-height: 1.8;
    text-align: left;
  }
  /* 说明组之间拉开一段呼吸距离（评审：设置弹窗信息压迫感） */
  .desc + .desc {
    margin-top: 10px;
  }
  .desc.keys {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--line-2);
    line-height: 1.7;
    color: var(--muted-2);
  }
  .primary {
    margin-top: 14px;
    width: 100%;
    min-height: 42px;
  }

  /* 触屏：开关与难度 chip 的热区补够（放样式块末尾，靠顺序压过基础规则） */
  @media (pointer: coarse), (max-width: 640px) {
    .sw,
    .chip {
      min-height: 40px;
    }
  }
</style>
