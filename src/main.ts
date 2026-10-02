import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

/** 构建期注入的 Service Worker 版本（见 vite.config.ts 的 swVersionPlugin） */
declare const __SW_VERSION__: string;

const app = mount(App, {
  target: document.getElementById('app')!,
});

/**
 * PWA：注册 Service Worker 并监听更新。
 * - 文件名带版本，不受 CDN 对 /sw.js 的长缓存影响
 * - 新版本进入 waiting 后派发 `pwa-update` 事件，由 App 提示用户刷新
 * - 页面回传 { type: 'SKIP_WAITING' } 后新 SW 立即接管（见 public/sw.js）
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw-${__SW_VERSION__}.js`)
      .then((reg) => {
        // 已有 waiting 的更新（例如上一次访问时留下的）
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('pwa-update'));
        }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('pwa-update'));
            }
          });
        });
      })
      .catch(() => {
        /* 注册失败不影响游戏运行 */
      });
  });
}

/** 应用更新：通知等待中的 SW 立即接管，随后刷新页面 */
export function applyUpdate(): void {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => location.reload(), 300);
  });
}

export default app;
