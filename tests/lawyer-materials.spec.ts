/** Real filesystem and local HTTP security checks; no production services. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import { createMaterialsHandler } from '../src/lawyer/routes.ts'
import { listMaterials, previewMaterial, type MaterialAccess } from '../src/lawyer/materials.ts'
let root: string; let outside: string; let server: Server; let base: string; let access: MaterialAccess
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'lawyer-materials-'))
  outside = await mkdtemp(join(tmpdir(), 'lawyer-outside-'))
  await writeFile(join(root, '证据.txt'), '真实工作区材料')
  await writeFile(join(root, '合同.pdf'), '%PDF-1.7\nfixture')
  await writeFile(join(root, '合同.docx'), 'office fixture')
  await writeFile(join(root, 'script.html'), '<script>alert(1)</script>')
  await writeFile(join(root, '.credentials.yaml'), 'secret')
  await writeFile(join(outside, 'private.txt'), 'not a case material')
  await mkdir(join(root, 'protected'))
  await writeFile(join(root, 'protected/secret.txt'), 'product secret')
  access = {
    sessions: { get: id => id === 'session-a' ? { header: { cwd: root } } : id === 'session-b' ? { header: { cwd: outside } } : undefined },
    assertFileAccess: path => { if (path.includes('/protected')) throw new Error('product policy refusal') },
  }
  server = createServer(createMaterialsHandler(access))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('missing test port')
  base = `http://127.0.0.1:${address.port}`
})
afterEach(async () => {
  await new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(e => e ? reject(e) : resolve()) })
  await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true })
})
const url = (path: string, sessionId = 'session-a') => `${base}/lawyer-materials/preview?${new URLSearchParams({ sessionId, path })}`
describe('managed material reads', () => {
  it('discovers actual materials, excludes hidden/active/protected entries and reads text/PDF', async () => {
    const list = await listMaterials(access, 'session-a', '')
    expect(list.items.map(i => i.name)).toEqual(['合同.docx', '合同.pdf', '证据.txt'])
    const response = await fetch(url('证据.txt'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('真实工作区材料')
    expect((await fetch(url('合同.pdf'))).headers.get('content-type')).toBe('application/pdf')
  })
  it('rejects nonexistent/forged session, missing cwd and client cwd', async () => {
    expect((await fetch(url('证据.txt', 'forged'))).status).toBe(404)
    expect((await fetch(url('证据.txt', '../session-a'))).status).toBe(404)
    expect((await fetch(`${url('证据.txt')}&cwd=${encodeURIComponent(outside)}`)).status).toBe(400)
    const noCwd = { ...access, sessions: { get: () => ({ header: {} }) } }
    await expect(listMaterials(noCwd, 'session-a', '')).rejects.toMatchObject({ status: 404 })
  })
  it('denies traversal, absolute paths, symlink files/directories and protected files', async () => {
    await symlink(join(outside, 'private.txt'), join(root, 'linked.txt'))
    await symlink(outside, join(root, 'linked-directory'))
    for (const path of ['../private.txt', join(outside, 'private.txt'), 'linked.txt', 'linked-directory/private.txt', 'protected/secret.txt', '.credentials.yaml', '..\\private.txt']) {
      expect((await fetch(url(path))).status, path).toBe(403)
    }
  })
  it('does not allow reading a different workspace using another session cwd', async () => {
    expect((await fetch(url('private.txt'))).status).toBe(404)
    expect(await (await fetch(url('private.txt', 'session-b'))).text()).toBe('not a case material')
  })
  it('refuses all write methods and all unregistered operations', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) expect((await fetch(url('证据.txt'), { method })).status).toBe(405)
    for (const operation of ['fs.write', 'fs.remove', 'fs.rename', 'terminal', 'git', 'settings', 'sidechat', 'jobs', 'browser']) {
      expect((await fetch(`${base}/lawyer-materials/${operation}?sessionId=session-a`)).status).toBe(404)
    }
    expect((await fetch(`${base}/sidebar/?method=fs.write`)).status).toBe(404)
  })
  it('refuses cross-site and cross-origin browser reads', async () => {
    expect((await fetch(url('证据.txt'), { headers: { origin: 'https://evil.example' } })).status).toBe(403)
    expect((await fetch(url('证据.txt'), { headers: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403)
  })
  it('refuses active formats, false PDFs and oversized previews', async () => {
    expect((await fetch(url('script.html'))).status).toBe(415)
    expect((await fetch(url('合同.docx'))).status).toBe(415)
    await writeFile(join(root, 'fake.pdf'), '<html>not PDF</html>')
    expect((await fetch(url('fake.pdf'))).status).toBe(415)
    await writeFile(join(root, 'large.txt'), Buffer.alloc(512 * 1024 + 1, 'a'))
    await expect(previewMaterial(access, 'session-a', 'large.txt')).rejects.toMatchObject({ status: 413 })
  })
})
