/** 平面向量（画布像素坐标） */
export interface Vec {
  x: number;
  y: number;
}

/**
 * 一根旋转指针。
 * freq 可为负：负数表示反向旋转（傅立叶级数中的负频率项）。
 * phase 为初始相位（弧度）。
 */
export interface Arm {
  on: boolean;
  r: number;
  freq: number;
  phase: number;
}

/** 频谱分量：频率 k 的模（画布像素）与相位（弧度） */
export interface SpectrumEntry {
  k: number;
  mag: number;
  phase: number;
}

/** 游戏阶段：编辑 / 运行中 / 暂停 / 已结算 */
export type GamePhase = 'edit' | 'running' | 'paused' | 'done';

/** 关卡静态定义（描述 + 点集生成方式） */
export interface LevelDef {
  id: string;
  name: string;
  hint: string;
  /** 目标点数量 */
  n: number;
  /** 本关可用指针上限（缺省 10） */
  armLimit?: number;
  /** 参数化闭曲线（数学坐标，t ∈ [0, 2π)），与 poly 二选一 */
  fn?: (t: number) => Vec;
  /** 折线顶点（数学坐标，首尾相接），与 fn 二选一 */
  poly?: Vec[];
}

/** 运行时关卡：包含画布坐标下的目标点集与目标曲线 */
export interface Level {
  id: string;
  name: string;
  hint: string;
  pts: Vec[];
  tol: number;
  /** 目标曲线光滑采样（画布坐标，编辑态作参考轮廓） */
  curve: Vec[];
  /** 目标曲线的离散傅里叶频谱（供"频谱对比"叠加显示） */
  spectrum: SpectrumEntry[];
  /** 本关可用指针上限 */
  armLimit: number;
  random?: boolean;
}
