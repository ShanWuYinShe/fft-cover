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

> 新增 skill 时同步本表——漏索引时系统仍会挂载，但 AI 很难主动想到加载它。

## 维护提醒

本文件与 skill 里的路径/命令断言，改动布局或评审流程后必须复核；
跑 `~/.agents/bin/skill-lint ~/work/fft_cover/.agents/skills` 可机器检查失效引用。

## CI 门禁与本地验证分工

重活（依赖安装、svelte-check、全量单测、构建、preview 冒烟）一律交给 GitHub Actions，本地只跑秒级检查。
完整流程见全局 skill `github-ci-flow`：开发分支推送 → `gh pr create` → `gh pr checks --watch`
全绿 → `gh pr merge --rebase --delete-branch` → 本地 `git pull --ff-only` 并清理 worktree。

- 本地（提交前，秒级）：`pnpm check`（svelte-check 全量类型/模板检查，实测约 2.6s）
- CI 覆盖（`.github/workflows/ci.yml`，job `fft-cover (Vite+Svelte)`）：`pnpm install --frozen-lockfile` → `pnpm check` → `pnpm test`（vitest）→ `pnpm build` → preview 冒烟（起 `vite preview` 断言 HTTP 200 + HTML）→ 上传 `dist/` 产物（保留 7 天）；push main 与 PR 均触发
- CI 覆盖不到、必须本地/真机验证的：`scripts/e2e-smoke.js`（agent-browser 端到端冒烟巡检，改核心玩法/UI 逻辑后按需执行，不进 CI）
- 发版/发布门禁不变：上线按 `README.md`「部署（workwork-server）」执行——本地 `pnpm build` 生成 `dist/` 后 scp 到 `workwork-server` 替换 `~/games/sites/fft-cover`；部署目录里的 compose 只跑 nginx，不涉及本地镜像构建
