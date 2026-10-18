<script lang="ts">
  /**
   * 座舱外框：贴在视口四边的青铜包边与四角角花。
   * 纯装饰层（pointer-events:none），让整屏读起来像一台机器的显示器，
   * 而不是一张可以随意滚动的网页。
   */
</script>

<div class="screen-frame" aria-hidden="true">
  <span class="frame-corner tl"></span>
  <span class="frame-corner tr"></span>
  <span class="frame-corner bl"></span>
  <span class="frame-corner br"></span>
  <span class="frame-rail top"></span>
  <span class="frame-rail bottom"></span>
</div>

<style>
  .screen-frame {
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
  }

  /* 视口四周的暗金发丝线：像机箱内沿 */
  .screen-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow:
      inset 0 0 0 1px rgba(245, 184, 65, 0.16),
      inset 0 0 60px rgba(0, 0, 0, 0.55);
  }

  /* 上下两条渐隐光带，强化“屏幕边界” */
  .frame-rail {
    position: absolute;
    left: 8%;
    right: 8%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(245, 184, 65, 0.55) 20%,
      rgba(255, 209, 102, 0.8) 50%,
      rgba(245, 184, 65, 0.55) 80%,
      transparent
    );
    opacity: 0.45;
  }
  .frame-rail.top {
    top: 0;
  }
  .frame-rail.bottom {
    bottom: 0;
  }

  /* 四角青铜包边 */
  .frame-corner {
    position: absolute;
    width: 26px;
    height: 26px;
    border-color: rgba(255, 209, 102, 0.75);
    filter: drop-shadow(0 0 6px rgba(245, 184, 65, 0.45));
  }
  .frame-corner.tl {
    top: 3px;
    left: 3px;
    border-top: 3px solid;
    border-left: 3px solid;
  }
  .frame-corner.tr {
    top: 3px;
    right: 3px;
    border-top: 3px solid;
    border-right: 3px solid;
  }
  .frame-corner.bl {
    bottom: 3px;
    left: 3px;
    border-bottom: 3px solid;
    border-left: 3px solid;
  }
  .frame-corner.br {
    bottom: 3px;
    right: 3px;
    border-bottom: 3px solid;
    border-right: 3px solid;
  }

  /* 手机竖屏：角花缩小，避免遮挡 HUD */
  @media (max-width: 640px) and (orientation: portrait) {
    .frame-corner {
      width: 16px;
      height: 16px;
    }
    .frame-corner.tl,
    .frame-corner.tr {
      top: 2px;
    }
    .frame-corner.bl,
    .frame-corner.br {
      bottom: 2px;
    }
    .frame-rail {
      left: 16%;
      right: 16%;
    }
  }
</style>
