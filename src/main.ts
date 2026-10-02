import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

/** 构建期注入的 Service Worker 版本（见 vite.config.ts 的 swVersionPlugin） */
declare const __SW_VERSION__: string;

const app = mount(App, {
  target: document.getElementById('app')!,
});

// PWA：注册 Service Worker（仅生产构建；dev 下不注册，避免缓存干扰开发）
// 文件名带版本 → 不受 CDN 对 /sw.js 的长缓存影响，新版本可及时接管
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw-${__SW_VERSION__}.js`).catch(() => {
      /* 注册失败不影响游戏运行 */
    });
  });
}

export default app;
