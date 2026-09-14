// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react-dom/test-utils'
import { renderRoot, setupReactAct, type RenderedRoot } from './test-utils.ts'
import { Materials } from '../src/lawyer/client/Materials.tsx'
import { referenceMaterial, type ReferenceContext } from '../src/lawyer/client/api.ts'
setupReactAct()
let view: RenderedRoot | undefined
afterEach(() => { view?.unmount(); view = undefined; vi.unstubAllGlobals() })
const list = { path: '', limited: false, items: [{ name: '证据.txt', path: '证据.txt', kind: 'text', size: 5 }, { name: '合同.docx', path: '合同.docx', kind: 'office', size: 5 }] }
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
async function click(name: string) {
  const button = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(name))
  expect(button).toBeTruthy()
  await act(async () => { button!.click() })
  await flush()
}
describe('legal material shelf', () => {
  it('shows real discovered files, plain read-only preview and draft reference', async () => {
    const fetcher = vi.fn(async (url: string) => url.includes('/preview') ? new Response('<script>plain text</script>') : new Response(JSON.stringify(list)))
    vi.stubGlobal('fetch', fetcher)
    const reference = vi.fn(() => true)
    view = renderRoot(<Materials sessionId="session-a" onReference={reference} />)
    await flush(); await click('证据.txt')
    expect(document.querySelector('pre')?.textContent).toBe('<script>plain text</script>')
    expect(document.querySelector('script')).toBeNull()
    await click('引用到对话')
    expect(reference).toHaveBeenCalledWith('证据.txt')
    expect(document.body.textContent).toContain('已引用到输入框')
    expect(document.querySelector('textarea')).toBeNull()
    expect([...document.querySelectorAll('button')].some(b => /删除|终端|Git|设置/.test(b.textContent ?? ''))).toBe(false)
    expect(fetcher.mock.calls.every(([url]) => !url.includes('cwd='))).toBe(true)
  })
  it('does not claim Office preview, and resets material state when switching sessions', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('session-b') ? { ...list, items: [] } : list))))
    view = renderRoot(<Materials sessionId="session-a" onReference={() => true} />)
    await flush(); await click('合同.docx')
    expect(document.body.textContent).toContain('不提供内嵌预览')
    view.rerender(<Materials sessionId="session-b" onReference={() => true} />)
    await flush()
    expect(document.body.textContent).toContain('暂无可查看材料')
    expect(document.body.textContent).not.toContain('不提供内嵌预览')
  })
  it('references only the selected session scoped draft and does not send', () => {
    const setDraft = vi.fn()
    const scope = { get: vi.fn(() => ({ input: { for: () => ({ state: { getSnapshot: () => ({ draft: '请分析' }) }, setDraft }) } })), emit: vi.fn() }
    const ctx = { sessions: { scope: vi.fn(() => scope) } } as ReferenceContext
    expect(referenceMaterial(ctx, 'session-a', '材料/合同 附件.docx')).toBe(true)
    expect(ctx.sessions.scope).toHaveBeenCalledWith('session-a')
    expect(scope.get).toHaveBeenCalledWith('conversation')
    expect(setDraft).toHaveBeenCalledWith('请分析 @"材料/合同 附件.docx"')
    expect(referenceMaterial(ctx, 'session-a', '../secret')).toBe(false)
  })
})
