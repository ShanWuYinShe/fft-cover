---
name: fft-cover-architecture
description: 傅立叶指针（fft_cover）项目架构事实：座舱 HUD 界面（grid 四区/机坞三段/断点/入口去重）、糖果星域视觉体系与对比度铁律、画布坐标系与性能（离屏烘焙/30fps/canvasK 补偿）、存档键与无尽模式语义、结算判定、反馈与动效（器物音/终局张力）、浏览器验证（agent-browser）与 e2e。触发：改界面布局/样式/弹层/皮肤；改引擎/存档/画布绘制/无尽模式/结算卡/可访问性；需要知道某个 localStorage 键的语义；改难度曲线或收集判定；写 e2e 或截图验收脚本。细节见 references/。
---

# 傅立叶指针 · 项目架构事实

全部为会话内实测验证的事实（以代码与单测为准）。改动相关区域前先读本文；细节与历史实测数据在 `references/`。

## 界面架构（浑天座舱 HUD）

- **信息三层（新控件先归层）**：一级 = 本关目标与下一步 / 画布 / 主操作 / 收集进度（可发光、大字）；
  二级 = 关卡入口 / 星级 / 本关目标 / 重置·更多·设置·成就 / 指针调参台（安静，无发光）；
  三级 = 相位罗盘、四象卡准、刻度尺、倍率矩阵、撤销重做（折进「高级调谐」，**折叠时不挂载**）。
  量化基线（`.workwork/ui-redesign/clutter.mjs`）：桌面游戏屏 65 按钮 / 22 盒子 / 43 发光 / 587 字 → **14 / 5 / 3 / 186**；成就弹窗盒子 47 → 6。
- **GameShell 是 grid 四区**：`--hud-h`(56) 顶栏 / 舞台 / `--dock-w`(384) 机坞 / `--cmd-h`(78) 指令栏；
  手机竖屏改成 `stage → dock → cmd → nav` 四行；机坞按内容自适应（上限 46dvh，`panel-expanded` 68dvh），
  `panel-hidden`（运行态）时机坞让位、画布吃掉剩余高度。竖屏平板 641–900 与横屏 ≤900 各有一套单独 grid。
- **机坞三段（别再改回去）**：`.dock-head`（标题条）→ `<GuideOverlay/>`（引导条，钉在这、不随内部滚动）→ `.dock-body`（弹性列，内滚）。
  引导条曾绝对定位在画布内，实测压掉 15.4%（竖屏）/ 26.2%（横屏）画布；挪进机坞后全视口 0%。
  **任何"把提示挂回画布"的改动都会重新遮挡目标点环。**
- **引导期自动展开机坞**：桌面机坞默认收起时引导条随之不可见——引导期（圆/椭圆未毕业 + 编辑态 + ≥901px）由 `uiState.autoExpandForGuide()` 自动展开；
  用户经 `toggleDock` 手动收起后 `dockAutoDismissed` 记住意愿、本会话不再自动展开（程序化 `closeDock` 不算用户手势）。
- **机坞撑满靠三处 flex**（缺一处就仍留死区）：`.dock-body` 设 `display:flex; flex-direction:column`、`ArmPanel .deck` 设 `flex:1 0 auto`、
  `ArmEditor .tune` 设 `flex:1 0 auto; justify-content:space-evenly`。实测死区 1280/1440/1920 = 150/330/510px → **0px**。
- **`--dock-w` 不要为了画布变窄**：1280–1920 下画布都是「高度 − 56 − 78 − 60」受限（526/706/886 都是高度值），缩机坞不会让画布变大，只会挤压参数区。
- **整屏锁死**：`html/body/#app` 是 `height:100dvh + overflow:hidden`，页面不滚动；滚动只发生在 `.gs-dock .dock-body` 与弹层内部。新弹层必须自带上限 + 内滚。
- **折叠用 `bind:open` + `{#if}`**：Chrome 下 `<details>` 折叠态子元素仍有布局尺寸（`getBoundingClientRect` 非 0），会漏进度量、Tab 顺序与读屏。
- **控件尺寸只看指针类型**：`tokens.css` 的 `--ctl-xs/sm/md/lg/menu`（22/26/30/40/46 桌面；`@media (pointer: coarse)` 下 32/40/42/46/52）
  + `--ctl-font(-sm)` / `--ctl-radius` / `--ctl-icon`。**不要写死 px**；触屏命中区必须 ≥40（视觉不够用 `::after { inset }` 外扩，range 这类替换元素用输入层外扩）。
- **入口去重**（改动时守住）：朱印只在画布 HUD；章节星数只在顶栏「关卡」；成就/设置只在顶栏（手机无顶栏时用画布 HUD 齿轮）+ 更多菜单；
  音量/音乐只在更多菜单；缩放只靠滚轮/双指 + 画布右下角一个「复位视图」键。主操作文案是人话：**开始旋转 / 结束并结算**
  （引擎 `runLabel` 仍带 ▶/⏸ 字形，渲染前要剥掉，否则和 SVG 图标出现两个三角）。
- **暂停入口**：运行态指令栏左侧「⏸ 暂停」（Icon 的 `pause`，onclick = keyboardHandler 的 `toggleRun`）+ 空格键；不要挪进更多菜单（两跳且更隐蔽）。
- **教学展示条件**：`App.tutorialUp` 加 `engine.isCampaignLevel`（无前缀 id 且非沙盒/无尽）——直奔创作/每日/每周/无尽不再被圆关教学伏击，
  回到战役关时教学如期补上（延迟教学时刻保留）。**沙盒不再 markFlag 教学已看**。
  **沙盒运行态隐藏快进键**（快进 = 跳等待到超时，沙盒无时限，转速键已覆盖速度；两个形似 1× 并排是歧义）。
  `App.svelte` onMount 挂全局调试桥 `window.__ENGINE = engine`，浏览器验证可直接读引擎状态。
- **公共件**：`src/styles/game-ui.css`（`.g-btn` / `.g-plate` / `.g-inset` / `.g-label` / `.g-num` / `.g-divider` / `.g-corners` / `.g-lamp` / `.g-scanlines`）；
  尺寸与质感令牌在 `tokens.css`（`--hud-h/--cmd-h/--dock-w/--tab-h`、`--metal-*`、`--face-*`、`--edge*`、`--bevel-*`）。
  `reset.css` 给原生 `button` 去了皮（background/border/padding 清零）——凡按钮必须自己声明背景，否则透明（成就页「白色胶囊」就是这么来的）。
- **装饰层**：`AmbientField`（浑天环 + 星点 + 暗角）与 `ScreenFrame`（四角包边）都是 `position:fixed; pointer-events:none`，`z-index:0/40`；
  `inert` 门控在 `App.svelte`（有浮层时整个 `.game-layer` 失效，避免 Tab 跑到背景 HUD）。快捷键门控类名必须保留：
  `.modal / .modal-backdrop / .finale / .ch-intro / .title-screen / .tutorial`。
- 断点细节、超宽屏 HUD、创作器双栏、打卡日历、换肤资产清单、各控件修复口径与验证坑见 `references/ui-layout.md`。

## 视觉体系：糖果星域

**反模式**：早先的「星图金铜」皮肤同时上六件装饰（回纹带 / 四角铆钉 / 云纹 / 朱印 / 切角 / 内高光），噪声盖过信息，被用户直接否掉
（评价「整个 UI 太难看」）；现行是明亮卡通（玩具盒）皮肤。改皮肤不要再回退金属拟物风。

- **三层三色纪律**：60% 中性（白卡 / 浅蓝底）、30% 珊瑚主色（主操作 / 选中 / 铭牌）、10% 点缀（薄荷=成功启用、天蓝=信息、葡萄紫=高级、危险红=结束）。**不允许五色竞争。**
- **厚度公式**：本体当「侧壁」+ `::before` 当面 + 底部露 3–5px；投影是 0 模糊纯色偏移。
  **禁止**黑色模糊阴影、`backdrop-filter`、`mix-blend-mode`、`clip-path`、回纹/铆钉/包角/扫描线。
- **圆角族**：`--r-sm`12 / `--r-md`18 / `--r-lg`28 / `--r-xl`36 / `--r-pill`999，同层级只用一档。
- **组件只消费令牌**，不自己拼贴图与阴影（令牌全在 `tokens.css`，公共件在 `game-ui.css`）。
- **浅底对比度铁律（实测，别再犯）**：

  | 场景 | 不合格写法 | 正确写法 |
  | --- | --- | --- |
  | 白底上的珊瑚字 | `--coral-deep` 3.77:1 | `--coral-text` #b5431a → 5.55:1 |
  | 珊瑚面上的白字 | 白字 2.6:1 | `--coral-ink` #4a1a00 → 5.6:1 |
  | 薄荷面上的白字 | 白字 2.15:1 | `--mint-ink` #073a34 → 5.9:1 |
  | 危险面上的白字 | 原 `--face-seal` 3.0:1 | 渐变加深到 #c9332a→#a3201a → 5.3:1 |
  | 未获得星 | `--line-bright` 1.8:1 | #6f96ab → 3.17:1 |

  文字色基线：`--text` 10.3:1 / `--muted` 6.3:1 / `--muted-2` 4.8:1。**改面料必须重算字色**（对比度会随面料变亮而掉；铭牌比面板更亮，铭牌上的字用 `--text`）。
- **画布必须是「有颜色的夜空」，不能是「白壳里的黑圆盘」**：满幅夜空场景（靛蓝→葡萄紫→暖橙地平线 + 三团柔光星云 + 90 颗固定星点 + 暗角），
  星盘边界只由刻度环与柔光表达。语义色（金目标 #fbbf24 / 青指针 #00f5d4 / 紫轨迹 / 红警示）**硬编码在 `Stage.svelte` 绘制代码里，一个字都不许改**；
  只有 `<style>` 浮层色可动。目标改白厚环 + 金内环的「糖果圈」，连杆加粗到 4.2/5.6 并加圆头。
- **星盘半径按内容算**，不要按视口短边：`arenaRadius()` 用关卡 `pts`/`curve` 相对中心的外接半径 ×1.5（下限 140，上限短边/2−16）。
  旧写法 `shortSide/2 - 10` 在竖屏下环比玩法内容大 2.4 倍。
- **"游戏味"四来源**（改 UI 前先想清楚是加装饰还是加反馈）：① 世界是活的（星盘刻度环缓转 + 绕盘扫掠 + 外环/柔光呼吸 + 36 颗星尘 + 目标点呼吸宝石）；
  ② 操作有回弹（按下 0.97、滑杆跨档顿感、律柱通电自下而上填充）；③ 状态有演出（关卡入场卡 1.4s、起跑 1.06→1.0 + 青色扩散环 +「起」字、
  结算星星逐颗弹入 + 分数 count-up）；④ 反馈有力度（收集 = 扩散环 + 6 火花 + 飘字弹跳 + HUD 数字弹跳；每 5 连 = 四边脉冲 + ×N 印章）。
  **加反馈 ≠ 加装饰**：控件依旧不加发光/包边/扫描线，clutter 目标不变。

## 画布与性能

- **逻辑空间与补偿**：SIZE=640 映射到 canvas CSS 宽度，物理尺寸 = 逻辑 × (shownW/640)；
  `canvasK() = min(1.6, max(1, SIZE/shownW))`，文本/点/框用 `canvasFont(px)` 反向补偿，**上限 1.6** 防长标签溢出。
  补偿分三类（改动前先归类）：① 状态/信息（文本、点、HUD 框）→ 全额补偿；② 信息承载图形（轨迹线、频谱曲线）→ 只保物理底线（`lineW` ≥1.2px）；
  ③ 语义/范围（容差圆 `engine.level.tol`、网格）→ **不补偿**。
- **禁用 `shadowBlur`**：辉光走 `glowDot()` + 渐变缓存（`glowCache`）；`measureText` 走 `measureW()` 缓存。
  粒子/星尘总数 ≤60、每帧新增绘制控制在几十次量级（星盘 + 星尘 + 拖尾 + 火花实测仍 61fps）。
- **性能三招**（都在 `Stage.svelte`）：① 静态背景烘焙到离屏 canvas（夜空 + 星云 + 星点 + 暗角），每帧只 `drawImage` 一次
  （尺寸或 `arenaRadius()` 变化才重烘，`bgDirty`/`bgRadius`）；② 渐变缓存（`skyGrad`/`nebulaCache`/`arenaGlow` 半径变化时失效）；
  ③ 非运行态 30fps（`if (phase !== 'running' && now - lastDraw < 33) skip draw`），运行态保持 60fps、手感不变。
  实测（CDP `Performance.getMetrics` 的 TaskDuration 差值，10s/场景，未节流 Chrome）：调参空闲 7.0% → 3.7%、动画运行 12.2% → 9.8%、
  暂停 5.8% → 2.4%、标题页 8.8% → 3.9%；空闲 CPU 几乎全来自「每帧重画静态背景」（停掉 rAF 立刻降到 0.1%）。
- **TDZ 白屏**：在 `Stage.svelte` 新增 `let skyGrad = null` 这类缓存变量时，**必须声明在 `resize()` 之前**——
  `resize()` 在组件初始化阶段就被 `$effect` 调用，声明在后面会抛 `ReferenceError: skyGrad is not defined` 并整页白屏。
- **长文件一律用 node 脚本按字符串替换改**：`read` 工具对长文件会静默截断（`Stage.svelte` 1497 行只回来 1322 行且不报错），
  直接「读全文 → 回写」会丢掉 175 行。改完 `wc -l` 核对行数、`svelte-check` 复核。
- 帧率/活跃度/CPU 归因的测量口径与禁用 flags 见 `references/browser-probes.md`。

## 存档与玩法语义

存档键（`constants.ts`，全部登记在 `SAVE_KEYS` 参与备份）：

| 键 | 内容 | 备注 |
| --- | --- | --- |
| fft-pointers-endless-v1 | `{ wave, score, run?: { seed, diff, wave, score } }` | best + 进行中一局（run=null 表示已结束） |
| fft-pointers-clear-v1 | `Record<关卡id, 全清秒数>` | **注意键名是单数 clear**（不是 clears） |
| fft-pointers-best-v1 / best-score-v1 | 各关星级 / 最佳分 | |
| fft-pointers-best-run-v1 | 个人最佳那局（解法+节奏同源） | 幽灵竞速对准更强的一条 |
| fft-pointers-last-level-v1 / last-custom-v1 | 常规续玩 / 创作关续玩 | 无尽续玩优先于这两者 |
| fft-pointers-diff-v1 | 随机关难度（easy/normal/hard） | |

- **无尽模式**：1–2 波 easy、3–5 波 normal、6+ 波 hard（`endlessDiff(wave)`）；过波线 = 收集 ≥35%（一星线，`starsFor(ratio) >= 1`）；
  `randomDiff` 必须与当前波同步（无尽关 id 不含难度，分享链接靠它）——`startEndless` 设 easy、`nextEndlessWave` 先 `endlessWave++`
  再取 `endlessDiff(wave)`（有单测锁定）；断点续玩：过波时落 `run`（seed/diff/wave/score），启动 `resumeEndlessRun()` 按 seed 复现当前波、
  从波首重开，**优先于常规续玩**；`exitEndless` 清 run。结算：`settleEndlessBest()` 严格更优才置 `endlessNewBest`（打平不算，有单测）；
  `endlessNeed` = 距 35% 线还差几点。
- **结算判定**：**「新纪录」只在破了一个既有正数纪录时点亮**（`(bestScores[id] ?? 0) > 0`）——首局是建立基准不是破纪录，
  否则 0 星烂局也挂「新纪录」；每日/每周同口径。「最快全清」保持首清点亮（`engine.test.ts` 有锁定测试）。
  「下一枚目标」量词：三星线 = `ceil(0.9n) − got`（不是全收数字），完美全清 = `n − got`。
  **每日/每周的读后写陷阱**：`newRecord` 计算必须在 `dailyBest` 写入**之前**（先算标志再落库），否则读到本局刚写入的分数、首局必误报。
- **结算近失钩子**：结论行（verdictParts）在「距下一颗星 ≤3 点」时追加「再收 N 点就是 M 星」；差得远不报（0 星报「还差 15 点」是泄气不是动力）。
  力竭卡：过波线只差 ≤3 点时 detail 行显示「本波就差 N 点过线」（`endlessNeed` 结算后仍反映失败波差距）；
  newBest（刚刷新历代最佳）时**不显示**「仅差 N 分」——settle 后 best==本局，会算出「仅差 0 分」自指噪声。
- 存档键全表备注、分享链接 `lv=`、挑战好友、大成结局触发配方、每日/每周与 `navigator.share` 回退见 `references/gameplay-and-save.md`。

## 反馈与动效

- **动效规范**：反馈 90–180ms、演出 300–600ms；进场 `cubic-bezier(0.16,1,0.3,1)`、回弹 `cubic-bezier(0.34,1.56,0.64,1)`、退场比进场快 30%；
  游戏内位移 ≤8px / 缩放 ≤1.08（标题页与 Toast 的一次性入场编排可到 1.15）；同时动画 ≤8 个元素；
  入场用 `animation-fill-mode: backwards`（`both` 会让计算值停在单位矩阵、并压住 hover/`:active`）。
- **UI 器物音**：按钮 = 木鱼「笃」（`uiClick` → 共享画法 `knock()`：正弦 600→450 Hz 下落、60ms，全局点击监听统一触发，音色改动只动 `audio.ts` 一处）；
  功能弹层展开 = 编钟「磬」（`uiChime`：分音比复用 `music.ts` 的 BELL_PARTIALS ×2/×2.76、基频 523.25、晚 70ms 起振成「笃→磬」应答）。**关闭弹层不加音**。
  `$effect` 里读 `engine.soundOn` 会让音效随开关切换重放——「仅挂载时一次」的语义要用 `untrack` 包住。
- **里程碑反馈清单**（改动后对照，别漏）：收集（音阶+飘字）/ 连击每 5（木鱼）/ 星级跨档（starSound+haptic）/ 印章（sealSound+haptic）/
  章节印（chapterSeal+haptic）/ 成就（achvSound+toast+haptic）/ 通关（perfectArpeggio 或 finishChord+震屏）/ 无尽过波（achvSound+haptic）/
  **终局倒计时（最后 3 秒每秒 tickSound+haptic+画布红光脉动；时间到非全清 = timeUpSound+红光一闪+双击触感）** /
  读屏播报（aria-live，优先级链：结算 > 成就 > 过波 > **终局倒计时（urgent 翻转播一次）** > 星级；600ms 防抖；
  **过波分支需 `endlessSurvived` 门控**——续玩恢复的存量波次不播）。
- **终局张力**：引擎单一事实源 `engine.urgent`（`$state`，`advance()` 里派生 `!sandbox && t >= RUN_DUR - 3`，resetRun/startRun/stopRun 清除）；
  读屏与画布/时间条演出都消费它，**不要**在 UI 里各自拿 `RUN_DUR - engine.t` 重算（读屏 getter 读 t 会让 App 的 `$effect` 每帧重跑）。
  三个通道：① 每秒一击 = Stage 帧循环里 `lastTickSec` 守卫（离开 >3s 区归零防重播）+ `tickSound(sec)`（620/760/900 Hz 逐秒升高）+ 8ms haptic；
  ② 时间到（非全清，判据 `t >= RUN_DUR - 1e-6`）= `timeUpSound` 下行双音 + 画布红光一闪 620ms + `[12,40,12]` 触感；
  ③ 画布边光 = `urgentVignette()` 径向渐变按视口缓存，随秒脉动 `0.06+0.1*(1-t%1)²`，`motionOff()` 时恒定 0.08。
- 器物音接线点、终局时间条演出、擦边提示、活跃度测量与引擎计时类测试坑见 `references/visual-and-feedback.md`。

## 浏览器验证与 e2e

- **浏览器验证统一走 agent-browser**（用户明确要求：不要自研 CDP 管线）。常用：
  `agent-browser set viewport 1440 900` → `open <url>` → `wait --fn "!!document.querySelector('canvas')"` → `screenshot --if-changed name.png`；
  量指标用 `eval "<表达式>"`（结果自己解析）。**务必 `agent-browser close` 收尾**；全机 owner daemon（`--remote-debugging-port=0` 那批进程）不受影响，别去 kill。
- **量尺脚本**（改布局/对比度/热区前先跑基线）：`.workwork/ui-r6/probe4.mjs`（一次输出 6 个视口的画布尺寸 / 引导条压画布 % / HUD 压画布 % /
  机坞死区 px / 横向溢出 / 页面滚动）、`.workwork/ui-r6/contrast.mjs`（像素级对比度，逐元素取值 + 命中测试跳过被遮挡元素，比旧 `audit.mjs` 的渐变背景误判可靠）、
  `.workwork/ui-r6/check6.mjs`（`pause` 实拍暂停浮层；`focus` 用 `CSS.forcePseudoState` 强制 `:focus-visible` 并对比前后计算属性）、
  `.workwork/ui-redesign/sizes.mjs`（尺寸普查）/ `touch.mjs`（命中区普查）/ `clutter.mjs` / `juice.mjs`、
  `.workwork/ui-r7/accept.sh`（format → svelte-check → 311 测试 → build → 9 条红线静态扫描 → 画布未改动校验）。
- **量遮挡要按「画布面积占比」而不是「有没有重叠」**：56px 高引导条在 338px 画布上是 15%、在 886px 画布上只有 5%，会被误判为可接受。
- **截图看着不对先取数据**：怀疑画布被浮层遮挡用 `document.elementFromPoint` 在画布四个采样点取顶层元素（返回 `CANVAS` 且 `filter:none` 即无遮挡）；
  缩略图里中文像乱码时先取 `textContent` 核对，别急着报 bug。`:focus-visible` 这类截图表达不出的状态用 CDP 强制伪类 + 读计算属性。
- **e2e 冒烟**：详见 `scripts/e2e-smoke.md`。关键：必须跑 dev server（动态 import 源码在 preview 不可用）；seg1 结果落 `sessionStorage['__e2eSeg1']`；
  每次运行用全新会话（长会话劣化）；「🎨 创作星轨」在「每日一练与无尽演武」折叠条内。eval 空输出/页面空白的第一排查项是 dev server 是否存活
  （`lsof -iTCP:<端口>`；5200 server 曾静默退出一次，重启即愈）。
- 测量口径、agent-browser 沙盒与提权、CDP 方法、flags 与 CPU 归因、e2e 脚本细节见 `references/browser-probes.md`。

## 已知限制

- agent-browser 长会话跑多步 e2e 不可靠（session 劣化），全流程自动化需独立 Playwright 实例（未立项，等用户决定）。
- 结算卡重开（📊 结算卡）后的主按钮文案是短标签（如「▶ 椭圆」），首次结算是「▶ 下一关 · 椭圆」——同一功能两种渲染状态
  （解锁庆祝 vs 常规导航），有意设计。

## references

- `references/ui-layout.md` — 断点与移动端布局、各控件修复口径、换肤资产清单、验证坑
- `references/visual-and-feedback.md` — 动效/器物音/终局张力/擦边提示的细节与验收方法
- `references/gameplay-and-save.md` — 存档键全表、无尽语义、结算判定、分享与邀请码
- `references/browser-probes.md` — 量尺与测量口径、agent-browser 与 e2e 细节、CPU 归因
