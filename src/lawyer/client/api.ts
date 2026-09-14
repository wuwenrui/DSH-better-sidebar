/** Same-origin, session-scoped reads; no caller cwd or write method exists. */
import type { Material } from '../materials.ts'
export interface MaterialList { path: string; items: Material[]; limited: boolean }
export function materialUrl(route: 'list' | 'preview', sessionId: string, path: string): string {
  return `/lawyer-materials/${route}?${new URLSearchParams({ sessionId, path })}`
}
export async function materialResponse(route: 'list' | 'preview', sessionId: string, path: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(materialUrl(route, sessionId, path), { signal, credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? '材料读取失败，请重试')
  }
  return response
}

interface ConversationScope {
  get(name: 'conversation'): { input: { for(scope: ConversationScope): { state: { getSnapshot(): { draft: string; draftRev?: number } }; setDraft(value: string): void } } } | undefined
  emit(name: string, data: unknown): void
}
export interface ReferenceContext { sessions: { scope(id: string): ConversationScope } }
/** Inserts only a reference into this session's draft, never sends a model message. */
export function referenceMaterial(ctx: ReferenceContext, sessionId: string, path: string): boolean {
  // eslint-disable-next-line no-control-regex -- reject control characters before formatting a file reference
  if (/[\x00-\x1f\x7f"\\]/.test(path) || path.startsWith('/') || path.split('/').includes('..')) return false
  const scope = ctx.sessions.scope(sessionId)
  const conversation = scope.get('conversation')
  if (!conversation) return false
  const input = conversation.input.for(scope)
  const before = input.state.getSnapshot()
  const ref = /\s/.test(path) ? `@"${path}"` : `@${path}`
  if (before.draftRev !== undefined) {
    scope.emit('slash/input-insert-reference', {
      reference: { source: 'reference', ref, label: path.split('/').at(-1), appearance: 'file', clipboardText: ref },
      span: { draftRev: before.draftRev, start: before.draft.length, end: before.draft.length },
    })
    if (input.state.getSnapshot().draftRev !== before.draftRev) return true
  }
  input.setDraft(`${before.draft}${before.draft ? ' ' : ''}${ref}`)
  return true
}
