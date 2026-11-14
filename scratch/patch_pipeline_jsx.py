path = 'soc-frontend/src/components/pipeline/MultiAgentPipeline.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''          <button
            onClick={() => setActiveStageTab('stage1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage1'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-200 flex items-center justify-center text-[10px]">1</span>
            <span>Agent Findings</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200 text-[10px]">{totalFindingsCount || findings.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage2'
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-fuchsia-500/30 text-fuchsia-200 flex items-center justify-center text-[10px]">2</span>
            <span>Correlation Agent</span>
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-400/20 text-fuchsia-200 text-[10px]">{correlationFindings.length || incidents.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage3')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage3'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-teal-500/30 text-teal-200 flex items-center justify-center text-[10px]">3</span>
            <span>LLM Threat Findings</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-200 text-[10px]">{llmIncidentFindings.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage4')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage4'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center text-[10px]">4</span>
            <span>Containment: Auto vs Manual</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px]">{responses.length}</span>
          </button>'''

replacement = '''          <button
            onClick={() => setActiveStageTab('stage1')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage1'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[9px] font-bold">STAGE 1</span>
            <span>Agent Findings</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200 text-[10px]">{totalFindingsCount || findings.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage2')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage2'
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/30 text-fuchsia-200 text-[9px] font-bold">STAGE 2</span>
            <span>Correlation Agent</span>
            <span className="px-1.5 py-0.5 rounded bg-fuchsia-400/20 text-fuchsia-200 text-[10px]">{incidents.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage3')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage3'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-200 text-[9px] font-bold">STAGE 3</span>
            <span>LLM Threat Findings</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-200 text-[10px]">{llmIncidentFindings.length}</span>
          </button>

          <button
            onClick={() => setActiveStageTab('stage4')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeStageTab === 'stage4'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-bold">STAGE 4</span>
            <span>Containment: Auto vs Manual</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px]">{responses.length}</span>
          </button>'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated MultiAgentPipeline.jsx tabs')
else:
    print('Target not found in MultiAgentPipeline.jsx')
