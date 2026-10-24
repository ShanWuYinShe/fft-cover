/**
 * 端到端冒烟巡检·第二段：刷新后的续玩 + UI 抽查。
 * 前置：先运行 e2e-smoke.js（它会以 location.reload() 结束第一段）。
 * 用法：agent-browser --session <名> eval "$(cat scripts/e2e-smoke-part2.js)"
 *
 * 期望：resumed 以 custom- 开头；achvCount=22；dexChapters=7；errs 为空。
 */
(async () => {
  const out = { errs: window.__errs || [] };
  // 引擎从调试桥取（window.__ENGINE 由 App onMount 挂载）——
  // 避免 await import(engine.svelte.ts) 的动态导入偶发挂起 eval
  // （第四十九轮实测；levels/scoring 纯数据模块的动态导入保留）
  const e2 = window.__ENGINE;
  out.resumed = e2.level?.id ?? null; // 期望 custom-…（续玩）
  // 结算卡重开回归锚（第 130 轮）：完成一局 → 收起结算卡 → 运行栏重开
  const S = await import('/src/lib/game/scoring.ts');
  const L2 = await import('/src/lib/game/levels.ts');
  const e2 = M.engine;
  e2.loadLevel(L2.LEVEL_DEFS.find((d) => d.id === 'circle'));
  S.solveFromSpectrum(e2.level.spectrum, e2.level.armLimit).forEach((a, i) =>
    e2.setArm(i, { ...a }),
  );
  e2.startRun();
  let g = 0;
  while (e2.phase !== 'done' && g < 2000) {
    e2.advance(1 / 60);
    g++;
  }
  await new Promise((r) => setTimeout(r, 300));
  // 查看轨迹已收进结算卡 ⋯ 菜单（P2 整合后不再直接可见）：先开菜单再点
  const cardMM = [...document.querySelectorAll('.card .mm-btn')][0];
  cardMM.click();
  await new Promise((r) => setTimeout(r, 300));
  const eye = [...document.querySelectorAll('.mm-pop button')].find((x) =>
    x.textContent.includes('查看轨迹'),
  );
  eye.click();
  await new Promise((r) => setTimeout(r, 300));
  // 「📊 结算卡」同样收进运行栏 ⋯ 菜单
  const runMM = [...document.querySelectorAll('.run-row .mm-btn')][0];
  runMM.click();
  await new Promise((r) => setTimeout(r, 300));
  const reopen = [...document.querySelectorAll('.mm-pop button')].find((x) =>
    x.textContent.includes('结算卡'),
  );
  out.reopenBtn = !!reopen;
  reopen.click();
  await new Promise((r) => setTimeout(r, 300));
  out.resultBack = !!document.querySelector('[class*=result]');
  // 收起结算卡回到编辑态，继续后续成就/图鉴/合成器抽查
  // 收起结算卡：同样走卡片 ⋯ 菜单（查看轨迹在菜单里）
  const cardMM2 = [...document.querySelectorAll('.card .mm-btn')][0];
  cardMM2.click();
  await new Promise((r) => setTimeout(r, 300));
  const closeR = [...document.querySelectorAll('.mm-pop button')].find((x) =>
    x.textContent.includes('查看轨迹'),
  );
  if (closeR) closeR.click();
  await new Promise((r) => setTimeout(r, 200));
  const achvBtn = [...document.querySelectorAll('button')].find(
    (x) => x.getAttribute('aria-label') === '成就',
  );
  achvBtn.click();
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
  // 「🎨 创作星轨」在「每日一练与无尽演武」折叠条内（曾名「更多玩法」）：
  // 折叠条可能是 details（开合靠 open 属性）或按钮（aria-expanded），两种都兼容
  await new Promise((r) => setTimeout(r, 300));
  const details = [...document.querySelectorAll('details')].find((x) =>
    (x.textContent || '').includes('每日一练'),
  );
  if (details) details.open = true;
  await new Promise((r) => setTimeout(r, 400));
  const composerBtn = [...document.querySelectorAll('button')].find((x) =>
    (x.textContent || '').includes('创作星轨'),
  );
  if (!composerBtn) throw new Error('创作星轨入口未找到（星图抽屉需先打开）');
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
  const nameInput = document.querySelector('.name-input');
  nameInput.value = '冒烟作品';
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  const playBtn = Array.from(document.querySelectorAll('.modal button')).find((x) =>
    x.textContent.includes('生成并游玩'),
  );
  playBtn.click();
  await new Promise((r) => setTimeout(r, 300));
  out.playedName = M.engine.level?.name ?? null; // 期望「冒烟作品」
  out.escClosed = !document.querySelector('.modal');
  return JSON.stringify(out, null, 1);
})();
