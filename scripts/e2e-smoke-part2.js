/**
 * 端到端冒烟巡检·第二段：刷新后的续玩 + UI 抽查。
 * 前置：先运行 e2e-smoke.js（它会以 location.reload() 结束第一段）。
 * 用法：agent-browser --session <名> eval "$(cat scripts/e2e-smoke-part2.js)"
 *
 * 期望：resumed 以 custom- 开头；achvCount=22；dexChapters=7；errs 为空。
 */
(async () => {
  const out = { errs: window.__errs || [] };
  const M = await import('/src/lib/game/engine.svelte.ts');
  out.resumed = M.engine.level?.id ?? null; // 期望 custom-…（续玩）
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.title === '成就');
  b.click();
  await new Promise((r) => setTimeout(r, 500));
  out.achvCount = document.querySelectorAll('.item').length; // 22
  out.dachengGot = (function () {
    const el = Array.from(document.querySelectorAll('.item')).find((x) =>
      x.textContent.includes('集大成'),
    );
    return el ? el.className.includes('got') : null;
  })();
  Array.from(document.querySelectorAll('.tabs button'))
    .find((x) => x.textContent.trim() === '图鉴')
    .click();
  await new Promise((r) => setTimeout(r, 400));
  out.dexChapters = document.querySelectorAll('.dex-ch').length; // 7
  const close = Array.from(document.querySelectorAll('.modal button')).find((x) =>
    x.textContent.replace(/\s+/g, '') === '关闭',
  );
  if (close) close.click();
  return JSON.stringify(out, null, 1);
})()
