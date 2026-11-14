import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  const [targetIp, setTargetIp] = useState('')
  const [isLaunching, setIsLaunching] = useState(false)

  const [parameters, setParameters] = useState({})
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const historyBusy = useRef(false)
  const checkingBusy = useRef(false)

  const refreshHistory = useCallback(async () => {
    if (historyBusy.current) return
    historyBusy.current = true
    try { setExecutions(await api.getSimulationExecutions(20)) }
    catch (err) { setError(err.message) }
    finally { historyBusy.current = false }
  }, [])

  const verifyInfrastructure = useCallback(async () => {
    if (checkingBusy.current) return
    checkingBusy.current = true
    setChecking(true)
    try { setStatus(await api.getSimulationStatus()) }
    catch (err) { setError(err.message) }
    finally { setChecking(false); checkingBusy.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.getSimulationScenarios()
      setScenarios(list)
      setError('')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
    refreshHistory()
    verifyInfrastructure()
  }, [refreshHistory, verifyInfrastructure])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => { if (!document.hidden) refreshHistory() }, 5000)
    return () => clearInterval(interval)
  }, [fetchData, refreshHistory])

  const running = executions.some(execution => execution.status === 'RUNNING')

  const handleLaunch = async (e) => {
    e.preventDefault()
    if (!launchingScenario) return
    try {
      setIsLaunching(true)
      await api.launchSimulation({
        scenario_id: launchingScenario.scenario_id,
        target_ip: targetIp,
        parameters
      })
      setLaunchingScenario(null)
      await refreshHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleStop = async (executionId) => {
    try {
      await api.stopSimulation(executionId)
      await refreshHistory()
    } catch (err) {
      setError(err.message)
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

      {error && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">{error}</p>}
      <section aria-label="Live simulation infrastructure" className="rounded-xl border border-cyan-500/20 bg-[#0d121c] p-4 text-xs space-y-2">
        <p className="font-semibold text-white">{checking ? 'Checking VM connections…' : status?.all_ready ? 'Both VMs connected · private route ready' : 'Infrastructure not ready; check VM connections'}</p>
        {status && <div className="flex flex-wrap gap-4 font-mono text-slate-300"><span>Attacker: {status.attacker_vm?.host} / {status.attacker_vm?.private_ip}</span><span>Victim: {status.victim_vm?.host} / {status.victim_vm?.private_ip}</span></div>}
      </section>
      {loading && <p role="status" className="text-xs text-slate-400">Loading supported scenarios…</p>}
      {/* Scenario Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scen) => (
          <div
            key={scen.scenario_id}
            className="p-5 rounded-2xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-purple-400 text-xs font-bold">{scen.scenario_id}</span>
                <Badge type={scen.severity || 'HIGH'}>{scen.severity || 'HIGH'}</Badge>
              </div>

              <h3 className="font-bold text-white text-sm">{scen.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{scen.description}</p>

              <div className="mt-3 p-2.5 rounded-xl bg-[#090d16] border border-[#182130] font-mono text-[11px] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>MITRE TTP:</span>
                  <span className="text-cyan-400">{scen.mitre_technique}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target Node:</span>
                  <span className="text-white">{status?.victim_vm?.private_ip || 'Checking…'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#182130] flex justify-end">
              <Button
                variant="primary"
                size="xs"
                disabled={!status?.all_ready || running}
                onClick={() => {
                  setLaunchingScenario(scen)
                  setTargetIp(status?.victim_vm?.private_ip || status?.allowed_targets?.[0] || '')
                  setParameters({ ...scen.default_parameters })
                  setError('')
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
                  <th className="pb-3">Events Captured</th>
                  <th className="pb-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {executions.map((exec) => (
                  <tr key={exec.execution_id} className="hover:bg-purple-950/10">
                    <td className="py-3 text-purple-400 font-bold">{String(exec.execution_id || '').substring(0, 16)}</td>
                    <td className="py-3 text-white font-semibold">{exec.scenario_name || exec.scenario_id}</td>
                    <td className="py-3 text-cyan-400">{exec.target_ip || '—'}</td>
                    <td className="py-3">
                      <Badge type={exec.status}>{exec.status}</Badge>
                    </td>
                    <td className="py-3 text-emerald-400">{exec.associated_event_ids?.length || 0} events</td>
                    <td className="py-3 text-right">
                      {exec.status === 'RUNNING' && (
                        <button
                          onClick={() => handleStop(exec.execution_id)}
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

      {executions[0] && <section className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736]">
        <h2 className="text-sm font-bold text-white mb-3">Latest execution · {executions[0].execution_id}</h2>
        <pre aria-label="Simulation terminal" className="h-52 overflow-auto overscroll-contain rounded-xl bg-[#090d16] p-3 text-[11px] text-slate-300 whitespace-pre-wrap break-words">{executions[0].raw_logs || 'Waiting for VM output…'}</pre>
      </section>}
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
              <div><span className="text-slate-500">Scenario ID:</span> {launchingScenario.scenario_id}</div>
              <div><span className="text-slate-500">MITRE ATT&CK:</span> {launchingScenario.mitre_technique}</div>
              <div><span className="text-slate-500">Intensity:</span> {launchingScenario.severity}</div>
            </div>

            <div>
              <label htmlFor="soc-target" className="text-slate-400 block mb-1">Victim private IP</label>
              <select id="soc-target" value={targetIp} onChange={event => setTargetIp(event.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white">
                {(status?.allowed_targets || []).map(target => <option key={target} value={target}>{target}</option>)}
              </select>
            </div>
            {Object.entries(launchingScenario.parameter_schema || {}).map(([key, schema]) => <div key={key}>
              <label htmlFor={`soc-param-${key}`} className="text-slate-400 block mb-1">{key.replace(/_/g, ' ')} · {schema.description}</label>
              {schema.enum ? <select id={`soc-param-${key}`} value={parameters[key] ?? schema.default} onChange={event => setParameters(prev => ({ ...prev, [key]: event.target.value }))} className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white">
                {schema.enum.map(option => <option key={option} value={option}>{option}</option>)}
              </select> : <input id={`soc-param-${key}`} type={schema.type === 'integer' ? 'number' : 'text'} min={schema.min} max={schema.max} required value={parameters[key] ?? schema.default ?? ''}
                onChange={event => setParameters(prev => ({ ...prev, [key]: schema.type === 'integer' ? Number(event.target.value) : event.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-[#1e2736] text-white" />}
            </div>)}
            {error && <p role="alert" className="text-amber-300">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setLaunchingScenario(null)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={isLaunching || !targetIp || !status?.allowed_targets?.includes(targetIp)}>
                <Play className="w-3.5 h-3.5 mr-1" />
                <span>{isLaunching ? 'Dispatching to VM…' : 'Start Emulation'}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

