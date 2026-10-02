<script lang="ts">
  import Stage from './lib/components/Stage.svelte';
  import ArmCard from './lib/components/ArmCard.svelte';
  import LevelPicker from './lib/components/LevelPicker.svelte';
  import ScorePanel from './lib/components/ScorePanel.svelte';
  import ResultOverlay from './lib/components/ResultOverlay.svelte';
  import { engine } from './lib/game/engine.svelte';
  import { beep, finishChord, perfectArpeggio } from './lib/game/audio';

  function toggleRun(): void {
    engine.toggleRun();
    beep(engine.phase === 'running' ? 440 : 330, 0.06, 'square', 0.06, engine.soundOn);
  }
  function stopRun(): void {
    const was = engine.phase;
    engine.stopRun();
    if (engine.phase === 'done' && (was === 'running' || was === 'paused')) {
      if (engine.collectedCount === engine.total) perfectArpeggio(engine.soundOn);
      else finishChord(engine.soundOn);
    }
  }
  function onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      toggleRun();
    } else if (e.key === 's' || e.key === 'S') {
      stopRun();
    } else if (e.key === 'r' || e.key === 'R') {
      engine.resetRun();
      beep(300, 0.06, 'square', 0.06, engine.soundOn);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<header>
  <h1>傅立叶指针</h1>
  <p class="sub">
    把最多 10 个旋转指针首尾相连——它们的合成就是一条傅立叶级数曲线，让指尖收集尽可能多的点
  </p>
</header>

<main>
  <section class="stage-wrap">
    <div class="canvas-box">
      <Stage />
      <div class="hud">
        <span class="lvl">{engine.level?.name ?? ''}{engine.sandbox ? ' 🧪' : ''}</span>
        <span class="score">收集 <b>{engine.collectedCount}</b>/{engine.total}</span>
      </div>
      {#if engine.phase === 'done'}
        <ResultOverlay />
      {/if}
    </div>
    <div class="run-row">
      {#if engine.sandbox}
        <button class="primary" onclick={() => engine.exitSandbox()}>⏹ 结束沙盒</button>
        <button onclick={() => engine.resetRun()}>⟲ 重置点</button>
        <button title="音效开关" onclick={() => engine.setSound(!engine.soundOn)}>
          {engine.soundOn ? '🔊' : '🔇'}
        </button>
      {:else}
        <button class="primary" onclick={toggleRun}>{engine.runLabel}</button>
        <button
          onclick={stopRun}
          disabled={engine.phase !== 'running' && engine.phase !== 'paused'}
        >
          ⏹ 停止结算
        </button>
        <button onclick={() => engine.resetRun()}>⟲ 重置点</button>
        <button
          title="无限时自由旋转，实时调参，成绩不计入记录"
          disabled={engine.phase === 'running' || engine.phase === 'paused'}
          onclick={() => engine.enterSandbox()}
        >
          🧪 沙盒
        </button>
        <button title="音效开关" onclick={() => engine.setSound(!engine.soundOn)}>
          {engine.soundOn ? '🔊' : '🔇'}
        </button>
      {/if}
    </div>
  </section>

  <aside class="panel">
    <LevelPicker />
    <ScorePanel />
    <section>
      <h2>
        指针
        <span class="muted">（本关上限 {engine.level?.armLimit ?? 10} 根；频率负数 = 反转）</span>
      </h2>
      <div class="tools-row">
        <button title="随机化已启用指针的半径与相位" onclick={() => engine.randomizeArms()}>
          🎲 随机参数
        </button>
        <button title="全部指针清零关闭" onclick={() => engine.clearArms()}>⭯ 清零</button>
      </div>
      <div id="arms-grid">
        {#each engine.arms as arm, i (i)}
          <ArmCard {arm} index={i} />
        {/each}
      </div>
    </section>
    <section class="tips">
      <p>快捷键：<kbd>空格</kbd> 开始/暂停 · <kbd>S</kbd> 停止结算 · <kbd>R</kbd> 重置</p>
      <p>
        原理：指针尖端位置 = Σ rₖ·e<sup>i(ωₖt+φₖ)</sup
        >。你调的每一根指针，都是目标曲线傅立叶展开中的一项——旋转玩法的背后就是傅立叶变换。
      </p>
    </section>
  </aside>
</main>
