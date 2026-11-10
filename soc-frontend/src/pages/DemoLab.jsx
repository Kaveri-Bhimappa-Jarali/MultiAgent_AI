import React, { useState } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  ShieldAlert,
  Server
} from 'lucide-react'

export function DemoLab() {
  const [triggering, setTriggering] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [result, setResult] = useState(null)

  const scenarios = [
    {
      num: 1,
      name: 'Scenario 1: Reconnaissance & Port Sweep',
      mitre: 'T1046 (Network Service Discovery)',
      description: 'Injects a rapid SYN port scan from external IP 198.51.100.22 targeting 15 unique ports on 10.0.0.5.',
      expected: 'Triggers RULE-SCAN-001 â†’ NetworkMonitoringAgent flags port scan.',
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
    },
    {
      num: 2,
      name: 'Scenario 2: SSH Credential Brute Force',
      mitre: 'T1110.001 (Password Guessing)',
      description: 'Simulates 8 rapid failed authentication attempts within 30 seconds followed by 1 successful login.',
      expected: 'Triggers RULE-AUTH-001 & RULE-AUTH-002 â†’ AuthenticationAgent flags account takeover.',
      color: 'border-amber-500/40 bg-amber-950/20 text-amber-300'
    },
    {
      num: 3,
      name: 'Scenario 3: Privilege Escalation & Lateral Movement',
      mitre: 'T1059.001, T1021.002, T1003.001',
      description: 'Injects obfuscated PowerShell command cradle and PsExec traversal from ws-finance-01 to srv-domain-01.',
      expected: 'Triggers EndpointAgent & CorrelationAgent â†’ Synthesizes multi-hop attack graph.',
      color: 'border-rose-500/40 bg-rose-950/20 text-rose-300'
    },
    {
      num: 4,
      name: 'Scenario 4: High-Volume Data Exfiltration',
      mitre: 'T1048 (Exfiltration Over Alternative Protocol)',
      description: 'Simulates anomalous 450 MB data egress flow to external IP over encrypted HTTPS port 8443.',
      expected: 'Triggers Isolation Forest Anomaly + CTI reputation match â†’ Risk Score elevated to 92.',
      color: 'border-purple-500/40 bg-purple-950/20 text-purple-300'
    }
  ]

  const handleTrigger = async (num) => {
    try {
      setTriggering(num)
      setResult(null)
      const res = await api.triggerScenario(num)
      setResult({
        success: true,
        message: `Scenario ${num} injected! Generated ${res.events_injected || 12} events, resulting in alerts and incident correlation.`
      })
    } catch (err) {
      setResult({
        success: false,
        message: `Failed to trigger scenario: ${err.message}`
      })
    } finally {
      setTriggering(null)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Reset all demo events, alerts, and active incidents in the database?')) return
    try {
      setResetting(true)
      await api.resetDemoLab()
      setResult({
        success: true,
        message: 'Demo lab database reset to baseline clean state.'
      })
    } catch (err) {
      setResult({
        success: false,
        message: `Reset failed: ${err.message}`
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-fuchsia-400" />
              <span>Interactive Demo Attack Lab</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/40 text-fuchsia-300 font-mono text-xs font-bold">
              Instant Scenarios
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            One-click adversary scenario triggers to demonstrate live multi-agent detection, risk calculation and SOAR containment
          </p>
        </div>

        <Button variant="danger" onClick={handleReset} disabled={resetting}>
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset Lab to Baseline'}</span>
        </Button>
      </div>

      {result && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            result.success
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}
        >
          {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}

      {/* 4 Interactive Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((scen) => {
          const isCurrent = triggering === scen.num

          return (
            <div
              key={scen.num}
              className="p-6 rounded-2xl bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-lg border font-mono text-xs font-bold ${scen.color}`}>
                    {scen.mitre}
                  </span>
                  <span className="text-xs font-mono text-slate-500">Live Injector</span>
                </div>

                <h3 className="text-base font-bold text-white">{scen.name}</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{scen.description}</p>

                <div className="mt-4 p-3 rounded-xl bg-[#090d16] border border-[#182130] text-[11px] font-mono text-slate-400">
                  <span className="text-purple-300 font-bold block mb-0.5">Expected AI Response:</span>
                  <span>{scen.expected}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#182130] flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => handleTrigger(scen.num)}
                  disabled={isCurrent || triggering !== null}
                >
                  <Play className={`w-3.5 h-3.5 ${isCurrent ? 'animate-spin' : ''}`} />
                  <span>{isCurrent ? 'Injecting Telemetry...' : 'Trigger Scenario'}</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

