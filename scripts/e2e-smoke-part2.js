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
  const close = Array.from(document.querySelectorAll('.modal button')).find(
    (x) => x.textContent.replace(/\s+/g, '') === '关闭',
  );
  if (close) close.click();
  // 合成器回归锚：20 行槽位 + 负频分隔条（20 槽改造）
  await new Promise((r) => setTimeout(r, 300));
  const composerBtn = document.querySelector('button[title="用谐波合成器创作自己的关卡"]');
  composerBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  out.composerRows = document.querySelectorAll('.sliders .row').length; // 20
  out.negLabel = !!document.querySelector('.neg-label');
  out.nameInput = !!document.querySelector('.name-input'); // 作品起名输入框（起名功能回归锚）
  // 过滤 chip 回归锚：清存档后偏好重置，chip 应为未按下
  const filterChip = Array.from(document.querySelectorAll('.pchip')).find((x) =>
    x.textContent.includes('已启用'),
  );
  out.filterChipOff = filterChip?.getAttribute('aria-pressed') === 'false';
  // 复制 chip 回归锚（清存档后未复制，应显示 📋 复制）
  out.copyChipReady = Array.from(document.querySelectorAll('.pchip')).some((x) =>
    x.textContent.includes('📋 复制'),
  );
  // Esc 关闭回归锚（与其他弹层同一交互）
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  out.escClosed = !document.querySelector('.modal');
})();
