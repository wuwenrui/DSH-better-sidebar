#!/usr/bin/env node
/** Build audited, self-contained LawyerDesk artifact without changing upstream packaging. */
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
const root = fileURLToPath(new URL('..', import.meta.url))
const output = join(root, 'dist/lawyer')
const directory = join(output, 'package')
await rm(output, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
function run(file, args, cwd = root) {
  const result = spawnSync(file, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) throw new Error(`Failed ${file} (${result.status})`)
}
run(resolve(root, 'node_modules/.bin/tsdown'), ['--config', 'tsdown.lawyer.config.ts'])
const manifest = {
  name: 'dsh-better-sidebar', version: '0.19.1-lawyer.1', type: 'module', license: 'MIT',
  description: 'LawyerDesk 受管材料：会话工作区只读列举、预览与引用',
  main: './lib/index.js', exports: { '.': './lib/index.js', './lawyer': './lib/index.js', './client': './lib/client.js', './package.json': './package.json' },
  files: ['lib', 'cordis.patch.yml', 'LICENSE', 'README.md'],
  peerDependencies: { '@deepseek-ai/dsh-product-policy': '0.1.5-rc.2' },
  dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-sidebar-right'] } },
}
await writeFile(join(directory, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
await writeFile(join(directory, 'cordis.patch.yml'), '- insert:\n    - id: lawyer-materials\n      name: dsh-better-sidebar\n')
await copyFile(join(root, 'LICENSE'), join(directory, 'LICENSE'))
await copyFile(join(root, 'docs/lawyer-materials.md'), join(directory, 'README.md'))
for (const file of ['index.js', 'client.js']) {
  const source = await readFile(join(directory, 'lib', file), 'utf8')
  if (/node-pty|node:child_process|new WebSocket|terminal_create|git\.stage|sidechat\.start|\/sidebar\//.test(source)) throw new Error(`Forbidden capability in ${file}`)
}
run('npm', ['pack', '--ignore-scripts', '--pack-destination', output], directory)
const artifact = join(output, 'dsh-better-sidebar-0.19.1-lawyer.1.tgz')
const bytes = await readFile(artifact)
console.log(JSON.stringify({ artifact, manifest: join(directory, 'package.json'), sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length }))
