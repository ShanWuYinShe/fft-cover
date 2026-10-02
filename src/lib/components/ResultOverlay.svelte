<script lang="ts">
  import { engine, starsFor } from '../game/engine.svelte';

  type CopyState = 'idle' | 'ok' | 'fail';
  let copyState = $state<CopyState>('idle');

  /** 兼容降级：旧式 execCommand 复制 */
  function fallbackCopy(text: string): boolean {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function copyReport(): Promise<void> {
    let ok = false;
    try {
      await navigator.clipboard.writeText(engine.buildReport());
      ok = true;
    } catch {
      ok = fallbackCopy(engine.buildReport());
    }
    copyState = ok ? 'ok' : 'fail';
    setTimeout(() => (copyState = 'idle'), 1500);
  }

  const words = [
    '再调调指针，让它扫过更多点！',
    '有点意思了！试着叠加一根新指针。',
    '相当不错！微调相位还能更准。',
    '完美拟合！你已掌握谐波的力量！',
  ];

  const n = $derived(engine.total);
  const got = $derived(engine.collectedCount);
  const st = $derived(starsFor(n ? got / n : 0));
  const best = $derived(engine.level ? (engine.bestStars[engine.level.id] ?? 0) : 0);
</script>

<div class="result">
  {#if engine.lastRunSandbox}
    <div class="stars">🧪</div>
    <div class="line">沙盒探索结束：收集 {got} / {n} 点 · 得分 {engine.score}</div>
    <div class="best">沙盒成绩不计入记录——挑战模式见真章！</div>
  {:else}
    <div class="stars">{'★'.repeat(st)}{'☆'.repeat(3 - st)}</div>
    <div class="line">
      收集 {got} / {n} 点（{n ? Math.round((got / n) * 100) : 0}%）· 得分 {engine.score}{engine.newRecord
        ? ' 🆕新纪录'
        : ''}
    </div>
    <div class="line">
      {#if engine.lastClearT !== null}
        ⚡ 全清用时 <b>{engine.lastClearT.toFixed(1)}s</b>{engine.newClearRecord
          ? ' 🆕最快纪录'
          : ''}
      {/if}
    </div>
    <div class="best">
      历史最佳 ★{Math.max(st, best)}
      {#if engine.bestClear !== null}· 最快全清 {engine.bestClear.toFixed(1)}s{/if}　{words[st]}
    </div>
  {/if}
  <div class="btns">
    <button class="primary" onclick={() => engine.resetRun()}>⟲ 再来一次</button>
    <button onclick={() => (engine.resultDismissed = true)}>👁 查看轨迹</button>
    <button onclick={copyReport}>
      {copyState === 'ok' ? '✓ 已复制' : copyState === 'fail' ? '⚠ 复制失败' : '📋 复制战报'}
    </button>
  </div>
</div>

<style>
  .result {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background: rgba(8, 10, 20, 0.72);
    backdrop-filter: blur(3px);
    border-radius: 14px;
    text-align: center;
  }
  .stars {
    font-size: 42px;
    letter-spacing: 8px;
    color: var(--gold);
    text-shadow: 0 0 24px rgba(251, 191, 36, 0.6);
  }
  .line {
    font-size: 15px;
    color: var(--text);
  }
  .line b {
    color: var(--gold);
  }
  .best {
    font-size: 13px;
    color: var(--muted);
  }
  .btns {
    display: flex;
    gap: 8px;
  }
</style>
