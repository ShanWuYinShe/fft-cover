---
name: cdp-gemini-workflow
description: fft_cover UI 审查的「截图→Gemini 网页评审」工作流与本机 CDP 实测坑。触发:要用浏览器自动化结合 Gemini 网页分析截图;CDP WebSocket 突然连不上;复用 gemini.mjs 脚本。
---

# 截图 → Gemini 网页评审工作流(fft_cover)

**2026-10-14 会话实测。** 用户级 browser-automation-safety skill 讲安全红线;本文件
记录本项目的具体管线与踩坑,建议成熟后把 CDP 教训合并进用户级 skill。

## 管线

1. 截图:agent-browser 独立 headless 会话(默认安全路径),覆盖
   桌面 1440×900(标题/主界面/底部/设置/成就)+ 移动 390×844(主界面/指针面板)
   - 暂停菜单/结算卡(需真跑一局:频率下拉调 10x 加速,「停止结算」可提前出结算卡)。
     落 .workwork/ui-audit/。
2. 评审:直连用户日常 Chrome CDP(DevToolsActivePort 读 WS 端点),
   `Input.dispatchDragEvent` 拖图进 Gemini composer → `Input.insertText` 提示词
   → 点发送 → 轮询响应。工具脚本 `.workwork/ui-audit/gemini.mjs`。
3. 落地:worktree 分支改 → prettier/check/test/build 全过 → ff-only 合并。

## 红线:用户不在场时禁止一切 CDP 连接尝试(2026-10-14 用户严厉纠错)

**每次对用户日常 Chrome 发起新的 DevTools WS 握手,都可能触发「正在请求远程控制」弹窗。**
连接失败 ≠ 纯技术问题,而是「每次尝试都在打扰用户」。2026-10-14 会话里我把
ws-retry.mjs(单次 6 连发)当「探测」跨多轮反复执行,累计数十次握手 → 用户回来
面对一堆 Chrome 弹窗,被严厉批评。

规则:

1. **连接失败一次即停**:第一次握手失败就永久停止本轮所有 CDP 尝试,把「等用户
   重启 Chrome / 用户在场时再试」写进交接说明,绝不写重试循环、不跨轮反复探测。
2. **重试上限 = 1 次/会话**(仅当有明确证据表明环境已变化,如 DevToolsActivePort
   的 uuid 变了),而不是「每轮试试看」。
3. 状态探测优先走**无副作用通道**(读文件、lsof),而不是发起连接本身。
   DevToolsActivePort 的 uuid 不变 ≈ Chrome 没重启 ≈ 连不上,直接放弃本次轮询。

## ⚠️ 优先读本节:profile 位置定案(2026-10-14 深夜修正)

**/Users/liyou/work/fft_cover/.agent-profile(项目根,持久,gitignore 已覆盖)**。
用户级 browser-automation-safety skill 里「位置选 /tmp」的结论已过时(用户指出
/tmp 重启清空不适合持久登录态;写入修正时提权审批超时暂未落盘),以本节为准:
项目根工作区内 = Chrome 运行时写入畅行 + 持久 + 同项目全会话可达,迁移实测
零数据损失。

## 统一 profile(2026-10-14 晚定案,用户验收:一个 profile 满足全部)

**位置:/Users/liyou/work/fft_cover/.agent-profile + 固定 session auto**(2026-10-14
晚从 /tmp 迁入:/tmp 重启清空,不适合持久登录态;项目根在工作区内,Chrome 运行时
写入畅行、持久、同项目全会话可达;gitignore 已覆盖。迁移实测零数据损失)。全部 Chrome 自动化
(截图/e2e/Gemini headless)统一用:

```bash
--session auto --profile /Users/liyou/work/fft_cover/.agent-profile   # 每条命令都带,缺了会落到别的 profile
# 受限会话对该命令申请 danger-full-access(2026-10-14 晚起提权原生启动,不注入 --no-sandbox)
```

- localStorage 跨浏览器重启持久(实测:写→close→重开→读回,含中文值)
- Gemini 登录态:首次有头登录一次后持久;headless 下可正常操作(实测未登录
  可达 composer,登录后全功能)
- 三条实测教训:① home 下 profile 不可行——Chrome 运行时写入被沙盒拒(exit 21),
  privileged 单命令只覆盖那一次执行;② 每条命令必须带 --profile,缺了 wrapper
  注入默认临时 profile,读写落到别处(假性「丢失」);③ eval 结果走 stderr,
  2>/dev/null 会误判为无输出。

## 复用的极限:常驻 daemon(2026-10-14 晚实测)

**socket 全局位置(2026-10-14 晚验证)**:/tmp/fft-gemini-cdp.sock——/tmp 全机可达、
路径 24 字节(上限 103)、umask 0o077 仅本用户可连;实测跨工作目录调用、并发、
权限收紧全部通过。迁移成本=改 SOCK 常量一行。

短进程方案的天花板:每个 node 进程都要自己握手,连续两次新建必挂第二次
(坑位释放延迟),单命令全流程只是把次数压到 1,跨命令仍要反复握手。
**极限方案是常驻 daemon**:gemini-daemon.mjs 持有一条 WS,本地 unix socket
(gemini-daemon.sock)转发 eval/screenshot/navigate 请求。

实测(2026-10-14 12:5x):daemon 启动握手 1 次后,连续 8 次请求(eval×5、
screenshot×2、status)全部成功、零间隔限制——对比短进程方案连续两次即挂。
附带实测:peek 成功后紧跟 read-once 新连接即被拒,坐实「合并/复用」必要性。

**跨进程/跨会话复用(2026-10-14 晚实测)**:unix socket 是系统级 IPC,daemon 不绑定
任何 DSH 会话。已实测:跨工作目录(绝对路径调用)、3 客户端并发(同时 eval+截图)
全部成功。其他会话接入方式:

1. `node /Users/liyou/work/fft_cover/.workwork/ui-audit/gemini-daemon.mjs where` — 查路径与运行态
2. `... call '{"type":"eval",...}'` — 直接复用,零握手
3. socket 不存在时 `start` — 幂等;未运行才会产生本会话的一次握手(预算独立计算)
   边界:连接请求预算按「会话」算,daemon 本身跨会话共享——谁先 start 谁付一次握手,
   之后所有会话零成本;对方沙盒若禁访问本路径,只能其自行 start。会话结束不影响 daemon
   (独立进程,空闲自退)。

生命周期:30 分钟空闲自动退出;Chrome 重启导致 WS 断开时自动退出并清 socket;
start 幂等(活 daemon 直接复用;死 socket 自动清理)。daemonFail 独立于 review 闸。

## 机制化(2026-10-14 晚,用户验收标准:一次会话最多一次连接请求)

光靠纪律不够,必须机制保证——gemini.mjs 已重写为「单连接流水线」:

1. **失败硬闸**:连接失败写 .workwork/ui-audit/cdp-state.json(result:fail),
   后续调用直接拒绝(exit 2),机制上不可能重试轰炸;删状态文件 = 显式重置。
2. **结果复用**:响应文件已存在且完整 → 直接退出不重发。
3. **单命令全流程**:连接→拖图→提示词→发送→轮询→存文本→截图→断开,
   一次执行完成所有步骤,整个进程只握手一次。
   验证方法(无副作用):写入 fail 状态跑 review 应 exit 2;造大结果文件应 exit 0 复用。

## 已踩坑(不要再踩)

- **CDP 短连接会被限流**:每条子命令各自新建 browser WS,status→send→shot→read
  连续建连,前几次成功后 Chrome 静默拒绝一切新 WS 握手(TCP 活、HTTP /json/* 照常
  404 响应 <1ms、ws.onopen 永不触发),40+ 分钟不自愈。正确姿势:单脚本内一个 WS
  连接长驻复用到进程退出;gemini.mjs 当前实现是反例,复用前先改。
- **未登录 Gemini 网页**:能附加图片(缩略图出现)但附件处理转圈不完成、消息发不出
  (发送点击无效);模型只有 Flash-Lite。要 Pro 质量必须走登录态(用户 Chrome 或
  有登录态的 profile)。
- `~/.agent-browser/cnm-gemini` profile 开出来是**未登录**状态,Gemini 登录态不在
  这里,别指望它做登录通道。
- 弹窗红线依旧:不 kill 用户 Chrome、不重启 Chrome、不反复重连(每次重连=弹窗风险)。
- 备选等恢复:用户 Chrome 重启后 DevToolsActivePort 更新,WS 即恢复。

## 最终架构:常驻无头 Chrome + home profile(2026-10-14 深夜定案)

经用户确认「profile 放用户目录」:特权启动一次常驻无头 Chrome
(profile=~/.agent-browser/profiles/auto,调试端口 9223,detach 常驻)。

- 复用:任何会话/项目经 agent-browser --cdp 9223 直连(独立实例 HTTP 端点
  正常,无日常 Chrome 的 404 限制),零弹窗。
- 持久:localStorage 跨命令持久(实测写读一致),profile 落盘 home。
- 启停脚本:.workwork/ui-audit/auto-chrome.sh(start/status/stop)。
  机器重启后需重新 start(登录态保留);start 需特权一次(Chrome 写 home)。
- 9222(日常 Chrome CDP)方案退役为备用;gemini-daemon.mjs 同步退役。

## 2026-10-15 实测:免提权 CDP 直连 owner + Gemini 网页四坑

**路线升级(本轮全程零提权、零弹窗)**:owner headless Chrome
(profiles/main)已在运行时,用 lsof 找到它的监听端口后 Node 内置
WebSocket 直连,不再需要 agent-browser(提权审批无人时应答会挂起到
超时,本轮改为直连后全流程顺畅):

```bash
lsof -iTCP -sTCP:LISTEN -nP | grep Google   # 找候选 pid
lsof -p <pid> | grep -oE '[.]agent-browser/profiles/[a-z]+'  # 确认是 owner(非日常 Chrome)
```

连上后 Target.getTargets 能看到 owner 内持久的 Gemini 登录态 tab。
只动自建/既有的 Gemini tab,不碰用户日常 Chrome(9222 绝对禁区)。

**Gemini 网页四坑(全部本轮实测,别再踩)**:

1. **Page.navigate 会使本 CDP session 的 Input 域失效**——导航后
   dispatchMouseEvent/KeyEvent 全部石沉大海(实测连点 10 次无效),
   页面「陈化」后才恢复。开新对话改点侧栏「发起新对话」按钮,全程
   不导航;若必须导航,导航后 re-attach 拿新 sessionId。
2. **菜单项(gem-menu-item)对 JS click() 完全无效**(勾选纹丝不动),
   必须真实坐标点击(Input.dispatchMouseEvent)。普通 button 用 JS
   click 可以,菜单项不行。keyboard ArrowDown 能移动高亮但 Enter/Space
   不响应(焦点不在菜单)。
3. **高级模型配额耗尽时菜单项带 .disabled 类,一切点击技巧都无效**——
   先查 elementFromPoint 链上的 disabled 类名,别再折腾点击机制。
   降级方案:直接用 Flash-Lite 跑评审+人工把关,配额重置(当日
   23:53)后再用高级模型复审。菜单结构 2026-10-15 已改版:一级菜单
   = 模型 4 项 + 「思考等级」入口,低/中/高在二级(0x0 隐藏,点
   「思考等级」后才可见)。
4. **跨端口 = 跨 origin**:5173 与 5174 的 localStorage 互不可见,
   换端口复验截图时 flags 要在新 origin 上重设,否则截到标题屏/
   教程弹窗。

**run_code 工具坑**:对含模板串/中文/转义的大块代码,DSH run_code 里
tools.edit 的 old/new_string 反复解析失败(Expected ',', got '<eof>',
write 则从未失败)——复杂改动改用「write 落一个 patch.mjs + node 执行
字符串替换」的方案,锚点先 grep 验证唯一、避开全角括号。

**上传与发送(沿用 10-14 结论,本轮复验有效)**:点 [aria-label="上传和工具"]
→ sleep 2.5s → DOM.setFileInputFiles(input[type=file][accept*=image],
绝对路径)→ 轮询 gem-media-attachment 出现且无 has-error;发送用真实
点击 [aria-label="发送"],提交成功判据 .ql-editor 变空;响应完成判据
[aria-label*="停止"] 消失 + model-response innerText 连续 2 次长度稳定。
导航后 Angular handler 未就绪,所有点击都要「点击→检测→重试」包装。

## 2026-10-15 下午追加:上传通道会临时失效

同一天内对同一 Gemini 账号大量自动化上传(11+ 张)后,「上传和工具」菜单
点击失效(点击 ok 但菜单面板不开、file input 不注入),reload/新 tab/拖拽
(dispatchDragEvent)全部无效——判断为服务端临时反滥用限制,客户端无解。
当日稍早上传 5 张完全正常,故为动态限制而非 UI 改版。
对策:等待限制解除(次日或数小时后)再复跑;上传前先小步验证(点击菜单
→查 input 数量)而不是整套流程跑一半才发现。

另:模型菜单项匹配用 split(' ').pop() 取模型名(「3.5 Flash-Lite」若用
/^\d+\s*/ 去前缀会残留「.5 Flash-Lite」导致 includes 永假);openMenu
每次循环先检测菜单是否已开(避免 toggle 误关);realClickItem 找不到目标
返回 null 重试(返回字符串会导致 scrollIntoView 崩溃)。

## 2026-10-15 再修正:上次的「上传通道临时失效」是误诊,真因是标签在后台

**与上一节结论冲突,以上一节为准的写法作废。** 本轮实测:同一 Gemini tab
上传前 `document.visibilityState === 'hidden'` 时,点「上传和工具」后
`aria-expanded` 会变 true 但 `input[type=file]` **恒为 0**(连点 3 轮均如此);
执行一次 `Page.bringToFront` 后再点,**同一次点击立刻拿到 inputs=1、菜单展开**。
即 yesterday 判定的「服务端反滥用限制」并不成立——只是后台标签被 Chrome
节流 rAF、Angular CDK 菜单不渲染(与用户级 skill「坑 0」的结论一致,
当时把它当成例外没有复用,导致误诊)。

**管线必须内建 bringToFront**:`uploadImage()` 开头
`await cdp.send('Page.bringToFront', {}, sessionId)` → sleep 700ms →
复查 `visibilityState === 'visible'`,不是就重试至多 3 次。headless 下
bringToFront 只是把该标签设为「活动」,**不抢用户焦点**(实测前台 ASN 不变),
可安全使用。菜单重试循环里也要再 bringToFront 一次(共享浏览器里别的会话
可能把标签切走)。

## 2026-10-15 再修正:回答采集的两个判据 bug(都会导致「假死」)

本轮把 runner 卡死 40+ 分钟的根因,两条都在**判据写法**上:

1. **`stopping` 必须返回布尔,不能返回字符串**。写成
   `"...return String(!!stop)"` 再由 `if (!stopping ...)` 判断 —— 返回的
   字符串 `"false"` 是**真值**,条件永不成立,于是轮询跑到 120 次超时。
   回答其实早已生成(实测页面上有 8 个 model-response)。判据一律用
   `return !!stop` 走 `returnByValue`。
2. **只数 `<model-response>` 精确标签,别用 `[class*=model-response]`**。
   后者会匹配嵌套的 `response-container` / `model-response-content` 等,
   实测同一个回答被数成 4 个(标签计数 6 vs 精确标签 2),配合
   `slice(beforeCount)` 会把已有回答当成新回答或漏掉。
3. **取正文用 cloneNode + 剔除列表 + textContent**,剔除列表见
   `r4-gemini-lib.mjs` 的 STRIP 常量;无头后台标签的 innerText 恒为空。

现成可复用脚本(本轮最终版,已验证 11/11 成功):
`.workwork/ui-audit/r4-gemini-lib.mjs` + `runner-r4.mjs`,
用法 `node runner-r4.mjs <from> <to> [模型名]`,响应落 `advice-r4/`。

## 2026-10-15 补充:高级模型配额当日 16:53 重置

实测菜单项文本带重置时间(`4 Argon 用量限额重置时间：10月15日 16:53`),
且 `disabled` 类为 false —— 说明当时是**用尽但可点**状态。要 Pro/Argon
质量需在重置后跑;Flash-Lite 无需 thinking tier(`ensureModel(..., false)`)。
用 `document.querySelector('.picker-primary-text').closest('button').getAttribute('aria-label')`
读当前模式,菜单项文本用 split 取名字段前先 `replace(/\s+/g,' ')`。
