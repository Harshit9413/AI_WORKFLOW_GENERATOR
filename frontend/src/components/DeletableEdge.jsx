import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from 'reactflow'

export default function DeletableEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, label, selected,
}) {
  const { setEdges } = useReactFlow()

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const stroke = selected ? '#7c3aed' : (style?.stroke ?? '#475569')
  const strokeWidth = selected ? 2.5 : (style?.strokeWidth ?? 1.5)

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, stroke, strokeWidth, transition: 'stroke 0.15s, stroke-width 0.15s' }}
      />
      <EdgeLabelRenderer>
        {/* Edge label */}
        {label && (
          <div style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10, fontWeight: 600, color: '#e2e8f0',
            background: '#1e293b', padding: '2px 7px', borderRadius: 4,
            border: selected ? '1px solid #7c3aed44' : '1px solid #334155',
            pointerEvents: 'none', userSelect: 'none',
            transition: 'border-color 0.15s',
          }}>
            {label}
          </div>
        )}

        {/* Delete button — appears only when edge is selected */}
        {selected && (
          <div
            className="nodrag nopan"
            onClick={() => setEdges(eds => eds.filter(e => e.id !== id))}
            title="Delete connection"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${label ? labelY - 22 : labelY}px)`,
              width: 18, height: 18, borderRadius: '50%',
              background: '#ef4444', border: '1.5px solid #0f172a',
              color: 'white', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', pointerEvents: 'all', zIndex: 10,
              boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            }}
          >
            ✕
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
