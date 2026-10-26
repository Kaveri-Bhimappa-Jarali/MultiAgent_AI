import React, { useState } from 'react';
import { AttackPathGraph as GraphData } from '../../types';
import { Server, User, Laptop, Database, Globe, ArrowRight, ShieldAlert, Info } from 'lucide-react';

interface AttackPathGraphProps {
  graph?: GraphData;
}

export const AttackPathGraph: React.FC<AttackPathGraphProps> = ({ graph }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-navy-900 border border-slate-800 text-center">
        <p className="text-sm text-mutedslate">No topological attack-path graph generated for this incident yet.</p>
      </div>
    );
  }

  const nodes = graph.nodes;
  const edges = graph.edges;

  // Layout calculations: arrange nodes horizontally in sequence
  const spacing = 180;
  const startX = 70;
  const centerY = 110;
  const svgWidth = Math.max(760, nodes.length * spacing + 120);

  const nodePositions = nodes.map((n, idx) => ({
    ...n,
    x: startX + idx * spacing,
    y: centerY,
  }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source_ip':
        return Globe;
      case 'account':
        return User;
      case 'endpoint':
        return Laptop;
      case 'server':
        return Server;
      case 'resource':
        return Database;
      default:
        return Server;
    }
  };

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'attacker':
        return { bg: '#F05265', border: '#F05265', text: '#F5F7FC' };
      case 'compromised':
        return { bg: '#F4B942', border: '#F4B942', text: '#0B1020' };
      case 'affected':
        return { bg: '#6D5AE6', border: '#8473EE', text: '#F5F7FC' };
      case 'target':
        return { bg: '#F05265', border: '#F05265', text: '#F5F7FC' };
      default:
        return { bg: '#111A2E', border: '#23345A', text: '#F5F7FC' };
    }
  };

  return (
    <div className="bg-navy-800 rounded-xl border border-slate-800 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-navy-700 gap-3">
        <div>
          <h4 className="text-sm font-semibold text-softwhite flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-gold" />
            <span>Topological Attack-Path Traversal</span>
          </h4>
          <p className="text-xs text-mutedslate mt-0.5 font-mono">
            Click on any entity node to inspect telemetry, credentials and pivot evidence.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-soccritical" />
            <span className="text-mutedslate">Attacker / Critical Target</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-socwarning" />
            <span className="text-mutedslate">Compromised</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-royal" />
            <span className="text-mutedslate">Affected Host</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="overflow-x-auto py-6">
        <svg width={svgWidth} height="220" className="mx-auto block">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6D5AE6" />
            </marker>
          </defs>

          {/* Directed Edges */}
          {nodePositions.map((pos, idx) => {
            if (idx === nodePositions.length - 1) return null;
            const nextPos = nodePositions[idx + 1];
            const matchingEdge = edges.find(
              (e) => e.source === pos.id && e.target === nextPos.id
            ) || edges[idx];

            return (
              <g key={`edge-${pos.id}-${nextPos.id}`}>
                <line
                  x1={pos.x + 32}
                  y1={pos.y}
                  x2={nextPos.x - 38}
                  y2={nextPos.y}
                  stroke="#6D5AE6"
                  strokeWidth="2.5"
                  strokeDasharray="6,4"
                  markerEnd="url(#arrowhead)"
                  className="transition-all"
                />
                {matchingEdge && (
                  <text
                    x={(pos.x + nextPos.x) / 2}
                    y={pos.y - 14}
                    fill="#D8B875"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none font-semibold"
                  >
                    {matchingEdge.stage || matchingEdge.relation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodePositions.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const colors = getNodeColor(node.status);
            const Icon = getNodeIcon(node.type);

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
                  fill="#111A2E"
                  stroke={isSelected ? '#D8B875' : colors.border}
                  strokeWidth={isSelected ? '3' : '2'}
                  className="transition-all duration-200 group-hover:scale-105"
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
                  <Icon className="w-5 h-5 text-softwhite" />
                </foreignObject>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 48}
                  fill={isSelected ? '#F5F7FC' : '#94A3B8'}
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
                  fill="#6D5AE6"
                  fontSize="9"
                  textAnchor="middle"
                  className="select-none font-mono uppercase"
                >
                  {node.type.replace('_', ' ')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl bg-navy-900 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-navy-800 border border-royal/30 text-royal-200">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-softwhite font-mono">{selectedNode.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-royal/20 text-royal-200 uppercase font-mono font-bold">
                  {selectedNode.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-socwarning uppercase font-mono">
                  {selectedNode.status}
                </span>
              </div>
              <p className="text-xs text-mutedslate mt-1 font-mono">
                Entity ID: <span className="text-softwhite">{selectedNode.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            {selectedNode.details && Object.entries(selectedNode.details).map(([k, v]) => (
              <div key={k} className="px-3 py-1.5 rounded-lg bg-navy-800 border border-slate-800">
                <span className="text-mutedslate capitalize">{k}: </span>
                <span className="text-softwhite font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
