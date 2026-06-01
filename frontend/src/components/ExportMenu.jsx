import { useEffect, useRef, useState } from 'react'
import { toPng, toSvg } from 'html-to-image'

const S = {
  wrap: { position: 'relative' },
  btn: {
    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    minWidth: 180,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 100,
    overflow: 'hidden',
  },
  label: {
    padding: '6px 14px 4px',
    fontSize: 10,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  itemIcon: { fontSize: 16 },
  itemTitle: { fontSize: 13, color: '#f1f5f9', fontWeight: 500 },
  itemDesc: { fontSize: 11, color: '#64748b' },
  divider: { height: 1, background: '#334155', margin: '0 10px' },
}

const OPTIONS = [
  { key: 'png',  icon: '🖼',  title: 'PNG Image',  desc: 'Best for docs & sharing' },
  { key: 'svg',  icon: '✏️',  title: 'SVG Vector', desc: 'Scalable, edit in Figma'  },
  { key: 'json', icon: '📄',  title: 'JSON Data',  desc: 'Re-import workflow later' },
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workflow'
}

function downloadBlob(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

export default function ExportMenu({ title, nodes, edges, canvasRef, showToast }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const disabled = nodes.length === 0

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleExport(format) {
    setOpen(false)
    const slug = slugify(title)
    const node = canvasRef.current

    try {
      if (format === 'png') {
        const dataUrl = await toPng(node, { backgroundColor: '#0f172a', pixelRatio: 2 })
        downloadBlob(dataUrl, `${slug}.png`)
        showToast('Exported as PNG')
      } else if (format === 'svg') {
        const dataUrl = await toSvg(node, { backgroundColor: '#0f172a' })
        downloadBlob(dataUrl, `${slug}.svg`)
        showToast('Exported as SVG')
      } else if (format === 'json') {
        const cleanNodes = nodes.map(({ data: { onLabelChange, onTypeChange, onDelete, ...d }, ...n }) => ({ ...n, data: d }))
        const json = JSON.stringify({ nodes: cleanNodes, edges }, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        downloadBlob(URL.createObjectURL(blob), `${slug}.json`)
        showToast('Exported as JSON')
      }
    } catch {
      showToast('Export failed — try again')
    }
  }

  return (
    <div style={S.wrap} ref={menuRef}>
      <button
        style={{ ...S.btn, ...(disabled ? S.btnDisabled : {}) }}
        onClick={() => !disabled && setOpen((o) => !o)}
        title={disabled ? 'Generate a diagram first' : 'Export workflow'}
      >
        ⬇ Export <span style={{ fontSize: 9, opacity: 0.8 }}>▼</span>
      </button>

      {open && (
        <div style={S.dropdown}>
          <div style={S.label}>Export As</div>
          {OPTIONS.map((opt, i) => (
            <div key={opt.key}>
              <div
                style={S.item}
                onClick={() => handleExport(opt.key)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168,85,247,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <span style={S.itemIcon}>{opt.icon}</span>
                <div>
                  <div style={S.itemTitle}>{opt.title}</div>
                  <div style={S.itemDesc}>{opt.desc}</div>
                </div>
              </div>
              {i < OPTIONS.length - 1 && <div style={S.divider} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
