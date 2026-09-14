/** Allowlisted GET routes only; no original sidebar APIs or upgrade listener. */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { MaterialError, listMaterials, previewMaterial, type MaterialAccess } from './materials.ts'

export const MATERIALS_ROUTE = '/lawyer-materials'
export function createMaterialsHandler(access: MaterialAccess) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    res.setHeader('cache-control', 'no-store')
    res.setHeader('x-content-type-options', 'nosniff')
    res.setHeader('referrer-policy', 'no-referrer')
    try {
      if (req.method !== 'GET') { res.setHeader('allow', 'GET'); throw new MaterialError(405, '材料入口只允许读取') }
      // The host webserver owns authentication. This additional check refuses browser cross-origin reads.
      const host = req.headers.host
      const origin = req.headers.origin
      if (!host || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname) || req.headers['sec-fetch-site'] === 'cross-site' || (origin !== undefined && new URL(origin).host !== host)) throw new MaterialError(403, '请求来源不允许')
      const url = new URL(req.url ?? '', 'http://materials.invalid')
      if (!['/lawyer-materials/list', '/lawyer-materials/preview'].includes(url.pathname)) throw new MaterialError(404, '没有此材料操作')
      if ([...url.searchParams.keys()].some(k => !['sessionId', 'path'].includes(k)) || url.searchParams.getAll('sessionId').length !== 1 || url.searchParams.getAll('path').length > 1) throw new MaterialError(400, '材料请求无效')
      const session = url.searchParams.get('sessionId') ?? ''
      const path = url.searchParams.get('path') ?? ''
      if (url.pathname.endsWith('/list')) {
        const data = await listMaterials(access, session, path)
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(data))
      } else {
        const data = await previewMaterial(access, session, path)
        res.writeHead(200, {
          'content-type': data.type,
          'content-length': data.body.length,
          'content-security-policy': "sandbox; default-src 'none'; frame-ancestors 'self'",
        })
        res.end(data.body)
      }
    } catch (error) {
      const status = error instanceof MaterialError ? error.status : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 403
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: error instanceof MaterialError ? error.message : '材料不可访问' }))
    }
  }
}
