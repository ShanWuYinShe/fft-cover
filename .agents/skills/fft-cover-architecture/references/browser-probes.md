# 浏览器验证、量尺与 CPU 归因

本文件是 SKILL.md「浏览器验证与 e2e」的细节，以及测量口径与基线数据。

## agent-browser（唯一浏览器入口）

- 浏览器自动化必须走 skill `agent-browser`，不写自研管线。**不要再写自建 CDP 截图脚本**；
  `.workwork/` 下的 `capture.mjs`/`audit.mjs` 只作参考，禁止新增同类脚本。
- `agent-browser` 在 workspace-write 沙盒下会因 `~/.agent-browser` 不可写而硬失败；本机约定是**以固有权限运行**它
  （保住 Chrome 原生沙盒 + 全机共享 daemon），不是绕过沙盒。
- 常用：`agent-browser set viewport 1440 900` → `open <url>` → `wait --fn "!!document.querySelector('canvas')"` →
  `screenshot --if-changed name.png`；量指标用 `eval "<表达式>"`（结果自己解析）。**务必 `agent-browser close` 收尾**；
  全机 owner daemon（`--remote-debugging-port=0` 那批进程）不受影响，别去 kill。

## 量尺脚本与基线

- **量尺脚本不在库内**，按下面口径用 `agent-browser eval` 重写：
  6 个视口的画布尺寸 / 引导条压画布 % / HUD 压画布 % / 机坞死区 px / 横向溢出 / 页面滚动（`getBoundingClientRect` + 命中测试）。
  基线（当前实现）：引导条压画布 **0 / 0 / 0**（竖屏/横屏/桌面）；机坞死区 **0 / 0 / 0**；HUD 压画布手机竖屏 7.7%（收集读数单行「收集 0/24」）。
  `CanvasHUD.svelte` 里**没有任何基于高度的隐藏规则**，`@media` 只有 901px/900px/640px+竖屏/900px+横屏/reduced-motion 五组，横屏档 `629-633` 只 `display:none` `.star-meter`。
- **对比度**：像素级逐元素取值 + 命中测试跳过被遮挡元素，比 `audit.mjs` 的渐变背景误判可靠。
- **焦点态 / 暂停浮层**：`focus` 用 `CSS.forcePseudoState` 强制 `:focus-visible` 并对比前后计算属性；`pause` 实拍暂停浮层。
- **尺寸普查 / 命中区普查 / 信息密度 / 活跃度**：枚举可交互元素 rect；按钮 / 容器 / 发光元素 / 字符数；画布区域连续帧像素变化率 + rAF 帧率。
- **热区普查有系统误差，别拿桌面视口的 rect 下结论**：agent-browser 是桌面 pointer，量到的是
  桌面 token（26/30/36），触屏上 `pointer:coarse` token 放大（tokens.css:360，34/40/44/56/58）后达标。
  正确口径是**代码审计 token 消费**：高频件（CanvasHUD 读数键、ArmEditor `.mini-key`、CampaignMap `.nav-btn`/`g-btn--icon`）
  全走 `--ctl-*` → coarse 达标；视觉必须小的场景用 `::after` 外扩（`base/Button` btn-sm 补 1px 到 40、`Toast` close 补 9px）。
  新控件照此办理：走 token 或补外扩，不要写死 px。
- **eval 模拟点击在 Drawer 隐藏态不可靠**：星图抽屉关着时，折叠条里的「创作星轨」按钮 `click()` 触发 handler 但界面无反应
  （Drawer 挂载条件未知，clicked:true 假阳性）——要测真实路径就先重开抽屉再点；深流程界面留给 Playwright 立项。
- **量遮挡要按「画布面积占比」而不是「有没有重叠」**：56px 高引导条在 338px 画布上是 15%、在 886px 画布上只有 5%，会被误判为可接受。

## CDP 侧验证手法（agent-browser 内 eval 可用时）

- **:focus-visible 的确定性验证**：截图没法表达焦点态，用 CDP 强制伪类 + 读计算属性：
  `DOM.getDocument` → `DOM.querySelector` → `CSS.forcePseudoState`（`forcedPseudoClasses: ['focus-visible']`）→
  `DOM.resolveNode` + `Runtime.callFunctionOn` 返回 `backgroundColor/boxShadow/color/…` 前后对比。
  截图完全看不出这类问题（例：主操作按钮焦点后金字压金面 2.36:1）。
- **渲染复核的探测法**：截图看着「画布变暗了」不要凭肉眼断定，用 `document.elementFromPoint` 在画布四个采样点取顶层元素——
  返回 `CANVAS` 且 `filter:none` 就说明没有浮层遮挡。同理，缩略图里的中文看起来像乱码时，先取 `textContent` 核对，别急着报 bug。
- **后台标签与 rAF**：Chrome 对后台标签节流 rAF（实测 hidden tab 3 秒 0 帧），测量前必须把标签置前台/活动。
- **eval 长脚本不可靠**：agent-browser 对长 await 的 eval 有超时/不可靠问题，用两段式（先装状态/监听器，再读取）；
  Svelte 状态更新在微任务批量刷 DOM，点击后同 tick 读到的还是旧值，要等两个 rAF 再断言。
- **按文本找按钮必须先去空白**：中文按钮的视觉文本带字间空格（textContent 是「继 续 旋 转」），
  `b.textContent.includes('继续旋转')` 恒不命中；且 `find(...)?.click()` 静默落空、自己拼的返回字符串照常打印，极易误判已点击。
  正确写法：`[...document.querySelectorAll('button')].find(b => b.textContent.replace(/\s/g, '').includes('继续旋转'))?.click()`。
- **沙盒里 `ps` 被拒**（`/bin/ps: Operation not permitted`）：查监听进程用 `lsof -nP -iTCP:<port> -sTCP:LISTEN`；
  确认某进程是不是自己起的用 `lsof -a -p <pid> -d cwd -Fn`（看 cwd）或 `lsof -a -p <pid> -Fn | grep <profile 目录名>`。
  **清理只 kill 自己起的**（按端口逐个核对），别人的实例（如用户自己跑着的 dev server）原样留着。
- **worktree 里软链 node_modules 会让 `git status` 出现未跟踪项**：`.gitignore` 的 `node_modules/` 只匹配真目录、不匹配软链。
  清理 worktree 前**先 `rm` 这个软链**（删软链不会动主树），否则 `git worktree remove` 会因未跟踪文件失败，而 `--force` 有删穿主树依赖的风险。
  **`git add -A` 也会把软链带进提交**——
  **规定动作顺序：验证完成 → `rm node_modules`（软链）→ 再 `git add -A && git commit`**，把删软链放在提交命令**之前**，
  不要依赖提交后核对；提交命令里顺带 `git status --short | grep node_modules && exit 1` 做闸。
  判据：软链一旦被提交并在他处检出，会**覆盖主树真实依赖目录**（自引用循环链、依赖全失）；main 不许改写历史，坏 blob 永久留在旧 commit，只能 `rm` 软链 + `pnpm install` + `git rm --cached` 补救。

## CPU 与渲染归因（识别 `--disable-gpu` 类反模式）

**反模式**：自起 headless Chrome 时带 `--disable-gpu`——它把 Chrome 打进软件光栅，活动标签渲染 CPU 从 ~12% 涨到 73–87%、
空实例从 8.6% 涨到 42.4%。现行浏览器统一由 agent-browser 托管，**不要再自己带 flags 起 Chrome**；以下数据只用于识别同类问题。

- 受控对比（整棵 Chrome 进程树 CPU 时间累加，同一页面 12 秒）：正常（默认 GPU）+4.30s ≈ **35.8%**；`--disable-gpu` +11.63s ≈ **96.9%**
  ——软件光栅让整树 CPU 占用涨到约 **2.7 倍**。注意要测**整棵树**：主进程 cputime 几乎不变（1.46s vs 1.41s，它只做调度），
  真正燃烧的是 renderer 子进程，只测主进程会得出「两者没差别」的错误结论。
- 场景对照（8 个本应用标签）：空实例 42.4% → 8.6%（4.9x）；8 标签稳定 129.6% → 37.1%（3.5x）；单活动标签渲染线程 73–87% → ~12%（6–7x）。
- **真正的持续高 CPU 来自「活动标签 × 软件光栅」**：`--disable-gpu` 下画布 rAF 重绘占渲染线程 70%+（停掉 rAF 后降到 3–6%），整实例吃满约一个核。
  泄漏的**隐藏**标签不烧 CPU——headless 对后台标签 rAF 节流到 0（实测 hidden tab 3 秒 0 帧），泄漏的主要代价是**内存**
  （每标签 130–250MB，44 标签 ≈ 6–10GB → swap 压力）与最后一个活动标签的满核燃烧。
- **应用侧无需改造**：游戏页在真实浏览器里被切后台时同样被节流，属正常行为；不要给 Stage 加「document.hidden 停绘」之类的守卫（对已节流的场景是死代码）。
- **量 CPU 别用 `ps pcpu` 的瞬时值下结论**：macOS `ps -o pcpu` 是近期加权平均，受控对比要固定场景、固定窗口
  （CDP `Performance.getMetrics` 的 TaskDuration 差值最可靠）。

## e2e 冒烟

详见 `scripts/e2e-smoke.md`。关键：必须跑 dev server（动态 import 源码在 preview 不可用）；seg1 结果落 `sessionStorage['__e2eSeg1']`；
每次运行用全新会话（长会话劣化）；「🎨 创作星轨」在「每日一练与无尽演武」折叠条内。
- **eval 空输出/页面空白的第一排查项：dev server 是否存活**——dev server 死亡后，页面的动态 import（如 e2e 脚本开头的
  `await import('/src/…')`）会**永久挂起**、新导航报 `ERR_CONNECTION_REFUSED`——会话劣化与 server 死亡症状叠加时，
  先 `lsof -iTCP:<port>` 验存活（dev server 可能静默退出，重启即愈）。agent-browser 通用坑见用户级 `browser-automation-safety` skill。
