<script lang="ts">
  import { engine } from '../game/engine.svelte';
  import { fitScore, starsFor } from '../game/scoring';

  type CopyState = 'idle' | 'ok' | 'fail';
  let copyState = $state<CopyState>('idle');
  let shareState: 'idle' | 'ok' = $state('idle');
  let imgState: 'idle' | 'ok' = $state('idle');

  /** 导出画布当前帧 + 成绩条为 PNG */
  function saveImage(): void {
    const src = document.querySelector('canvas');
    if (!src) return;
    const off = document.createElement('canvas');
    off.width = src.width;
    off.height = src.height + 120;
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.drawImage(src, 0, 0);
    const h = src.height;
    octx.fillStyle = 'rgba(8,10,20,.92)';
    octx.fillRect(0, h, off.width, 120);
    octx.fillStyle = '#fbbf24';
    octx.font = 'bold 44px sans-serif';
    octx.fillText((engine.level?.name ?? '') + '  ' + engine.score + ' 分', 40, h + 52);
    octx.fillStyle = '#8b93a7';
    octx.font = '30px sans-serif';
    octx.fillText(
      '收集 ' + got + '/' + n + ' · 拟合度 ' + (fit * 100).toFixed(0) + '% · 傅立叶指针',
      40,
      h + 98,
    );
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = 'fft-' + (engine.level?.id ?? 'run') + '-' + engine.score + '.png';
    a.click();
    imgState = 'ok';
    setTimeout(() => (imgState = 'idle'), 1500);
  }

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
    const text = engine.buildReport();
    // 移动端优先原生分享面板
    if ('share' in navigator) {
      try {
        await navigator.share({ title: '傅立叶指针战报', text });
        shareState = 'ok';
        setTimeout(() => (shareState = 'idle'), 1500);
        return;
      } catch {
        /* 用户取消或环境不支持则走剪贴板 */
      }
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
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
  const fit = $derived(engine.level ? fitScore(engine.level.spectrum, engine.arms) : 0);
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
    <div class="arms-line">解法：{engine.armsLine()} · 拟合度 {(fit * 100).toFixed(0)}%</div>
  {/if}
  <div class="btns">
    <button class="primary" onclick={() => engine.resetRun()}>⟲ 再来一次</button>
    <button onclick={() => (engine.resultDismissed = true)}>👁 查看轨迹</button>
    <button onclick={copyReport}>
      {shareState === 'ok'
        ? '✓ 已分享'
        : copyState === 'ok'
          ? '✓ 已复制'
          : copyState === 'fail'
            ? '⚠ 复制失败'
            : '📤 分享战报'}
    </button>
    <button onclick={saveImage}>{imgState === 'ok' ? '✓ 已保存' : '📸 保存成绩图'}</button>
  </div>
</div>

<style>
  .result {
    position: absolute;
    inset: 0;
    animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    animation: star-pop 0.5s ease-out backwards;
  }
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.92);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes star-pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
    60% {
      transform: scale(1.15);
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  .line {
    font-size: 15px;
    color: var(--text);
  }
  .line b {
    color: var(--gold);
  }
  .arms-line {
    font-size: 12px;
    color: var(--muted);
    max-width: 90%;
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
