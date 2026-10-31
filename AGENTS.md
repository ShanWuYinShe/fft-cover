# fft_cover（傅立叶指针）

座舱 HUD 风格的 Web 界面（Svelte）。本文件只做项目特有补充，通用约束以全局 `~/AGENTS.md` 为准。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm build
```

> 包管理器以 `pnpm-lock.yaml` 为准（不要改用 npm/bun）。

## skill 索引（改对应模块前先加载对应 skill）

| skill | 管什么 |
|---|---|
| `fft-cover-architecture` | 架构事实：座舱 HUD 满屏浮层布局、机坞三段、断点、入口去重、糖果星域视觉体系 |
| `fft-cover-gemini-review` | UI 评审工作流：agent-browser 截图 → Gemini 网页评审 → worktree 落地，含截图场景与视口清单、评审 prompt 约定 |

> 新增 skill 时同步本表——漏索引时系统仍会挂载，但 AI 很难主动想到加载它（2026-10-31 补建本文时本目录有 skill 却没有任何 AGENTS.md）。

## 维护提醒

本文件与 skill 里的路径/命令断言，改动布局或评审流程后必须复核；
跑 `~/.agents/bin/skill-lint ~/work/fft_cover/.agents/skills` 可机器检查失效引用。
