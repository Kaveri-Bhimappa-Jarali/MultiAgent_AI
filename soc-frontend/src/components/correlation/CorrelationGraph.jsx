import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitMerge, ShieldAlert, ArrowDown, Zap, CheckCircle2 } from 'lucide-react'

export function CorrelationGraph({ incident, onSelectEventNode }) {
  const [selectedNodeId, setSelectedNodeId] = useState('EVT-1001')

  const nodes = [
    {
      id: 'EVT-1001',
      title: 'Failed Login',
      sub: 'Single SSH Failure',
      time: '10:42:31',
      source: '192.168.1.45',
      category: 'Authentication',
      color: '#ef4444',
      stage: 'Initial Probe'
    },
    {
      id: 'EVT-1002',
      title: 'Multiple Failed Logins',
      sub: '48 attempts in 14s',
      time: '10:42:45',
      source: '192.168.1.45',
      category: 'Authentication',
      color: '#f97316',
      stage: 'Credential Velocity Spike'
    },
    {
      id: 'EVT-1003',
      title: 'Port Scanning',
      sub: 'SYN Scan across 6 ports',
      time: '10:43:02',
      source: '192.168.1.45',
      category: 'Network',
      color: '#d946ef',
      stage: 'Reconnaissance Expansion'
    },
    {
      id: 'EVT-1004',
      title: 'Suspicious Network Access',
      sub: 'Target: PostgreSQL Cluster',
      time: '10:43:18',
      source: '192.168.1.45',
      category: 'Network / DB',
      color: '#8b5cf6',
      stage: 'Database Access Pivot'
    },
  ]

  const handleNodeClick = (node) => {
    setSelectedNodeId(node.id)
    if (onSelectEventNode) onSelectEventNode(node)
  }

  return (
    <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <GitMerge className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Attack Chain Topology Graph
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Temporal correlation graph clustering individual telemetry events by source adversary IP: <span className="font-mono text-purple-300">192.168.1.45</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-purple-950/50 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-purple-400 animate-pulse" />
            <span>4 Linked Signals</span>
          </span>
        </div>
      </div>

      {/* Visual Attack Chain Graph Flow */}
      <div className="py-4 relative flex flex-col items-center max-w-xl mx-auto w-full">
        {nodes.map((node, index) => {
          const isSelected = selectedNodeId === node.id
          const isLast = index === nodes.length - 1

          return (
            <React.Fragment key={node.id}>
              {/* Event Node */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => handleNodeClick(node)}
                className={`w-full p-4 rounded-xl border cursor-pointer transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-950/60 to-slate-900 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                    : 'bg-[#090d16] border-[#1e2736] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border"
                      style={{
                        backgroundColor: `${node.color}20`,
                        borderColor: `${node.color}50`,
                        color: node.color
                      }}
                    >
                      0{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{node.id}</span>
                        <span className="text-[11px] font-bold text-purple-300">({node.title})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{node.sub}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-400">{node.time}</div>
                    <div className="text-[10px] font-mono text-cyan-300">{node.source}</div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#182130] flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 uppercase font-semibold">Tactic: {node.stage}</span>
                  <span className="text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Correlated</span>
                  </span>
                </div>
              </motion.div>

              {/* Connecting animated arrow */}
              {!isLast && (
                <div className="my-2 flex flex-col items-center">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-fuchsia-500 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <ArrowDown className="w-4 h-4 text-fuchsia-400 -mt-1" />
                </div>
              )}
            </React.Fragment>
          )
        })}

        {/* Synthesis Arrow */}
        <div className="my-3 flex flex-col items-center">
          <div className="w-0.5 h-8 bg-gradient-to-b from-fuchsia-500 to-rose-500" />
          <ArrowDown className="w-5 h-5 text-rose-400 -mt-1 animate-bounce" />
        </div>

        {/* Synthesized Incident Banner */}
        <div className="w-full p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/40 to-slate-900 border border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)] text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-rose-400 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>🔗 Correlated Security Incident Synthesized</span>
          </div>
          <div className="text-base font-extrabold text-white mt-1">
            Possible Brute Force + Network Reconnaissance Attack
          </div>
          <div className="text-xs text-slate-400 mt-1">
            4 Linked Events • Confidence: <span className="text-emerald-400 font-bold">94%</span> • Incident ID: <span className="font-mono text-purple-300">INC-2026-001</span>
          </div>
        </div>
      </div>
    </div>
  )
}
