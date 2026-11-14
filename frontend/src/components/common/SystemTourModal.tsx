import React, { useState } from 'react';
import {
  X,
  Shield,
  Layers,
  Crosshair,
  Bot,
  ShieldAlert,
  Zap,
  Activity,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Server,
  Radio,
  FileCheck,
  Eye
} from 'lucide-react';

interface SystemTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemTourModal: React.FC<SystemTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      id: 'overview',
      title: '1. What is ROYAL SOC?',
      subtitle: 'Autonomous Threat Detection & Response Platform',
      icon: Shield,
      iconColor: 'text-royal-300',
      badgeBg: 'bg-royal/20 border-royal/40',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-softwhite">ROYAL SOC</strong> is an automated Security Operations Center that monitors computers, servers, and network connections 24/7.
          </p>
          <div className="p-3 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-softwhite flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>What problem does it solve?</span>
            </h4>
            <p>
              Traditional security analysts are overwhelmed by thousands of disconnected alerts every day (alert fatigue). ROYAL SOC automatically correlates signals, determines root causes, and neutralizes threats at machine speed.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-navy-900 border border-navy-800">
              <span className="text-gold font-bold block mb-1">01. INGEST</span>
              Captures logs across endpoints, servers, and network flows.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-900 border border-navy-800">
              <span className="text-royal-300 font-bold block mb-1">02. REASON</span>
              10 specialized AI agents correlate evidence into incidents.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-900 border border-navy-800">
              <span className="text-emerald-400 font-bold block mb-1">03. DEFEND</span>
              SOAR containment blocks threats and verifies outcomes.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-sources',
      title: '2. Where Does Security Data Come From?',
      subtitle: 'Continuous Telemetry Collection Across 5 Vectors',
      icon: Layers,
      iconColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/15 border-blue-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            The system continuously collects security signals through modular adapters that normalize diverse formats into a standardized schema (<code className="text-royal-200">SecurityEvent</code>).
          </p>
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-navy-950/70 border border-slate-800 flex items-start space-x-2.5">
              <span className="text-xs font-bold text-amber-300 font-mono w-28 flex-shrink-0">Authentication:</span>
              <span>Captures SSH sign-ins, sudo commands, and failed password attempts (<code className="text-slate-400">/var/log/auth.log</code>).</span>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950/70 border border-slate-800 flex items-start space-x-2.5">
              <span className="text-xs font-bold text-blue-300 font-mono w-28 flex-shrink-0">Network Flows:</span>
              <span>Monitors TCP/UDP connection attempts, port sweeps, and data transfer volumes.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950/70 border border-slate-800 flex items-start space-x-2.5">
              <span className="text-xs font-bold text-purple-300 font-mono w-28 flex-shrink-0">Endpoint Activity:</span>
              <span>Watches process commands (<code className="text-slate-400">powershell</code>, <code className="text-slate-400">certutil</code>) and access to sensitive files (<code className="text-slate-400">/etc/shadow</code>).</span>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950/70 border border-slate-800 flex items-start space-x-2.5">
              <span className="text-xs font-bold text-emerald-300 font-mono w-28 flex-shrink-0">Virtual Lab Nodes:</span>
              <span>Direct telemetry from Endpoint, Server, and Attacker nodes (<code className="text-slate-400">192.168.56.0/24</code>).</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'detection',
      title: '3. How Are Threats Detected?',
      subtitle: 'Hybrid Defense: Rules + Unsupervised ML + Supervised ML',
      icon: Crosshair,
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Rather than relying on a single method, ROYAL SOC combines three complementary detection engines:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-royal-200 block">12 MITRE Rules</span>
              <p className="text-[11px] text-slate-400">
                Deterministic signatures catching known attack tactics like Brute Force (T1110) or LOLBins (T1059.001) with 100% precision.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-amber-300 block">Isolation Forest</span>
              <p className="text-[11px] text-slate-400">
                Unsupervised anomaly model analyzing 7 statistical features (ports, hours, command length) to detect zero-day anomalies.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-emerald-300 block">Random Forest</span>
              <p className="text-[11px] text-slate-400">
                100-tree classifier trained on authentic UNSW-NB15 & CICIDS2017 datasets to identify malicious flow patterns.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'agents',
      title: '4. What Do the 10 AI Agents Do?',
      subtitle: 'Specialized Autonomous Software Analysts',
      icon: Bot,
      iconColor: 'text-royal-300',
      badgeBg: 'bg-royal/20 border-royal/40',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Each agent is an autonomous specialist programmed to evaluate specific aspects of security evidence:
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">1. Network Agent:</strong> Evaluates traffic volumes & sweeps.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">2. Auth Agent:</strong> Detects login bursts & spraying.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">3. Endpoint Agent:</strong> Watches processes & file access.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">4. Malicious Behav. Agent:</strong> Detects LOLBins & ransomware.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">5. Anomaly Agent:</strong> Scores statistical outlier vectors.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">6. Threat Intel Agent:</strong> Enriches external IOC reputations.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">7. Correlation Agent:</strong> Chains detections into incidents.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">8. Attack-Path Agent:</strong> Maps multi-hop network graphs.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">9. Investigation Agent:</strong> Generates 8-question RCA stories.
            </div>
            <div className="p-2 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-softwhite">10. Response Agent:</strong> Proposes SOAR containment plans.
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Note: Agents run locally and deterministically with sub-millisecond execution times without external API delays.
          </p>
        </div>
      )
    },
    {
      id: 'incidents',
      title: '5. How Are Incidents Created & Scored?',
      subtitle: 'Entity Pivoting, 7-Factor Risk & 8-Question RCA',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 border-rose-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            When multiple findings involve the same user, IP, or host, the <strong>Correlation Agent</strong> groups them into a single <strong>Incident</strong>.
          </p>
          <div className="p-3 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-softwhite">Calibrated 7-Factor Risk Score (0 to 100)</h4>
            <p className="text-[11px] text-slate-400">
              Scores are calculated mathematically based on: Attack Progression Stage (25-90), Detection Confidence, Asset Importance (1.0x - 1.35x), Account Privilege (1.0x - 1.25x), Threat Intel bonus, and Evidence Volume.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-navy-950/70 border border-slate-800 space-y-1">
            <h4 className="font-semibold text-softwhite">Automated Root Cause Analysis (RCA)</h4>
            <p className="text-[11px] text-slate-400">
              The Investigation Agent automatically writes answers to: Who attacked, What happened, When it occurred, Where it hit, Why it succeeded, How they moved, Impact assessment, and Remediation steps.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'soar',
      title: '6. How Do SOAR Responses & Verification Work?',
      subtitle: 'Human-in-the-Loop Containment with Real Verification',
      icon: Zap,
      iconColor: 'text-gold',
      badgeBg: 'bg-gold/15 border-gold/40',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            To stop attacks before damage spreads, the system prepares automated defensive containment playbooks:
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-amber-300">1. Recommendation:</strong> Response Agent recommends actions (e.g. <code className="text-slate-300">BLOCK_IP</code>, <code className="text-slate-300">ISOLATE_ENDPOINT</code>, <code className="text-slate-300">DISABLE_USER</code>).
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-violet-300">2. Dry Run / Simulation:</strong> The administrator previews the exact command and expected effect without touching live infrastructure.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-cyan-300">3. Administrator Authorization:</strong> An authorized SOC Admin approves the action, creating an immutable audit record.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <strong className="text-emerald-400">4. Empirical Verification:</strong> After execution, the Verification Engine tests network sockets or firewall tables to prove subsequent packets are dropped.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard-guide',
      title: '7. How to Interpret the Dashboard',
      subtitle: 'Understanding Cards, Colors & Next Actions',
      icon: Activity,
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            The Command Center simplifies complex security data into clear indicators:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <span className="font-bold text-rose-400 block mb-0.5">Critical / High Alerts (Red)</span>
              Severe attacks requiring immediate analyst triage and containment.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <span className="font-bold text-amber-300 block mb-0.5">Pending Approvals (Gold)</span>
              Automated actions waiting for you to review and authorize.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-0.5">Online / Verified (Green)</span>
              Monitors are healthy and threats have been proven contained.
            </div>
            <div className="p-2.5 rounded-lg bg-navy-950 border border-slate-800">
              <span className="font-bold text-royal-200 block mb-0.5">Guided Workflow (Steps 1-6)</span>
              Click through the 6 natural steps to triage, analyze, and resolve threats.
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <strong>Recommended Next Step:</strong> Check the "What Needs Your Attention?" card on the dashboard or launch a scenario from the Demo Attack Lab!
          </div>
        </div>
      )
    }
  ];

  const current = tourSteps[currentStep];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-navy-700">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${current.badgeBg}`}>
              <Icon className={`w-5 h-5 ${current.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-softwhite">{current.title}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700">
                  Step {currentStep + 1} of {tourSteps.length}
                </span>
              </div>
              <p className="text-xs text-mutedslate mt-0.5">{current.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-mutedslate hover:text-softwhite hover:bg-navy-800 transition"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center space-x-1.5 my-3.5 overflow-x-auto pb-1">
          {tourSteps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all duration-200 flex-1 min-w-[28px] ${
                idx === currentStep
                  ? 'bg-royal shadow-sm shadow-royal/40'
                  : idx < currentStep
                  ? 'bg-emerald-500/60'
                  : 'bg-navy-800 hover:bg-navy-700'
              }`}
              title={step.title}
            />
          ))}
        </div>

        {/* Dynamic Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 my-2">
          {current.content}
        </div>

        {/* Footer Navigation Controls */}
        <div className="mt-4 pt-3.5 border-t border-navy-700 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-slate-400 font-mono">
            {currentStep + 1} / {tourSteps.length}
          </span>

          {currentStep < tourSteps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-royal text-softwhite hover:bg-royal/80 text-xs font-semibold font-mono transition shadow-lg shadow-royal/20"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-softwhite hover:bg-emerald-500 text-xs font-semibold font-mono transition shadow-lg shadow-emerald-900/30"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Start Exploring</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
