# 布局细节与控件修复口径

本文件是 SKILL.md「界面架构」的细节与各断点/控件的实测口径。

## 断点与移动端布局

- **手机竖屏**（≤640 portrait）：机坞改为底部抽屉（`height: min(66dvh, 560px)`，`.dock-open` 上滑打开），底部导航 `.gs-nav` 显示；
  运行态 `.panel-hidden` 自动收起机坞、画面让给游戏；`panelExpanded` 只剩 MobileNav 的展开态语义（不切 grid 行）。
- **画布设置齿轮按断点显隐**：`.hud-settings-btn` 只在 ≤900px（顶栏成就/设置按钮隐藏的区间）显示，≥901px 隐藏（顶栏常驻，入口去重）——
  桌面端顶栏齿轮与画布齿轮若同时存在会重复且都占 Tab 序。实测断点行为：≤900 顶栏三键 `display:none`。
- **超宽屏 HUD 芯片必须避让机坞**：`.hud` 容器 `inset:0` 铺满全窗，右上收集/星级/本关目标芯片锚定窗口右缘，超宽屏（如 3440px）会落进机坞覆盖区被引导浮层盖住。
  做法：≥901px 档 `.hud { right: var(--dock-w) }`，HUD 整体（含得分/时间条的居中）锚定「可见游戏区」。
  规则：**浮层覆盖式布局里，right 锚定的元素必须按覆盖物宽度让位**；判据：超宽屏下芯片不与机坞/引导浮层重叠。
- **移动端视口要用真实机型，别只用 390**：390×844 只是 iPhone 13/14/15 一档，且属偏窄的一端。统计结论（多份来源一致）：

  | 宽度×高度 | 占比 / 机型 |
  | --- | --- |
  | **360×800** | **最常见（≈10.3%）**，中端 Android 主力 |
  | 390×844 | 6.55%，iPhone 13/14/15 |
  | 393×852 | 5.35%，iPhone 15/16 Pro |
  | 412×915 / 411×891 | 4.3%，Galaxy S24、Pixel 8/9 |
  | 375×812 | 4.2%，iPhone SE 一系 |
  | 430×932 | iPhone 16 Plus |
  | 440×956 | iPhone 16 Pro Max |
  | 725×870 | 折叠屏展开（现代手机整体跨度 360–707 CSS px） |

  **验收至少覆盖 360 / 411 / 440 三档 + 844×390 横屏**；只用 390 会漏掉最常见的窄屏与大屏机型。当前实现：360–725 全区间画布 100% 占满、无横向溢出（量法：各视口 `scrollWidth` 与视口宽比对）。

## 控件尺寸与「减重」

- `tokens.css` 的 `--ctl-xs/sm/md/lg/menu`（26/30/36/50/52 桌面；`@media (pointer: coarse)` 下 34/40/44/56/58）+ `--ctl-font(-sm)` / `--ctl-radius` / `--ctl-icon`。
  **不要写死 px**；触屏命中区必须 ≥40（视觉不够就用 `::after { inset }` 外扩，range 这类替换元素用输入层外扩）。
- 实测基线：桌面可交互元素高度中位 30px、>40px 0 个；触屏 390×844 / 844×390 无 <40。量法：枚举可交互元素的 `getBoundingClientRect`（量尺脚本已随自研管线清理）。
- 「减重」同属这条：描边 1px、底部硬阴影 2px、按钮字重 ≤700、中文标签字距 ≤1.5px。

## 交互与反馈口径

- **清空进度武装态超时**：存档 tab 的「清空进度」两步确认，武装态（确认清空？）4 秒后自动解除（`confirmTimer` + onDestroy 清理）——
  武装态不超时解除时，「点一下走开回来再点」会误清存档；数据安全控件的标准做法就是自动解除。
  验证坑：Svelte 状态更新在微任务批量刷 DOM，点击后**同 tick** 查询读到的还是更新前的文案，要等两个 rAF 再断言；
  agent-browser 长 await 的 eval 不可靠，用两段式（先装状态再读）。
- **菜单项反馈不可见**：MoreMenu 的 `run()` 先 `open=false` 再执行 handler——选中项上的反馈标签（如「✓ 已复制战报」）随菜单卸载，用户永远看不到。
  菜单动作的结果反馈一律走 `uiState.setShareNote()` 全局 toast（分享战报/保存成绩图已接，含失败分支的诚实提示）；持久按钮（如每日分享）的内联标签不受此限。
  另：headless 下剪贴板 `write` 与 `execCommand` 都会失败，恰好可用来验证失败分支。
- **无效邀请码的静默失败**：星图 ExtraSection 的邀请码输入，粘贴无法识别的内容若 `if (!parsed) return` 就是静默失败——玩家零感知。
  必须接 `setShareNote`（「邀请码无法识别，请检查后重试」）。通则：**任何解析/加载失败的静默 `return` 都值得问一句「用户知道发生了什么吗」**。
- **创作者邀请码复制**：ComposerModal 的 `copyCode` 的 catch 忽略 → `setShareNote`（「邀请码复制失败，请重试」）。
  静默失败点必须全部接 `setShareNote`：战报 / 成绩图 / 挑战好友 / 每日分享 / 邀请码复制 / 创作器邀请码 / 无效邀请码输入（取数：grep 复制/解析分支的 catch 与裸 `return`）。
- **标题页三步上手按进度门控**：`ts-steps` 卡必须按进度门控：`{#if !hasProgress}`（复用战绩行的同一条件）——
  有进度看战绩行（星级 · 朱印），无进度才显示三步上手。
- **打卡日历未来日可见性**：统计 tab 日历的 `.cal-cell.future` 若只用数字色 muted→muted-2 区分，两个蓝灰在浅底上不可分辨；
  必须用 `background: transparent` + 弱边（未来日=空槽，过去空日=浅蓝底，已打卡=薄荷，今天=珊瑚描边，四态分明）。5 周窗口按周一对齐。
- **系统减弱动态偏好的播种与用户显式选择**：App onMount 以 `flags.reduceMotion === undefined` 判「未 touched」播种系统偏好，
  但 `setFlag(key,false)` 是删键——用户显式关掉后键回 undefined，下次刷新播种会把显式关闭悄悄翻回开启。
  做法：SettingsModal 切换时 `markFlag('reduceMotionTouched')` 哨兵，播种条件加 `!reduceMotionTouched`。
  E2E 坑：模态重载后旧元素引用点击是空操作（静默），断言要读引擎状态而非依赖点击生效。

## 编辑器与布局坑

- **创作器双栏**：40 根滑块会把 150px 预览画布挤出视口（canvas top=1151 > 视口 900）造成盲编辑——sticky 无效，因为预览 wrapper 位于
  `composer-body`（1145px）的最后 73px，sticky 移动区间为负（sticky 元素只能在父盒内移动）。正解是双栏：`.composer-layout` grid
  （200px 预览窗格不滚 + 滑块列表独立内滚，`height: min(56vh, 500px)`，窄屏 720px 收单列）。
  **sticky 不生效时先查元素在父盒里的剩余移动区间，负区间 = 永不粘住。**
- **创作器数值读出与预设激活态**：每行滑块后接 tabular 数值读出（幅值/相位°），精度工具读得回设定值；预设芯片加 `appliedPreset` 激活态
  （手动改任何滑杆即转自定义并熄灭）。预设芯片实际文案是「心搏」不是「心形」——自动化脚本 `?.click()` 会把找不到目标静默吞掉，
  **断言必须断在行为上而不是调用返回值上**。
- **不要往指令栏加快捷键提示**（反模式）：指令栏是内容自适应药丸（1920 下仅 ~610px），`cmd-left` 任何视口都装不下 135px 的提示，
  >1500px 媒体查询放行后也只露出「空」一字（死装饰）。快捷键文档只在设置弹窗的「快捷键」说明里。
- **改 CSS 块要用编译产物回查**：用脚本（python 替换）改 `<style>` 块时，「模板改了、样式没改」不会报错
  （`<span>` 进了模板、规则没进 style 时肉眼看不出来）。改完必须 `grep` 编译后的 CSS（或 `pnpm build` 后在 dist 里回查）确认规则真的存在。

## 换肤资产清单

换肤类改动的资产清单：`og.png` + favicon + 全尺寸 icon + `manifest` 的 theme/background_color + `index.html` 的 theme-color，换完皮肤逐项过一遍。
（易漏项不止 og.png——index.html theme-color、manifest theme/background_color、以及整个图标组 favicon-32 / icon-192 / 512 /
apple-touch-icon / icon.svg 都要一起对齐糖果品牌：theme 色 #bfe3ff（--bg 令牌同值）、og.png 以 1200×630 实拍重制、图标组同构图重绘。）

## 页面内数据状态

- **同 origin 的 localStorage 会串档**：截图/验收前必须隔离存档（`localStorage.clear()` 或换 origin）。操作口径见 skill `fft-cover-gemini-review`（截图步骤），不在此重复。
