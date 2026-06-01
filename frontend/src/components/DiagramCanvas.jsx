import { useCallback } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import DeletableEdge from './DeletableEdge'
import EditableNode from './EditableNode'

const nodeTypes = { default: EditableNode }
const edgeTypes = { deletable: DeletableEdge }

const defaultEdgeOptions = {
  type: 'deletable',
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 },
  style: { stroke: '#475569', strokeWidth: 1.5 },
}

const connectionLineStyle = { stroke: '#7c3aed', strokeWidth: 2, strokeDasharray: '5 3' }

export default function DiagramCanvas({ nodes, edges, onNodesChange, onEdgesChange, setEdges }) {
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, ...defaultEdgeOptions }, eds)
      ),
    [setEdges]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineStyle={connectionLineStyle}
      deleteKeyCode="Delete"
      fitView
      fitViewOptions={{ padding: 0.2 }}
      connectionRadius={20}
    >
      <Controls
        style={{
          background: '#1e1e2e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
        }}
      />
      <Background
        color="#2a2a3e"
        gap={20}
        size={1}
        variant="dots"
      />
    </ReactFlow>
  )
}
