/** A quiet document shelf, not a developer explorer. State is scoped to the mounted session. */
import { useEffect, useState } from 'react'
import type { Material } from '../materials.ts'
import { materialResponse, type MaterialList } from './api.ts'

export interface MaterialsProps { sessionId: string; onReference(path: string): boolean }
const LABELS: Record<Material['kind'], string> = { folder: '目录', pdf: 'PDF', image: '图片', text: '文本', office: '办公文档' }
export function Materials(props: MaterialsProps) {
  return <MaterialShelf key={props.sessionId} {...props} />
}
function MaterialShelf({ sessionId, onReference }: MaterialsProps) {
  const [path, setPath] = useState('')
  const [revision, refresh] = useState(0)
  const [listing, setListing] = useState<MaterialList>()
  const [selected, select] = useState<Material>()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    setListing(undefined); setError(''); setNotice('')
    materialResponse('list', sessionId, path, abort.signal).then(r => r.json()).then((data: MaterialList) => {
      if (!abort.signal.aborted) setListing(data)
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [sessionId, path, revision])
  const navigate = (value: string) => { setPath(value); select(undefined); setQuery('') }
  return <section className="lawyer-materials" aria-label="本会话材料" data-lawyer-materials>
    <header><div><strong>本会话材料</strong><p>来自当前工作区 · 只读查看</p></div><button aria-label="刷新材料" onClick={() => { select(undefined); refresh(n => n + 1) }}>刷新</button></header>
    <nav aria-label="材料位置"><button onClick={() => navigate('')} disabled={!path}>全部材料</button>{path && <><span> / {path}</span><button onClick={() => navigate(path.split('/').slice(0, -1).join('/'))}>返回上层</button></>}</nav>
    <input type="search" aria-label="筛选当前目录材料" placeholder="按材料名称筛选" value={query} onChange={e => setQuery(e.target.value)} />
    {error && <p role="alert">{error}</p>}
    {!listing && !error && <p role="status">正在查找材料…</p>}
    {listing && <div className="lm-list" aria-label="材料列表">
      {listing.items.filter(item => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item => <button key={item.path} className="lm-row" aria-pressed={selected?.path === item.path} onClick={() => item.kind === 'folder' ? navigate(item.path) : select(item)}>
        <span className="lm-kind">{LABELS[item.kind]}</span><span className="lm-name">{item.name}</span><span aria-hidden="true">{item.kind === 'folder' ? '›' : '查看'}</span>
      </button>)}
      {listing.items.length === 0 && <p>此目录暂无可查看材料。将材料放入当前工作区后刷新。</p>}
      {listing.items.length > 0 && !listing.items.some(item => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p>没有匹配的材料。</p>}
      {listing.limited && <p>目录内容较多，仅显示部分材料。请进入具体目录查看。</p>}
    </div>}
    {selected && <section className="lm-preview" aria-label="材料预览"><div className="lm-preview-heading"><strong>{selected.name}</strong><button onClick={() => { try { setNotice(onReference(selected.path) ? '已引用到输入框，发送前可以继续补充问题。' : '引用失败，请确认会话输入框已就绪。') } catch { setNotice('引用失败，请重试。') } }}>引用到对话</button></div><Preview key={`${sessionId}:${selected.path}:${revision}`} sessionId={sessionId} material={selected} /></section>}
    {notice && <p role="status">{notice}</p>}
  </section>
}
function Preview({ sessionId, material }: { sessionId: string; material: Material }) {
  const [text, setText] = useState<string>()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (material.kind === 'office') return
    const abort = new AbortController(); let blobUrl = ''
    materialResponse('preview', sessionId, material.path, abort.signal).then(async response => {
      if (material.kind === 'text') { const value = await response.text(); if (!abort.signal.aborted) setText(value) }
      else { const blob = await response.blob(); if (!abort.signal.aborted) { blobUrl = URL.createObjectURL(blob); setUrl(blobUrl) } }
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => { abort.abort(); if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [sessionId, material.path, material.kind])
  if (material.kind === 'office') return <p>此办公文档不提供内嵌预览。请引用到对话处理，或使用 LawyerDesk 已有的本机办公应用打开入口。</p>
  if (error) return <p role="alert">{error}</p>
  if (material.kind === 'text' && text !== undefined) return <pre>{text}</pre>
  if (url && material.kind === 'image') return <img src={url} alt={material.name} />
  if (url && material.kind === 'pdf') return <iframe src={url} title={`预览 ${material.name}`} />
  return <p role="status">正在读取预览…</p>
}
