---
name: fft-cover-gemini-review
description: fft_cover 的 UI 评审工作流：agent-browser 截图 → Gemini 网页评审 → worktree 落地。含截图场景与视口清单、评审 prompt 约定、Gemini 网页自动化的项目侧坑、以及"用户不在场禁止 CDP"红线。触发：给 fft_cover 做 UI 审查、截对照图、用 Gemini 网页分析截图、批量评审与复评；需要知道本项目截图落盘位置或评审 prompt 写法时加载。通用 Gemini 网页自动化机制见用户级 skill browser-automation-safety。
---

# fft_cover · 截图 → Gemini 网页评审

**浏览器自动化一律 agent-browser**。通用机制（上传、菜单渲染、回答采集、后台标签节流、profile/session）见用户级 skill
`browser-automation-safety` 的 `gemini-web-automation.md`（其 references 目录）；本文件只记 fft_cover 专属流程与红线。

## 红线（用户明确要求，先读）

- **用户不在场时禁止对其日常 Chrome 发起一切 CDP 连接尝试**。每次新的 DevTools WS 握手都可能触发「正在请求远程控制」弹窗；
  连接失败 ≠ 纯技术问题，而是「每次尝试都在打扰用户」。连接失败一次即停：不写重试循环、不跨轮反复探测，
  把「等用户在场 / 重启 Chrome 后再试」写进交接说明。状态探测优先走无副作用通道（读文件、`lsof`），而不是发起连接本身。
- **禁止自研 spawn Chrome / 固定端口 CDP 直连管线**（反模式，2026-10-21 用户级红线：Dock 身份劫持的根因）：
  不再新增或运行 `gemini.mjs`、`ws-retry.mjs`、`auto-chrome.sh`、`r4-gemini-lib.mjs`、`runner-r4.mjs` 这类自研脚本；
  截图与 Gemini 操作统一走 `agent-browser`（wrapper 内置 chrome-guard 与孤儿收割）。owner 掉线交给 wrapper 自愈，不纠缠重连。
- 不 kill / 不重启用户 Chrome、不反复重连（每次重连 = 弹窗风险）；Gemini 登录态跟着 agent-browser profile 走，别指望别的 profile 自带登录。

## 现行管线（三步）

### 1. 截图（agent-browser）

```bash
agent-browser set viewport 1440 900
agent-browser open http://localhost:5200/
agent-browser wait --fn "!!document.querySelector('canvas')"
agent-browser screenshot --if-changed .workwork/ui-audit/20-desktop-title.png
```

- 场景清单：桌面 1440×900（标题 / 主界面 / 滚动到底部 / 设置 / 成就）+ 移动 390×844（主界面 / 指针面板）；
  暂停菜单与结算卡要真跑一局（频率下拉调 10x 加速，「停止结算」可提前出结算卡）。
- 移动端视口别只用 390：验收至少覆盖 360 / 411 / 440 + 844×390 横屏（机型占比依据见 skill `fft-cover-architecture`）。
- 产物落 `.workwork/ui-audit/`（`NN-<场景>.png` 递增编号；对照图另存 before/after）。
- **同 origin 的 localStorage 会串档**：跑完无尽/结算截图再截另一档，应用会按存档恢复上一局；截对照图前先 `localStorage.clear()`，
  或换一个 origin（如 `http://[::1]:5200/`）隔离。换端口复验时标志位要在新 origin 上重设，否则会截到标题屏 / 教程弹窗。
- 收尾务必 `agent-browser close`；量指标用 `eval "<表达式>"` 自己解析结果。长会话跑多步流程不可靠（见「已知限制」）。

### 2. Gemini 网页评审（agent-browser）

1. 打开 Gemini 网页（默认 headless owner），保证目标标签是**前台活动标签**——后台标签被 Chrome 节流 rAF，
   Angular CDK 菜单不渲染：点「上传和工具」后 `aria-expanded` 会变 true，但 `input[type=file]` 恒为 0。
2. 上传图片：点「上传和工具」→ 等菜单 / 输入框出现 → 通过 file input 注入图片绝对路径 → 轮询附件缩略图出现且无 `has-error`。
3. 贴 prompt（中文，写法见下）→ 点发送（`.ql-editor` 变空 = 提交成功）→ 轮询完成判据
   （无「停止」按钮 + 回答文本连续 2 次长度稳定）→ 读 `textContent`（后台标签的 `innerText` 恒为空）。
4. 产物：prompt 落 `.workwork/ui-audit/prompt-v<N>.md`；评审全文与逐条意见落 `gemini-advice-v<N>.md` / `advice-<批次>/`。

- 模型：默认 Flash-Lite 快跑；要 Pro / Argon 质量时分两步——配额耗尽的菜单项带 `disabled` 类且点击无效，用尽但可点时菜单项文本会带
  重置时间（「用量限额重置时间：…」）；等重置后再跑，或接受 Flash-Lite 结果 + 人工把关。低 / 中 / 高「思考等级」在二级菜单，
  Flash-Lite 无需 thinking tier。
- 具体命令、上传 / 菜单 / 采集四坑的通用写法**见用户级 skill `browser-automation-safety` 的 `gemini-web-automation.md`（其 references 目录）**，不要在项目里复写一套。

### 3. 落地（worktree → 验证 → ff-only）

- 评审结论按「影响度高 / 中 / 低」分组，只取可落地的项；改动在 worktree 分支进行，别在主检出改。
- 验收：`pnpm exec prettier --check .` → `pnpm check`（svelte-check）→ `pnpm test` → `pnpm build` 全过，再做端到端截图复核
  （复评 prompt 用同一 Gemini 会话上下文）。
- 合并统一 `git merge --ff-only`；提交信息与推送纪律见用户级 skill `git-workflow`。

## 评审 prompt 写法（项目约定）

- **首轮**：交代游戏是什么（玩法一句话 + 技术栈 + 主题气质 + 支持设备）→ 列附图顺序（1..N 分别对应哪张截图）→ 给审计维度
  （审美 / 布局 / 用户体验）→ 硬要求：具体到数值（颜色值、字号、间距、圆角、阴影、动效时长）、每条标【高/中/低】影响度与对应图区域、
  覆盖字号层级 / 对比度(WCAG) / 视觉层级 / 信息密度 / 留白节奏 / 圆角一致性 / 图标风格 / hover-active 态 / 弹窗布局 / 触控热区 /
  首屏关键动作可见性 → 中文、按优先级排序。
- **复评轮**：标注「同一会话上下文」，逐条说明上轮改了什么（附新截图），只问未触达区域与「是否引入新问题」，避免重复全文。
- prompt 用中文、不贴代码；要求 Gemini 给可直接落地的 CSS 级建议，不要求它改代码。

## 已踩坑（仍有效）

- **Gemini 网页自动化的通用机制不在本文件复写**：后台标签 rAF 导致「上传和工具」菜单里 `input[type=file]` 恒为 0、
  上传与读取回答的判据（`textContent` vs `innerText`）、Flash-Lite / Argon 配额与重渲染复位、未登录形态——统一见用户级 skill
  `browser-automation-safety` 的 `gemini-web-automation.md`（其 references 目录）。
- **dev server 死了会伪装成页面空白**：eval 空输出 / 脚本挂起时先 `lsof -iTCP:5200 -sTCP:LISTEN` 验存活
  （本项目 UI 审查会话惯用 5200；`scripts/e2e-smoke.md` 用 5199——两套约定并存，以启动日志里的实际 URL 为准）。
- **`ps` 在沙盒里被拒**（`/bin/ps: Operation not permitted`）：查监听用 `lsof -nP -iTCP:<port> -sTCP:LISTEN`；
  确认进程归属用 `lsof -a -p <pid> -d cwd -Fn`；清理只 kill 自己起的实例（按端口逐个核对）。

## 已知限制

- agent-browser 长会话跑多步 e2e 不可靠（session 劣化），全流程自动化需独立 Playwright 实例（未立项，等用户决定）。
- Gemini 网页是消费级 SPA：菜单结构会改版、配额与模型随时可能变。以当次实测为准，不要把某次菜单文案写进脚本硬编码。
