/**
 * 浑天璇玑 · 读屏无障碍播报调度器
 * 优先级链：结算 > 成就解锁 > 过波 > 星级跨档
 * 600ms 防抖提交，避免高连击下读屏队列堆积
 */

import { engine } from '../game/engine.svelte';
import { starsFor } from '../game/scoring';

class ScreenReaderManager {
  srLive = $state('');
  private srTimer: ReturnType<typeof setTimeout> | undefined;

  get message(): string {
    if (engine.phase === 'done') {
      if (engine.endless) {
        return (
          '无尽挑战结束，止步第 ' +
          engine.endlessWave +
          ' 波，累计 ' +
          engine.endlessScore +
          ' 分' +
          (engine.endlessNewBest ? '，刷新历史最佳' : '')
        );
      }
      const st = engine.collectedCount / Math.max(1, engine.total);
      return (
        '本局结束，收集 ' +
        engine.collectedCount +
        '/' +
        engine.total +
        '，' +
        starsFor(st) +
        ' 星，得分 ' +
        engine.score
      );
    }
    if (engine.toast) return '解锁成就：' + engine.toast.name;
    if (engine.endless && engine.endlessWave > 1 && engine.endlessSurvived) {
      return (
        '第 ' +
        (engine.endlessWave - 1) +
        ' 波通过，累计 ' +
        engine.endlessScore +
        ' 分，进入第 ' +
        engine.endlessWave +
        ' 波'
      );
    }
    if (engine.starReached > 0) {
      return (
        '已收集 ' +
        engine.collectedCount +
        '/' +
        engine.total +
        '，' +
        engine.starReached +
        ' 星达成'
      );
    }
    return '';
  }

  update(): void {
    const msg = this.message;
    if (!msg) return;
    clearTimeout(this.srTimer);
    this.srTimer = setTimeout(() => {
      this.srLive = msg;
    }, 600);
  }
}

export const screenReader = new ScreenReaderManager();
