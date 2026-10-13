import io
path = 'src/lib/game/engine.test.ts'
with io.open(path, encoding='utf-8') as f:
    lines = f.read().split('\n')
idx = next(i for i, l in enumerate(lines) if l.startswith("describe('endless 进行中持久化"))
need = '''describe('endlessNeed（无尽本波还差几点过关）', () => {
  it('按一星线（35%）计算差值；未开始 / 已达标返回 0', () => {
    const engine = new GameEngine();
    engine.loadLevel(LEVEL_DEFS[0]);
    expect(engine.endlessNeed).toBe(0); // 未开无尽
    engine.endless = true;
    const total = engine.total;
    engine.collectedCount = 0;
    expect(engine.endlessNeed).toBe(Math.ceil(total * 0.35 - 1e-9));
    engine.collectedCount = Math.ceil(total * 0.35);
    expect(engine.endlessNeed).toBe(0); // 刚好达标
    engine.collectedCount = total;
    expect(engine.endlessNeed).toBe(0); // 超额
  });
});'''
lines[idx:idx] = need.split('\n') + ['']
with io.open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('restored endlessNeed before line', idx + 1)
