<script lang="ts">
  import Modal from './base/Modal.svelte';
  import Button from './base/Button.svelte';
  import { engine } from '../game/engine.svelte';

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
</script>

<Modal title="设置" icon="gear" size="md" {onclose}>
  <div class="settings-rows">
    <div class="setting-row">
      <span class="setting-k g-label">音效</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.soundOn}
        aria-pressed={engine.soundOn}
        onclick={() => engine.setSound(!engine.soundOn)}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.soundOn ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">背景音乐</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.musicOn}
        aria-pressed={engine.musicOn}
        onclick={() => engine.setMusic(!engine.musicOn)}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.musicOn ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">音量</span>
      <button type="button" class="toggle-btn" onclick={onCycleVolume}>
        <!-- 音量是循环档：三格电平条直观表示当前档位 -->
        <span class="bars" aria-hidden="true">
          <i class="bar" class:lite={volume > 0}></i>
          <i class="bar" class:lite={volume >= 0.5}></i>
          <i class="bar" class:lite={volume >= 1}></i>
        </span>
        <span class="tv">{volume === 1 ? '100%' : volume === 0.5 ? '50%' : '静音'}</span>
      </button>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">专家模式</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={engine.expertMode}
        aria-pressed={engine.expertMode}
        onclick={() => engine.toggleExpert()}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{engine.expertMode ? '开' : '关'}</span>
      </button>
    </div>

    <div class="setting-row setting-row--seg">
      <span class="setting-k g-label">随机 / 每日难度</span>
      <span class="chips" role="group" aria-label="随机与每日难度">
        {#each DIFFS as d (d.id)}
          <button
            type="button"
            class="chip"
            class:on={engine.difficulty === d.id}
            aria-pressed={engine.difficulty === d.id}
            onclick={() => engine.setDifficulty(d.id)}
          >
            {d.nm}
          </button>
        {/each}
      </span>
    </div>

    <div class="setting-row">
      <span class="setting-k g-label">减少动画</span>
      <button
        type="button"
        class="toggle-btn"
        class:on={reduceMotion}
        aria-pressed={reduceMotion}
        onclick={() => {
          // 显式切换（无论方向）都记 touched：否则「关」会删键回 undefined，
          // 系统偏好播种在下次刷新时把用户的显式关闭悄悄翻回开启（第三十八轮推演）
          engine.markFlag('reduceMotionTouched');
          engine.setFlag('reduceMotion', !reduceMotion);
        }}
      >
        <span class="lamp" aria-hidden="true"></span>
        <span class="tv">{reduceMotion ? '开' : '关'}</span>
      </button>
    </div>
  </div>

  <div class="settings-notes">
    <p class="desc">
      专家模式会隐藏目标轮廓与预览，只靠频谱与收集反馈推导参数。减少动画会关掉抖动、弹动与错峰入场（系统开启了“减弱动态效果”时默认打开）。
    </p>
    <p class="desc kb-only">
      快捷键：空格 开始 / 暂停（结算后立即重开）· S 停止结算 · R 重置 · ⌘/Ctrl+Z 撤销 ·
      ⌘/Ctrl+Shift+Z 或 ⌘/Ctrl+Y 重做 · Esc 关闭面板
    </p>
    <p class="desc formula">
      原理：指针尖端位置 = Σ rₖ·e^(i(ωₖt+φₖ))——你调的每一根指针，都是目标曲线傅立叶展开中的一项。
    </p>
  </div>

  {#snippet footer()}
    <Button variant="primary" size="md" onclick={onclose}>关 闭</Button>
  {/snippet}
</Modal>

<style>
  .settings-rows {
    /* 开关列宽：两个 --ctl-lg 加一个小间隔，五行左边缘对齐（不写死 px） */
    --ctl-col: calc(var(--ctl-lg) * 2 + var(--space-2));
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }

  /* 每一行 = 自己的白卡面：白面 + 浅蓝描边 + 硬投影 */
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 10px 12px 10px 14px;
    min-height: 56px;
    box-sizing: border-box;
    background: var(--mat-block);
    border: 2px solid var(--line);
    border-radius: var(--r-md);
    box-shadow: var(--mat-block-shadow);
  }

  .setting-row--seg {
    flex-wrap: wrap;
    row-gap: 10px;
  }

  /* 行标题：15px/800 深蓝字 + 左侧珊瑚铭牌条 */
  .setting-row .setting-k {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    padding-left: 12px;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-transform: none;
    color: var(--text);
    white-space: nowrap;
  }

  .setting-row .setting-k::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 4px;
    height: 18px;
    margin-top: -9px;
    border-radius: var(--r-pill);
    background: var(--coral);
  }

  /* 糖果拨钮：药丸槽 + 右端指示灯；开 = 薄荷面 */
  .toggle-btn {
    appearance: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    flex: none;
    width: var(--ctl-col);
    min-height: var(--ctl-md);
    padding: 0 32px 0 12px;
    border: 2px solid var(--line-bright);
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    color: var(--muted);
    font-family: var(--font-round);
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    letter-spacing: 0.5px;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: inset 0 2px 4px rgba(90, 150, 190, 0.18);
    -webkit-tap-highlight-color: transparent;
    transition:
      background 0.14s ease,
      color 0.14s ease,
      border-color 0.14s ease;
  }

  .toggle-btn:hover {
    border-color: var(--coral-text);
    color: var(--coral-edge);
  }

  /* 开：薄荷糖果面 + 深字（mint-ink 在薄荷上 7.5:1） */
  .toggle-btn.on {
    background: var(--face-jade);
    border-color: var(--mint-edge);
    color: var(--mint-ink);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.5),
      0 3px 0 var(--mint-edge);
  }

  /* 指示灯：关 = 浅蓝灯珠；开 = 白灯珠 */
  .lamp {
    position: absolute;
    right: 11px;
    top: 50%;
    width: 12px;
    height: 12px;
    margin-top: -6px;
    border-radius: 50%;
    flex: none;
    background: var(--line-bright);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .toggle-btn.on .lamp {
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
  }

  /* 音量：三格糖果电平 */
  .bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 3px;
    height: 14px;
    padding: 0 4px;
    border-radius: var(--r-sm);
    background: var(--mat-block);
    box-shadow: inset 0 1px 2px rgba(90, 150, 190, 0.2);
  }

  .bars .bar {
    width: 4px;
    border-radius: 2px;
    background: var(--line-bright);
  }

  .bars .bar:nth-child(1) {
    height: 6px;
  }
  .bars .bar:nth-child(2) {
    height: 9px;
  }
  .bars .bar:nth-child(3) {
    height: 13px;
  }

  .bars .bar.lite {
    background: var(--mint);
  }

  /* 分段器：浅蓝凹槽里放白药丸，选中 = 薄荷 */
  .chips {
    display: flex;
    gap: 4px;
    flex: none;
    padding: 4px;
    border-radius: var(--r-pill);
    background: var(--groove-bg);
    box-shadow: var(--groove-shadow);
  }

  .chip {
    appearance: none;
    min-width: 52px;
    min-height: calc(var(--ctl-md) - 8px);
    padding: 0 12px;
    cursor: pointer;
    color: var(--muted);
    font-family: var(--font-round);
    font-size: var(--ctl-font-sm);
    font-weight: 800;
    white-space: nowrap;
    border: none;
    border-radius: var(--r-pill);
    background: transparent;
    transition:
      color 0.12s ease,
      background 0.12s ease,
      box-shadow 0.12s ease;
  }

  .chip:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.75);
  }

  .chip.on {
    color: var(--mint-ink);
    background: var(--face-jade);
    box-shadow: 0 2px 0 var(--mint-edge);
  }

  /* 说明文字：每条都是自己的浅薄荷提示卡 */
  .settings-notes {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .desc {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 2px solid var(--note-edge);
    background: var(--note-bg);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.6;
    color: var(--muted);
  }

  .desc.formula {
    color: var(--grape-deep);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px;
  }

  /* 窄屏：分段选择器占满一行（高度由 --ctl-* 按指针类型自动切换） */
  @media (max-width: 640px) {
    .setting-row--seg .chips {
      width: 100%;
    }
    .setting-row--seg .chip {
      flex: 1 1 0;
    }
  }
</style>
