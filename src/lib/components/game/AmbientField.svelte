<script lang="ts">
  /**
   * 浑天星穹背景：座舱背后的一层环境演出。
   * 纯 CSS 装饰（旋转浑天环 + 星点 + 暗角），不参与交互、不抢帧。
   * 运行态（.live）时环转得更快、暗角更收，让整屏「进入状态」。
   */
  import { engine } from '../../game/engine.svelte';
</script>

<div class="ambient" class:live={engine.phase === 'running'} aria-hidden="true">
  <div class="halo halo-top"></div>
  <div class="halo halo-bottom"></div>
  <div class="ring ring-a"></div>
  <div class="stars"></div>
  <div class="vignette"></div>
</div>

<style>
  .ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    max-width: 100vw;
    max-height: 100dvh;
    background:
      radial-gradient(ellipse 90% 70% at 50% 8%, rgba(20, 34, 62, 0.85) 0%, transparent 62%),
      radial-gradient(ellipse 70% 60% at 78% 92%, rgba(245, 184, 65, 0.06) 0%, transparent 60%),
      linear-gradient(180deg, #070b15 0%, #04060c 55%, #03050a 100%);
  }

  .halo {
    position: absolute;
    left: 50%;
    width: 120vw;
    height: 60vh;
    transform: translateX(-50%);
    filter: blur(40px);
  }
  .halo-top {
    top: -28vh;
    background: radial-gradient(ellipse at 50% 100%, rgba(0, 245, 212, 0.07), transparent 65%);
  }
  .halo-bottom {
    bottom: -34vh;
    background: radial-gradient(ellipse at 50% 0%, rgba(245, 184, 65, 0.07), transparent 65%);
  }

  .ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    pointer-events: none;
  }
  .ring-a {
    width: 1080px;
    height: 1080px;
    margin: -540px 0 0 -540px;
    border: 1px dashed rgba(245, 184, 65, 0.075);
    animation: hud-spin 300s linear infinite;
    transition: border-color 0.4s ease;
  }
  /* 运行态：环加速、描边提亮（世界「开机」了） */
  .ambient.live .ring-a {
    border-color: rgba(0, 245, 212, 0.16);
    animation-duration: 90s;
  }
  @keyframes hud-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* 星点：两层不同密度的点阵，位置固定不闪烁（避免干扰读盘） */
  .stars {
    position: absolute;
    inset: -2px;
    background-image:
      radial-gradient(1.4px 1.4px at 12% 22%, rgba(255, 255, 255, 0.5), transparent 60%),
      radial-gradient(1.2px 1.2px at 82% 14%, rgba(245, 184, 65, 0.55), transparent 60%),
      radial-gradient(1.6px 1.6px at 68% 72%, rgba(0, 245, 212, 0.45), transparent 60%),
      radial-gradient(1.2px 1.2px at 28% 84%, rgba(255, 255, 255, 0.35), transparent 60%),
      radial-gradient(1px 1px at 46% 36%, rgba(255, 255, 255, 0.3), transparent 60%),
      radial-gradient(1px 1px at 92% 56%, rgba(255, 255, 255, 0.28), transparent 60%);
    opacity: 0.85;
  }

  /* 暗角：把视线收进中央舞台 */
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 78% 72% at 50% 46%,
      transparent 55%,
      rgba(0, 0, 0, 0.55) 100%
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation: none;
    }
  }
  /* 应用内设置里的「减弱动态效果」也会加这个类 */
  :global(.reduce-motion) .ring {
    animation: none;
  }
</style>
