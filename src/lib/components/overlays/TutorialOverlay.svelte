<script lang="ts">
  import { engine } from '../../game/engine.svelte';

  let { onstart }: { onstart?: () => void } = $props();

  function onDismiss(): void {
    engine.markFlag('tutorialSeen');
    if (onstart) onstart();
  }
</script>

<div class="tutorial-backdrop" role="dialog" aria-modal="true">
  <div class="tut-box">
    <h2 class="font-celestial">怎么玩？</h2>
    <ol class="tut-list">
      <li>在指针面板启用指针并调参——<b>金色虚线</b>是目标曲线，让<b>紫色轨迹</b>贴上去</li>
      <li>点「▶ 开始旋转」，指针尖端每扫过一个点就得分，连收有连击加成</li>
      <li>跑完结算星级；卡关就开「频谱对比」看目标的真实傅立叶系数</li>
    </ol>
    <button type="button" class="tut-start-btn font-celestial" onclick={onDismiss}>
      开始挑战
    </button>
  </div>
</div>

<style>
  .tutorial-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fade-in 0.25s ease-out;
  }

  .tut-box {
    background: linear-gradient(175deg, rgba(16, 24, 42, 0.98), rgba(8, 12, 22, 0.99));
    border: 1px solid rgba(245, 184, 65, 0.4);
    border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-6);
    max-width: 440px;
    width: 100%;
    box-shadow:
      0 16px 50px rgba(0, 0, 0, 0.8),
      0 0 25px rgba(245, 184, 65, 0.15);
    animation: modal-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  }

  .tut-box h2 {
    margin: 0 0 var(--space-4);
    font-size: var(--fs-xl);
    color: var(--gold-bright);
    letter-spacing: 2px;
    text-align: center;
  }

  .tut-list {
    margin: 0 0 var(--space-6);
    padding-left: var(--space-5);
    color: var(--text);
    font-size: var(--fs-md);
    line-height: 1.7;
  }

  .tut-list li {
    margin-bottom: var(--space-3);
  }

  .tut-list b {
    color: var(--gold-bright);
  }

  .tut-start-btn {
    appearance: none;
    width: 100%;
    height: 42px;
    background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 100%);
    border: 1px solid var(--gold-bright);
    border-radius: var(--radius-md);
    color: #060911;
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(245, 184, 65, 0.45);
    transition: all 0.15s ease;
  }
  .tut-start-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(245, 184, 65, 0.6);
  }
</style>
