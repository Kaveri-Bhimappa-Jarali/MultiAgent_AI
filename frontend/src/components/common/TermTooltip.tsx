import React, { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

export const GLOSSARY: Record<string, { title: string; explanation: string; example?: string }> = {
  'Security Event': {
    title: 'Security Event',
    explanation: 'A raw record or log signal generated when an action occurs on a system, such as a user sign-in, file change, or network connection.',
    example: 'E.g., Failed SSH login attempt from 192.168.1.50'
  },
  'Detection': {
    title: 'Detection / Alert Finding',
    explanation: 'A flag raised when security rules or Machine Learning models identify suspicious behavior matching known attack techniques or anomalies.',
    example: 'E.g., Rule T1110 triggered after 5 consecutive login failures'
  },
  'Incident': {
    title: 'Security Incident',
    explanation: 'A confirmed, prioritized security case created by correlating related detections to give analysts the complete story of an attack.',
    example: 'E.g., Brute force followed by privilege escalation on Enterprise Server'
  },
  'Severity': {
    title: 'Severity Level',
    explanation: 'A standardized indicator (Critical, High, Medium, Low, Info) describing how dangerous a threat is and how urgently it must be handled.',
    example: 'Critical = immediate harm; Medium = suspicious anomaly'
  },
  'Risk Score': {
    title: 'Risk Score (0 to 100)',
    explanation: 'A calculated danger rating based on asset importance, attack stage, threat severity, and detection confidence.',
    example: 'Score > 75 triggers immediate administrator alerts'
  },
  'AI Agent': {
    title: 'Autonomous AI Agent',
    explanation: 'A specialized software analyst that automatically investigates evidence, traces network paths, checks threat feeds, or plans containment.',
    example: 'E.g., Authentication Specialist Agent examining failed logins'
  },
  'MITRE ATT&CK': {
    title: 'MITRE ATT&CK Framework',
    explanation: 'A globally standard knowledge base documenting real-world cyber adversary tactics, techniques, and procedures (TTPs).',
    example: 'E.g., T1078 (Valid Accounts), T1059 (Command Execution)'
  },
  'SOAR': {
    title: 'SOAR Containment',
    explanation: 'Security Orchestration, Automation, and Response: automated actions taken to stop an attack, like blocking an IP or isolating an endpoint.',
    example: 'E.g., Blocking malicious IP on guest firewall'
  },
  'Response Verification': {
    title: 'Response Verification',
    explanation: 'An automated post-execution check that tests whether a defensive action succeeded and confirms the threat is genuinely contained.',
    example: 'E.g., Probing firewall rules to confirm packet drop'
  }
};

interface TermTooltipProps {
  term: keyof typeof GLOSSARY | string;
  children?: React.ReactNode;
}

export const TermTooltip: React.FC<TermTooltipProps> = ({ term, children }) => {
  const [open, setOpen] = useState(false);
  const info = GLOSSARY[term] || {
    title: term,
    explanation: 'Cybersecurity metric monitored in the SOC pipeline.'
  };

  return (
    <span className="relative inline-flex items-center">
      <span
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-softwhite transition decoration-dotted underline underline-offset-2"
        title="Click to view explanation"
      >
        <span>{children || term}</span>
        <HelpCircle className="w-3.5 h-3.5 text-royal-300 inline flex-shrink-0" />
      </span>

      {open && (
        <span
          className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3 bg-navy-950 border border-royal/50 rounded-xl shadow-2xl text-left block pointer-events-none animate-in fade-in"
          style={{ minWidth: '260px' }}
        >
          <span className="flex items-center space-x-1.5 text-xs font-bold text-softwhite mb-1 block">
            <Info className="w-3.5 h-3.5 text-royal-300 inline" />
            <span>{info.title}</span>
          </span>
          <span className="text-[11px] text-slate-300 font-normal leading-relaxed block">
            {info.explanation}
          </span>
          {info.example && (
            <span className="text-[10px] text-royal-200 font-mono mt-1.5 pt-1.5 border-t border-navy-800 block">
              {info.example}
            </span>
          )}
        </span>
      )}
    </span>
  );
};
