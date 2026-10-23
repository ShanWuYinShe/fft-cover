---
name: fft-cover-architecture
description: 傅立叶指针（fft_cover）项目架构事实：全屏座舱 UI 架构（grid 四区/tokens/game-ui 公共件/触屏热区/星图金铜美术皮肤与验收脚本）、本地免提权截图链路、存档键清单与备份域、无尽模式语义（波次难度爬升/35% 过波线/断点续玩/结算）、画布坐标系与物理补偿体系（canvasK）、里程碑反馈清单（音效/触觉/读屏）、e2e 冒烟运行要点。触发：改界面布局/样式/弹层/截图链路；改引擎/存档/画布绘制/无尽模式/结算卡/可访问性；需要知道某个 localStorage 键的语义；改难度曲线或收集判定；写 e2e 脚本。
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
  **机坞三段（第六轮定案，别再改回去）**：`.dock-head`（标题条）→ **`<GuideOverlay/>`（引导条，钉在这、不随内部滚动）**
  → `.dock-body`（弹性列，内滚）。引导条曾经绝对定位在画布内，实测压掉 15.4%（竖屏）/26.2%（横屏）画布；
  挪进机坞后全视口 0%，同时填掉机坞顶部空档。**任何「把提示挂回画布」的改动都会重新遮挡目标点环。**
  **第十六轮补全（2026-10-24）**：桌面机坞默认收起时引导条随之不可见（走查新玩家路径实测发现）——
  引导期（圆/椭圆未毕业 + 编辑态 + ≥901px）由 `uiState.autoExpandForGuide()` 自动展开机坞；
  用户经 `toggleDock` 手动收起后 `dockAutoDismissed` 记住意愿、本会话不再自动展开
  （程序化 `closeDock` 不算用户手势）。动引导条位置前先想清楚这条链路。
  机坞撑满靠三处 flex（缺一处就仍留死区）：`.dock-body` 设 `display:flex; flex-direction:column`、
  `ArmPanel .deck` 设 `flex:1 0 auto`（撑满剩余高度）、`ArmEditor .tune` 设 `flex:1 0 auto; justify-content:space-evenly`
  （无富余高度时与原来一致，不影响手机内滚）。实测机坞死区 1280/1440/1920 = 150/330/510px → **0px**。
  **`--dock-w` 不要为了画布变窄**：1280–1920 下画布都是「高度 − 56 − 78 − 60」受限
  （526/706/886 都是高度值），缩机坞不会让画布变大，只会挤压参数区。
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
- **美术皮肤：星图金铜（第七轮，当前定稿；第五轮器物语言已被推翻）**：第五轮的「回纹带 + 四角铆钉 +
  云纹 + 朱印 + 切角 + 内高光」六件装饰同时出现，噪声盖过信息，用户直接否掉（「ui风格太丑了吧」），
  并要求按游戏美术的方式做——**要有真实贴图与材质，不是网页换配色**。第七轮的结论：
  - **底**：深空星云 + 电影颗粒。颗粒层用 `feTurbulence` 程序化生成 data-URI，`opacity .045` +
    `mix-blend-mode: overlay`，**盖在面板之上**（`.game-screen::after`，fixed + z-index 40），
    不是压在背景下面——压在下面只有背景有颗粒、面板发干，反而没有贴图感。静态层，零动画开销。
  - **面**：拉丝青铜装甲 `--mat-plate`（斜向高光 + 拉丝 + 内沿暖亮线 + 内框发丝 + 外柔影）。
  - **铭牌**：黄铜底 `--plate-brass` + 刻字（机坞抬头、章节条、标题条统一用）。
  - **控件**：雕刻凹槽滑杆 `--groove-bg`/`--groove-shadow` + 17px 金珠拇指（`::-webkit-slider-thumb`
    与 `::-moz-range-thumb` 都要写）、金箔主按钮、键帽式次级键。
  - **装饰只剩两处**：雕花包角 `--tex-corner`（全屏 2 枚，`.g-rivets::after` 已重做成右上角包角）
    与四角包边。切角/铆钉/回纹全部退场。
  - **厚度公式**：内侧 1px 暖亮线 + 雕刻凹槽 + 外柔影。**禁止 2px 硬立体边**（那是 2–3px bevel 的
    年代感拟物，正是「丑」的主要来源之一）。
  - **色彩纪律**：一种金属（青铜/金）+ 一种能量色（青玉，只用于画布/启用灯）+ 一种警示色（朱砂）。
    五个竞争色相无层级 = 廉价。
  - 令牌全在 `tokens.css`（`--mat-*` / `--tex-*` / `--plate-*` / `--face-*` / `--r-*`），公共件在
    `game-ui.css`。**组件只消费令牌，不自己拼贴图与阴影。**
  - **切角已全量取消**：`--chamfer-*` 一律 `none`，且组件层调用已全部清除（`none` 是 `clip-path`
    的合法值，所以第五轮那种「改令牌值就能静默降级 25 处调用」的写法现在只作兜底）。新代码用 `--r-*`。
    随之消失的两个坑：`clip-path` 切掉 `outline` / 切掉内部滚动条——圆角没有这些问题。
  - **画布语义色是红线**：金色目标 `#fbbf24`、青色指针 `#00f5d4`、紫色轨迹、红色警示全部**硬编码在
    `Stage.svelte` 绘制代码里**，用户明确要求保留，**一个字都不许改**；只有 `<style>` 浮层色可动。
  - **对比度会随面料变亮而掉**：面板提亮一档后 `--muted` 在面料上只剩 3.6:1。改面料必须**重算字色**
    （第七轮把 `--muted` 提到 `#bda887` ≈5.8:1、`--muted-2` 提到 `#b09a72` ≈4.7:1）。黄铜铭牌比
    面板更亮，铭牌上的字要用 `--text`（`--muted` 在铭牌上只有 ≈4.0:1，压线不过）。
- **改 CSS 块要用编译产物回查**：用脚本（python 替换）改 `<style>` 块时，「模板改了、样式没改」不会报错
  （B 线踩过：`<span>` 进了模板、规则没进 style，肉眼直到传 hint 才暴露）。改完必须
  `grep` 编译后的 CSS（或 `pnpm build` 后在 dist 里回查）确认规则真的存在。
- **UI 返工的验收脚本**：`.workwork/ui-r7/accept.sh`（第六/七轮沉淀）。一次跑完
  format → svelte-check → 311 测试 → build → 9 条红线静态扫描 → 画布未改动校验，输出「N 项通过 / M 项不通过」。
  扫描器有两条**必须保留的排除规则**，否则全是假阳性：
  ① `!important` 排除 `src/styles/animations.css`（`prefers-reduced-motion` 的标准写法，main 原有）；
  ② `--pattern-hui`/`--rivet` 只查组件层（`^src/styles/` 排除），令牌定义本身要留作兜底。
  冷蓝判定口径：`rgba(r,g,b)` 里 `b > g` 且 `b-r >= 12` 且 `r < g`（青 `b≈g`、紫 `r>g` 不会误伤）。
- **渲染复核的探测法**：截图看着「画布变暗了」不要凭肉眼断定，用 `document.elementFromPoint` 在画布
  四个采样点取顶层元素——返回 `CANVAS` 且 `filter:none` 就说明没有浮层遮挡。同理，缩略图里的中文
  看起来像乱码时，先取 `textContent` 核对，别急着报 bug（本轮据此排除了两个假 bug）。

- **空间与遮挡量尺（第六轮新增，改布局前先跑基线）**：`.workwork/ui-r6/probe4.mjs`（一次输出 6 个视口的
  画布尺寸 / 引导条压画布 % / HUD 压画布 % / 机坞死区 px / 横向溢出 / 页面滚动）、
  `.workwork/ui-r6/contrast.mjs`（像素级对比度：逐元素取值 + 命中测试跳过被遮挡元素，比 `audit.mjs`
  的渐变背景误判可靠）、`.workwork/ui-r6/check6.mjs`（`pause` 实拍暂停浮层；`focus` 用
  `CSS.forcePseudoState` 强制 `:focus-visible` 并对比前后计算属性）。第六轮基线 → 改后：
  引导条压画布 15.4/26.2/5.1%（竖屏/横屏/桌面）→ **0/0/0**；机坞死区 150/330/510 → **0/0/0**；
  HUD 压画布手机竖屏 9.2% → 7.7%（收集读数由两行改单行「收集 0/24」；横屏 12.4% 来自 `本关目标` 行，
  只在 ≤700px 高时隐藏）。**量遮挡要按「画布面积占比」而不是「有没有重叠」**，否则 56px 高地引导条在
  338px 画布上是 15%、在 886px 画布上只有 5%，会被误判为可接受。
- **CDP 同 origin 的 localStorage 会串档**：跑完无尽/结算截图后再截另一档，应用会按存档恢复上一局，
  出来的图不是你要的界面。截对照图前先 `localStorage.clear()`，或用 `http://[::1]:5200/` 隔离 origin。
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
- **暂停的入口（第十九轮，2026-10-24）**：运行态指令栏左侧可见「⏸ 暂停」按钮（Icon.svelte 的 `pause` 图标，onclick = keyboardHandler 的 `toggleRun`）+ 空格键；此前只有空格一条隐形入口，而暂停浮层的偏差诊断是「边跑边看」的正经工具。不要把暂停挪进更多菜单（两跳且更隐蔽）。
- **沙盒入口（第二十三轮，2026-10-24）**：`enterSandbox()` 同时 `markFlag('tutorialSeen')`——直奔沙盒的玩家跳过圆关教学，不标记的话教学会悬在沙盒画面上；沙盒运行态隐藏快进键（快进=跳等待到超时，沙盒无时限，转速键已覆盖速度，两个形似 1× 并排是歧义）。另：App.svelte onMount 挂了全局调试桥 `window.__ENGINE = engine`，浏览器验证可直接读引擎状态，无需插桩。
- **新手教学展示条件（第二十四轮，取代第二十三轮的沙盒单点补丁）**：`App.tutorialUp` 加 `engine.isCampaignLevel`（无前缀 id 且非沙盒/无尽）——直奔创作/每日/每周/无尽等进阶路径不再被圆关教学伏击，回到战役关时教学如期补上（延迟教学时刻保留）。enterSandbox 不再 markFlag('tutorialSeen')。ComposerModal 生成并游玩时顺手 `uiState.closeStarmap()`（此前星图抽屉盖着玩家刚造好的关卡）。另：调试桥 `window.__ENGINE`（App onMount 挂的）可直接读引擎状态做浏览器验证。
- **清空进度武装态超时（第二十六轮，2026-10-24）**：存档 tab 的「清空进度」两步确认，武装态（确认清空？）4 秒后自动解除（confirmTimer + onDestroy 清理）——原实现武装后永不解除，「点一下走开回来再点」会误清存档。数据安全控件的标准做法。验证坑：Svelte 状态更新在微任务批量刷 DOM，点击后**同 tick** 查询读到的还是旧文案，要等两个 rAF 再断言；agent-browser eval 长 await 不可靠，用两段式（先装状态再读）。
- **画布设置齿轮按断点显隐（第三十六轮，2026-10-24）**：`.hud-settings-btn` 只在 ≤900px （顶栏成就/设置按钮隐藏的区间）显示，≥901px 隐藏（顶栏常驻，入口去重）——此前桌面端顶栏齿轮与画布齿轮重复且都占 Tab 序。实测断点行为：≤900 顶栏三键 display:none。
- **标题页三步上手按进度门控（第三十三轮，2026-10-24）**：`ts-steps` 卡原先无条件渲染，63 星老手每次回标题都被新手三步糊脸；改为 `{#if !hasProgress}`（复用战绩行的同一条件）——新手看三步上手，老手看战绩行（3/63 星 · 朱印）。
- **指令栏快捷键提示已移除（第二十九轮，2026-10-24）**：指令栏是内容自适应药丸（1920 下仅 ~610px），cmd-left 任何视口都装不下 135px 的提示，>1500px 媒体查询放行后也只露出「空」一字（r14 起即为死装饰）。快捷键文档只在设置弹窗的「快捷键」说明里；别再把提示加回指令栏。
- **创作器双栏重构（第三十轮，2026-10-24）**：40 根滑块把 150px 预览画布挤出视口（canvas top=1151 > 视口 900）造成盲编辑——sticky 修复无效，因为预览 wrapper 位于 composer-body（1145px）的最后 73px，sticky 移动区间为负（sticky 元素只能在父盒内移动）。正解是双栏：`.composer-layout` grid（200px 预览窗格不滚 + 滑块列表独立内滚，`height: min(56vh, 500px)`，窄屏 720px 收单列）。**sticky 不生效时先查元素在父盒里的剩余移动区间，负区间 = 永不粘住。**
- **创作器数值读出与预设激活态（第三十一轮，2026-10-24）**：每行滑块后接 tabular 数值读出（幅值/相位°），精度工具读得回设定值；预设芯片加 `appliedPreset` 激活态（手动改任何滑杆即转自定义并熄灭）。预设芯片实际文案是「心搏」不是「心形」——自动化脚本 `?.click()` 会把找不到目标静默吞掉，断言必须断在行为上而不是调用返回值上。
- **打卡日历未来日可见性（第二十八轮，2026-10-24）**：统计 tab 日历的 `.cal-cell.future` 原本只把数字色 muted→muted-2，两个蓝灰在浅底上不可分辨；改为 `background: transparent` + 弱边（未来日=空槽，过去空日=浅蓝底，已打卡=薄荷，今天=珊瑚描边，四态分明）。5 周窗口按周一对齐，未来日通常只有本周剩余几天。
- **菜单项反馈不可见（第二十七轮，2026-10-24）**：MoreMenu 的 `run()` 先 `open=false` 再执行  handler——选中项上的反馈标签（如「✓ 已复制战报」）随菜单卸载，用户永远看不到。菜单动作的结果反馈一律走 `uiState.setShareNote()` 全局 toast（分享战报/保存成绩图已接，含失败分支的诚实提示）；持久按钮（如每日分享）的内联标签不受此限。另：headless 下剪贴板 write 与 execCommand 都会失败，恰好可用来验证失败分支。
- **navigator.share 失败必须回退剪贴板（第三十二轮，2026-10-24）**：`if (navigator.share)` 只保证 API 存在，桌面 Chrome 无分享目标时 `share()` 照样 reject——shareArms 原实现失败直接进  fail 态，「挑战好友」在桌面 Chrome 上发不出去（copyReport 同位置就有回退，漏了这里）。修后 catch → 剪贴板回退 + setShareNote，端到端实测：分享 stub 捕获挑战链接 → 好友打开 URL 载入同题同参 + 「参数已装好」提示。
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
  --remote-debugging-port=9411 --no-first-run \
  --user-data-dir="$PWD/.workwork/ui-redesign/chrome-profile" about:blank &
```

**禁止 `--disable-gpu`（第十二轮实测修正）**：它把 Chrome 打进软件光栅，活动标签渲染 CPU 从
~12% 涨到 73–87%、空实例从 8.6% 涨到 42.4%（见下节量化表）。第九/十一轮会话照抄旧模板带上它，
是风扇狂转的第二根因。full-access 下也不加 `--no-sandbox`（原生沙盒保留，2026-10-20 实测
GPU 渲染正常、页面加载正常）；只有 workspace-write 沙盒内才需要 `--no-sandbox`
（嵌套 Seatbelt 冲突，见 browser-automation-safety skill）。

- 脚本：`.workwork/ui-redesign/shot.mjs <scenario> <out.png> [宽] [高] [mobile]`（单场景截图；
  星图场景点的是顶栏 `.hud-quiet-btn`——入口改过名，旧类名 `.hud-starmap-btn` 已不存在）
  与 `verify.mjs`（17 个场景批量：截图 + 布局度量：不滚屏 / 无横向溢出 / 未声明背景的按钮 /
  <40px 触屏热区 / 画布尺寸），报告落 `verify-report.json`。
- `PUT /json/new?<url>` 开自己的标签（用完 `/json/close/<id>`），不抢焦点、不写 home。
- **同一 Chrome 下 localStorage 按 origin 共享**：多个会话同时截图会互相覆盖
  `fft-pointers-flags-v1`（表现为 title 场景截不出来）——用 `http://[::1]:5200/` 与
  `http://localhost:5200/` 两个 origin 隔离。
- dev server 端口：本仓库会话用 5200（`pnpm dev --port 5200`），别和 5199/5173 混。

### CDP 截图脚本的资源治理（第九轮实测，风扇起飞的根因）

**每次 `PUT /json/new` 都会开一个新标签页，headless Chrome 每个 tab 至少一个 renderer 进程；
不关闭就会堆积，实测把机器拖到 171 个 Chrome 进程、风扇狂转。**

- **每个脚本都必须 `finally` 里 `GET /json/close/<tabId>`**，并且 tabId 要真的从 `connect()`
  返回出来——第九轮踩的坑是关闭语句写成了
  ``fetch(`/json/close/${(await Promise.resolve('')).toString()}`)``（插值恒为空串），
  请求静默失败、一个 tab 都没关，`audit8.mjs` 跑两轮堆了 44 个 tab。
- **批量脚本尤其危险**：`audit8.mjs` 是 9 场景 × 4 视口 = 36 次 new；`space.mjs` 是 21 次。
  写这类循环时，close 必须放在**循环体内**（不是循环外），且用当次迭代的 tabId。
- **自查命令**（跑完脚本后确认没泄漏）：
  ```bash
  # 跑之前/之后各执行一次，数字应相同
  curl -s http://127.0.0.1:9421/json/list | python3 -c "import sys,json; print(len(json.load(sys.stdin)))"
  # 全机 CDP 进程数（正常应为 0 或 1 个实例的进程树）
  pgrep -f "remote-debugging-port" | wc -l
  ```
- **收尾必关**：`kill -9 <主进程 pid>` 后要 `pgrep -f "remote-debugging-port"` 复查，
  子进程可能残留；`top` 在本机沙盒里会被拒（`Operation not permitted`），
  用 `pgrep -P <pid> | wc -l` 数子进程规模代替。

### CPU 归因量化（第十二轮实测，2026-10-20，`.workwork/cpu-r12/`）

**第十三轮独立复测（2026-10-20，同一页面 12 秒，整棵 Chrome 进程树 CPU 时间累加）**：

| 启动参数 | 进程树 CPU 时间 | 折合单核 |
| --- | --- | --- |
| 正常（默认 GPU） | +4.30s | **35.8%** |
| `--disable-gpu` | +11.63s | **96.9%** |

即软件光栅让整树 CPU 占用涨到约 **2.7 倍**。注意要测**整棵树**——主进程 cputime 几乎不变
（1.46s vs 1.41s，它只做调度），真正燃烧的是 renderer 子进程，只测主进程会得出
「两者没差别」的错误结论。

第九轮只定位了「标签泄漏 → 进程堆积」，第十二轮用受控实验补全了另一半，并修正一个误判：

| 场景（8 个本应用标签） | `--disable-gpu`（旧模板） | GPU 正常 | 倍率 |
| --- | --- | --- | --- |
| 空实例（0 标签） | 42.4% | 8.6% | 4.9x |
| 8 标签稳定 | 129.6% | 37.1% | 3.5x |
| 单活动标签（渲染线程内） | 73–87% | ~12% | 6–7x |

- **真正的持续高 CPU 来自「活动标签 × 软件光栅」**：`--disable-gpu` 下画布 rAF 重绘占渲染
  线程 70%+（停掉 rAF 后降到 3–6%），整实例吃满约一个核。泄漏的**隐藏**标签不烧 CPU——
  headless 对后台标签 rAF 节流到 0（实测 hidden tab 3 秒 0 帧），泄漏的主要代价是
  **内存**（每标签 130–250MB，44 标签 ≈ 6–10GB → swap 压力）与最后一个活动标签的满核燃烧。
- **应用侧无需改造**：游戏页在真实浏览器里被切后台时同样被节流，属正常行为；
  不要给 Stage 加「document.hidden 停绘」之类的守卫（对已节流的场景是死代码）。
- **量 CPU 别用 `ps pcpu` 的瞬时值下结论**：macOS `ps -o pcpu` 是近期加权平均，
  受控对比要固定场景、固定窗口（CDP `Performance.getMetrics` 的 TaskDuration 差值最可靠）。

### 移动端视口要用真实机型，别用 390（第九轮纠正）

390×844 只是 iPhone 13/14/15 一档，且属于**偏窄**的一端。Statcounter 2025-07 与
多份 2025–2026 统计的一致结论（[FASTCODING](https://fastcoding.jp/blog/all/info/designwidth-202509/)、
[designrush](https://www.designrush.com/agency/web-development-companies/trends/website-dimensions#1)、
[phone-simulator](https://phone-simulator.com/blog/most-popular-mobile-screen-resolutions-in-2026)）：

| 宽度×高度 | 占比/机型 |
| --- | --- |
| **360×800** | **最常见（≈10.3%）**，中端 Android 主力 |
| 390×844 | 6.55%，iPhone 13/14/15 |
| 393×852 | 5.35%，iPhone 15/16 Pro |
| 412×915 / 411×891 | 4.3%，Galaxy S24、Pixel 8/9 |
| 375×812 | 4.2%，iPhone SE 一系 |
| 430×932 | iPhone 16 Plus |
| 440×956 | iPhone 16 Pro Max |
| 725×870 | 折叠屏展开（现代手机整体跨度 360–707 CSS px） |

**验收至少覆盖 360 / 411 / 440 三档 + 844×390 横屏**，只用 390 会漏掉最常见的窄屏与
大屏机型。实测第九轮铺满改造在 360–725 全区间画布都是 100% 占满、无横向溢出。

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
- **力竭卡近失钩子（第二十一轮，2026-10-24）**：力竭时若过波线只差 ≤3 点，EndlessResult detail 行显示「本波就差 N 点过线」（`endlessNeed` 结算后仍反映失败波差距）；newBest（刚刷新历代最佳）时**不显示**「仅差 N 分」——settle 后 best==本局，会算出「仅差 0 分」自指噪声（与第十七轮新纪录同款问题）

## 画布坐标系与补偿体系（Stage.svelte）

- 逻辑空间 SIZE=640，映射到 canvas CSS 宽度；物理尺寸 = 逻辑 × (shownW/640)
- `canvasK() = min(1.6, max(1, SIZE/shownW))`——文本/点/框用 `canvasFont(px)` 反向补偿；**上限 1.6** 防长标签溢出
- 补偿类别（改动前先归类）：
  1. 状态/信息（文本、点、HUD 框）→ 全额补偿
  2. 信息承载图形（轨迹线、频谱曲线）→ 只保物理底线（`lineW` ≥1.2px）
  3. 语义/范围（容差圆 `engine.level.tol`、网格）→ **不补偿**
- **擦边提示（第十八轮，2026-10-24）**：运行态指针从 <2.2×tol 未收集点附近扫过时，该点糖果圈「兴奋」鼓一下（`rr ×(1+0.42·fKick)`）+ 薄荷环扩散（rgba(47,199,155)，380ms，每点 600ms 冷却）——把调参差局的 16s 死时间变成连续距离信号。金色=已收、薄荷=擦边；仅 running 触发、专家模式关闭（不泄露容差）、`motionOff()` 下不闪。验证坑：canvas 像素采样无法区分薄荷与指针青色光晕的抗锯齿混色，要用确定性几何场景（圆关 r=140 vs 目标 120，纯擦边永不收集）+ 截图目视。
- 辉光用 `glowDot()` + 渐变缓存（`glowCache`），**禁用 shadowBlur**（低端机软件路径，实测 27 次/帧 → 0）；measureText 用 `measureW()` 缓存

## 里程碑反馈清单（改动后对照，别漏）

收集（音阶+飘字）/ 连击每 5（木鱼）/ 星级跨档（starSound+haptic）/ 印章（sealSound+haptic）/ 章节印（chapterSeal+haptic）/ 成就（achvSound+toast+haptic）/ 通关（perfectArpeggio 或 finishChord+震屏）/ 无尽过波（achvSound+haptic）/ **终局倒计时（第十五轮新增：最后 3 秒每秒 tickSound+haptic+画布红光脉动；时间到非全清 = timeUpSound+红光一闪+双击触感）** / 读屏播报（aria-live，优先级链：结算 > 成就 > 过波 > **终局倒计时（urgent 翻转播一次）** > 星级；600ms 防抖；**过波分支需 endlessSurvived 门控**——续玩恢复的存量波次不播）

## 终局张力（第十五轮，2026-10-24 落地）

- **引擎单一事实源**：`engine.urgent`（$state）——advance() 里派生 `!sandbox && t >= RUN_DUR - 3`，resetRun/startRun/stopRun 清除。读屏与画布/时间条演出都消费它，**不要**在 UI 里各自拿 `RUN_DUR - engine.t` 重算（读屏 getter 读 t 会让 App 的 $effect 每帧重跑）。
- **三个通道**：① 每秒一击 = Stage 帧循环里 `lastTickSec` 守卫（离开 >3s 区归零防重播）+ `tickSound(sec)`（knock 620/760/900 Hz 逐秒升高）+ 8ms haptic；② 时间到（非全清，判据 `t >= RUN_DUR - 1e-6`）= `timeUpSound` 下行双音 + 画布红光一闪 620ms + `[12,40,12]` 触感——与主动结束 finishChord、全清 perfectArpeggio 三者听觉身份互斥；③ 画布边光 = `urgentVignette()` 径向渐变按视口缓存（`urgentGlow` 声明在 resize 之前——TDZ 坑同 skyGrad），随秒脉动 `0.06+0.1*(1-t%1)²`，`motionOff()` 时恒定 0.08。
- **时间条演出**：数字用 `{#key urgent ? timeLeft : 'steady'}` 换键重挂载做每秒弹跳（非 urgent 区不重挂）；轨道心跳环动画**只在 `phase === 'running'`**——暂停时回到静止，否则无限动画闪到天荒地老。
- **引擎计时类测试的坑（实测）**：GameEngine 默认圆关 + 默认 1× 指针会**直接全清**，advance 循环跑到 t≈7.6s 触发「全清 3 秒后自动结算」，一局在终局窗口之前就 done——测最后 3 秒/超时类逻辑必须先 `setArm(0, { on: false })` 断掉全清。另外 780×(1/60) 浮点累加会得到 12.999…，边界断言要多推几帧。
- **结算近失钩子**：结论行（verdictParts）在「距下一颗星 ≤3 点」时追加「再收 N 点就是 M 星」；差得远不报（0 星报「还差 15 点」是泄气不是动力）。

## UI 器物音（2026-10-19 落地，动 UI 音效前先读）

- **UI 音已从 triangle 电子味换成器物音色**：所有按钮 = 木鱼「笃」（`uiClick` → 共享画法 `knock()`：正弦 600→450 Hz 下落、60ms，全局点击监听统一触发，音色改动只动 audio.ts 一处）；功能弹层展开 = 编钟「磬」（`uiChime`：分音比复用 music.ts 的 BELL_PARTIALS ×2/×2.76、基频 523.25、晚 70ms 起振成「笃→磬」应答）。**关闭弹层不加音**（关闭键自带笃声）。
- **磬的接线点**：App.svelte 一处 `$effect` 监听 showAchv/showSettings/starMapOpen/`engine.phase==='paused'` 的 **false→true 沿**（弹层互切不双响）；ComposerModal 在自身 `$effect` 里 `untrack` 只认挂载一次；MoreMenu 展开分支触发。**演出层（标题/章节入场/通关/结算/教程）不加磬**——它们有自己的音效编排。
- **坑**：`$effect` 里读 `engine.soundOn` 会让音效随开关切换重放——「仅挂载时一次」的语义要用 `untrack` 包住；700 Hz 实际发声上限只约束**环境音总线**（NOTE_MAX_HZ），UI/游戏音效的既有上限是 1046.5 Hz（starSound），磬的 ×2.76 泛音 1444 Hz 靠「极轻（0.08×0.045）+ 短促（≤0.5s）」不扎耳。
- 里程碑音效函数（collectSound/pluck、woodfishSound、starSound、sealSound、chapterSealSound、achvSound、perfectArpeggio、finishChord）本轮未动，别顺手改参数。

## e2e 冒烟要点

详见 `scripts/e2e-smoke.md`。关键：必须跑 dev server（动态 import 源码在 preview 不可用）；seg1 结果落 `sessionStorage['__e2eSeg1']`；每次运行用全新会话（长会话劣化）；「🎨 创作」在更多玩法折叠条内。agent-browser 通用坑见用户级 browser-automation-safety skill。


## 美术皮肤：糖果星域（第十四轮定稿，**取代第七轮「星图金铜」**）

用户对第七轮金铜皮肤的评价是「整个 UI 太难看，一眼看过去毫无想玩的想法」；对比多套样张后选定
**明亮卡通（玩具盒）**，并要求「完全重构」。第十四轮把外壳、画布、调参台、弹层、标题页全部重做。

- **三层三色纪律**：60% 中性（白卡 / 浅蓝底）、30% 珊瑚主色（主操作 / 选中 / 铭牌）、
  10% 点缀（薄荷=成功启用、天蓝=信息、葡萄紫=高级、危险红=结束）。**不允许五色竞争。**
- **厚度公式**：本体当「侧壁」+ `::before` 当面 + 底部露 3–5px；投影是 0 模糊纯色偏移。
  **禁止**黑色模糊阴影、`backdrop-filter`、`mix-blend-mode`、`clip-path`、回纹/铆钉/包角/扫描线。
- **圆角族**：`--r-sm`12 / `--r-md`18 / `--r-lg`28 / `--r-xl`36 / `--r-pill`999，同层级只用一档。
- **浅底对比度铁律（实测，别再犯）**：

  | 场景 | 不合格写法 | 正确写法 |
  | --- | --- | --- |
  | 白底上的珊瑚字 | `--coral-deep` 3.77:1 | `--coral-text` #b5431a → 5.55:1 |
  | 珊瑚面上的白字 | 白字 2.6:1 | `--coral-ink` #4a1a00 → 5.6:1 |
  | 薄荷面上的白字 | 白字 2.15:1 | `--mint-ink` #073a34 → 5.9:1 |
  | 危险面上的白字 | 原 `--face-seal` 3.0:1 | 渐变加深到 #c9332a→#a3201a → 5.3:1 |
  | 未获得星 | `--line-bright` 1.8:1 | #6f96ab → 3.17:1 |

  文字色基线：`--text` 10.3:1 / `--muted` 6.3:1 / `--muted-2` 4.8:1。
- **画布必须是「有颜色的夜空」，不能是「白壳里的黑圆盘」**：第十三轮用浅色天空 + 居中深色圆盘，
  实测读起来像白纸上开了个黑洞。第十四轮改成**满幅夜空场景**（靛蓝→葡萄紫→暖橙地平线 +
  三团柔光星云 + 90 颗固定星点 + 暗角），星盘边界只由刻度环与柔光表达。
  语义色（金目标 #fbbf24 / 青指针 / 紫轨迹 / 红警示）在这套底上实测 7.3–13:1，**颜色一个没改**；
  改的只是形状：目标改白厚环 + 金内环的「糖果圈」，连杆加粗到 4.2/5.6 并加圆头。
- **星盘半径按内容算**，不要按视口短边：`arenaRadius()` 用关卡 `pts`/`curve` 相对中心的外接半径
  ×1.5（下限 140，上限短边/2−16）。旧写法 `shortSide/2 - 10` 在竖屏下环比玩法内容大 2.4 倍。

## 画布 CPU：静态层离屏烘焙 + 空闲降帧（第十四轮实测）

改前空闲态整屏每帧重绘占 **7.0% 单核**（CDP `Performance.getMetrics` 的 TaskDuration 差值，
10s/场景，未节流 Chrome），停掉 rAF 立刻降到 0.1% —— 空闲 CPU 几乎全来自「每帧重画静态背景」。

| 场景 | 改前 | 改后 |
| --- | --- | --- |
| 调参空闲（edit） | 7.0% | **3.7%** |
| 动画运行（running） | 12.2% | **9.8%** |
| 暂停（paused） | 5.8% | **2.4%** |
| 标题页 | 8.8% | **3.9%** |

**第十五~二十四轮加法后的整体回归（2026-10-24，agent-browser 页面内实测）**：编辑态与运行态均 60fps（rAF 计数；30fps 绘制节流不影响 rAF 频率）、0 longtask、控制台零错误——滴答音/终局红光/擦边闪光/暂停键全部在线时性能无回退。回归口径：fps 与 longtask 用页面内 rAF 计数 + PerformanceObserver('longtask')，分两次 eval 安装与读取（eval 对长 await 有超时）；关键断言清单见各轮小节。

**第十五~三十七轮的整体回归（2026-10-24 复跑，全部通过）**：本地链 316/316 + 浏览器关键路径
（战役教学/机坞自动展开/结算语义无误报/沙盒无伏击无快进/360 齿轮可见/60fps 0 longtask/控制台零错误）。
关键断言逐条见各轮小节；本次回归无任何代码改动需求。

三招（都在 `Stage.svelte`）：
1. **静态背景烘焙到离屏 canvas**（夜空 + 星云 + 星点 + 暗角），每帧只 `drawImage` 一次；
   尺寸或 `arenaRadius()` 变化才重烘（`bgDirty`/`bgRadius`）。
2. **渐变缓存**：`skyGrad`/`nebulaCache`/`arenaGlow` 全部缓存，半径变化时失效；
   不再每帧 `createLinearGradient`/`createRadialGradient`（profiler 里排前三）。
3. **非运行态 30fps**：`frame()` 里 `if (phase !== 'running' && now - lastDraw < 33) skip draw`；
   运行态保持 60fps，手感不变。

### 两个必须记住的坑

- **TDZ 白屏**：在 `Stage.svelte` 新增 `let skyGrad = null` 这类缓存变量时，**必须声明在 `resize()`
  之前**。`resize()` 在组件初始化阶段就被 `$effect` 调用，若声明在它后面（文件更下方），
  会抛 `ReferenceError: skyGrad is not defined` 并整页白屏。
- **read 工具对长文件会静默截断**：`Stage.svelte` 1497 行，`read` 只回来 1322 行且不报错，
  直接「读全文 → 回写」会**丢掉 175 行**（本轮真实发生，靠 `git checkout HEAD --` 救回）。
  **长文件一律用 node 脚本按字符串替换改**，改完 `wc -l` 核对行数、`svelte-check` 复核。

## 浏览器验证统一走 agent-browser（用户明确要求）

用户指示：「不要再用自研管线了，必须全部走浏览器自动化的 skill」。**不要再写自建 CDP 截图脚本**，
一律 `agent-browser`（`.workwork/` 下旧的 `capture.mjs`/`audit.mjs` 只作历史参考，不再新增）。

- `agent-browser` 在 workspace-write 沙盒下会因 `~/.agent-browser` 不可写而硬失败；
  本机约定是**以固有权限运行**它（保住 Chrome 原生沙盒 + 全机共享 daemon），不是绕过沙盒。
- 常用：`agent-browser set viewport 1440 900` → `open <url>` → `wait --fn "!!document.querySelector('canvas')"`
  → `screenshot --if-changed name.png`；量指标用 `eval "<表达式>"`（结果自己解析）。
- **务必 `agent-browser close`** 收尾；全机 owner daemon（`--remote-debugging-port=0` 那批进程）不受影响，别去 kill。

## 已知限制

- agent-browser 长会话跑多步 e2e 不可靠（session 劣化），全流程自动化需独立 Playwright 实例（未立项，等用户决定）
- 结算卡重开（📊 结算卡）后的主按钮文案是短标签（如「▶ 椭圆」），首次结算是「▶ 下一关 · 椭圆」——同一功能两种渲染状态（解锁庆祝 vs 常规导航），有意设计
- **结算判定语义（第十七轮，2026-10-24）**：「新纪录」（newRecord）只在**破了一个既有正数纪录**时点亮（`(bestScores[id] ?? 0) > 0`）；首局是建立基准不是破纪录——否则 0 星烂局也挂「新纪录」，与「还没拿到星」自相矛盾（实测）。每日/每周同口径。「最快全清」（newClearRecord）保持首清点亮（engine.test.ts 有锁定测试）：全清本身是成就，与失败局不构成矛盾。 「下一枚目标」量词口径（第二十轮）：三星线 = ceil(0.9n) − got（不是全收数字），完美全清 = n − got——此前三星提示用全收数字，24 点关 2/24 会说「再收集 22 点」（实际 20 就够）。 **每日/每周的读后写陷阱（第二十二轮）**：r17 修常规关时，每日/每周两处的 `newRecord` 计算被放在 `dailyBest` 写入**之后**——读到本局刚写入的分数，首局必误报（浏览器实测 0 星首局盖「新纪录」印章，window 挂 engine 插桩定位）。修同模式多站点时 必须逐路径验证或逐路径补单测；先算标志再落库。
