import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import {
  Crosshair,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
  AlertOctagon,
  CheckCircle2,
  Clock
} from 'lucide-react'

export function AttackSimulation() {
  const [scenarios, setScenarios] = useState([])
  const [executions, setExecutions] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [launchingScenario, setLaunchingScenario] = useState(null)
  const [targetIp, setTargetIp] = useState('10.0.0.5')
  const [isLaunching, setIsLaunching] = useState(false)

  const defaultScenarios = [
    {
      id: 'SCENARIO-1',
      name: 'External Reconnaissance & Port Scan',
      description: 'Executes SYN stealth sweep across ports 1-1024 detecting firewall and service responses.',
      mitre: 'T1046 (Network Service Discovery)',
      intensity: 'LOW',
      target: '10.0.0.5'
    },
    {
      id: 'SCENARIO-2',
      name: 'Distributed SSH Brute Force Campaign',
      description: 'Generates multi-source dictionary attack bursts against SSH services.',
      mitre: 'T1110.001 (Password Guessing)',
      intensity: 'MEDIUM',
      target: '10.0.0.5'
    },
    {
      id: 'SCENARIO-3',
      name: 'Lateral Movement & Credential Dumping',
      description: 'Simulates PsExec / SMB traversal and LSASS process memory inspection.',
      mitre: 'T1021.002, T1003.001',
      intensity: 'HIGH',
      target: 'srv-domain-01'
    },
    {
      id: 'SCENARIO-4',
      name: 'DNS Tunneling & Data Exfiltration',
      description: 'Simulates chunked base64 payload exfiltration over encoded DNS TXT queries.',
      mitre: 'T1071.004, T1048',
      intensity: 'HIGH',
      target: 'gw-edge-01'
    },
    {
      id: 'SCENARIO-5',
      name: 'Ransomware Canary Modification Burst',
      description: 'Rapid creation and encryption simulation of canary files in temporary directories.',
      mitre: 'T1486 (Data Encrypted for Impact)',
      intensity: 'CRITICAL',
      target: 'ws-finance-01'
    }
  ]

  const fetchData = async () => {
    try {
      setLoading(true)
      const [scenList, execList, simStatus] = await Promise.all([
        api.getSimulationScenarios().catch(() => defaultScenarios),
        api.getSimulationExecutions().catch(() => []),
        api.getSimulationStatus().catch(() => ({ status: 'IDLE' }))
      ])
      setScenarios(scenList && scenList.length > 0 ? scenList : defaultScenarios)
      setExecutions(execList || [])
      setStatus(simStatus || { status: 'IDLE' })
    } catch (err) {
      console.error('Failed to load simulations', err)
      setScenarios(defaultScenarios)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLaunch = async (e) => {
    e.preventDefault()
    if (!launchingScenario) return
    try {
      setIsLaunching(true)
      await api.launchSimulation({
        scenario_id: launchingScenario.id,
        target_ip: targetIp
      })
      setLaunchingScenario(null)
      await fetchData()
    } catch (err) {
      console.error('Failed to launch simulation', err)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStop = async (executionId) => {
    try {
      await api.stopSimulation(executionId)
      await fetchData()
    } catch (err) {
      console.error('Failed to stop simulation', err)
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Crosshair className="w-6 h-6 text-rose-400" />
              <span>Adversary Attack Simulation Console</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold">
              Breach & Attack Simulation (BAS)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Execute controlled adversary emulation campaigns against virtual nodes to test multi-agent detection and SOAR containment
          </p>
        </div>

        <Button variant="secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Scenario Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scen) => (
          <div
            key={scen.id}
            className="p-5 rounded-2xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-purple-400 text-xs font-bold">{scen.id}</span>
                <Badge type={scen.intensity || 'HIGH'}>{scen.intensity || 'HIGH'}</Badge>
              </div>

              <h3 className="font-bold text-white text-sm">{scen.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{scen.description}</p>

              <div className="mt-3 p-2.5 rounded-xl bg-[#090d16] border border-[#182130] font-mono text-[11px] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>MITRE TTP:</span>
                  <span className="text-cyan-400">{scen.mitre}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target Node:</span>
                  <span className="text-white">{scen.target || 'srv-domain-01'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#182130] flex justify-end">
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  setLaunchingScenario(scen)
                  setTargetIp(scen.target || '10.0.0.5')
                }}
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                <span>Launch Attack</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Historical Simulation Executions */}
      <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Simulation Execution History</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">{executions.length} historical runs</span>
        </div>

        <div className="overflow-x-auto">
          {executions.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                  <th className="pb-3">Execution ID</th>
                  <th className="pb-3">Scenario</th>
                  <th className="pb-3">Target Node</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Events Injected</th>
                  <th className="pb-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {executions.map((exec) => (
                  <tr key={exec.id || exec.execution_id} className="hover:bg-purple-950/10">
                    <td className="py-3 text-purple-400 font-bold">{String(exec.id || exec.execution_id || '').substring(0, 16)}</td>
                    <td className="py-3 text-white font-semibold">{exec.scenario_name || exec.scenario_id}</td>
                    <td className="py-3 text-cyan-400">{exec.target_ip || '10.0.0.5'}</td>
                    <td className="py-3">
                      <Badge type={exec.status}>{exec.status}</Badge>
                    </td>
                    <td className="py-3 text-emerald-400">{exec.events_count || 48} events</td>
                    <td className="py-3 text-right">
                      {exec.status === 'RUNNING' && (
                        <button
                          onClick={() => handleStop(exec.id || exec.execution_id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] hover:bg-rose-900/40 transition-colors"
                        >
                          <Square className="w-3 h-3 inline mr-1" />
                          Stop
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No simulation executions recorded yet. Select a scenario above to test detections.
            </div>
          )}
        </div>
      </div>

      {/* Launch Scenario Modal */}
      <Modal
        isOpen={!!launchingScenario}
        onClose={() => setLaunchingScenario(null)}
        title={`Launch Scenario: ${launchingScenario?.name || ''}`}
        maxWidth="max-w-md"
      >
        {launchingScenario && (
          <form onSubmit={handleLaunch} className="space-y-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736] text-slate-300 space-y-1">
              <div><span className="text-slate-500">Scenario ID:</span> {launchingScenario.id}</div>
              <div><span className="text-slate-500">MITRE ATT&CK:</span> {launchingScenario.mitre}</div>
              <div><span className="text-slate-500">Intensity:</span> {launchingScenario.intensity}</div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Target Host IP / Entity</label>
              <input
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setLaunchingScenario(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={isLaunching}>
                <Play className="w-3.5 h-3.5 mr-1" />
                <span>{isLaunching ? 'Injecting Telemetry...' : 'Start Emulation'}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

