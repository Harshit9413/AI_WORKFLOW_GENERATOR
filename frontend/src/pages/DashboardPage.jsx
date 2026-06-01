import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearToken } from '../api'

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function cleanTitle(raw) {
  return (raw || '').replace(/^[-\s`*"']+/, '').replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/^\s*-+\s*/, '').trim() || raw
}

const ACCENTS = [
  { bg: '#0a1628', node: '#1d4ed8', line: '#3b82f6', dot: '#93c5fd' },
  { bg: '#061410', node: '#065f46', line: '#10b981', dot: '#6ee7b7' },
  { bg: '#120a24', node: '#6d28d9', line: '#8b5cf6', dot: '#c4b5fd' },
  { bg: '#180f00', node: '#92400e', line: '#f59e0b', dot: '#fcd34d' },
  { bg: '#031018', node: '#0e7490', line: '#06b6d4', dot: '#67e8f9' },
  { bg: '#150310', node: '#9d174d', line: '#ec4899', dot: '#f9a8d4' },
]

/* ── Diagram thumbnail ────────────────────────────────────────────────────── */
function DiagramThumb({ index, nodeCount, edgeCount, isHovered }) {
  const acc = ACCENTS[index % ACCENTS.length]
  const count = Math.min(Math.max(nodeCount || 3, 3), 5)
  const nodes = [
    { x: 18,  y: 36, w: 46, h: 22, label: 'API'   },
    { x: 88,  y: 18, w: 42, h: 20, label: 'DB'     },
    { x: 88,  y: 54, w: 46, h: 20, label: 'Cache'  },
    { x: 160, y: 36, w: 42, h: 22, label: 'CDN'    },
    { x: 124, y: 74, w: 46, h: 20, label: 'Queue'  },
  ].slice(0, count)
  const edges = [[0,1],[0,2],[1,3],[2,3],[2,4]].slice(0, Math.max(edgeCount || 2, 2))

  return (
    <div style={{
      position: 'relative', height: 110, background: acc.bg,
      borderRadius: '11px 11px 0 0', overflow: 'hidden',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 220 100"
        preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id={`dots${index}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill={acc.dot} fillOpacity="0.18"/>
          </pattern>
        </defs>
        <rect width="220" height="100" fill={`url(#dots${index})`}/>
        {edges.map(([a,b], i) => nodes[a] && nodes[b] ? (
          <line key={i}
            x1={nodes[a].x + nodes[a].w} y1={nodes[a].y + nodes[a].h/2}
            x2={nodes[b].x}              y2={nodes[b].y + nodes[b].h/2}
            stroke={acc.line} strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="5,3"/>
        ) : null)}
        {nodes.map((n, i) => (
          <g key={i}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="5"
              fill={acc.node} fillOpacity={i===0 ? 0.75 : 0.5}
              stroke={acc.line} strokeOpacity="0.55" strokeWidth="1"/>
            <text x={n.x+n.w/2} y={n.y+n.h/2+3.5} textAnchor="middle"
              fill={acc.dot} fontSize="8" fontFamily="system-ui" fontWeight="700">{n.label}</text>
          </g>
        ))}
      </svg>

      {/* hover overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '11px 11px 0 0',
        background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.02em',
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 7, padding: '6px 18px', backdropFilter: 'blur(8px)',
        }}>Open →</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 7, left: 9,
        background: 'rgba(0,0,0,0.55)', borderRadius: 20,
        padding: '2px 8px', fontSize: 9.5, color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>{nodeCount||0} nodes · {edgeCount||0} edges</div>
    </div>
  )
}

/* ── Context menu ─────────────────────────────────────────────────────────── */
function ContextMenu({ onNavigate, onRename, onDuplicate, onShare, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc   = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const items = [
    { icon: '↗', label: 'Open',            action: onNavigate },
    { icon: '✎', label: 'Rename',          action: onRename },
    { icon: '⧉', label: 'Duplicate',       action: onDuplicate },
    { icon: '🔗', label: 'Copy share link', action: onShare },
    null,
    { icon: '🗑', label: 'Delete',          action: onDelete, danger: true },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }} title="More options"
        style={{
          width: 28, height: 28, borderRadius: 6,
          border: `1px solid ${open ? '#334155' : 'rgba(255,255,255,0.08)'}`,
          background: open ? '#1e293b' : 'rgba(255,255,255,0.04)',
          color: '#94a3b8', cursor: 'pointer', fontSize: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>⋯</button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 300,
          background: '#0f1825', border: '1px solid #1e2d3d',
          borderRadius: 10, minWidth: 178, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        }}>
          <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e2d3d', fontSize: 9, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Actions</div>
          {items.map((item, i) => item === null ? (
            <div key={i} style={{ height: 1, background: '#1e2d3d', margin: '2px 0' }}/>
          ) : (
            <button key={i}
              onClick={e => { e.stopPropagation(); setOpen(false); item.action(e) }}
              onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                color: item.danger ? '#f87171' : '#cbd5e1',
                padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background 0.12s',
              }}>
              <span style={{ width: 14, opacity: 0.7, fontSize: 12 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Star button ──────────────────────────────────────────────────────────── */
function StarBtn({ id, starred, onToggle, visible }) {
  const active = starred.includes(id)
  return (
    <button onClick={e => { e.stopPropagation(); onToggle(id) }} title={active ? 'Unstar' : 'Star'}
      style={{
        width: 28, height: 28, borderRadius: 6,
        border: `1px solid ${active ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
        background: active ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
        color: active ? '#fbbf24' : '#475569', cursor: 'pointer', fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: active || visible ? 1 : 0,
        transform: active ? 'scale(1.1)' : visible ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
      }}>{active ? '★' : '☆'}</button>
  )
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ background: '#0c1520', border: '1px solid #1a2642', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 110, background: 'linear-gradient(90deg,#0c1520 25%,#111e30 50%,#0c1520 75%)', backgroundSize: '300% 100%', animation: 'shimmer 1.6s ease infinite' }}/>
      <div style={{ padding: '14px 14px 16px' }}>
        <div style={{ height: 12, background: '#1a2642', borderRadius: 6, width: '70%', marginBottom: 10, animation: 'shimmer 1.6s ease infinite' }}/>
        <div style={{ height: 10, background: '#1a2642', borderRadius: 6, width: '42%', animation: 'shimmer 1.6s ease infinite' }}/>
      </div>
    </div>
  )
}

/* ── Grid card ────────────────────────────────────────────────────────────── */
function GridCard({ wf, index, starred, isHovered, onHover, onLeave,
  onNavigate, onRename, onDuplicate, onShare, onDelete, onToggleStar,
  renamingId, renameValue, setRenameValue, onCommitRename, onCancelRename }) {
  const renaming = renamingId === wf.id
  const ref = useRef(null)
  useEffect(() => { if (renaming && ref.current) { ref.current.focus(); ref.current.select() } }, [renaming])

  return (
    <div onClick={() => !renaming && onNavigate()} onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{
        background: isHovered ? '#0f1e2e' : '#0a1420',
        border: `1px solid ${isHovered ? '#2a4060' : '#1a2642'}`,
        borderRadius: 12, cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-3px)' : 'none',
        boxShadow: isHovered ? '0 16px 40px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
      }}>
      <DiagramThumb index={index} nodeCount={wf.node_count} edgeCount={wf.edge_count} isHovered={isHovered}/>

      <div style={{ padding: '12px 13px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
          {renaming ? (
            <input ref={ref} value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={onCommitRename}
              onKeyDown={e => { if (e.key==='Enter') onCommitRename(); if (e.key==='Escape') onCancelRename() }}
              onClick={e => e.stopPropagation()}
              style={{ flex:1, background:'#060f1a', border:'1.5px solid #3b82f6', borderRadius:6, padding:'4px 8px', fontSize:13, fontWeight:600, color:'#f1f5f9', outline:'none', boxSizing:'border-box' }}
            />
          ) : (
            <div onDoubleClick={e => { e.stopPropagation(); onRename(e) }} title="Double-click to rename"
              style={{ flex:1, fontSize:13, fontWeight:600, color: isHovered ? '#e2e8f0' : '#8bacc4', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.5, transition:'color 0.2s' }}>
              {cleanTitle(wf.title)}
            </div>
          )}
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            <StarBtn id={wf.id} starred={starred} onToggle={onToggleStar} visible={isHovered}/>
            <div style={{ opacity: isHovered ? 1 : 0, transition:'opacity 0.15s' }}>
              <ContextMenu onNavigate={onNavigate} onRename={onRename} onDuplicate={onDuplicate} onShare={onShare} onDelete={onDelete}/>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11 }}>
          <span style={{ background:'rgba(59,130,246,0.12)', color:'#60a5fa', borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:600 }}>Architecture</span>
          <span style={{ color:'#1e3a5f' }}>·</span>
          <span style={{ color:'#2a4060', fontSize:11 }}>{timeAgo(wf.updated_at)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── List row ─────────────────────────────────────────────────────────────── */
function ListRow({ wf, index, starred, isHovered, onHover, onLeave,
  onNavigate, onRename, onDuplicate, onShare, onDelete, onToggleStar,
  renamingId, renameValue, setRenameValue, onCommitRename, onCancelRename }) {
  const acc = ACCENTS[index % ACCENTS.length]
  const renaming = renamingId === wf.id
  const ref = useRef(null)
  useEffect(() => { if (renaming && ref.current) { ref.current.focus(); ref.current.select() } }, [renaming])

  return (
    <div onClick={() => !renaming && onNavigate()} onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:9, cursor:'pointer',
        background: isHovered ? '#0a1420' : 'transparent',
        border: `1px solid ${isHovered ? '#1a2642' : 'transparent'}`,
        transition:'all 0.15s',
      }}>
      <div style={{ width:40, height:40, borderRadius:8, flexShrink:0, background:acc.bg, border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' }}>
        <svg width="40" height="40" viewBox="0 0 40 40">
          <rect width="40" height="40" fill={acc.bg}/>
          <rect x="5" y="12" width="13" height="8" rx="2.5" fill={acc.node} fillOpacity="0.7" stroke={acc.line} strokeOpacity="0.5" strokeWidth="0.8"/>
          <rect x="22" y="7"  width="12" height="8" rx="2.5" fill={acc.node} fillOpacity="0.5" stroke={acc.line} strokeOpacity="0.35" strokeWidth="0.7"/>
          <rect x="22" y="21" width="12" height="8" rx="2.5" fill={acc.node} fillOpacity="0.5" stroke={acc.line} strokeOpacity="0.35" strokeWidth="0.7"/>
          <line x1="18" y1="16" x2="22" y2="11" stroke={acc.line} strokeOpacity="0.4" strokeWidth="0.8"/>
          <line x1="18" y1="17" x2="22" y2="25" stroke={acc.line} strokeOpacity="0.3" strokeWidth="0.8"/>
        </svg>
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        {renaming ? (
          <input ref={ref} value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={onCommitRename}
            onKeyDown={e => { if (e.key==='Enter') onCommitRename(); if (e.key==='Escape') onCancelRename() }}
            onClick={e => e.stopPropagation()}
            style={{ background:'#060f1a', border:'1.5px solid #3b82f6', borderRadius:5, padding:'3px 7px', fontSize:13, fontWeight:600, color:'#f1f5f9', outline:'none', width:'100%', boxSizing:'border-box' }}
          />
        ) : (
          <div onDoubleClick={e => { e.stopPropagation(); onRename(e) }}
            style={{ fontSize:13, fontWeight:600, color: isHovered ? '#e2e8f0' : '#5a7a99', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'color 0.2s' }}>
            {cleanTitle(wf.title)}
          </div>
        )}
        <div style={{ display:'flex', gap:6, marginTop:3, alignItems:'center' }}>
          <span style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:600 }}>Architecture</span>
          <span style={{ fontSize:10, color:'#1e3a5f' }}>{wf.node_count} nodes</span>
        </div>
      </div>

      <span style={{ fontSize:11, color:'#1e3a5f', flexShrink:0, width:64, textAlign:'right' }}>{timeAgo(wf.updated_at)}</span>
      <div style={{ display:'flex', gap:4, flexShrink:0, opacity: isHovered ? 1 : 0, transition:'opacity 0.15s' }} onClick={e => e.stopPropagation()}>
        <StarBtn id={wf.id} starred={starred} onToggle={onToggleStar} visible={isHovered}/>
        <ContextMenu onNavigate={onNavigate} onRename={onRename} onDuplicate={onDuplicate} onShare={onShare} onDelete={onDelete}/>
      </div>
    </div>
  )
}

/* ── New card ─────────────────────────────────────────────────────────────── */
function NewCard({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        border: `1.5px dashed ${hov ? '#3b82f6' : '#1a2642'}`,
        borderRadius: 12, minHeight: 192,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:10, cursor:'pointer',
        background: hov ? 'rgba(59,130,246,0.04)' : 'transparent',
        transition:'all 0.18s',
      }}>
      <div style={{
        width:44, height:44, borderRadius:12,
        background: hov ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hov ? 'rgba(59,130,246,0.35)' : '#1a2642'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22, color: hov ? '#60a5fa' : '#1e3a5f', transition:'all 0.18s',
      }}>+</div>
      <span style={{ fontSize:12, fontWeight:600, color: hov ? '#60a5fa' : '#1e3a5f', transition:'color 0.18s' }}>New Diagram</span>
      <span style={{ fontSize:10, color: hov ? '#3b82f6' : 'transparent', transition:'color 0.18s' }}>Describe your system to AI →</span>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState([])
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [sort, setSort]           = useState('newest')
  const [view, setView]           = useState('grid')
  const [navActive, setNavActive] = useState('all')
  const [hoveredId, setHoveredId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [starred, setStarred] = useState(() => { try { return JSON.parse(localStorage.getItem('wf_starred')||'[]') } catch { return [] } })
  const [toast, setToast] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    Promise.all([api.listWorkflows(), api.me()])
      .then(([wfs, u]) => { setWorkflows(wfs); setUser(u) })
      .catch(() => flash('Failed to load', 'err'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const h = e => { if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); searchRef.current?.focus() } }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  function flash(msg, type='ok') { setToast({msg,type}); setTimeout(()=>setToast(null),2600) }

  const toggleStar = useCallback(id => {
    setStarred(prev => { const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]; localStorage.setItem('wf_starred',JSON.stringify(next)); return next })
  }, [])

  const handleDelete = useCallback(async (wf, e) => {
    e?.stopPropagation()
    if (!window.confirm(`Delete "${cleanTitle(wf.title)}"?`)) return
    await api.deleteWorkflow(wf.id)
    setWorkflows(p => p.filter(w => w.id!==wf.id))
    flash('Deleted')
  }, [])

  const handleDuplicate = useCallback(async (wf, e) => {
    e?.stopPropagation()
    try { const n = await api.duplicateWorkflow(wf.id); setWorkflows(p=>[n,...p]); flash('Duplicated') }
    catch { flash('Duplicate failed','err') }
  }, [])

  const handleShare = useCallback(async (wf, e) => {
    e?.stopPropagation()
    await navigator.clipboard.writeText(`${window.location.origin}/share/${wf.share_token}`)
    flash('Share link copied!')
  }, [])

  const startRename = useCallback((wf, e) => {
    e?.stopPropagation(); setRenamingId(wf.id); setRenameValue(wf.title)
  }, [])

  const commitRename = useCallback(async (wf) => {
    const t = renameValue.trim()
    if (!t||t===wf.title) { setRenamingId(null); return }
    try { await api.renameWorkflow(wf.id,t); setWorkflows(p=>p.map(w=>w.id===wf.id?{...w,title:t}:w)); flash('Renamed') }
    catch { flash('Rename failed','err') }
    setRenamingId(null)
  }, [renameValue])

  const filtered = workflows
    .filter(wf => navActive==='starred' ? starred.includes(wf.id) : wf.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sort==='newest') return new Date(b.updated_at)-new Date(a.updated_at)
      if (sort==='oldest') return new Date(a.updated_at)-new Date(b.updated_at)
      if (sort==='az')     return a.title.localeCompare(b.title)
      if (sort==='za')     return b.title.localeCompare(a.title)
      return 0
    })

  const cardProps = wf => ({
    wf, starred, isHovered: hoveredId===wf.id,
    onHover: () => setHoveredId(wf.id), onLeave: () => setHoveredId(null),
    onNavigate:  () => navigate(`/workflow/${wf.id}`),
    onRename:    e => startRename(wf,e),
    onDuplicate: e => handleDuplicate(wf,e),
    onShare:     e => handleShare(wf,e),
    onDelete:    e => handleDelete(wf,e),
    onToggleStar: toggleStar,
    renamingId, renameValue, setRenameValue,
    onCommitRename: () => commitRename(wf),
    onCancelRename: () => setRenamingId(null),
  })

  const NAV = [
    { key:'all',     icon:'⊞', label:'All Diagrams', count: workflows.length },
    { key:'starred', icon:'⭐', label:'Starred',      count: starred.length||null },
  ]

  return (
    <div style={{ display:'flex', height:'100vh', background:'#080f1a', fontFamily:"'Inter',system-ui,sans-serif", color:'#f1f5f9', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width:220, flexShrink:0, background:'#09111e', borderRight:'1px solid #111e30', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 }}>
        {/* Logo */}
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #111e30' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 2px 12px rgba(37,99,235,0.35)' }}>🗺️</div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px' }}>Diagramify</div>
              <div style={{ fontSize:10, color:'#1e3a5f', letterSpacing:'0.04em' }}>AI Architecture</div>
            </div>
          </div>
        </div>

        {/* New button */}
        <div style={{ padding:'12px 12px 6px' }}>
          <button onClick={() => navigate('/workflow')} style={{
            width:'100%', background:'linear-gradient(135deg,#2563eb,#7c3aed)',
            color:'white', border:'none', borderRadius:8, padding:'9px 14px',
            fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:8,
            boxShadow:'0 4px 14px rgba(37,99,235,0.3)',
          }}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span> New Diagram
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding:'6px 8px', flex:1 }}>
          {NAV.map(item => {
            const active = navActive===item.key
            return (
              <button key={item.key} onClick={() => setNavActive(item.key)} style={{
                width:'100%',
                background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: active ? '#93c5fd' : '#3d5a7a',
                border: `1px solid ${active ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
                borderRadius:7, padding:'8px 10px', fontSize:13,
                cursor:'pointer', textAlign:'left',
                display:'flex', alignItems:'center', gap:9, marginBottom:2,
                fontWeight: active ? 600 : 400,
                transition:'all 0.15s',
              }}
                onMouseEnter={e => { if(!active){e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.color='#607a99'} }}
                onMouseLeave={e => { if(!active){e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#3d5a7a'} }}
              >
                <span style={{ fontSize:13, width:16, textAlign:'center' }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {item.count > 0 && (
                  <span style={{ fontSize:10, fontWeight:600, background: active?'rgba(59,130,246,0.2)':'rgba(255,255,255,0.05)', color: active?'#93c5fd':'#1e3a5f', borderRadius:20, padding:'1px 7px' }}>{item.count}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid #111e30' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#2563eb,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
              {user?.email?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email?.split('@')[0]||''}</div>
              <div style={{ fontSize:10, color:'#1e3a5f' }}>Free plan</div>
            </div>
            <button onClick={() => { clearToken(); navigate('/login') }} title="Logout"
              style={{ background:'transparent', border:'1px solid #111e30', borderRadius:5, color:'#1e3a5f', cursor:'pointer', fontSize:13, padding:'4px 8px', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color='#1e3a5f'; e.currentTarget.style.borderColor='#111e30' }}
            >↪</button>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* Topbar */}
        <div style={{ background:'#080f1a', borderBottom:'1px solid #111e30', padding:'0 24px', height:52, display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
          <div style={{ position:'relative', flex:1, maxWidth:440 }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#1e3a5f', fontSize:13, pointerEvents:'none' }}>🔍</span>
            <input ref={searchRef} placeholder="Search diagrams..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', background:'#0c1520', border:'1px solid #111e30', borderRadius:8, padding:'8px 72px 8px 36px', fontSize:13, color:'#d1d5db', outline:'none', boxSizing:'border-box', transition:'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor='#2563eb'}
              onBlur={e  => e.target.style.borderColor='#111e30'}
            />
            {search ? (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.06)', border:'none', color:'#64748b', cursor:'pointer', fontSize:12, padding:'2px 7px', borderRadius:4 }}>✕</button>
            ) : (
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'#1a3050', border:'1px solid #111e30', borderRadius:4, padding:'2px 6px', pointerEvents:'none' }}>⌘K</span>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ background:'#0c1520', border:'1px solid #111e30', borderRadius:7, padding:'7px 10px', fontSize:12, color:'#4b6080', cursor:'pointer', outline:'none' }}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>
            <div style={{ display:'flex', background:'#0c1520', border:'1px solid #111e30', borderRadius:7, overflow:'hidden' }}>
              {[{k:'grid',i:'⊞',t:'Grid view'},{k:'list',i:'☰',t:'List view'}].map(v => (
                <button key={v.k} title={v.t} onClick={() => setView(v.k)} style={{
                  background: view===v.k ? '#111e30' : 'transparent',
                  color: view===v.k ? '#d1d5db' : '#2a4060',
                  border:'none', padding:'6px 12px', fontSize:15, cursor:'pointer', transition:'all 0.15s',
                }}>{v.i}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'22px 24px' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:18 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'#94a3b8', margin:0, letterSpacing:'-0.2px' }}>
              {{all:'All Diagrams', starred:'Starred'}[navActive]}
            </h2>
            {!loading && filtered.length>0 && (
              <span style={{ fontSize:12, color:'#1a3050', fontWeight:500 }}>
                {search ? `${filtered.length} of ${workflows.length}` : filtered.length}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(228px,1fr))', gap:14 }}>
              {[1,2,3,4,5,6].map(i=><SkeletonCard key={i}/>)}
            </div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'80px 0' }}>
              <svg width="130" height="100" viewBox="0 0 130 100" style={{ opacity:0.12, display:'block', margin:'0 auto 20px' }}>
                <rect x="8"  y="28" width="32" height="20" rx="5" fill="#3b82f6"/>
                <rect x="54" y="14" width="28" height="20" rx="5" fill="#7c3aed"/>
                <rect x="54" y="50" width="28" height="20" rx="5" fill="#0891b2"/>
                <rect x="96" y="32" width="26" height="20" rx="5" fill="#059669"/>
                <line x1="40" y1="38" x2="54" y2="24" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,3"/>
                <line x1="40" y1="40" x2="54" y2="60" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,3"/>
                <line x1="82" y1="24" x2="96" y2="38" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,3"/>
                <line x1="82" y1="60" x2="96" y2="44" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4,3"/>
              </svg>
              {search ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'#475569', margin:'0 0 6px' }}>No results for "{search}"</p>
                  <button onClick={() => setSearch('')} style={{ marginTop:16, background:'transparent', border:'1px solid #1a2642', color:'#60a5fa', borderRadius:7, padding:'7px 16px', fontSize:12, cursor:'pointer' }}>Clear search</button>
                </>
              ) : navActive==='starred' ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'#475569', margin:'0 0 6px' }}>No starred diagrams</p>
                  <p style={{ fontSize:13, color:'#1e3a5f', margin:0 }}>Click ☆ on any diagram card to star it</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize:16, fontWeight:700, color:'#475569', margin:'0 0 8px' }}>No diagrams yet</p>
                  <p style={{ fontSize:13, color:'#1e3a5f', margin:'0 0 24px', lineHeight:1.7 }}>Describe any system in plain English —<br/>AI generates the architecture diagram</p>
                  <button onClick={() => navigate('/workflow')} style={{ background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'white', border:'none', borderRadius:9, padding:'11px 26px', fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 18px rgba(37,99,235,0.35)' }}>+ Create your first diagram</button>
                </>
              )}
            </div>
          ) : view==='grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(228px,1fr))', gap:14 }}>
              {filtered.map((wf,i) => <GridCard key={wf.id} index={i} {...cardProps(wf)}/>)}
              {!search && navActive!=='starred' && <NewCard onClick={() => navigate('/workflow')}/>}
            </div>
          ) : (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 100px', padding:'3px 12px 6px', fontSize:10, color:'#1a3050', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700, borderBottom:'1px solid #111e30', marginBottom:4 }}>
                <span>Name</span><span style={{ textAlign:'right' }}>Modified</span><span/>
              </div>
              {filtered.map((wf,i) => <ListRow key={wf.id} index={i} {...cardProps(wf)}/>)}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
          background: toast.type==='err' ? '#1a0a0a' : '#0f1e30',
          border: `1px solid ${toast.type==='err' ? 'rgba(248,113,113,0.3)' : '#1a2e4a'}`,
          borderRadius:9, padding:'10px 20px', fontSize:13, color:'#e2e8f0',
          zIndex:9999, boxShadow:'0 8px 40px rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', gap:9, whiteSpace:'nowrap',
          animation:'fadeUp 0.25s ease',
        }}>
          <span style={{ color: toast.type==='err' ? '#f87171' : '#34d399', fontSize:15 }}>{toast.type==='err'?'⚠':'✓'}</span>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#111e30; border-radius:10px; }
        input::placeholder { color:#1e3a5f; }
        select option { background:#0c1520; color:#d1d5db; }
      `}</style>
    </div>
  )
}
