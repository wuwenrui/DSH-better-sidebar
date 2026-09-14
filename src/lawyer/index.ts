/** LawyerDesk-only host entry. The unrestricted plugin is never imported. */
import { createMaterialsHandler, MATERIALS_ROUTE } from './routes.ts'
import { assertLawyerFileAccess, isLawyerPolicyEnabled } from '@deepseek-ai/dsh-product-policy'
import type { MaterialAccess } from './materials.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const name = 'lawyer-materials'
export const inject = ['webServer', 'sessions']
interface MaterialHost {
  sessions: MaterialAccess['sessions']
  webServer: { register(route: { kind: 'prefix'; path: string; handler(req: IncomingMessage, res: ServerResponse): Promise<void> }): () => void }
  effect(callback: () => () => void): unknown
}
export function apply(ctx: MaterialHost): void {
  if (!isLawyerPolicyEnabled()) throw new Error('法律材料入口只能在受管 LawyerDesk 中启用')
  const handler = createMaterialsHandler({ sessions: ctx.sessions, assertFileAccess: assertLawyerFileAccess })
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: MATERIALS_ROUTE, handler }))
}
