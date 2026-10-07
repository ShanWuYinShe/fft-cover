/* 傅立叶指针 · Service Worker
 * 策略：
 *  - 导航请求（HTML）与 manifest：network-first，失败回退缓存（保证更新可见 + 离线可玩）
 *  - 带指纹的资源（/assets/*）、图标：cache-first（内容不可变，命中即用）
 */
// __SW_VERSION__ 由构建注入（vite.config.ts 的 swVersionPlugin）
const CACHE = 'fft-pointers-__SW_VERSION__';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// 安装：预缓存 app shell。不在此处 skipWaiting——新版本先进入 waiting，
// 由页面提示用户后发送 SKIP_WAITING 再接管，避免打断进行中的对局。
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

// 页面确认更新后立即接管
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // 集合站子路径游戏(travel/cnm/wave-warden)是独立应用,不归本 SW 管:
  // 全部直接放行,避免它们的资源被 cache-first 误入库、离线导航错回根游戏
  if (/^\/(travel|cnm|wave-warden)(\/|$)/.test(url.pathname)) return;

  // 导航与 manifest：network-first
  if (req.mode === 'navigate' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  // 静态资源：cache-first（miss 时回源并入库）
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
