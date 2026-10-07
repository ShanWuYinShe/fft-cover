/**
 * 全局快捷键的"别抢输入"判定。
 *
 * 输入框 / 下拉框 / 多行文本框 / 可编辑区域里按键都属于用户在打字，
 * 全局快捷键（空格开始暂停、S 停止、R 重置）必须让路——
 * 原先只挡了 INPUT 与 SELECT，存档页的 textarea 里敲空格会直接重开一局。
 */
export function isTypingTarget(el: EventTarget | null | undefined): boolean {
  if (!el || typeof el !== 'object') return false;
  const node = el as HTMLElement;
  const tag = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return node.isContentEditable === true;
}
