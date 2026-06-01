import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MarkerType, useEdgesState, useNodesState } from 'reactflow'
import { api, BASE_URL } from '../api'
import AnalysisPanel from '../components/AnalysisPanel'
import ChatPanel from '../components/ChatPanel'
import DiagramCanvas from '../components/DiagramCanvas'
import ExportMenu from '../components/ExportMenu'
import InitialChatBox from '../components/InitialChatBox'
import { dagreLayout } from '../utils/dagreLayout'

function styleEdges(edges) {
  return edges.map((e) => ({
    ...e,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 },
    style: { stroke: '#475569', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#e2e8f0', fontWeight: 600 },
    labelBgStyle: { fill: '#1e293b', fillOpacity: 1 },
    labelBgPadding: [5, 3],
    labelBgBorderRadius: 4,
  }))
}

const S = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', fontFamily: 'system-ui', color: '#f1f5f9' },
  topbar: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 30, position: 'relative' },
  breadcrumb: { fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 },
  breadTitle: { color: '#f1f5f9', fontWeight: 600 },
  backBtn: { background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 13, padding: '4px 8px' },
  actions: { display: 'flex', gap: 8, alignItems: 'center' },
  btnNewDiagram: { background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  btnSave: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  btnShare: { background: 'linear-gradient(135deg,#059669,#0d9488)', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  floatingToolbar: { position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 },
  btnFloat: { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },
  errorBar: { position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '8px 16px', fontSize: 12, zIndex: 15 },
  emptyCanvas: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '12px 18px', fontSize: 13, color: '#f1f5f9', zIndex: 999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
}

export default function WorkflowPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [mode, setMode] = useState(id ? 'diagram' : 'chat')
  const [chatHistory, setChatHistory] = useState([])
  const [initialLoading, setInitialLoading] = useState(false)
  const [generatingStep, setGeneratingStep] = useState('')

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [analysisText, setAnalysisText] = useState('')
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(id ? parseInt(id) : null)
  const [shareToken, setShareToken] = useState('')
  const [title, setTitle] = useState('New Workflow')
  const [prompt, setPrompt] = useState('')
  const [toast, setToast] = useState('')
  const canvasRef = useRef(null)

  const handleLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
  }, [setNodes])

  const handleTypeChange = useCallback((nodeId, newType) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, node_type: newType } } : n))
  }, [setNodes])

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  const handleDuplicateNode = useCallback((nodeId) => {
    setNodes((currentNodes) => {
      const node = currentNodes.find((n) => n.id === nodeId)
      if (!node) return currentNodes
      return [...currentNodes, { ...node, id: `dup-${Date.now()}`, selected: false, position: { x: node.position.x + 40, y: node.position.y + 40 }, data: { ...node.data } }]
    })
  }, [setNodes])

  useEffect(() => {
    if (!id) return
    api.getWorkflow(parseInt(id)).then((wf) => {
      setPrompt(wf.prompt)
      setTitle(wf.title)
      setAnalysisText(wf.analysis_text || '')
      setShareToken(wf.share_token)
      setSavedId(wf.id)
      const rawCb = wf.nodes.map((n) => ({
        ...n,
        data: { ...n.data, icon_url: n.data.icon_url ? `${BASE_URL}${n.data.icon_url}` : null, onLabelChange: handleLabelChange, onTypeChange: handleTypeChange, onDelete: handleDeleteNode, onDuplicate: handleDuplicateNode },
      }))
      const styledEdges = styleEdges(wf.edges)
      setNodes(dagreLayout(rawCb, styledEdges))
      setEdges(styledEdges)
    }).catch(() => setError('Failed to load workflow.'))
  }, [id])

  async function handleInitialSend(message) {
    setChatHistory(h => [...h, { role: 'user', content: message }])
    setInitialLoading(true)
    setGeneratingStep('')
    try {
      const data = await api.generateStream(message, (label) => setGeneratingStep(label))
      if (data && data.type === 'chat') {
        setChatHistory(h => [...h, { role: 'assistant', content: data.reply }])
      } else if (data && data.type === 'done') {
        const rawCb = data.nodes.map((n) => ({
          ...n,
          data: { ...n.data, icon_url: n.data.icon_url ? `${BASE_URL}${n.data.icon_url}` : null, onLabelChange: handleLabelChange, onTypeChange: handleTypeChange, onDelete: handleDeleteNode, onDuplicate: handleDuplicateNode },
        }))
        const styledEdges = styleEdges(data.edges)
        setNodes(dagreLayout(rawCb, styledEdges))
        setEdges(styledEdges)
        setAnalysisText(data.analysis_text || '')
        setPrompt(message)
        setTitle(message.slice(0, 60))
        setChatHistory(h => [...h, { role: 'assistant', content: 'Your architecture diagram is ready! Explore it on the left — keep chatting here to refine it, ask questions, or modify components.' }])
        setTimeout(() => setMode('diagram'), 80)
      }
    } catch (err) {
      setChatHistory(h => [...h, { role: 'assistant', content: `Something went wrong: ${err.message}. Please try again.` }])
    } finally {
      setInitialLoading(false)
      setGeneratingStep('')
    }
  }

  function handleNewDiagram() {
    setMode('chat')
    setChatHistory([])
    setNodes([])
    setEdges([])
    setAnalysisText('')
    setError('')
    setPrompt('')
    setTitle('New Workflow')
    setSavedId(null)
    setShareToken('')
    if (id) navigate('/workflow', { replace: true })
  }

  async function handleSave() {
    if (nodes.length === 0) { showToast('Generate a diagram first'); return }
    try {
      const cleanNodes = nodes.map(({ data: { onLabelChange, onTypeChange, onDelete, onDuplicate, ...d }, ...n }) => ({
        ...n,
        data: { ...d, icon_url: d.icon_url ? d.icon_url.replace(BASE_URL, '') : null },
      }))
      const res = await api.saveWorkflow({ id: savedId, prompt, nodes: cleanNodes, edges, analysis_text: analysisText })
      setSavedId(res.id)
      setShareToken(res.share_token)
      showToast('Workflow saved!')
      if (!id) navigate(`/workflow/${res.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleShare() {
    if (!shareToken) { await handleSave(); return }
    const url = `${window.location.origin}/share/${shareToken}`
    await navigator.clipboard.writeText(url)
    showToast('Share link copied to clipboard!')
  }

  function showToast(msg, duration = 2500) {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }

  function handleRelayout() {
    setNodes((nds) => dagreLayout(nds, edges))
  }

  function handleAddNode() {
    const newId = `manual-${Date.now()}`
    setNodes((nds) => [...nds, {
      id: newId, type: 'default',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { label: 'New Node', node_type: 'service', onLabelChange: handleLabelChange, onTypeChange: handleTypeChange, onDelete: handleDeleteNode, onDuplicate: handleDuplicateNode },
    }])
  }

  const rawNodes = nodes.map(({ data: { onLabelChange, onTypeChange, onDelete, onDuplicate, ...d }, ...n }) => ({ ...n, data: d }))

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.breadcrumb}>
          <button style={S.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <span style={{ color: '#334155' }}>/</span>
          <span style={S.breadTitle}>{title}</span>
        </div>
        <div style={S.actions}>
          {mode === 'diagram' && (
            <button style={S.btnNewDiagram} onClick={handleNewDiagram}>✦ New Diagram</button>
          )}
          <button style={S.btnSave} onClick={handleSave}>Save</button>
          <ExportMenu title={title} nodes={nodes} edges={edges} canvasRef={canvasRef} showToast={showToast} />
          <button style={S.btnShare} onClick={handleShare}>Share 🔗</button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>

        <div style={{
          position: 'absolute', inset: 0,
          opacity: mode === 'chat' ? 1 : 0,
          pointerEvents: mode === 'chat' ? 'auto' : 'none',
          transition: 'opacity 0.45s ease',
          zIndex: mode === 'chat' ? 10 : 1,
        }}>
          <InitialChatBox
            history={chatHistory}
            loading={initialLoading}
            generatingStep={generatingStep}
            onSend={handleInitialSend}
          />
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          opacity: mode === 'diagram' ? 1 : 0,
          pointerEvents: mode === 'diagram' ? 'auto' : 'none',
          transition: 'opacity 0.5s ease',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gridTemplateRows: '1fr',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid #334155' }} ref={canvasRef}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {error && <div style={S.errorBar}>⚠️ {error}</div>}

            <div style={S.floatingToolbar}>
              <button style={S.btnFloat} onClick={handleAddNode}>+ Node</button>
              <button style={{ ...S.btnFloat, color: '#64748b' }} onClick={handleRelayout} title="Snap nodes back to clean layout">⊞ Re-layout</button>
            </div>

            <AnalysisPanel analysisText={analysisText} />

            {nodes.length === 0 ? (
              <div style={S.emptyCanvas}>
                <div style={{ fontSize: 36, opacity: 0.15 }}>🗺️</div>
                <div style={{ fontSize: 13, color: '#334155' }}>Your diagram will appear here</div>
              </div>
            ) : (
              <DiagramCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                setEdges={setEdges}
              />
            )}
          </div>

          <ChatPanel
            nodes={rawNodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onLabelChange={handleLabelChange}
            onTypeChange={handleTypeChange}
            onDelete={handleDeleteNode}
            initialHistory={chatHistory}
          />
        </div>
      </div>

      {toast && <div style={S.toast}>✓ {toast}</div>}
    </div>
  )
}
