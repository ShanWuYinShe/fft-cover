<script lang="ts">
  /**
   * 明亮天空背景：座舱背后的一层环境演出（浅色天空 + 云朵 + 彩色柔光）。
   * 纯 CSS 装饰，不参与交互、不抢帧；运行态（.live）只做极慢的旋转与呼吸。
   */
  import { engine } from '../../game/engine.svelte';
</script>

<div class="ambient" class:live={engine.phase === 'running'} aria-hidden="true">
  <div class="clouds"></div>
  <div class="glows"></div>
  <div class="ring ring-a"></div>
</div>

<style>
  /* ============================================================
   * 天空背景（第十四轮）：奶油白 → 天蓝 → 浅薄荷，全屏没有一处深色。
   * 层次：云朵（静态）+ 彩色柔光（呼吸）+ 天球环（缓转）。
   * 浅底上大幅运动会晕，所以动效幅度都很小。
   * ============================================================ */
  .ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    max-width: 100vw;
    max-height: 100dvh;
    background: linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 58%, var(--bg-chassis) 100%);
  }

  /* 云朵：五团低透明度白 / 奶油径向渐变，固定不动 */
  .clouds {
    position: absolute;
    inset: -4%;
    background-image:
      radial-gradient(36% 24% at 16% 20%, rgba(255, 255, 255, 0.95), transparent 72%),
      radial-gradient(28% 18% at 68% 12%, rgba(255, 255, 255, 0.85), transparent 74%),
      radial-gradient(44% 26% at 50% 74%, rgba(255, 255, 255, 0.7), transparent 76%),
      radial-gradient(24% 16% at 90% 56%, rgba(255, 255, 255, 0.8), transparent 74%),
      radial-gradient(30% 20% at 8% 88%, rgba(255, 255, 255, 0.6), transparent 76%);
  }

  /* 彩色柔光：奶油 / 浅蓝 / 薄荷 / 珊瑚各一团，透明度很低，只把天空烘暖 */
  .glows {
    position: absolute;
    inset: -6%;
    background-image:
      radial-gradient(34% 30% at 82% 14%, rgba(255, 236, 200, 0.55), transparent 72%),
      radial-gradient(30% 28% at 12% 62%, rgba(206, 240, 255, 0.6), transparent 74%),
      radial-gradient(26% 24% at 74% 82%, rgba(47, 199, 155, 0.16), transparent 72%),
      radial-gradient(22% 20% at 96% 46%, rgba(255, 122, 69, 0.13), transparent 72%);
    opacity: 0.85;
    transition: opacity 600ms ease;
  }

  /* 运行态：柔光轻轻呼吸（9s，幅度只有 20%），不抢画布 */
  .ambient.live .glows {
    animation: sky-breathe 9s ease-in-out infinite;
  }
  @keyframes sky-breathe {
    0%,
    100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }

  /* 天球环：一条很淡的虚线，只做「世界在慢慢转」的暗示 */
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
    border: 1px dashed rgba(31, 127, 168, 0.1);
    animation: hud-spin 420s linear infinite;
    transition: border-color 600ms ease;
  }
  .ambient.live .ring-a {
    border-color: rgba(15, 148, 132, 0.16);
    animation-duration: 240s;
  }
  @keyframes hud-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ring,
    .ambient.live .glows {
      animation: none;
    }
  }
  :global(.reduce-motion) .ring,
  :global(.reduce-motion) .ambient.live .glows {
    animation: none;
  }
</style>
