---
name: fft-cover-architecture
description: 傅立叶指针（fft_cover）项目架构事实：全屏座舱 UI 架构（grid 四区/tokens/game-ui 公共件/触屏热区）、本地免提权截图链路、存档键清单与备份域、无尽模式语义（波次难度爬升/35% 过波线/断点续玩/结算）、画布坐标系与物理补偿体系（canvasK）、里程碑反馈清单（音效/触觉/读屏）、e2e 冒烟运行要点。触发：改界面布局/样式/弹层/截图链路；改引擎/存档/画布绘制/无尽模式/结算卡/可访问性；需要知道某个 localStorage 键的语义；改难度曲线或收集判定；写 e2e 脚本。
---

# 傅立叶指针 · 项目架构事实

**全部为会话内实测验证的事实（2026-10-13，代码与单测为准）。** 改动相关区域前先读本节，避免重新踩坑。

## 界面架构（浑天座舱 HUD，2026-10-18 落地；同日第二轮做减法）

**信息三层（新控件先归层）**：一级 = 本关目标与下一步 / 画布 / 主操作 / 收集进度（可发光、大字）；
二级 = 关卡入口 / 星级 / 本关目标 / 重置·更多·设置·成就 / 指针调参台（安静，无发光）；
三级 = 相位罗盘、四象卡准、刻度尺、倍率矩阵、撤销重做（折进「高级调谐」，**折叠时不挂载**）。
量化基线（`.workwork/ui-redesign/clutter.mjs`）：桌面游戏屏 65 按钮/22 盒子/43 发光/587 字 →
**14 / 5 / 3 / 186**；成就弹窗盒子 47 → 6。

- **`<details>` 折叠陷阱（实测）**：Chrome 下折叠态子元素仍有布局尺寸（`getBoundingClientRect` 非 0），
  会漏进度量、Tab 顺序与读屏。正确做法 `bind:open` + `{#if}`，折叠时不挂载（C 线第二轮踩过）。
- **整屏锁死**：`html/body/#app` 是 `height:100dvh + overflow:hidden`，页面不滚动；滚动只发生在
  `.gs-dock .dock-body`（右侧机坞 / 移动端机坞面板）与弹层内部。新弹层必须自带上限 + 内滚。
- **GameShell 是 grid 四区**：`--hud-h`(56) 顶栏 / 舞台 / `--dock-w`(384) 机坞 / `--cmd-h`(78) 指令栏；
  手机竖屏改成 `stage → dock → cmd → nav` 四行，机坞**按内容自适应**（上限 46dvh，`panel-expanded` 68dvh），
  `panel-hidden`（运行态）时机坞让位、画布吃掉剩余高度。竖屏平板 641–900 与横屏 ≤900 各有一套单独 grid。
- **「游戏味」四来源（第三轮定性，改 UI 前先想清楚是加装饰还是加反馈）**：
  ① 世界是活的（星盘刻度环缓转 + 绕盘扫掠 + 外环/柔光呼吸 + 36 颗星尘 + 目标点呼吸宝石）；
  ② 操作有回弹（按下 0.97、滑杆跨档顿感、律柱通电自下而上填充）；
  ③ 状态有演出（关卡入场卡 1.4s、起跑 1.06→1.0 + 青色扩散环 +「起」字、结算星星逐颗弹入 + 分数 count-up）；
  ④ 反馈有力度（收集 = 扩散环 + 6 火花 + 飘字弹跳 + HUD 数字弹跳；每 5 连 = 四边脉冲 + ×N 印章）。
  **加反馈 ≠ 加装饰**：控件依旧不加发光/包边/扫描线，clutter 目标不变。
- **动效规范**：反馈 90–180ms、演出 300–600ms；进场 `cubic-bezier(0.16,1,0.3,1)`、回弹
  `cubic-bezier(0.34,1.56,0.64,1)`、退场比进场快 30%；游戏内位移 ≤8px / 缩放 ≤1.08
  （标题页与 Toast 的一次性入场编排可到 1.15）；同时动画 ≤8 个元素；入场动画用
  `animation-fill-mode: backwards`（`both` 会让计算值停在单位矩阵、并压住 hover/`:active`）。
- **活跃度可量**（`.workwork/ui-redesign/juice.mjs`，采样画布区域连续帧的像素变化率 +
  rAF 帧率）：静息 0.29% / 运行 2.8% / 减动效 0%；运行态 61fps。
  **测量前必须 `Page.bringToFront` 且用不节流的 Chrome**（`--disable-background-timer-throttling
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`）——后台标签 rAF 会被
  节流到 ~1fps，测出来全是假的。
- **画布性能红线不变**：禁用 `shadowBlur`；辉光走 `glowDot` + `glowCache`；文字宽度走 `measureW`；
  粒子/星尘总数 ≤60、每帧新增绘制控制在几十次量级（本轮星盘 + 星尘 + 拖尾 + 火花实测仍 61fps）。
- **控件尺寸只看指针类型（第四轮）**：`tokens.css` 的 `--ctl-xs/sm/md/lg/menu`（22/26/30/40/46 桌面；
  `@media (pointer: coarse)` 下 32/40/42/46/52）+ `--ctl-font(-sm)`、`--ctl-radius`、`--ctl-icon`。
  **不要写死 px**；触屏命中区必须 ≥40（视觉不够就用 `::after { inset }` 外扩，range 这类替换元素
  用输入层外扩）。实测基线：桌面可交互元素高度中位 30px、>40px 0 个；触屏 390×844 / 844×390 无 <40。
  量尺脚本：`.workwork/ui-redesign/sizes.mjs`（尺寸普查）与 `touch.mjs`（命中区普查）。
  「减重」同属这条：描边 1px、底部硬阴影 2px、按钮字重 ≤700、中文标签字距 ≤1.5px。
- **移动端机坞布局**：手机竖屏 grid 行是 `auto（舞台，按内容取高）| minmax(0,1fr)（机坞，内部滚动）
| auto（指令栏）| auto（底部导航）`；`panel-expanded` 时舞台行置 0 并 `display:none`（否则画布会被
  压扁、引导条会压到面板控件上）；`panel-hidden`（运行态）时机坞让位、画布吃掉剩余高度。
- **入口去重**（改动时守住）：朱印只在画布 HUD；章节星数只在顶栏「关卡」入口；成就/设置只在顶栏
  （手机无顶栏时用画布 HUD 齿轮）+ 更多菜单；音量/音乐只在更多菜单；缩放只靠滚轮/双指 + 画布右下角
  一个「复位视图」键。主操作文案是人话：**开始旋转 / 结束并结算**（引擎 `runLabel` 仍带 ▶/⏸ 字形，
  渲染前要剥掉，否则和 SVG 图标出现两个三角）。
- **公共件**在 `src/styles/game-ui.css`（`.g-btn` / `.g-plate` / `.g-inset` / `.g-label` / `.g-num` /
  `.g-divider` / `.g-corners` / `.g-lamp` / `.g-scanlines`），尺寸与金属质感令牌在 `tokens.css`
  （`--hud-h/--cmd-h/--dock-w/--tab-h`、`--metal-*`、`--face-*`、`--edge*`、`--bevel-*`）。
- **`reset.css` 给原生 `button` 去了皮**（background/border/padding 清零）：凡按钮必须自己声明背景，
  否则透明（成就页「白色胶囊」就是没重置原生按钮导致的）。**触屏可点件一律 ≥40px 高**。
- 装饰层 `AmbientField`（浑天环 + 星点 + 暗角）与 `ScreenFrame`（四角包边）都是
  `position:fixed; pointer-events:none`，`z-index:0/40`；`inert` 门控在 `App.svelte`
  （有浮层时整个 `.game-layer` 失效，避免 Tab 跑到背景 HUD）。
- **快捷键门控类名**必须保留：`.modal / .modal-backdrop / .finale / .ch-intro / .title-screen / .tutorial`。

## 本地截图链路（免提权、免打扰，2026-10-18 实测）

agent-browser 的 owner（headless Chrome）可能中途消失（实测 62425 掉线），而沙盒里
`agent-browser` 因 `~/.agent-browser` 不可写会硬失败。**兜底且更稳的一条**：自己在
workspace 内起一个专属 headless Chrome，用 CDP HTTP + 内置 WebSocket 直连截图：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9411 --no-sandbox --disable-gpu --no-first-run \
  --user-data-dir="$PWD/.workwork/ui-redesign/chrome-profile" about:blank &
```

- 脚本：`.workwork/ui-redesign/shot.mjs <scenario> <out.png> [宽] [高] [mobile]`（单场景截图；
  星图场景点的是顶栏 `.hud-quiet-btn`——入口改过名，旧类名 `.hud-starmap-btn` 已不存在）
  与 `verify.mjs`（17 个场景批量：截图 + 布局度量：不滚屏 / 无横向溢出 / 未声明背景的按钮 /
  <40px 触屏热区 / 画布尺寸），报告落 `verify-report.json`。
- `PUT /json/new?<url>` 开自己的标签（用完 `/json/close/<id>`），不抢焦点、不写 home。
- **同一 Chrome 下 localStorage 按 origin 共享**：多个会话同时截图会互相覆盖
  `fft-pointers-flags-v1`（表现为 title 场景截不出来）——用 `http://[::1]:5200/` 与
  `http://localhost:5200/` 两个 origin 隔离。
- dev server 端口：本仓库会话用 5200（`pnpm dev --port 5200`），别和 5199/5173 混。

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
