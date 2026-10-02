<script lang="ts">
  import { LEVEL_DEFS } from '../game/levels';
  import { ACHIEVEMENTS } from '../game/scoring';
  import { clearSave, exportSave, importSave } from '../game/save';
  import { engine } from '../game/engine.svelte';

  let { onclose }: { onclose: () => void } = $props();

  const unlockedCount = $derived(Object.keys(engine.achievements).length);
  const totalStars = $derived(
    LEVEL_DEFS.reduce((sum, d) => sum + (engine.bestStars[d.id] ?? 0), 0),
  );

  /* ---------- 存档（备份/恢复/清空） ---------- */
  let tab: 'achv' | 'save' = $state('achv');
  let saveText = $state('');
  let importText = $state('');
  let msg: { ok: boolean; text: string } | null = $state(null);
  let confirmClear = $state(false);

  function doExport(): void {
    saveText = exportSave();
    msg = { ok: true, text: '已生成存档，复制下面这段文本保存好即可' };
  }
  async function copySave(): Promise<void> {
    if (!saveText) doExport();
    try {
      await navigator.clipboard.writeText(saveText);
      msg = { ok: true, text: '已复制到剪贴板' };
    } catch {
      msg = { ok: true, text: '请手动复制下面的文本' };
    }
  }
  function doImport(): void {
    const res = importSave(importText);
    if (res.ok) {
      msg = { ok: true, text: res.detail + '，正在刷新…' };
      setTimeout(() => location.reload(), 700);
    } else {
      msg = { ok: false, text: res.detail };
    }
  }
  function doClear(): void {
    if (!confirmClear) {
      confirmClear = true;
      return;
    }
    clearSave();
    msg = { ok: true, text: '已清空进度，正在刷新…' };
    setTimeout(() => location.reload(), 700);
  }
</script>

<div class="modal">
  <div class="box">
    <h2>
      🏆 成就 <span class="muted">{unlockedCount} / {ACHIEVEMENTS.length}</span>
    </h2>
    <div class="tabs">
      <button type="button" class:on={tab === 'achv'} onclick={() => (tab = 'achv')}>成就</button>
      <button type="button" class:on={tab === 'save'} onclick={() => (tab = 'save')}>存档</button>
    </div>
    {#if tab === 'save'}
      <div class="save">
        <p class="desc">进度保存在本机浏览器里。换设备或清理浏览器数据前，先导出备份。</p>
        <button type="button" class="mini" onclick={copySave}>📋 导出并复制存档</button>
        {#if saveText}
          <textarea class="io" readonly rows="3" value={saveText}></textarea>
        {/if}
        <textarea
          class="io"
          rows="3"
          placeholder="粘贴存档文本（FFTP1:…）后点导入"
          bind:value={importText}></textarea>
        <div class="row">
          <button type="button" class="mini" disabled={!importText.trim()} onclick={doImport}
            >⬆ 导入并恢复</button
          >
          <button type="button" class="mini danger" onclick={doClear}
            >{confirmClear ? '确认清空？' : '🗑 清空进度'}</button
          >
        </div>
        {#if msg}
          <p class="msg" class:bad={!msg.ok}>{msg.text}</p>
        {/if}
      </div>
    {/if}
    <div class="list" class:hide={tab !== 'achv'}>
      {#each ACHIEVEMENTS as a (a.id)}
        {@const got = !!engine.achievements[a.id]}
        <div class="item" class:got>
          <span class="icon">{got ? '🏆' : '🔒'}</span>
          <div class="txt">
            <div class="nm">{a.name}</div>
            <div class="desc">{a.desc}</div>
          </div>
        </div>
      {/each}
    </div>
    <div class="hint">当前总星数 {totalStars} / {LEVEL_DEFS.length * 3}（随机关不计星）</div>
    <button class="primary" onclick={onclose}>关 闭</button>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 14, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 50;
  }
  .box {
    width: min(92vw, 380px);
    background: #10152a;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    text-align: center;
    box-shadow: 0 16px 60px rgba(0, 0, 0, 0.6);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 17px;
    letter-spacing: 2px;
  }
  .muted {
    color: var(--muted);
    font-size: 13px;
    letter-spacing: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    max-height: 46vh;
    overflow-y: auto;
    text-align: left;
  }
  .item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    opacity: 0.5;
  }
  .item.got {
    opacity: 1;
    border-color: rgba(251, 191, 36, 0.45);
    background: rgba(251, 191, 36, 0.05);
  }
  .icon {
    font-size: 20px;
  }
  .nm {
    font-size: 14px;
    font-weight: 600;
  }
  .desc {
    font-size: 12px;
    color: var(--muted);
  }
  .hint {
    font-size: 11.5px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  /* 分区切换 */
  .tabs {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-bottom: 12px;
  }
  .tabs button {
    font-size: var(--fs-sm);
    padding: 4px 16px;
    min-height: 28px;
    border-radius: 999px;
    color: var(--muted);
  }
  .tabs button.on {
    border-color: rgba(79, 209, 197, 0.7);
    color: var(--cyan);
    background: var(--cyan-dim);
  }
  .list.hide {
    display: none;
  }
  /* 存档区 */
  .save {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
    text-align: left;
  }
  .save .desc {
    font-size: var(--fs-xs);
    color: var(--muted);
    margin: 0;
    line-height: 1.6;
  }
  .save .io {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    background: #0f1428;
    color: var(--text);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    padding: 7px 9px;
    font-size: var(--fs-xs);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    outline: none;
    word-break: break-all;
  }
  .save .io:focus {
    border-color: rgba(79, 209, 197, 0.6);
  }
  .save .row {
    display: flex;
    gap: 8px;
  }
  .save .row .mini {
    flex: 1;
  }
  .mini {
    font-size: var(--fs-sm);
    padding: 6px 12px;
    min-height: 32px;
    border-radius: var(--r-sm);
  }
  .mini.danger:hover:not(:disabled) {
    border-color: rgba(248, 113, 113, 0.7);
    color: #f87171;
    box-shadow: none;
  }
  .msg {
    font-size: var(--fs-xs);
    color: var(--cyan);
    margin: 0;
  }
  .msg.bad {
    color: #f87171;
  }
</style>
