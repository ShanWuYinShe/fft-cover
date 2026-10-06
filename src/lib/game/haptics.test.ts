import { describe, expect, it, vi, afterEach } from 'vitest';
import { haptic } from './haptics';

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'navigator');
});

describe('haptic', () => {
  it('开关关闭时不震动', () => {
    const vibrate = vi.fn();
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate }, configurable: true });
    haptic(20, false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('开启时把振动模式透传给 navigator.vibrate', () => {
    const vibrate = vi.fn();
    Object.defineProperty(globalThis, 'navigator', { value: { vibrate }, configurable: true });
    haptic(18);
    expect(vibrate).toHaveBeenCalledWith(18);
    haptic([20, 60, 20]);
    expect(vibrate).toHaveBeenCalledWith([20, 60, 20]);
  });

  it('环境不支持 / 抛错时不抛异常', () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    expect(() => haptic(20)).not.toThrow();
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          throw new Error('nope');
        },
      },
      configurable: true,
    });
    expect(() => haptic(20)).not.toThrow();
  });
});
