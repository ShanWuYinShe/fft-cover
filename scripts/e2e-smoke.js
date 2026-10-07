// =====================================================================
// e2e-smoke.js —— 端到端冒烟巡检（可重跑）
// =====================================================================
// 用途：合并第 49/70/80 轮的手工冒烟——全关精确解、模式载入、续玩、
//       成就/图鉴 UI、控制台错误收集。改完核心逻辑后跑一遍当回归。
//
// 前置（agent-browser 会话）:
//   export AGENT_BROWSER_SOCKET_DIR="$PWD/sock" AGENT_BROWSER_ARGS=--no-sandbox
//   agent-browser --session <名> --profile "$PWD/prof" open http://localhost:5199/
//   agent-browser --session <名> open http://localhost:5199/   # 双开模式
//   # 清存档 + 关掉首访遮罩：
//   agent-browser --session <名> eval "localStorage.clear(); localStorage.setItem('fft-pointers-flags-v1', JSON.stringify({ seenTitle: true, tutorialSeen: true })); 'ok'"
//   agent-browser --session <名> reload
//
// 运行：
//   agent-browser --session <名> eval "$(cat .workwork/e2e-smoke.js)"
//
// 输出：JSON（steps / errs）。errs 应为空；steps 抽查关键值。
// =====================================================================
(async () => {
  const out = { errs: [], steps: [] };
  window.addEventListener('error', (ev) =>
    out.errs.push('window: ' + String(ev.message).slice(0, 100)),
  );
  const origErr = console.error;
  console.error = function () {
    out.errs.push('console: ' + Array.from(arguments).map(String).join(' ').slice(0, 100));
    origErr.apply(console, arguments);
  };

  const L = await import('/src/lib/game/levels.ts');
  const S = await import('/src/lib/game/scoring.ts');
  const M = await import('/src/lib/game/engine.svelte.ts');
  const e = M.engine;

  // 1) 全部内置关：精确解 100% 收集
  for (const def of L.LEVEL_DEFS) {
    e.loadLevel(def);
    const sol = S.solveFromSpectrum(e.level.spectrum, e.level.armLimit);
    sol.forEach((a, i) => e.setArm(i, { ...a }));
    e.startRun();
    let g = 0;
    while (e.phase === 'running' && g < 2000) {
      e.advance(1 / 60);
      g++;
    }
    out.steps.push(def.id + ':' + e.collectedCount + '/' + e.total);
    e.resetRun();
  }

  // 2) 各模式载入
  e.loadDaily();
  out.steps.push('daily:' + e.level.id.slice(0, 12));
  e.loadWeekly();
  out.steps.push('weekly:' + e.level.id.slice(0, 16));
  e.loadRandomSeed(77);
  out.steps.push('random');
  e.loadCustomLevel([{ k: 1, mag: 80, phase: 0 }], '创作');
  out.steps.push('custom');

  // 3) 刷新 → 创作关续玩
  location.hash = '';
  location.reload();
  return JSON.stringify(out, null, 1);
})();

// ---- 第二段：刷新后运行 scripts/e2e-smoke-part2.js ----
// （续玩 custom-…、成就 22 项、图鉴 7 章；脚本已单独沉淀，无需复制注释代码）
// (async () => {
//   const out = {};
//   const M = await import('/src/lib/game/engine.svelte.ts');
//   out.resumed = M.engine.level?.id ?? null;   // 应为 custom-…
//   const b = Array.from(document.querySelectorAll('button')).find(x => x.title === '成就');
//   b.click(); await new Promise(r => setTimeout(r, 500));
//   out.achvCount = document.querySelectorAll('.item').length;  // 22
//   Array.from(document.querySelectorAll('.tabs button')).find(x => x.textContent.trim() === '图鉴').click();
//   await new Promise(r => setTimeout(r, 400));
//   out.dexChapters = document.querySelectorAll('.dex-ch').length;  // 7
//   return JSON.stringify(out, null, 1);
// })()
