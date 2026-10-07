# 端到端冒烟巡检（e2e-smoke）

改完核心逻辑后的回归巡检：21 关精确解收集率、四模式载入、创作关续玩、
成就/图鉴 UI、控制台错误收集。需要 dev server（5199）+ agent-browser 会话，
完整前置与两段式用法见 `scripts/e2e-smoke.js` 头部注释。

````bash
# 1) 起 dev server
pnpm dev -- --port 5199
# 2) 按 scripts/e2e-smoke.js 头部注释建立 agent-browser 会话并清存档
# 3) 运行
agent-browser --session <名> eval "$(cat scripts/e2e-smoke.js)"
# 4) 刷新后运行第二段（续玩 + UI 抽查）

第二段（刷新后）：

```bash
agent-browser --session <名> eval "$(cat scripts/e2e-smoke-part2.js)"
````

期望：`resumed` 以 `custom-` 开头；`achvCount=22`；`dexChapters=7`；`composerRows=20`；`negLabel=true`；`nameInput=true`；`filterChipOff=true`；`errs` 为空。

扩展注意：模拟滑杆/输入框交互时，派发事件必须带 `{ bubbles: true }`（Svelte 5 把 `input` 事件委托到应用根节点，不冒泡的派发不会命中组件的 `oninput`）。
