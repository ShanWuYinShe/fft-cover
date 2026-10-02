/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * 给构建产物 dist/sw.js 注入版本号：
 * public/ 下的文件是直接拷贝进 dist 的（不经过 bundle），因此用 closeBundle
 * 钩子在构建完成后改写文件。
 * 每次构建版本变化 → SW 的 CACHE 名变化 → activate 清理旧缓存，
 * 避免 cache-first 的指纹资源在客户端无限累积。
 */
function swVersionPlugin(): Plugin {
  const version = process.env.GIT_COMMIT || String(Date.now());
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const file = resolve(process.cwd(), 'dist/sw.js');
      if (!existsSync(file)) return;
      const src = readFileSync(file, 'utf8').replaceAll('__SW_VERSION__', version);
      writeFileSync(file, src);
    },
  };
}

export default defineConfig({
  plugins: [svelte(), swVersionPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
