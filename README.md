# 傅立叶指针 · 旋转连杆挑战

基于傅立叶变换的收集小游戏：把最多 10 根不同半径的旋转指针**首尾相连**，它们的合成轨迹就是一条傅立叶级数曲线——调整各指针的半径、频率（负数 = 反转）与相位，让指尖在旋转中**经过尽可能多的目标点**。

## 技术栈

- [Svelte 5](https://svelte.dev)（runes 响应式）+ TypeScript
- [Vite](https://vite.dev) 构建，[Vitest](https://vitest.dev) 单测
- Canvas 2D 渲染（requestAnimationFrame 命令式循环），UI 面板为响应式组件
- 包管理：pnpm（registry 走 npmmirror）

## 玩法

1. 右侧面板勾选启用指针（⟲ 按钮切换旋转方向，点击数值精确输入）；**每关有指针上限**（圆 1 根、椭圆 2 根、心形 8 根……），上限恰好容纳该关的精确傅立叶分解；编辑态可直接**拖拽画布关节**调半径与相位（实时显示数值）
2. 拖动滑块调整每根指针的半径 / 频率 / 相位：**暗金虚线**是目标曲线参考，**紫色虚线**是你当前参数的合成轨迹——逼近它！
3. 点「▶ 开始旋转」，指针真实旋转，尖端每扫过一个点即点亮计分；**1.2 秒内连续收集触发连击**，点分 = 100 × (1 + 连击数)，按关记录最佳得分
4. 收集音效按**五声音阶**递进，全部收齐奏响 C 大三和弦琶音（傅立叶 = 谐波 = 和声）
5. 跑完 2 个基础周期（或按 S）结算星级：收集 ≥90% 三星、≥65% 二星、≥35% 一星；结算后可「👁 查看轨迹」回看，点画布恢复
   「📅 每日」按**当前随机难度**生成今日关卡（seed = 日期+难度，同难度全球同关，按日与难度记最佳）；「🎲 随机」支持简单/普通/困难三档——普通可完美拟合，**困难关含超出指针上限的分量，只能尽量逼近**；随机关有**邀请码**：复制发给好友，或输入邀请码重建同一关卡
6. 编辑态可直接**拖拽画布上的关节**调整半径与相位（滑块之外的第二种手感，支持触屏）；拖滑块时对应关节会在画布上金色高亮
7. 收集全部点会触发金色冲击波特效
8. 「🧪 沙盒」模式：无限时自由旋转，边转边实时调参扫点，成绩不计入记录；可切**转速档位**（0.5×/1×/2×）；「🪄 自动拟合」按目标频谱直接解出精确参数并以动画演示傅立叶逐项逼近；画布右上角的**频谱仪**实时显示你的傅立叶系数（青=正频、紫=负频）
9. 全清一关会记录**最快全清用时**（⚡ 竞速目标），结算面板与「本次成绩」中可见
10. 指针面板的「🎲 随机参数 / ⭯ 清零」帮你快速起步；「▶ 回放解法」一键载入上届那局的指针配置并立即旋转；音效开关偏好会被记住
11. 结算浮层可「📋 复制战报」：关卡、星级、得分、全清用时与解法参数一键分享（随机关附邀请码）
12. **👻 上届竞速**：运行中上届解法的轨迹以金色虚线同屏显示，收集胶囊下方还会实时告诉你**比上届同一时刻多收还是少收了几点**（进度条上的金色刻度＝上届此刻的收集比例），结算卡给出"上届同期 ±N 点"；首次访问有新手引导
13. **🎵 背景音乐就是你自己的指针**：每一根启用的指针都是一个真实声部，参数一改和声立刻跟着变——频率→音高、半径→音量、相位→左右；旋转与结算时音乐更饱满，暂停思考时自动退到背景。点运行栏的 🎵 可开关（偏好会被记住）

快捷键：空格 开始/暂停（结算后空格立即重开）· S 停止结算 · R 重置。

## 音效与音乐

傅立叶级数本来就是声音的语言，所以声音不是装饰，而是**同一套数学的听觉通道**：

| 指针参数 | 听感                                                | 实现                                                                                |
| -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 频率 fₖ  | 第 k 次谐波（1× = 根音 C3、2× = 八度、3× = 十二度） | 振荡器基频 = 130.81 Hz × \|fₖ\|（上限 16×）                                         |
| 半径 rₖ  | 声部音量（分量越大越响）                            | 增益 0.04 + 0.2 × min(1, r/170)                                                     |
| 相位 φₖ  | 立体声左右位置                                      | 声像 = sin(φₖ)                                                                      |
| 旋转方向 | ±7 音分失谐                                         | 正频略升、负频略降——±k 频率对因此产生**缓慢拍音**，这是"两根反向指针"在听觉上的样子 |
| 收集序号 | 五声音阶上行                                        | 收集音效（PENTATONIC），全清奏 C 大三和弦琶音                                       |

垫音（根音 + 纯五度 + 12 秒周期的呼吸起伏）保证任何配置下都有稳定的底；声部走总线低通 → 压缩器 → 总音量，10 根指针同时发声也不会破音。浏览器自动播放策略要求手势，故音乐在**首次点击/按键后**才起播；切到后台自动挂起。

## 数学原理

指针链尖端位置（复平面表示）：

    P(t) = Σₖ rₖ · e^(i·ωₖ·t + φₖ)，ωₖ = 2π·fₖ / T0

这正是傅立叶级数的合成形式。任意周期曲线都可分解为有限个旋转向量之和——玩家的任务就是逆向找出这组系数。

## PWA

线上为可安装的 PWA：手机浏览器菜单「添加到主屏幕」后可全屏运行，**离线也能玩**。

- `public/manifest.webmanifest` — standalone 显示、深色主题、192/512/maskable 图标
- `public/sw.js` — Service Worker：
  - 导航与 manifest：**network-first**（保证新版本可见），断网回退缓存
  - `/assets/*`、图标：**cache-first**（文件名带指纹，内容不可变）
- 图标由 `icon.svg` 通过 headless Chrome 栅格化生成（192/512/180/32）
- 仅生产构建注册 SW（dev 下不注册，避免缓存干扰开发）

## 部署（workwork-server）

线上地址：**https://game.chaoset.com/**（CF 橙云代理，源站 IPv6-only）。

- 服务器目录 `~/games/`，compose 挂 `ipvlan_docker` 外部网络，静态 IPv6 `…:1::60`（next free was ::60；::10 面板 / ::12 xray / ::20 hotspot / ::30 ops / ::40 media / ::50 music）
- 证书：chaoset.com 通配符（CF Origin CA），归档 `~/work/dogod/cf_token_and_cert/chaoset.com/`
- DNS：`game.chaoset.com` AAAA → `…:1::60`（橙云）。**服务器 IPv6 前缀轮换时需更新此记录**（可参照 workwork 面板的轮换同步逻辑）
- 新增游戏：`sites/` 下加 `<game>/` 静态目录，复制 `deploy/nginx-game.chaoset.com.conf` 中 server 块改 root/server_name，`docker compose exec nginx nginx -s reload`

更新上线流程：

```bash
pnpm build && scp -r dist workwork-server:/tmp/fft-cover-dist
ssh workwork-server "rm -rf ~/games/sites/fft-cover && mv /tmp/fft-cover-dist ~/games/sites/fft-cover"
```

首次部署（服务器无 ~/games 时）：

```bash
ssh workwork-server "mkdir -p ~/games/nginx/conf.d ~/games/cert ~/games/sites"
scp deploy/docker-compose.yml workwork-server:~/games/docker-compose.yml
scp deploy/nginx-game.chaoset.com.conf workwork-server:~/games/nginx/conf.d/games.conf
scp ~/work/dogod/cf_token_and_cert/chaoset.com/cert.pem ~/work/dogod/cf_token_and_cert/chaoset.com/cert.key workwork-server:/tmp/
ssh workwork-server "mv /tmp/cert.pem ~/games/cert/chaoset.pem && mv /tmp/cert.key ~/games/cert/chaoset.key && chmod 600 ~/games/cert/chaoset.key"
ssh workwork-server "cd ~/games && docker compose up -d"
```

## 开发

```bash
pnpm install        # 安装依赖（store 已指向 workspace）
pnpm dev            # 开发服务器
pnpm format         # Prettier 格式化
pnpm check          # svelte-check 类型检查
pnpm test           # Vitest 单测
pnpm build          # 产物构建（dist/）
pnpm preview        # 预览构建产物
```

目录结构：

    src/
      lib/game/        纯逻辑：constants / types / math / levels / scoring / save / share
                       audio（音效）/ harmony（指针→声部映射）/ music（和声垫音音频图）
                       pace（上届节奏：幽灵竞速时间线）
                       engine.svelte.ts（runes 状态引擎）
      lib/components/  Stage（canvas 渲染循环）、ArmPanel / ArmRow / ArmEditor、
                       LevelPicker、ScorePanel、ResultOverlay、TitleScreen、AchievementsModal、ComposerModal
      App.svelte       布局与组装

legacy/vanilla.html 是重写前的单文件原型，仅作参考。
