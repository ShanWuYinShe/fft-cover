# 存档、玩法与结算语义

本文件是 SKILL.md「存档与玩法语义」的细节。

## 存档键（`src/lib/game/constants.ts`；进度类在 `SAVE_KEYS`、偏好类在 `PREF_KEYS`，两类都参与备份）

| 键 | 内容 | 备注 |
| --- | --- | --- |
| fft-pointers-endless-v1 | `{ wave, score, run: { seed, diff, wave, score } | null }` | best + 进行中一局（run=null 表示已结束）；旧格式无 run 自动兼容 |
| fft-pointers-clear-v1 | `Record<关卡id, 全清秒数>` | **注意键名是单数 clear**（不是 clears） |
| fft-pointers-best-v1 / fft-pointers-best-score-v1 | 各关星级 / 最佳分 | 结算判定「新纪录」读它 |
| fft-pointers-best-run-v1 | 个人最佳那局（解法+节奏同源） | 幽灵竞速对准更强的一条 |
| fft-pointers-last-level-v1 / last-custom-v1 | 常规续玩 / 创作关续玩 | 无尽续玩优先于这两者 |
| fft-pointers-diff-v1 | 随机关难度（easy/normal/hard） | 偏好键（`PREF_KEYS`，清空进度时保留） |

## 无尽模式语义

- 波次难度爬升：1–2 波 easy、3–5 波 normal、6+ 波 hard（`endlessDiff(wave)`）。
- 过波线：收集 ≥35%（一星线，`starsFor(ratio) >= 1`）。
- **randomDiff 必须与当前波同步**（无尽关 id 不含难度，分享链接靠它）——`startEndless` 设 easy、`nextEndlessWave` 先 `endlessWave++`
  再取 `endlessDiff(wave)`（有单测锁定）。
- 断点续玩：过波时落 `run`（seed/diff/wave/score），启动 `resumeEndlessRun()` 按 seed 复现当前波、从波首重开，**优先于常规续玩**；`exitEndless` 清 run。
- 结算：`settleEndlessBest()` 严格更优才置 `endlessNewBest`（打平不算，有单测）；`endlessNeed` = 距 35% 线还差几点。
- **力竭卡近失钩子**：力竭时若过波线只差 ≤3 点，EndlessResult 的 detail 行显示「本波就差 N 点过线」（`endlessNeed` 结算后仍反映失败波差距）；
  newBest（刚刷新历代最佳）时**不显示**「仅差 N 分」——settle 后 best==本局，会算出「仅差 0 分」自指噪声。

## 结算判定语义

- **「新纪录」（newRecord）只在破了一个既有正数纪录时点亮**（`(bestScores[id] ?? 0) > 0`）；首局是建立基准不是破纪录——
  否则 0 星烂局也挂「新纪录」，与「还没拿到星」自相矛盾（实测）。每日/每周同口径。
- **「最快全清」（newClearRecord）保持首清点亮**（`engine.test.ts` 有锁定测试）：全清本身是成就，与失败局不构成矛盾。
- **「下一枚目标」量词口径**：三星线 = `ceil(0.9n) − got`（不是全收数字），完美全清 = `n − got`——
  此前三星提示用全收数字，24 点关 2/24 会说「再收集 22 点」（实际 20 就够）。
- **每日/每周的读后写陷阱**：`newRecord` 计算必须放在 `dailyBest` 写入**之前**（先算标志再落库）——曾把它放在写入之后，
  读到本局刚写入的分数、首局必误报（浏览器实测 0 星首局盖「新纪录」印章，靠 window 挂 engine 插桩定位）。
  修同模式多站点时必须逐路径验证或逐路径补单测。
- **结算近失钩子**：结论行（`verdictParts`）在「距下一颗星 ≤3 点」时追加「再收 N 点就是 M 星」；差得远不报（0 星报「还差 15 点」是泄气不是动力）。

## 分享与邀请码

- **挑战好友链接带 lv= 段**：战役内置关的解法分享此前不携带关卡（`levelHashPart` 对内置关返回空）——好友打开链接落在自己上次的关卡，
  跨关挑战对不上题。修后 `lv=<id>` 进 hash、`readLevelFromHash` 校验内置关白名单、`applyHashShare` 先 `loadLevel` 再套参数、`shareNote` 带关卡名。
- **分享类修复必须断言复制内容的完整形态**：给每日分享加风味文案时只查了文案头部——URL 尾部实为 `normal#d=normal` 坏链
  （`buildDailyUrl`/`buildWeeklyUrl` 的首参是页面 base URL，误传 diff 当 base）。规则：**改分享/复制类代码，断言必须覆盖完整产物（含 URL 可打开性）。**
- **navigator.share 失败必须回退剪贴板**：`if (navigator.share)` 只保证 API 存在，桌面 Chrome 无分享目标时 `share()` 照样 reject——
  `shareArms` 原实现失败直接进 fail 态，「挑战好友」在桌面 Chrome 上发不出去（`copyReport` 同位置就有回退，漏了这里）。
  修后 catch → 剪贴板回退 + `setShareNote`；端到端实测：分享 stub 捕获挑战链接 → 好友打开 URL 载入同题同参 + 「参数已装好」提示。
- **每周分享入口**：每日/每周分享链接的坏 base 修复时一并补了每周分享入口。

## 大成结局（FinaleOverlay）的审计触发配方

该 surface 需全 Campaign 通关才一见，实测可注入触发：localStorage `fft-pointers-best-v1` 写入全部 21 个战役关 id（值 3）
**但留目标关不写**，刷新后全清目标关 → `stopRun` 时 `campaignState` 变为「全三星精通」即触发（含谐波大师成就）。
500px 窄窗已验证渲染完整（统计行 / 大成印 / 继续挑战）。
