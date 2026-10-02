---
name: agent-browser-troubleshooting
description: agent-browser 在本机沙盒下的启动失败排查（SingletonLock 残留锁）。适用于本机所有项目的浏览器自动化；建议日后并入用户级 browser-automation-safety skill。
---

# agent-browser 启动失败排查：SingletonLock 残留锁

**实测日期**：2026-10-01，同一 DSH 会话内遇到 2 次，清锁即愈。

## 表象

- `Chrome exited early (exit code: 21) without writing DevToolsActivePort`
- stderr 中 `Failed to create .../chrome-profile/SingletonLock: File exists (17)`
- 常伴随 Crashpad `settings.dat: Operation not permitted` 报错——这是噪音，不致命，别被带偏去加 --no-sandbox

## 根因

上次会话/任务的 Chrome 临时 profile 残留了 SingletonLock（symlink），Chrome ProcessSingleton 机制为防多实例写坏 profile 拒绝启动。

## 解法

```bash
rm -f '/private/var/folders/*/T/agent-browser-sandbox/chrome-profile/SingletonLock'
```

然后重试原命令即可。无需 --no-sandbox，无需重建 daemon/session。

注意：

- 路径各机不同，以报错原文里的 profile 路径为准（macOS 在 /private/var/folders/.../T/）
- 删除前先 ls 确认该目录确属 agent-browser 临时 profile（目录名含 agent-browser-sandbox）
- 归属说明：跨项目通用，按约定应沉淀到用户级 ~/.agents/skills/browser-automation-safety；因会话沙盒限制暂存于项目内
