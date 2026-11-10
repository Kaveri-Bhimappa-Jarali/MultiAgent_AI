import React, { useState } from 'react'
import { Server, User, Laptop, Database, Globe, ShieldAlert, Info } from 'lucide-react'

export function AttackPathGraph({ graph }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#090d16] border border-[#1e2736] text-center">
        <p className="text-xs text-slate-400 font-mono">No topological attack-path graph generated for this incident yet.</p>
      </div>
    )
  }

  const nodes = graph.nodes
  const edges = graph.edges || []

  // Horizontal layout calculation
  const spacing = 190
  const startX = 80
  const centerY = 110
  const svgWidth = Math.max(760, nodes.length * spacing + 120)

  const nodePositions = nodes.map((n, idx) => ({
    ...n,
    x: startX + idx * spacing,
    y: centerY,
  }))

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]

  const getNodeIcon = (type) => {
    switch (type) {
      case 'source_ip':
        return Globe
      case 'account':
        return User
      case 'endpoint':
        return Laptop
      case 'server':
        return Server
      case 'resource':
        return Database
      default:
        return Server
    }
  }

  const getNodeColor = (status) => {
    switch (status) {
      case 'attacker':
        return { bg: '#f43f5e', border: '#f43f5e', text: '#ffffff' }
      case 'compromised':
        return { bg: '#f59e0b', border: '#f59e0b', text: '#000000' }
      case 'affected':
        return { bg: '#a855f7', border: '#c084fc', text: '#ffffff' }
      case 'target':
        return { bg: '#ef4444', border: '#ef4444', text: '#ffffff' }
      default:
        return { bg: '#1e293b', border: '#334155', text: '#ffffff' }
    }
  }

  return (
    <div className="bg-[#0d121c] rounded-2xl border border-[#1e2736] p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#182130] gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>Topological Attack-Path Traversal (DAG)</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Click on any entity node to inspect telemetry, credentials and pivot evidence.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            <span className="text-slate-400">Attacker / Crown Jewel</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span className="text-slate-400">Compromised</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="text-slate-400">Affected Host</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="overflow-x-auto py-6">
        <svg width={svgWidth} height="220" className="mx-auto block">
          <defs>
            <marker
              id="arrowhead-soc"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
            </marker>
          </defs>

          {/* Directed Edges */}
          {nodePositions.map((pos, idx) => {
            if (idx === nodePositions.length - 1) return null
            const nextPos = nodePositions[idx + 1]
            const matchingEdge = edges.find(
              (e) => e.source === pos.id && e.target === nextPos.id
            ) || edges[idx]

            return (
              <g key={`edge-${pos.id}-${nextPos.id}`}>
                <line
                  x1={pos.x + 32}
                  y1={pos.y}
                  x2={nextPos.x - 38}
                  y2={nextPos.y}
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeDasharray="6,4"
                  markerEnd="url(#arrowhead-soc)"
                  className="transition-all"
                />
                {matchingEdge && (
                  <text
                    x={(pos.x + nextPos.x) / 2}
                    y={pos.y - 14}
                    fill="#c084fc"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none font-semibold"
                  >
                    {matchingEdge.stage || matchingEdge.relation || 'traversal'}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {nodePositions.map((node) => {
            const isSelected = selectedNode?.id === node.id
            const colors = getNodeColor(node.status)
            const Icon = getNodeIcon(node.type)

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className="cursor-pointer group"
              >
                {/* Outer Ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 34 : 28}
                  fill="#090d16"
                  stroke={isSelected ? '#a855f7' : colors.border}
                  strokeWidth={isSelected ? '3' : '2'}
                  className="transition-all duration-200"
                />

                {/* Inner Glow Badge */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill={colors.bg}
                  opacity={isSelected ? '0.9' : '0.4'}
                />

                {/* Node Icon */}
                <foreignObject
                  x={node.x - 10}
                  y={node.y - 10}
                  width="20"
                  height="20"
                  className="pointer-events-none"
                >
                  <Icon className="w-5 h-5 text-white" />
                </foreignObject>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 48}
                  fill={isSelected ? '#ffffff' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                  className="select-none font-mono"
                >
                  {node.label}
                </text>

                <text
                  x={node.x}
                  y={node.y + 62}
                  fill="#a855f7"
                  fontSize="9"
                  textAnchor="middle"
                  className="select-none font-mono uppercase"
                >
                  {(node.type || '').replace('_', ' ')}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl bg-[#090d16] border border-[#1e2736] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white font-mono">{selectedNode.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 uppercase font-mono font-bold border border-purple-500/30">
                  {selectedNode.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 uppercase font-mono border border-amber-500/30">
                  {selectedNode.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Entity ID: <span className="text-white">{selectedNode.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
            {selectedNode.details && Object.entries(selectedNode.details).map(([k, v]) => (
              <div key={k} className="px-3 py-1.5 rounded-lg bg-[#0d121c] border border-[#1e2736]">
                <span className="text-slate-400 capitalize">{k}: </span>
                <span className="text-white font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

