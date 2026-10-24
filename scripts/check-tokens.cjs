#!/usr/bin/env node
/**
 * 令牌引用完整性检查：所有 var(--x) 引用必须在 tokens.css 中有定义。
 * 未定义令牌 = 声明静默失效（如 width 回退 auto），无报错无感知——
 * 本脚本让这类缺口在 CI/本地检查中显形。
 *
 * 用法：node scripts/check-tokens.cjs   （退出码 0 = 全部可解析）
 * 口径：扫描 src/styles + src/lib（组件与样式），忽略 fallback 值
 *       （var(--x, fallback) 视为已处理——调用方自带回退）。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tok = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const defined = new Set();
for (const m of tok.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);

const files = [path.join(root, 'src/app.css')];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(svelte|css)$/.test(f)) files.push(p);
  }
}
walk(path.join(root, 'src/lib'));
walk(path.join(root, 'src/styles'));

// 第二定义源：组件模板/样式里的内联定义（如 style="--progress: 50%"）
for (const f of files) {
  if (!f.endsWith('.svelte')) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
}

const bad = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/var\((--[a-zA-Z0-9-]+)(?:,[^)]*)?\)/g)) {
    const name = m[1];
    if (!defined.has(name)) {
      const line = s.slice(0, m.index).split('\n').length;
      bad.push(name + ' @ ' + path.relative(root, f) + ':' + line);
    }
  }
}
if (bad.length) {
  console.error('未定义令牌引用 ' + bad.length + ' 处：');
  for (const b of bad) console.error('  ' + b);
  process.exit(1);
}
console.log('令牌引用完整性 OK：全部 var() 引用均可在 tokens.css 解析');
