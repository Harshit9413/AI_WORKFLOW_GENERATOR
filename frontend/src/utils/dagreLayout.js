import dagre from 'dagre'

// Match the actual rendered node size in EditableNode.jsx
const NODE_W = 160
const NODE_H = 100

/**
 * Runs Dagre left-to-right layout on nodes + edges.
 * Returns a new nodes array with updated position.x / position.y.
 * Edges are unchanged — ReactFlow routes them from the new handle positions.
 */
export function dagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',   // left → right flow
    nodesep: 80,     // vertical gap between sibling nodes
    ranksep: 160,    // horizontal gap between columns (ranks)
    marginx: 60,
    marginy: 60,
  })

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => {
    if (e.source && e.target) g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n  // keep original position if dagre failed
    // Dagre centers nodes — subtract half-size to get ReactFlow top-left origin
    return {
      ...n,
      position: {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
      },
    }
  })
}
