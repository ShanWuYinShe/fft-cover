/**
 * 浑天璇玑 · 音效与配乐生命周期控制器
 */

import { engine } from '../game/engine.svelte';
import { setVolume as setAudioVolume, initVolumeFromStorage, uiClick } from '../game/audio';
import { musicIntensity } from '../game/harmony';
import { startMusic, updateMusic, setMusicSuspended } from '../game/music';

class AudioController {
  volume = $state(initVolumeFromStorage());

  /** 循环切换音量档位：100% -> 50% -> 0% (静音) */
  cycleVolume(): void {
    const next = this.volume === 1 ? 0.5 : this.volume === 0.5 ? 0 : 1;
    this.volume = next;
    setAudioVolume(next);
    engine.setSound(next > 0);
  }

  /** 音量图标名 */
  get volIconName(): string {
    return this.volume === 1 ? 'volume-high' : this.volume === 0.5 ? 'volume-low' : 'volume-mute';
  }

  /** 背景音乐声部与动态强度同步 */
  syncMusic(): void {
    updateMusic(
      engine.arms,
      musicIntensity(engine.phase, engine.sandbox),
      engine.musicOn,
      this.volume,
      engine.musicalKey,
      engine.phase !== 'edit',
    );
  }

  /** 安装全局音频监听（首次手势起播、全局点击音、后台切入挂起） */
  setupListeners(): () => void {
    const onUiClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('button')) {
        uiClick(engine.soundOn);
      }
    };
    document.addEventListener('click', onUiClick, true);

    const onFirstGesture = () => {
      startMusic();
      this.syncMusic();
    };
    document.addEventListener('pointerdown', onFirstGesture, { capture: true, once: true });
    document.addEventListener('keydown', onFirstGesture, { capture: true, once: true });

    const onVisibility = () => {
      setMusicSuspended(document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('click', onUiClick, true);
      document.removeEventListener('pointerdown', onFirstGesture, true);
      document.removeEventListener('keydown', onFirstGesture, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }
}

export const audioController = new AudioController();
