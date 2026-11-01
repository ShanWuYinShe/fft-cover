# 视觉、动效与反馈的细节

本文件是 SKILL.md「视觉体系」「反馈与动效」两节的实现细节与验收方法。

## UI 器物音

- **按钮 = 木鱼「笃」**：`uiClick` → 共享画法 `knock()`（正弦 600→450 Hz 下落、60ms）；全局点击监听统一触发，音色改动只动 `audio.ts` 一处。
- **功能弹层展开 = 编钟「磬」**：`uiChime`（分音比复用 `music.ts` 的 BELL_PARTIALS ×2/×2.76、基频 523.25、晚 70ms 起振成「笃→磬」应答）。**关闭弹层不加音**（关闭键自带笃声）。
- **磬的接线点**：App.svelte 一处 `$effect` 监听 `showAchv/showSettings/starMapOpen/engine.phase==='paused'` 的 **false→true 沿**（弹层互切不双响）；
  ComposerModal 在自身 `$effect` 里 `untrack` 只认挂载一次；MoreMenu 展开分支触发。**演出层（标题/章节入场/通关/结算/教程）不加磬**——
  它们有自己的音效编排。
- **坑**：`$effect` 里读 `engine.soundOn` 会让音效随开关切换重放——「仅挂载时一次」的语义要用 `untrack` 包住；
  700 Hz 实际发声上限只约束**环境音总线**（`NOTE_MAX_HZ`），UI/游戏音效的既有上限是 1046.5 Hz（`starSound`），
  磬的 ×2.76 泛音 1444 Hz 靠「极轻（0.08×0.045）+ 短促（≤0.5s）」不扎耳。
- 里程碑音效函数（collectSound/pluck、woodfishSound、starSound、sealSound、chapterSealSound、achvSound、perfectArpeggio、finishChord）
  既有实现不要顺手改参数。

## 终局张力（最后 3 秒）

- **引擎单一事实源**：`engine.urgent`（`$state`）——`advance()` 里派生 `!sandbox && t >= RUN_DUR - 3`，resetRun/startRun/stopRun 清除。
  读屏与画布/时间条演出都消费它，**不要**在 UI 里各自拿 `RUN_DUR - engine.t` 重算（读屏 getter 读 t 会让 App 的 `$effect` 每帧重跑）。
- **三个通道**：
  ① 每秒一击 = Stage 帧循环里 `lastTickSec` 守卫（离开 >3s 区归零防重播）+ `tickSound(sec)`（knock 620/760/900 Hz 逐秒升高）+ 8ms haptic；
  ② 时间到（非全清，判据 `t >= RUN_DUR - 1e-6`）= `timeUpSound` 下行双音 + 画布红光一闪 620ms + `[12,40,12]` 触感——
  与主动结束 `finishChord`、全清 `perfectArpeggio` 三者听觉身份互斥；
  ③ 画布边光 = `urgentVignette()` 径向渐变按视口缓存（`urgentGlow` 声明在 `resize()` 之前——TDZ 坑同 `skyGrad`），
  随秒脉动 `0.06+0.1*(1-t%1)²`，`motionOff()` 时恒定 0.08。
- **时间条演出**：数字用 `{#key timeLeft <= 3 && engine.phase === 'running' ? timeLeft : 'steady'}` 换键重挂载做每秒弹跳（非最后 3 秒不重挂）；
  轨道心跳环动画**只在 `phase === 'running'`**——暂停时回到静止，否则无限动画闪到天荒地老。
- **引擎计时类测试的坑**：GameEngine 默认圆关 + 默认 1× 指针会**直接全清**，advance 循环跑到 t≈7.6s 触发「全清 3 秒后自动结算」，
  一局在终局窗口之前就 done——测最后 3 秒/超时类逻辑必须先 `setArm(0, { on: false })` 断掉全清。
  另外 780×(1/60) 浮点累加会得到 12.999…，边界断言要多推几帧。
- **结算近失钩子**：结论行在「距下一颗星 ≤3 点」时追加「再收 N 点就是 M 星」；差得远不报。

## 擦边提示（画布内的连续距离信号）

- 运行态指针从 <2.2×tol 未收集点附近扫过时，该点糖果圈「兴奋」鼓一下（`rr ×(1+0.42·fKick)`）+ 薄荷环扩散（rgba(47,199,155)，380ms，每点 600ms 冷却）——
  把调参差局的 16s 死时间变成连续距离信号。金色=已收、薄荷=擦边；仅 running 触发、专家模式关闭（不泄露容差）、`motionOff()` 下不闪。
- 验证坑：canvas 像素采样无法区分薄荷与指针青色光晕的抗锯齿混色，要用确定性几何场景（圆关 r=140 vs 目标 120，纯擦边永不收集）+ 截图目视。

## 活跃度可量

活跃度量法（量尺脚本已随自研管线清理）：采样画布区域连续帧的像素变化率 + rAF 帧率——静息 0.29% / 运行 2.8% / 减动效 0%；运行态 61fps。
整体回归口径：编辑态与运行态均 60fps（rAF 计数；30fps 绘制节流不影响 rAF 频率）、0 longtask、控制台零错误——fps 与 longtask 用页面内
rAF 计数 + `PerformanceObserver('longtask')`，分两次 eval 安装与读取（eval 对长 await 有超时）。
**测量前必须 `Page.bringToFront` 且用不节流的 Chrome**（`--disable-background-timer-throttling --disable-backgrounding-occluded-windows
--disable-renderer-backgrounding`）——后台标签 rAF 会被节流到 ~1fps，测出来全是假的。

## 动效规范（写作口径）

反馈 90–180ms、演出 300–600ms；进场 `cubic-bezier(0.16,1,0.3,1)`、回弹 `cubic-bezier(0.34,1.56,0.64,1)`、退场比进场快 30%；
游戏内位移 ≤8px / 缩放 ≤1.08（标题页与 Toast 的一次性入场编排可到 1.15）；同时动画 ≤8 个元素；
入场动画用 `animation-fill-mode: backwards`（`both` 会让计算值停在单位矩阵、并压住 hover/`:active`）。

## 里程碑反馈清单（改动后对照，别漏）

收集（音阶+飘字）/ 连击每 5（木鱼）/ 星级跨档（starSound+haptic）/ 印章（sealSound+haptic）/ 章节印（chapterSeal+haptic）/
成就（achvSound+toast+haptic）/ 通关（perfectArpeggio 或 finishChord+震屏）/ 无尽过波（achvSound+haptic）/
**终局倒计时（最后 3 秒每秒 tickSound+haptic+画布红光脉动；时间到非全清 = timeUpSound+红光一闪+双击触感）** /
读屏播报（aria-live，优先级链：结算 > 成就 > 过波 > **终局倒计时（urgent 翻转播一次）** > 星级；600ms 防抖；
**过波分支需 `endlessSurvived` 门控**——续玩恢复的存量波次不播）。

## UI 返工的验收脚本

`.workwork/ui-r7/accept.sh`：一次跑完 format → svelte-check → 测试 → build → 9 条红线静态扫描 → 画布未改动校验，输出「N 项通过 / M 项不通过」。
其中的测试数是写死的基线，**以实跑为准**（取数：脚本输出的 Tests 行）。
扫描器有两条**必须保留的排除规则**，否则全是假阳性：
① `!important` 排除 `src/styles/animations.css`（`prefers-reduced-motion` 的标准写法）；
② `--pattern-hui`/`--rivet` 只查组件层（`^src/styles/` 排除），令牌定义本身要留作兜底。
冷蓝判定口径：`rgba(r,g,b)` 里 `b > g` 且 `b-r >= 12` 且 `r < g`（青 `b≈g`、紫 `r>g` 不会误伤）。
