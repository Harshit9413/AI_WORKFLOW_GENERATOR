export function renderInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ color: '#f1f5f9', fontWeight: 600 }}>{p}</strong>
      : p
  )
}

export function renderMarkdown(text) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 4 }} />
    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s/, '')
      return <div key={i} style={{ fontWeight: 700, color: '#60a5fa', fontSize: 13, marginTop: 8, marginBottom: 2 }}>{content}</div>
    }
    if (/^[\-\*•]\s/.test(line.trim())) {
      const content = line.trim().replace(/^[\-\*•]\s/, '')
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginLeft: 6, marginTop: 2 }}>
          <span style={{ color: '#7c3aed', flexShrink: 0 }}>•</span>
          <span style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{renderInline(content)}</span>
        </div>
      )
    }
    if (/^\d+\.\s/.test(line.trim())) {
      const num = line.trim().match(/^(\d+)\./)[1]
      const content = line.trim().replace(/^\d+\.\s/, '')
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginLeft: 4, marginTop: 4 }}>
          <span style={{ color: '#7c3aed', flexShrink: 0, fontWeight: 600, fontSize: 11 }}>{num}.</span>
          <span style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{renderInline(content)}</span>
        </div>
      )
    }
    return <div key={i} style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{renderInline(line)}</div>
  })
}
