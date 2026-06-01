import { useCallback, useEffect, useState } from 'react'
import { Handle, Position } from 'reactflow'
import {
  FaCloud,
  FaCopy,
  FaDatabase,
  FaEnvelope,
  FaHdd,
  FaLock,
  FaServer,
  FaUser,
} from 'react-icons/fa'

const TYPE_CONFIG = {
  client:    { icon: FaUser,     color: '#22c55e', label: 'Client'    },
  service:   { icon: FaServer,   color: '#a855f7', label: 'Service'   },
  datastore: { icon: FaDatabase, color: '#3b82f6', label: 'Datastore' },
  queue:     { icon: FaEnvelope, color: '#f59e0b', label: 'Queue'     },
  security:  { icon: FaLock,     color: '#ef4444', label: 'Security'  },
  storage:   { icon: FaHdd,      color: '#6366f1', label: 'Storage'   },
  cloud:     { icon: FaCloud,    color: '#64748b', label: 'Cloud'     },
}

// 12 visually distinct vibrant colors — each node gets its own via ID hash
const NODE_PALETTE = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#e879f9', // fuchsia
]

function nodeAccentColor(id) {
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff
  return NODE_PALETTE[h % NODE_PALETTE.length]
}

// Fetches an SVG, synthesises a viewBox if missing (so CSS sizing scales
// rather than clips), then inlines the markup so CSS fill:currentColor works
// for monochrome icons while brand-coloured icons keep their own palette.
//
// `fallback` is rendered while loading and on any fetch/parse error, so the
// icon box is never left blank.
function InlineSvg({ src, color, size, fallback }) {
  const [svg, setSvg] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) { setSvg(null); setError(false); return }
    let alive = true
    setSvg(null)
    setError(false)

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(text => {
        if (!alive) return

        // Validate that the response looks like an SVG
        if (!/<svg\b/i.test(text)) { setError(true); return }

        let processed = text

        // If no viewBox, derive one from the width/height attrs so the SVG
        // coordinate space scales when we resize the element via CSS.
        if (!/viewBox/i.test(processed)) {
          const w = processed.match(/\bwidth="([\d.]+)"/)
          const h = processed.match(/\bheight="([\d.]+)"/)
          if (w && h) {
            processed = processed.replace(/(<svg\b)/i, `$1 viewBox="0 0 ${w[1]} ${h[1]}"`)
          }
        }

        const hasExplicitColor = /fill="#|fill='#|stop-color|stroke="#|stroke='#/.test(processed)
        const fillStyle = hasExplicitColor ? '' : 'fill:currentColor;'

        // width/height:100% fills the parent span; display:block removes the
        // inline-baseline gap that would shift the icon slightly.
        const styled = processed.replace(
          /(<svg\b)/i,
          `$1 style="width:100%;height:100%;display:block;${fillStyle}"`
        )
        setSvg(styled)
      })
      .catch(() => { if (alive) setError(true) })

    return () => { alive = false }
  }, [src])

  // Show fallback while loading or if the fetch/parse failed
  if (!svg || error) return fallback ?? null

  return (
    <span
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        overflow: 'hidden',
        flexShrink: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function inferTypeFromLabel(label) {
  const l = label.toLowerCase()
  if (/user|browser|mobile|frontend|client/.test(l)) return 'client'
  if (/kafka|rabbitmq|\bsqs\b|celery|queue|message|event/.test(l)) return 'queue'
  if (/\bs3\b|cdn|blob|\bgcs\b|object.?store|file.?storage/.test(l)) return 'storage'
  if (/\baws\b|\bgcp\b|azure|docker|kubernetes|\bk8s\b|container/.test(l)) return 'cloud'
  if (/auth|jwt|oauth|firewall|\bwaf\b|identity|security/.test(l)) return 'security'
  if (/postgres|mysql|mongodb|sqlite|dynamodb|redis|\bdb\b|database|mongo/.test(l)) return 'datastore'
  if (/\bapi\b|server|fastapi|backend|gateway|nginx|microservice|load.?balancer/.test(l)) return 'service'
  return null
}

export default function EditableNode({ id, data, selected }) {
  const [isHovered, setIsHovered] = useState(false)
  const config = TYPE_CONFIG[data.node_type] ?? TYPE_CONFIG.service
  const Icon = config.icon
  const color = nodeAccentColor(id)
  const showControls = selected || isHovered

  const handleBlur = useCallback(
    (e) => {
      const newLabel = e.currentTarget.innerText.trim()
      if (!newLabel) return
      if (data.onLabelChange) data.onLabelChange(id, newLabel)
      const inferred = inferTypeFromLabel(newLabel)
      if (inferred && inferred !== data.node_type && data.onTypeChange) {
        data.onTypeChange(id, inferred)
      }
    },
    [id, data]
  )

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: `linear-gradient(160deg, ${color}22 0%, #0d1121 100%)`,
        border: selected
          ? `2px solid ${color}`
          : isHovered
          ? `2px solid ${color}99`
          : `2px solid ${color}44`,
        borderRadius: 12,
        padding: '14px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 88,
        maxWidth: 128,
        boxShadow: selected
          ? `0 0 0 3px ${color}44, 0 8px 24px rgba(0,0,0,0.5)`
          : isHovered
          ? `0 4px 20px ${color}22, 0 4px 16px rgba(0,0,0,0.4)`
          : `0 2px 10px rgba(0,0,0,0.35)`,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {/* Connection handles on all 4 sides — drag from any side to connect */}
      <Handle type="target" position={Position.Left}   style={{ background: color, border: '2px solid #13172a', width: 10, height: 10, left: -6 }} />
      <Handle type="target" position={Position.Top}    style={{ background: color, border: '2px solid #13172a', width: 10, height: 10, top: -6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: '2px solid #13172a', width: 10, height: 10, bottom: -6 }} />

      {/* Action buttons — top-right, appear on hover/select */}
      {showControls && (
        <div
          className="nodrag nopan"
          style={{ position: 'absolute', top: -10, right: -4, display: 'flex', gap: 3, zIndex: 10 }}
        >
          {data.onDuplicate && (
            <button
              title="Duplicate node"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onDuplicate(id) }}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#3b82f6', border: '1.5px solid #13172a',
                color: 'white', fontSize: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <FaCopy size={7} />
            </button>
          )}
          {data.onDelete && (
            <button
              title="Delete node"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); data.onDelete(id) }}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#ef4444', border: '1.5px solid #13172a',
                color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Icon box */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: data.icon_url ? `${color}15` : `${color}28`,
          border: `1.5px solid ${color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {data.icon_url ? (
          <InlineSvg
            src={data.icon_url}
            color={color}
            size={52}
            fallback={<Icon color={color} size={22} />}
          />
        ) : (
          <Icon color={color} size={22} />
        )}
      </div>

      {/* Label — click to rename */}
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onMouseDown={(e) => e.stopPropagation()}
        title="Click to rename"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#cbd5e1',
          outline: 'none',
          cursor: 'text',
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: 110,
          wordBreak: 'break-word',
          letterSpacing: '0.01em',
          borderBottom: isHovered || selected ? '1px dashed #475569' : '1px solid transparent',
          paddingBottom: 1,
          transition: 'border-color 0.15s',
        }}
      >
        {data.label}
      </div>

      {/* Type picker — visible only when selected */}
      {selected && (
        <div
          className="nodrag nopan"
          style={{
            display: 'flex',
            gap: 4,
            paddingTop: 6,
            borderTop: '1px solid #1e2340',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const TIcon = cfg.icon
            const isActive = (data.node_type ?? 'service') === type
            return (
              <button
                key={type}
                title={cfg.label}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (data.onTypeChange) data.onTypeChange(id, type)
                }}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: isActive ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                  background: isActive ? `${cfg.color}22` : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0, transition: 'all 0.15s',
                }}
              >
                <TIcon color={isActive ? cfg.color : '#475569'} size={9} />
              </button>
            )
          })}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: color, border: '2px solid #13172a', width: 10, height: 10, right: -6 }} />
    </div>
  )
}
