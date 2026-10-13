---
name: fft-cover-architecture
description: 傅立叶指针（fft_cover）项目架构事实：存档键清单与备份域、无尽模式语义（波次难度爬升/35% 过波线/断点续玩/结算）、画布坐标系与物理补偿体系（canvasK）、里程碑反馈清单（音效/触觉/读屏）、e2e 冒烟运行要点。触发：改引擎/存档/画布绘制/无尽模式/结算卡/可访问性；需要知道某个 localStorage 键的语义；改难度曲线或收集判定；写 e2e 脚本。
---

# 傅立叶指针 · 项目架构事实

**全部为会话内实测验证的事实（2026-10-13，代码与单测为准）。** 改动相关区域前先读本节，避免重新踩坑。

## 存档键清单（constants.ts，全部登记在 SAVE_KEYS 参与备份）

| 键                                          | 内容                                                 | 备注                                                            |
| ------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| fft-pointers-endless-v1                     | `{ wave, score, run?: { seed, diff, wave, score } }` | best + 进行中一局（run=null 表示已结束）；旧格式无 run 自动兼容 |
| fft-pointers-clear-v1                       | `Record<关卡id, 全清秒数>`                           | **注意键名是单数 clear**（不是 clears）                         |
| fft-pointers-best-v1 / best-score-v1        | 各关星级 / 最佳分                                    |                                                                 |
| fft-pointers-best-run-v1                    | 个人最佳那局（解法+节奏同源）                        | 幽灵竞速对准更强的一条                                          |
| fft-pointers-last-level-v1 / last-custom-v1 | 常规续玩 / 创作关续玩                                | 无尽续玩优先于这两者                                            |
| fft-pointers-diff-v1                        | 随机关难度（easy/normal/hard）                       |                                                                 |

## 无尽模式语义

- 波次难度爬升：1–2 波 easy、3–5 波 normal、6+ 波 hard（`endlessDiff(wave)`）
- 过波线：收集 ≥35%（一星线，`starsFor(ratio) >= 1`）
- **randomDiff 必须与当前波同步**（无尽关 id 不含难度，分享链接靠它）——startEndless 设 easy、nextEndlessWave 先 `endlessWave++` 再取 `endlessDiff(wave)`（有单测锁定）
- 断点续玩：过波时落 `run`（seed/diff/wave/score），启动 `resumeEndlessRun()` 按 seed 复现当前波、从波首重开，**优先于常规续玩**；exitEndless 清 run
- 结算：`settleEndlessBest()` 严格更优才置 `endlessNewBest`（打平不算，有单测）；`endlessNeed` = 距 35% 线还差几点

## 画布坐标系与补偿体系（Stage.svelte）

- 逻辑空间 SIZE=640，映射到 canvas CSS 宽度；物理尺寸 = 逻辑 × (shownW/640)
- `canvasK() = min(1.6, max(1, SIZE/shownW))`——文本/点/框用 `canvasFont(px)` 反向补偿；**上限 1.6** 防长标签溢出
- 补偿类别（改动前先归类）：
  1. 状态/信息（文本、点、HUD 框）→ 全额补偿
  2. 信息承载图形（轨迹线、频谱曲线）→ 只保物理底线（`lineW` ≥1.2px）
  3. 语义/范围（容差圆 `engine.level.tol`、网格）→ **不补偿**
- 辉光用 `glowDot()` + 渐变缓存（`glowCache`），**禁用 shadowBlur**（低端机软件路径，实测 27 次/帧 → 0）；measureText 用 `measureW()` 缓存

## 里程碑反馈清单（改动后对照，别漏）

收集（音阶+飘字）/ 连击每 5（木鱼）/ 星级跨档（starSound+haptic）/ 印章（sealSound+haptic）/ 章节印（chapterSeal+haptic）/ 成就（achvSound+toast+haptic）/ 通关（perfectArpeggio 或 finishChord+震屏）/ 无尽过波（achvSound+haptic）/ 读屏播报（aria-live，优先级链：结算 > 成就 > 过波 > 星级；600ms 防抖；**过波分支需 endlessSurvived 门控**——续玩恢复的存量波次不播）

## e2e 冒烟要点

详见 `scripts/e2e-smoke.md`。关键：必须跑 dev server（动态 import 源码在 preview 不可用）；seg1 结果落 `sessionStorage['__e2eSeg1']`；每次运行用全新会话（长会话劣化）；「🎨 创作」在更多玩法折叠条内。agent-browser 通用坑见用户级 browser-automation-safety skill。

## 已知限制

- agent-browser 长会话跑多步 e2e 不可靠（session 劣化），全流程自动化需独立 Playwright 实例（未立项，等用户决定）
- 结算卡重开（📊 结算卡）后的主按钮文案是短标签（如「▶ 椭圆」），首次结算是「▶ 下一关 · 椭圆」——同一功能两种渲染状态（解锁庆祝 vs 常规导航），有意设计
