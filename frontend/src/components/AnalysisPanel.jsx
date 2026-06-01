import { useState } from 'react'

function parseAnalysis(text) {
  const sections = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let current = null
  for (const line of lines) {
    const headerMatch = line.match(/^([A-Za-z ]+):\s*(.*)$/)
    if (headerMatch && !line.startsWith('-')) {
      const title = headerMatch[1].trim()
      const inline = headerMatch[2].trim()
      const knownHeaders = ['Overview', 'Components', 'Data Flow', 'Recommendations', 'Data flow']
      if (knownHeaders.some(h => title.toLowerCase() === h.toLowerCase())) {
        current = { title, items: [], inline }
        sections.push(current)
        continue
      }
    }
    if (line.startsWith('-') && current) { current.items.push(line.replace(/^-\s*/, '')); continue }
    if (current) { if (current.inline) current.inline += ' ' + line; else current.inline = line }
  }
  return sections.length > 0 ? sections : null
}

const sectionColors = { overview: '#60a5fa', components: '#34d399', 'data flow': '#f59e0b', recommendations: '#c084fc' }
function getSectionColor(title) { return sectionColors[title.toLowerCase()] || '#94a3b8' }

function renderBullet(text, i) {
  const colonIdx = text.indexOf(':')
  if (colonIdx > 0 && colonIdx < 20) {
    const name = text.slice(0, colonIdx).trim()
    const desc = text.slice(colonIdx + 1).trim()
    return (
      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <span style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>▸</span>
        <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{name}:</span>{' '}{desc}
        </span>
      </div>
    )
  }
  return (
    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
      <span style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>▸</span>
      <span style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{text}</span>
    </div>
  )
}

export default function AnalysisPanel({ analysisText }) {
  const [open, setOpen] = useState(false)
  const sections = analysisText ? parseAnalysis(analysisText) : null

  return (
    <>
      {/* Toggle tab — always visible on left edge of canvas */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close analysis' : 'Open analysis'}
        style={{
          position: 'absolute', left: open ? 296 : 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 20, background: '#1e293b', border: '1px solid #334155',
          borderLeft: open ? '1px solid #334155' : 'none',
          borderRadius: '0 8px 8px 0',
          padding: '10px 6px', cursor: 'pointer', color: '#94a3b8', fontSize: 11,
          writingMode: 'vertical-rl', letterSpacing: '0.05em', fontFamily: 'system-ui',
          transition: 'left 0.3s ease', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {open ? '◀' : '▶'} Analysis
      </button>

      {/* Panel — slides in from left */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 296,
        background: '#0f172a', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', zIndex: 19,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        fontFamily: 'system-ui',
      }}>
        <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: 13, fontWeight: 600, color: '#f1f5f9', flexShrink: 0 }}>
          📋 AI Analysis
        </div>

        {!analysisText ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: 0.15, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: '#334155' }}>Analysis will appear here</div>
            </div>
          </div>
        ) : sections ? (
          <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map((sec, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${getSectionColor(sec.title)}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: getSectionColor(sec.title), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{sec.title}</div>
                {sec.inline && <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, marginBottom: sec.items.length ? 6 : 0 }}>{sec.inline}</div>}
                {sec.items.map((item, j) => renderBullet(item, j))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysisText}</div>
          </div>
        )}
      </div>
    </>
  )
}
