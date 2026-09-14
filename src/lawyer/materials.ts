/** Read-only material discovery. Never trusts a browser-supplied workspace. */
import { constants } from 'node:fs'
import { lstat, open, realpath, opendir } from 'node:fs/promises'
import { isAbsolute, join, relative, sep, extname } from 'node:path'

export interface Material { name: string; path: string; kind: 'folder' | 'pdf' | 'image' | 'text' | 'office'; size: number }
export interface MaterialAccess {
  sessions: { get(id: string): { header: { cwd?: string } } | undefined }
  assertFileAccess(path: string): void
}
export class MaterialError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const TYPES: Record<string, Material['kind']> = {
  '.pdf': 'pdf', '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.webp': 'image',
  '.txt': 'text', '.md': 'text', '.csv': 'text', '.log': 'text',
  '.doc': 'office', '.docx': 'office', '.xls': 'office', '.xlsx': 'office', '.ppt': 'office', '.pptx': 'office', '.rtf': 'office',
}
export const MIME: Record<string, string> = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
const MAX_ROWS = 500
const MAX_SCAN = 5000
const MAX_PREVIEW = 20 * 1024 * 1024
const MAX_TEXT = 512 * 1024
const HIDDEN = new Set(['node_modules', 'vendor', 'profiles', 'product-artifacts', 'product-pnpm-store'])
function safeName(name: string): boolean {
  // eslint-disable-next-line no-control-regex -- filenames containing controls are not safe material references
  return !name.startsWith('.') && !HIDDEN.has(name) && !/[\x00-\x1f\x7f]/.test(name)
}

/** Deny symlinks at every component, even inside the root; canonical containment is checked too. */
export async function resolveMaterial(access: MaterialAccess, sessionId: string, path: string): Promise<{ root: string; absolute: string; path: string }> {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(sessionId)) throw new MaterialError(404, '会话不存在或尚未就绪')
  const cwd = access.sessions.get(sessionId)?.header.cwd
  if (!cwd || !isAbsolute(cwd)) throw new MaterialError(404, '会话不存在或尚未就绪')
  if (isAbsolute(path) || path.includes('\\') || path.split('/').some(p => p === '..' || (p !== '' && p !== '.' && !safeName(p)))) throw new MaterialError(403, '只能查看本会话材料')
  const root = await realpath(cwd)
  access.assertFileAccess(root)
  let absolute = root
  for (const part of path.split('/').filter(p => p !== '' && p !== '.')) {
    absolute = join(absolute, part)
    access.assertFileAccess(absolute)
    if ((await lstat(absolute)).isSymbolicLink()) throw new MaterialError(403, '不允许通过链接访问材料')
  }
  absolute = await realpath(absolute)
  const rel = relative(root, absolute)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new MaterialError(403, '材料超出本会话范围')
  access.assertFileAccess(absolute)
  return { root, absolute, path: rel.split(sep).join('/') }
}

export async function listMaterials(access: MaterialAccess, sessionId: string, path: string) {
  const resolved = await resolveMaterial(access, sessionId, path)
  if (!(await lstat(resolved.absolute)).isDirectory()) throw new MaterialError(400, '请选择材料目录')
  const items: Material[] = []
  let scanned = 0; let limited = false
  const directory = await opendir(resolved.absolute)
  for await (const entry of directory) {
    if (++scanned > MAX_SCAN || items.length >= MAX_ROWS) { limited = true; break }
    if (!safeName(entry.name) || entry.isSymbolicLink()) continue
    const kind = entry.isDirectory() ? 'folder' : TYPES[extname(entry.name).toLowerCase()]
    if (!kind) continue
    const path = [resolved.path, entry.name].filter(Boolean).join('/')
    try {
      const child = await resolveMaterial(access, sessionId, path)
      const info = await lstat(child.absolute)
      if (!info.isDirectory() && !info.isFile()) continue
      items.push({ name: entry.name, path, kind, size: info.size })
    } catch { /* Inaccessible, protected or concurrently removed entries are not materials. */ }
  }
  items.sort((a, b) => Number(b.kind === 'folder') - Number(a.kind === 'folder') || a.name.localeCompare(b.name, 'zh-CN'))
  return { path: resolved.path, items, limited }
}

/** Reads a bounded regular file. HTML/SVG/Office are never served as active browser content. */
export async function previewMaterial(access: MaterialAccess, sessionId: string, path: string) {
  const resolved = await resolveMaterial(access, sessionId, path)
  const extension = extname(resolved.absolute).toLowerCase()
  const kind = TYPES[extension]
  if (!kind || kind === 'office') throw new MaterialError(415, '此格式请使用已安装的办公应用打开')
  const handle = await open(resolved.absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const info = await handle.stat()
    if (!info.isFile()) throw new MaterialError(403, '只能预览普通材料文件')
    // Revalidate after opening; the descriptor cannot be redirected by a later path replacement.
    const again = await resolveMaterial(access, sessionId, path)
    const current = await lstat(again.absolute)
    if (current.dev !== info.dev || current.ino !== info.ino) throw new MaterialError(409, '材料已变化，请刷新')
    if (info.size > (kind === 'text' ? MAX_TEXT : MAX_PREVIEW)) throw new MaterialError(413, '材料较大，请使用本机应用查看')
    const buffer = Buffer.alloc(Math.min(info.size + 1, MAX_PREVIEW + 1))
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    if (bytesRead > info.size) throw new MaterialError(409, '材料已变化，请刷新')
    const body = buffer.subarray(0, bytesRead)
    if (kind === 'pdf' && !body.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new MaterialError(415, '此文件不是有效的 PDF')
    if (kind === 'text' && body.includes(0)) throw new MaterialError(415, '此文件不是可预览的文本')
    return { body, type: MIME[extension] ?? 'text/plain; charset=utf-8' }
  } finally { await handle.close() }
}
