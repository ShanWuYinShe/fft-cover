# 傅立叶指针 · 旋转连杆挑战

基于傅立叶变换的收集小游戏：把最多 10 根不同半径的旋转指针**首尾相连**，它们的合成轨迹就是一条傅立叶级数曲线——调整各指针的半径、频率（负数 = 反转）与相位，让指尖在旋转中**经过尽可能多的目标点**。

## 技术栈

- [Svelte 5](https://svelte.dev)（runes 响应式）+ TypeScript
- [Vite](https://vite.dev) 构建，[Vitest](https://vitest.dev) 单测
- Canvas 2D 渲染（requestAnimationFrame 命令式循环），UI 面板为响应式组件
- 包管理：pnpm（registry 走 npmmirror）

## 玩法

1. 右侧面板勾选启用指针（自中心起首尾相连，最多 10 根）
2. 拖动滑块调整每根指针的半径 / 频率 / 相位，紫色虚线为实时预览的合成轨迹
3. 点「▶ 开始旋转」，指针真实旋转，尖端每扫过一个点即点亮计分
4. 跑完 2 个基础周期（或按 S）结算星级：收集 ≥90% 三星、≥65% 二星、≥35% 一星
5. 关卡从「圆」到「心形」难度递进，提示中暗藏谐波分解线索；「🎲 随机」无限生成可完美拟合的关卡

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
