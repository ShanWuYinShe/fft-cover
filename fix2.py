import io
path = 'src/lib/game/engine.test.ts'
with io.open(path, encoding='utf-8') as f:
    lines = f.read().split('\n')
# 找到孤儿 it 块的起始行（"  it('按一星线"），它前面一行是持久化 describe 的收尾 "});"
idx = next(i for i, l in enumerate(lines) if l.startswith("  it('按一星线"))
# 孤儿块从 idx-1（describe 尾行被 python 插入时错位产生）到 idx+13（it 块结束 "  });"）
# 实际结构：945: "});"  946: describe头缺失 → 直接把 946..958 的错误片段删除，
# 并在 "});"（持久化块结尾）之前重新插入完整的 endlessNeed describe
start = next(i for i, l in enumerate(lines) if l.startswith("describe('endlessNeed"))
end = next(i for i, l in enumerate(lines) if i > start and l.strip() == '});')
need = lines[start:end + 1]
lines[start:end + 1] = []
# 插到文件尾（该区域只包含持久化/新纪录等块，追加安全）
lines.extend(need)
with io.open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('moved endlessNeed block to tail, was at', start + 1, '-', end + 1)
