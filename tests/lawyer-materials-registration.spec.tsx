// @vitest-environment jsdom
/** Public client registration uses only the native files tab and follows effect teardown. */
import { expect, it, vi } from 'vitest'
import { apply } from '../src/lawyer/client/index.tsx'
it('registers the native materials tab after the registry arrives and fully disposes', () => {
  const disposers: (() => void)[] = []
  const unregisterType = vi.fn(); const unregisterSlot = vi.fn()
  const register = vi.fn(() => unregisterType)
  const slotRegister = vi.fn(() => unregisterSlot)
  let ready: ((ctx: Parameters<typeof apply>[0]) => void) | undefined
  const scope = { get: vi.fn(() => undefined), emit: vi.fn() }
  const ctx = {
    sessions: { scope: () => scope },
    get: () => ({ register }),
    effect: (callback: () => () => void) => { disposers.push(callback()) },
    inject: (names: string[], callback: (ctx: Parameters<typeof apply>[0]) => void) => { expect(names).toEqual(['sidebarRightTabs']); ready = callback },
    slots: { inject: (_name: string, callback: () => () => void) => callback(), register: slotRegister },
  }
  apply(ctx)
  expect(register).not.toHaveBeenCalled()
  expect(document.querySelector('style[data-plugin="lawyer-materials"]')).toBeTruthy()
  ready!(ctx)
  expect(register).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'lawyer-materials', kind: 'files', priority: 'extension' }))
  expect(slotRegister).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'sidebar.right.pane.tab', key: 'lawyer-materials' }), expect.any(Function))
  for (const dispose of disposers.reverse()) dispose()
  expect(unregisterType).toHaveBeenCalledOnce()
  expect(unregisterSlot).toHaveBeenCalledOnce()
  expect(document.querySelector('style[data-plugin="lawyer-materials"]')).toBeNull()
})
