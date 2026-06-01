import { useEffect, useRef, useState } from 'react'
import { api, BASE_URL } from '../api'
import { renderMarkdown } from '../utils/markdown'

const S = {
  panel: { background: '#0a0f1a', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui', minWidth: 0, minHeight: 0, overflow: 'hidden', borderLeft: '1px solid #334155' },
  header: { padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: 13, fontWeight: 600, color: '#f1f5f9', flexShrink: 0 },
  messages: { flex: 1, minHeight: 0, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  emptyWrap: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyInner: { textAlign: 'center' },
  emptyIcon: { fontSize: 28, opacity: 0.15, marginBottom: 8 },
  emptyText: { fontSize: 12, color: '#334155' },
  msgUser: { alignSelf: 'flex-end', maxWidth: '90%' },
  msgBot: { alignSelf: 'flex-start', maxWidth: '100%', width: '100%' },
  label: { fontSize: 10, color: '#475569', marginBottom: 3 },
  inputBar: { padding: 12, borderTop: '1px solid #334155', display: 'flex', gap: 6, background: '#0f172a', flexShrink: 0 },
  input: { flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#f1f5f9', outline: 'none' },
  sendBtn: { background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  actionChip: { display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 10, marginTop: 6, marginRight: 4 },
}

// ── diagram action helpers ──────────────────────────────────────────────────

function nextNodeId() {
  return `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function nextNodePosition(nodes) {
  if (!nodes.length) return { x: 200, y: 200 }
  const maxX = Math.max(...nodes.map(n => n.position?.x ?? 0))
  const lastNode = nodes.find(n => (n.position?.x ?? 0) === maxX)
  return { x: maxX + 220, y: lastNode?.position?.y ?? 200 }
}

function applyActions(actions, nodes, edges, setNodes, setEdges, onLabelChange, onTypeChange, onDelete) {
  let ns = [...nodes]
  let es = [...edges]
  const applied = []

  for (const action of actions) {
    const findNode = (label) => ns.find(n =>
      (n.data?.label || '').toLowerCase() === label.toLowerCase()
    )

    if (action.type === 'add_node') {
      const exists = findNode(action.label)
      if (!exists) {
        const id = nextNodeId()
        const pos = nextNodePosition(ns)
        ns.push({
          id,
          type: 'default',
          position: pos,
          data: {
            label: action.label,
            node_type: action.node_type || 'service',
            icon_url: action.icon_url ? `${BASE_URL}${action.icon_url}` : null,
            onLabelChange,
            onTypeChange,
            onDelete,
          },
        })
        applied.push(`Added "${action.label}"`)
      }
    }

    else if (action.type === 'remove_node') {
      const node = findNode(action.label)
      if (node) {
        ns = ns.filter(n => n.id !== node.id)
        es = es.filter(e => e.source !== node.id && e.target !== node.id)
        applied.push(`Removed "${action.label}"`)
      }
    }

    else if (action.type === 'add_edge') {
      const src = findNode(action.from)
      const tgt = findNode(action.to)
      if (src && tgt) {
        const edgeId = `e${src.id}-${tgt.id}`
        if (!es.find(e => e.id === edgeId)) {
          es.push({ id: edgeId, source: src.id, target: tgt.id, label: action.label || '' })
          applied.push(`Connected ${action.from} → ${action.to}`)
        }
      }
    }

    else if (action.type === 'remove_edge') {
      const src = findNode(action.from)
      const tgt = findNode(action.to)
      if (src && tgt) {
        es = es.filter(e => !(e.source === src.id && e.target === tgt.id))
        applied.push(`Removed connection ${action.from} → ${action.to}`)
      }
    }

    else if (action.type === 'rename_node') {
      const node = findNode(action.old_label)
      if (node) {
        ns = ns.map(n => n.id === node.id
          ? {
              ...n,
              data: {
                ...n.data,
                label: action.new_label,
                ...(action.icon_url !== undefined ? { icon_url: action.icon_url ? `${BASE_URL}${action.icon_url}` : null } : {}),
              },
            }
          : n
        )
        applied.push(`Renamed "${action.old_label}" → "${action.new_label}"`)
      }
    }

    else if (action.type === 'replace_node') {
      const node = findNode(action.old_label)
      if (node) {
        ns = ns.map(n => n.id === node.id
          ? {
              ...n,
              data: {
                ...n.data,
                label: action.new_label,
                ...(action.node_type ? { node_type: action.node_type } : {}),
                icon_url: action.icon_url ? `${BASE_URL}${action.icon_url}` : null,
              },
            }
          : n
        )
        applied.push(`Replaced "${action.old_label}" → "${action.new_label}"`)
      }
    }
  }

  if (applied.length) {
    setNodes(ns)
    setEdges(es)
  }
  return applied
}

// ── component ───────────────────────────────────────────────────────────────

export default function ChatPanel({ nodes, edges, setNodes, setEdges, onLabelChange, onTypeChange, onDelete, initialHistory = [] }) {
  const [history, setHistory] = useState([])
  const synced = useRef(false)

  useEffect(() => {
    if (!synced.current && initialHistory.length > 0) {
      setHistory(initialHistory)
      synced.current = true
    }
  }, [initialHistory])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setHistory(h => [...h, userMsg])
    setLoading(true)

    try {
      const data = await api.chatEnhance(msg, nodes, edges, history)
      if (!data) throw new Error('No response from server')
      const applied = data.actions?.length
        ? applyActions(data.actions, nodes, edges, setNodes, setEdges, onLabelChange, onTypeChange, onDelete)
        : []

      setHistory(h => [...h, { role: 'assistant', content: data.reply || 'Done.', applied }])
    } catch (err) {
      console.error('ChatPanel error:', err)
      setHistory(h => [...h, { role: 'assistant', content: `Error: ${err.message}`, applied: [] }])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>🤖 AI Assistant</div>

      {history.length === 0 && !loading ? (
        <div style={S.emptyWrap}>
          <div style={S.emptyInner}>
            <div style={S.emptyIcon}>🤖</div>
            <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
              Ask AI to analyze nodes<br />or say "add Redis", "remove DB",<br />"connect A to B"
            </div>
          </div>
        </div>
      ) : (
        <div style={S.messages}>
          {history.map((msg, i) => (
            <div key={i} style={msg.role === 'user' ? S.msgUser : S.msgBot}>
              <div style={S.label}>{msg.role === 'user' ? 'You' : 'AI Assistant'}</div>
              {msg.role === 'user' ? (
                <div style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 13, lineHeight: 1.65, boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}>{msg.content}</div>
              ) : (
                <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.7)', padding: '12px 14px', borderRadius: '4px 16px 16px 16px' }}>
                  {renderMarkdown(msg.content)}
                  {msg.applied?.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 6 }}>
                      {msg.applied.map((a, j) => (
                        <span key={j} style={{ ...S.actionChip, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={S.msgBot}>
              <div style={S.label}>AI Assistant</div>
              <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px 10px 10px 2px', display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 150, 300].map(d => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569', display: 'inline-block', animation: 'bounce 1s infinite', animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={S.inputBar}>
        <input
          style={S.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='e.g. "add Redis cache" or "analyze each node"'
          disabled={loading}
        />
        <button style={{ ...S.sendBtn, opacity: loading ? 0.5 : 1 }} onClick={send} disabled={loading}>↑</button>
      </div>
    </div>
  )
}
