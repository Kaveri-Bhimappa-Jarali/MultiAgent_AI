import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { EvaluationRun } from '../types';
import { Database, Play, BarChart2, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export const EvaluationLab: React.FC = () => {
  const [datasetName, setDatasetName] = useState('UNSW-NB15');
  const [modelType, setModelType] = useState('Random Forest');
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [activeRun, setActiveRun] = useState<EvaluationRun | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await api.getEvaluationRuns();
      setRuns(res);
      if (res.length > 0 && !activeRun) {
        setActiveRun(res[0]);
      }
    } catch (err) {
      console.error('Failed to load evaluation runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      const res = await api.runEvaluation(datasetName, modelType);
      setActiveRun(res);
      setRuns((prev) => [res, ...prev]);
    } catch (err) {
      console.error('Failed to execute evaluation', err);
    } finally {
      setEvaluating(false);
    }
  };

  const featureData = activeRun?.feature_importance
    ? Object.entries(activeRun.feature_importance).map(([feature, importance]) => ({
        feature,
        importance: Math.round(importance * 1000) / 10,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
          <span>HISTORICAL DATASET LAB & ML BENCHMARK EVALUATION</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
            EMPIRICAL VALIDATION
          </span>
        </h1>
        <p className="text-xs text-mutedslate mt-1 font-mono">
          Train and evaluate supervised detection models on standard cybersecurity datasets (UNSW-NB15, CICIDS2017) with strict train/test isolation.
        </p>
      </div>

      {/* Control Benchmarking Panel */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
          <Database className="w-4 h-4 text-gold" />
          <span>Configure Benchmark Experiment</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="block text-mutedslate mb-1.5">Benchmark Dataset</label>
            <select
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-softwhite focus:border-royal outline-none"
            >
              <option value="UNSW-NB15">UNSW-NB15 (Flow Features & Packet Metrics)</option>
              <option value="CICIDS2017">CICIDS2017 (Inter-Arrival Time & Volumetric)</option>
            </select>
          </div>

          <div>
            <label className="block text-mutedslate mb-1.5">Classifier Architecture</label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-softwhite focus:border-royal outline-none"
            >
              <option value="Random Forest">Random Forest (Ensemble 100 Trees)</option>
              <option value="Decision Tree">Decision Tree (Cart Max Depth 6)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${evaluating ? 'animate-spin' : ''}`} />
              <span>{evaluating ? 'Fitting & Testing ML Model...' : 'Execute Evaluation Run'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Run Metrics Results */}
      {activeRun && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 text-center">
              <span className="text-[10px] text-mutedslate uppercase">Accuracy</span>
              <p className="text-2xl font-bold text-socsuccess mt-1">{Math.round(activeRun.accuracy * 1000) / 10}%</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 text-center">
              <span className="text-[10px] text-mutedslate uppercase">Precision</span>
              <p className="text-2xl font-bold text-royal-200 mt-1">{Math.round(activeRun.precision * 1000) / 10}%</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 text-center">
              <span className="text-[10px] text-mutedslate uppercase">Recall (Detection Rate)</span>
              <p className="text-2xl font-bold text-gold mt-1">{Math.round(activeRun.recall * 1000) / 10}%</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 text-center">
              <span className="text-[10px] text-mutedslate uppercase">F1-Score</span>
              <p className="text-2xl font-bold text-softwhite mt-1">{Math.round(activeRun.f1_score * 1000) / 10}%</p>
            </div>
            <div className="p-4 rounded-xl bg-navy-800 border border-slate-800 text-center">
              <span className="text-[10px] text-mutedslate uppercase">False Positive Rate</span>
              <p className="text-2xl font-bold text-soccritical mt-1">{Math.round(activeRun.false_positive_rate * 1000) / 10}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-royal-200" />
                <span>Empirical Confusion Matrix</span>
              </h3>

              <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 font-mono text-xs">
                <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-slate-800 font-bold text-mutedslate">
                  <div>Actual \ Pred</div>
                  <div className="text-socsuccess">Pred: NORMAL</div>
                  <div className="text-soccritical">Pred: ATTACK</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-b border-navy-800">
                  <div className="text-mutedslate font-bold">Act: NORMAL</div>
                  <div className="p-2 rounded bg-navy-950 text-socsuccess font-bold">
                    TN: {activeRun.confusion_matrix[0][0]}
                  </div>
                  <div className="p-2 rounded bg-navy-950 text-soccritical font-bold">
                    FP: {activeRun.confusion_matrix[0][1]}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="text-mutedslate font-bold">Act: ATTACK</div>
                  <div className="p-2 rounded bg-navy-950 text-socwarning font-bold">
                    FN: {activeRun.confusion_matrix[1][0]}
                  </div>
                  <div className="p-2 rounded bg-navy-950 text-socsuccess font-bold">
                    TP: {activeRun.confusion_matrix[1][1]}
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-mutedslate space-y-1">
                <p>Dataset Sample Size: <span className="text-softwhite">{activeRun.sample_size} records</span></p>
                <p>Run Identifier: <span className="text-royal-200">{activeRun.run_id}</span></p>
                <p>Evaluation Timestamp: <span className="text-softwhite">{new Date(activeRun.evaluated_at).toUTCString()}</span></p>
              </div>
            </div>

            {/* Feature Importance */}
            <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                <span>Feature Importance Weights (%)</span>
              </h3>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureData} layout="vertical">
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} domain={[0, 'dataMax + 10']} />
                    <YAxis dataKey="feature" type="category" stroke="#94A3B8" fontSize={10} width={110} />
                    <Tooltip contentStyle={{ backgroundColor: '#111A2E', borderColor: '#23345A', borderRadius: '8px' }} />
                    <Bar dataKey="importance" fill="#6D5AE6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Runs Table */}
      <div className="bg-navy-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
        <div className="p-4 bg-navy-950/70 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-softwhite">Historical Evaluation Runs ({runs.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-navy-950/80 border-b border-navy-700 text-mutedslate uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Dataset</th>
                <th className="py-3 px-4">Model Type</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">F1-Score</th>
                <th className="py-3 px-4">FPR</th>
                <th className="py-3 px-4">Evaluated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 text-softwhite">
              {runs.map((r) => (
                <tr
                  key={r.run_id}
                  onClick={() => setActiveRun(r)}
                  className={`hover:bg-navy-700/40 cursor-pointer transition ${
                    activeRun?.run_id === r.run_id ? 'bg-royal/15 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-royal-200">{r.run_id}</td>
                  <td className="py-3 px-4">{r.dataset_name}</td>
                  <td className="py-3 px-4 text-gold">{r.model_type}</td>
                  <td className="py-3 px-4 text-socsuccess">{Math.round(r.accuracy * 1000) / 10}%</td>
                  <td className="py-3 px-4">{Math.round(r.f1_score * 1000) / 10}%</td>
                  <td className="py-3 px-4 text-soccritical">{Math.round(r.false_positive_rate * 1000) / 10}%</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(r.evaluated_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
