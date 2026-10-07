/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Service Worker 版本化：
 *  - 把 dist/sw.js 内容中的 __SW_VERSION__ 替换为构建版本（GIT_COMMIT 或时间戳）
 *  - 重命名为 sw-<version>.js：URL 随版本变化，避免被 CDN/浏览器按 .js 长缓存
 *    （实测 Cloudflare 会缓存 /sw.js 4 小时，导致新 SW 迟迟不生效）
 *  - 版本同时通过 __SW_VERSION__ 常量注入前端，注册时引用对应文件名
 *  - CACHE 名同样带版本 → activate 时清理旧缓存，避免指纹资源无限累积
 */
function swVersionPlugin(): Plugin {
  const version = process.env.GIT_COMMIT || String(Date.now());
  const outName = `sw-${version}.js`;
  return {
    name: 'sw-version',
    apply: 'build',
    config() {
      return { define: { __SW_VERSION__: JSON.stringify(version) } };
    },
    closeBundle() {
      const src = resolve(process.cwd(), 'dist/sw.js');
      if (!existsSync(src)) return;
      const code = readFileSync(src, 'utf8').replaceAll('__SW_VERSION__', version);
      writeFileSync(resolve(process.cwd(), 'dist', outName), code);
      rmSync(src);
    },
  };
}

/**
 * healthz 版本指纹:构建时生成 dist/version.json(nginx /healthz 直接 alias)。
 * 版本与 swVersionPlugin 同源(GIT_COMMIT,缺失退化为时间戳);曾靠手工维护,
 * rsync --delete 部署一次就把线上文件清掉了(healthz 404),必须随构建产出。
 */
function versionJsonPlugin(): Plugin {
  const version = process.env.GIT_COMMIT || String(Date.now());
  return {
    name: 'version-json',
    apply: 'build',
    closeBundle() {
      const content = JSON.stringify({
        service: 'games',
        game: 'fft-cover',
        status: 'ok',
        commit: version,
        built_at: new Date().toISOString(),
      });
      writeFileSync(resolve(process.cwd(), 'dist/version.json'), content);
    },
  };
}

export default defineConfig({
  plugins: [svelte(), swVersionPlugin(), versionJsonPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
