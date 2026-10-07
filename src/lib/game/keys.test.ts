import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './keys';

/** 造一个只有 tagName / isContentEditable 的假节点（Node 环境没有 DOM） */
const el = (tagName: string, editable = false) =>
  ({ tagName, isContentEditable: editable }) as unknown as HTMLElement;

describe('isTypingTarget：全局快捷键要给输入让路', () => {
  it('输入框 / 多行文本 / 下拉框都算在打字', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('SELECT'))).toBe(true);
  });

  it('标签名大小写不敏感（浏览器大写，写测试时常写小写）', () => {
    expect(isTypingTarget(el('textarea'))).toBe(true);
    expect(isTypingTarget(el('input'))).toBe(true);
  });

  it('contenteditable 区域也算（富文本编辑）', () => {
    expect(isTypingTarget(el('DIV', true))).toBe(true);
  });

  it('普通按钮 / 画布 / 空值不算', () => {
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(el('CANVAS'))).toBe(false);
    expect(isTypingTarget(el('DIV'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
  });
});
