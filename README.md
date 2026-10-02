# 傅立叶指针 · 旋转连杆挑战

基于傅立叶变换的收集小游戏：把最多 10 根不同半径的旋转指针**首尾相连**，它们的合成轨迹就是一条傅立叶级数曲线——调整各指针的半径、频率（负数 = 反转）与相位，让指尖在旋转中**经过尽可能多的目标点**。

## 技术栈

- [Svelte 5](https://svelte.dev)（runes 响应式）+ TypeScript
- [Vite](https://vite.dev) 构建，[Vitest](https://vitest.dev) 单测
- Canvas 2D 渲染（requestAnimationFrame 命令式循环），UI 面板为响应式组件
- 包管理：pnpm（registry 走 npmmirror）

## 玩法

1. 右侧面板勾选启用指针（自中心起首尾相连）；**每关有指针上限**（圆 1 根、椭圆 2 根、心形 8 根……），上限恰好容纳该关的精确傅立叶分解
2. 拖动滑块调整每根指针的半径 / 频率 / 相位：**暗金虚线**是目标曲线参考，**紫色虚线**是你当前参数的合成轨迹——逼近它！
3. 点「▶ 开始旋转」，指针真实旋转，尖端每扫过一个点即点亮计分；**1.2 秒内连续收集触发连击**，点分 = 100 × (1 + 连击数)，按关记录最佳得分
4. 收集音效按**五声音阶**递进，全部收齐奏响 C 大三和弦琶音（傅立叶 = 谐波 = 和声）
5. 跑完 2 个基础周期（或按 S）结算星级：收集 ≥90% 三星、≥65% 二星、≥35% 一星；结算后可「👁 查看轨迹」回看，点画布恢复
6. 关卡线性解锁（前一关 ≥1★）；「🎲 随机」无限生成可完美拟合的关卡，随机关有**邀请码**：复制发给好友，或输入邀请码重建同一关卡
7. 「🧪 沙盒」模式：无限时自由旋转，边转边实时调参扫点，成绩不计入记录；画布右上角的**频谱仪**实时显示你的傅立叶系数（青=正频、紫=负频）
8. 指针面板的「🎲 随机参数 / ⭯ 清零」帮你快速起步；音效开关偏好会被记住

快捷键：空格 开始/暂停 · S 停止结算 · R 重置。

## 数学原理

指针链尖端位置（复平面表示）：

    P(t) = Σₖ rₖ · e^(i·ωₖ·t + φₖ)，ωₖ = 2π·fₖ / T0

这正是傅立叶级数的合成形式。任意周期曲线都可分解为有限个旋转向量之和——玩家的任务就是逆向找出这组系数。

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
      lib/game/        纯逻辑：constants / types / math / levels / audio / engine.svelte.ts（runes 状态引擎）
      lib/components/  Stage（canvas 渲染循环）、ArmCard、LevelPicker、ScorePanel、ResultOverlay
      App.svelte       布局与组装

legacy/vanilla.html 是重写前的单文件原型，仅作参考。
