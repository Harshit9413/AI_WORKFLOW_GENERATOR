import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEdgesState, useNodesState } from 'reactflow'
import { api, isLoggedIn } from '../api'
import AnalysisPanel from '../components/AnalysisPanel'
import DiagramCanvas from '../components/DiagramCanvas'
import ExportMenu from '../components/ExportMenu'

const S = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', fontFamily: 'system-ui', color: '#f1f5f9' },
  topbar: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 16, fontWeight: 700, color: '#60a5fa' },
  badge: { background: 'rgba(5,150,105,0.15)', color: '#34d399', fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.2)' },
  title: { fontSize: 13, color: '#94a3b8' },
  cta: { fontSize: 12, color: '#64748b' },
  saveBtn: {
    background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
  },
  body: { display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, overflow: 'hidden' },
  canvasWrap: { position: 'relative' },
  emptyWrap: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 },
  emptyIcon: { fontSize: 36, opacity: 0.15 },
  emptyText: { fontSize: 13, color: '#334155' },
  errorWrap: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 },
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f1f5f9',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 13,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
}

export default function SharePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [analysisText, setAnalysisText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('Shared Diagram')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    api.getShare(token)
      .then((wf) => {
        setTitle(wf.title)
        setNodes(wf.nodes)
        setEdges(wf.edges)
        setAnalysisText(wf.analysis_text || '')
        setPrompt(wf.prompt || '')
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    if (!isLoggedIn()) {
      navigate('/login')
      return
    }
    try {
      await api.saveWorkflow({ prompt, nodes, edges, analysis_text: analysisText })
      showToast('Saved to your workflows!')
    } catch {
      showToast('Save failed — try again')
    }
  }

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topLeft}>
          <span style={S.logo}>🗺️ AI Workflow Generator</span>
          {!loading && !notFound && (
            <>
              <span style={{ color: '#334155', fontSize: 13 }}>›</span>
              <span style={S.title}>{title}</span>
              <span style={S.badge}>Read Only</span>
            </>
          )}
        </div>
        <div style={S.topRight}>
          {!loading && !notFound && nodes.length > 0 && (
            <>
              <ExportMenu
                title={title}
                nodes={nodes}
                edges={edges}
                canvasRef={canvasRef}
                showToast={showToast}
              />
              <button style={S.saveBtn} onClick={handleSave}>
                Save to My Workflows
              </button>
            </>
          )}
          <div style={S.cta}>
            Want to build your own?{' '}
            <Link to="/signup" style={{ color: '#60a5fa', textDecoration: 'none' }}>Sign up free →</Link>
          </div>
        </div>
      </div>

      <div style={S.body}>
        <div style={S.canvasWrap} ref={canvasRef}>
          {loading && (
            <div style={S.emptyWrap}>
              <div style={S.emptyText}>Loading...</div>
            </div>
          )}
          {notFound && (
            <div style={S.errorWrap}>
              <div style={{ fontSize: 36, opacity: 0.2 }}>🔗</div>
              <div style={{ fontSize: 14, color: '#475569' }}>This shared diagram was not found.</div>
              <Link to="/signup" style={{ color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>Create your own →</Link>
            </div>
          )}
          {!loading && !notFound && nodes.length > 0 && (
            <DiagramCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setEdges={setEdges}
            />
          )}
        </div>
        <AnalysisPanel analysisText={analysisText} />
      </div>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  )
}
