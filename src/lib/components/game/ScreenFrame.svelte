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
  <!-- 云纹角标：四角各一枚（器物感的来源之一） -->
  <span class="frame-cloud tl"></span>
  <span class="frame-cloud tr"></span>
  <span class="frame-cloud bl"></span>
  <span class="frame-cloud br"></span>
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
      inset 0 0 0 1px var(--edge-bronze),
      inset 0 0 0 2px rgba(0, 0, 0, 0.55),
      inset 0 0 80px rgba(0, 0, 0, 0.6);
  }

  /* 云纹角标：一枚回卷的云头（两块圆角弧拼出） */
  .frame-cloud {
    position: absolute;
    width: 16px;
    height: 16px;
    opacity: 0.75;
  }
  .frame-cloud::before,
  .frame-cloud::after {
    content: '';
    position: absolute;
    border: 1.5px solid var(--edge-bronze-hot);
    border-color: var(--edge-bronze-hot) transparent transparent var(--edge-bronze-hot);
    border-radius: 50% 0 0 0;
  }
  .frame-cloud::before {
    inset: 0;
    width: 13px;
    height: 13px;
  }
  .frame-cloud::after {
    inset: 5px 0 0 5px;
    width: 9px;
    height: 9px;
    border-width: 1px;
    opacity: 0.7;
  }
  .frame-cloud.tl {
    top: 7px;
    left: 7px;
    transform: rotate(-45deg);
  }
  .frame-cloud.tr {
    top: 7px;
    right: 7px;
    transform: rotate(45deg) scaleX(-1);
  }
  .frame-cloud.bl {
    bottom: 7px;
    left: 7px;
    transform: rotate(-135deg);
  }
  .frame-cloud.br {
    bottom: 7px;
    right: 7px;
    transform: rotate(135deg) scaleX(-1);
  }

  /* 四角青铜包边 */
  .frame-corner {
    position: absolute;
    width: 26px;
    height: 26px;
    border-color: rgba(255, 209, 102, 0.45);
  }
  .frame-corner.tl {
    top: 3px;
    left: 3px;
    border-top: 2px solid;
    border-left: 2px solid;
  }
  .frame-corner.tr {
    top: 3px;
    right: 3px;
    border-top: 2px solid;
    border-right: 2px solid;
  }
  .frame-corner.bl {
    bottom: 3px;
    left: 3px;
    border-bottom: 2px solid;
    border-left: 2px solid;
  }
  .frame-corner.br {
    bottom: 3px;
    right: 3px;
    border-bottom: 2px solid;
    border-right: 2px solid;
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
  }
</style>
