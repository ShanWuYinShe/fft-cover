<script lang="ts">
  import Stage from './lib/components/Stage.svelte';
  import ArmCard from './lib/components/ArmCard.svelte';
  import LevelPicker from './lib/components/LevelPicker.svelte';
  import ScorePanel from './lib/components/ScorePanel.svelte';
  import ResultOverlay from './lib/components/ResultOverlay.svelte';
  import AchievementsModal from './lib/components/AchievementsModal.svelte';
  import { engine } from './lib/game/engine.svelte';
  import {
    achvSound,
    beep,
    finishChord,
    perfectArpeggio,
    setVolume,
    getVolume,
  } from './lib/game/audio';

  let showAchv = $state(false);
  let volume = $state(getVolume());

  /** 音量三态循环 1 → 0.5 → 0（静音时同步引擎开关） */
  function cycleVolume(): void {
    const next = volume === 1 ? 0.5 : volume === 0.5 ? 0 : 1;
    volume = next;
    setVolume(next);
    engine.setSound(next > 0);
  }
  const volIcon = $derived(volume === 1 ? '🔊' : volume === 0.5 ? '🔉' : '🔇');

  // 新手引导：首次访问显示（flag 持久化在引擎 flags 里）
  const tutorialSeen = $derived(!!engine.flags['tutorialSeen']);

  // 成就解锁 toast：3 秒后自动消失
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!engine.toast) return;
    achvSound(engine.soundOn);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => engine.clearToast(), 3000);
  });

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
      if (engine.phase === 'done') {
        engine.resetRun();
        engine.startRun(); // 快速迭代：结算后空格立即重开
      } else {
        toggleRun();
      }
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
        <button
          title="按目标频谱自动解出精确参数（动画演示傅立叶逐项逼近）"
          disabled={engine.autoSolve}
          onclick={() => engine.startAutoSolve()}
        >
          🪄 {engine.autoSolve ? '拟合中…' : '自动拟合'}
        </button>
        <button title="沙盒转速档位" onclick={() => engine.cycleSpeed()}>⚡ {engine.speed}×</button>
        <button onclick={() => engine.resetRun()}>⟲ 重置点</button>
        <button title="音量（点击循环 全/半/静）" onclick={cycleVolume}>
          {volIcon}
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
        <button title="音量（点击循环 全/半/静）" onclick={cycleVolume}>
          {volIcon}
        </button>
        <button title="成就" onclick={() => (showAchv = true)}>🏆</button>
      {/if}
    </div>
  </section>

  <aside class="panel">
    <LevelPicker />
    <ScorePanel />
    <section>
      <h2>
        指针
        <span class="muted"
          >（本关上限 {engine.level?.armLimit ?? 10} 根；⟲ 切换旋转方向，点击数值精确输入）</span
        >
      </h2>
      <div class="tools-row">
        <button
          title="在频谱仪上叠加目标曲线的真实频谱（教学用）"
          class:gold={engine.spectrumCompare}
          onclick={() => engine.toggleSpectrumCompare()}
        >
          🔍 频谱对比
        </button>
        <button title="随机化已启用指针的半径与相位" onclick={() => engine.randomizeArms()}>
          🎲 随机参数
        </button>
        <button title="全部指针清零关闭" onclick={() => engine.clearArms()}>⭯ 清零</button>
        {#if engine.hasSavedArms()}
          <button title="载入本关最佳得分那局的指针配置" onclick={() => engine.loadSavedArms()}>
            📥 上届解法
          </button>
        {/if}
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
{#if showAchv}
  <AchievementsModal onclose={() => (showAchv = false)} />
{/if}
{#if !tutorialSeen}
  <div class="tutorial">
    <div class="tut-box">
      <h2>怎么玩？</h2>
      <ol>
        <li>右侧启用指针并拖动滑块——<b>金色虚线</b>是目标曲线，把你的<b>紫色轨迹</b>贴上去</li>
        <li>点「▶ 开始旋转」，指针尖端每扫过一个点就得分，连收有连击加成</li>
        <li>跑完结算星级；卡关就开「🔍 频谱对比」看目标的真实傅立叶系数</li>
      </ol>
      <button
        class="primary"
        onclick={() => {
          engine.markFlag('tutorialSeen');
        }}
      >
        开始挑战
      </button>
    </div>
  </div>
{/if}
{#if engine.toast}
  <div class="toast">🏆 解锁成就：{engine.toast.name}</div>
{/if}
