/** Separate browser entry: only the native materials tab and reference-to-draft action. */
import { Materials } from './Materials.tsx'
import { referenceMaterial, type ReferenceContext } from './api.ts'
import { materialStyle } from './style.ts'

interface MaterialClient extends ReferenceContext {
  effect(callback: () => () => void): unknown
  inject(names: string[], callback: (ctx: MaterialClient) => void): unknown
  get(name: 'sidebarRightTabs'): { register(definition: { id: string; kind: string; priority: 'extension'; title(): string; guide: { order: number; title(): string; description(): string }[] }): () => void }
  slots: {
    inject(name: string, callback: () => () => void): () => void
    register(descriptor: { name: string; key: string; inject(sessionId: string): { sessionId: string; onReference(path: string): boolean } }, component: typeof Materials): () => void
  }
}
export const name = 'lawyer-materials-client'
export const inject = ['slots', 'sessions']
export function apply(ctx: MaterialClient): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'lawyer-materials'
    style.textContent = materialStyle
    document.head.append(style)
    return () => style.remove()
  })
  ctx.inject(['sidebarRightTabs'], scope => {
    const tabs = scope.get('sidebarRightTabs')
    scope.effect(() => tabs.register({
      id: 'lawyer-materials', kind: 'files', priority: 'extension', title: () => '材料',
      guide: [{ order: 10, title: () => '本会话材料', description: () => '查看材料并引用到对话' }],
    }))
    scope.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab', key: 'lawyer-materials',
      inject: sessionId => ({ sessionId, onReference: path => referenceMaterial(ctx, sessionId, path) }),
    }, Materials)))
  })
}
