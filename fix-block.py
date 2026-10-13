import io
path = 'src/lib/game/engine.test.ts'
with io.open(path, encoding='utf-8') as f:
    lines = f.read().split('\n')
idx = next(i for i, l in enumerate(lines) if l.startswith("describe('endless"))
block = '''describe('endless 进行中持久化（断点续玩）', () => {
  let original: PropertyDescriptor | undefined;

  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: memStore(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('startEndless 落 run；exitEndless 清 run', () => {
    const engine = new GameEngine();
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.startEndless();
    const stored = JSON.parse(localStorage.getItem('fft-pointers-endless-v1') ?? '{}');
    expect(stored.run?.wave).toBe(1);
    expect(stored.run?.diff).toBe('easy');
    expect(typeof stored.run?.seed).toBe('number');
    engine.exitEndless();
    const after = JSON.parse(localStorage.getItem('fft-pointers-endless-v1') ?? '{}');
    expect(after.run ?? null).toBeNull();
  });

  it('resumeEndlessRun：按存档 seed/diff 复现当前波（启动续玩）', () => {
    const engine = new GameEngine();
    engine.loadLevel(LEVEL_DEFS[0]);
    engine.endlessRun = { seed: 777, diff: 'normal', wave: 4, score: 6000 };
    expect(engine.resumeEndlessRun()).toBe(true);
    expect(engine.endless).toBe(true);
    expect(engine.endlessWave).toBe(4);
    expect(engine.endlessScore).toBe(6000);
    expect(engine.level?.id).toBe('random-777');
    expect(engine.randomDiff).toBe('normal');
  });

  it('无 run（或 run.wave=0）时不续玩', () => {
    const engine = new GameEngine();
    engine.loadLevel(LEVEL_DEFS[0]);
    expect(engine.resumeEndlessRun()).toBe(false);
    expect(engine.endless).toBe(false);
  });
});'''
lines[idx] = block
with io.open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('fixed at line', idx + 1)
