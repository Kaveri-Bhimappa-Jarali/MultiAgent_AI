import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import { LabActivity } from '../../types';
import { formatSocTimestamp } from '../../utils/timestamps.js';

const colors = ['#38bdf8', '#fbbf24', '#a78bfa', '#94a3b8'];
const tooltipStyle = { width: 200, whiteSpace: 'normal' as const, background: '#0B1020', border: '1px solid #334155', borderRadius: 12, color: '#f8fafc' };
const connected = (status: string) => ['CONNECTED', 'RECEIVING_TELEMETRY'].includes(status);
const timeLabel = (timestamp: string) => new Date(timestamp).toLocaleTimeString('en-IN', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
});

export const LiveLabOverview = React.memo(function LiveLabOverview() {
  const [minutes, setMinutes] = useState(60);
  const [snapshot, setSnapshot] = useState<LabActivity | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await api.getLabActivity(minutes);
      if (version !== requestVersion.current) return;
      setSnapshot(result);
      setError('');
    } catch {
      if (version === requestVersion.current) setError('Cannot refresh lab activity. Check the SOC backend connection.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [minutes]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => { if (!document.hidden) refresh(); }, 10000);
    return () => { clearInterval(interval); requestVersion.current += 1; };
  }, [refresh]);

  const rangeLabel = snapshot?.window_minutes === 1440 ? '24 hours' : `${snapshot?.window_minutes ?? minutes} minutes`;

  return (
    <section aria-labelledby="live-lab-title" className="min-h-[564px] rounded-2xl border border-sky-400/20 bg-midnight/90 p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="live-lab-title" className="text-lg font-bold text-white">VM telemetry</h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="lab-time-range">Lab activity time range</label>
          <select id="lab-time-range" value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white">
            <option value={15}>Last 15 minutes</option><option value={60}>Last hour</option><option value={1440}>Last 24 hours</option>
          </select>
          <button onClick={refresh} disabled={loading} aria-label="Refresh lab activity" className="p-2 rounded-lg border border-white/15 text-sky-300 disabled:opacity-50 hover:bg-white/5"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <p role="alert" className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-sm rounded-lg bg-slate-950 border border-amber-500/30 p-3 text-xs text-amber-200">{error}{snapshot ? ' Showing the last successful snapshot.' : ''}</p>}
      {!snapshot ? <p role="status" className="py-8 text-sm text-softwhite/60">{loading ? 'Loading VM connections and telemetry…' : 'Lab activity is unavailable.'}</p> : <>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-softwhite/60">VMs reporting <strong className="text-emerald-300 ml-1">{snapshot.nodes.filter(item => connected(item.status)).length} / {snapshot.nodes.length}</strong></span>
          {snapshot.nodes.map(item => <span key={item.vm_id} className={`rounded-full border px-2.5 py-1 text-[10px] ${connected(item.status) ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-400/20 text-amber-300'}`}>
            {item.vm_id === 'vm-attacker-01' ? 'Attacker' : 'Victim'} · {item.status.replace(/_/g, ' ').toLowerCase()}
          </span>)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 min-w-0">
            <h3 className="text-sm text-white font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-sky-400" />Telemetry received over time</h3>
            <p className="text-[11px] text-softwhite/50 mt-1 mb-4">{snapshot.bucket_minutes}-minute buckets · IST · last {rangeLabel}</p>
            <div className="flex gap-4 text-[11px] mb-3"><span className="text-amber-300">● Attacker</span><span className="text-sky-300">● Victim</span></div>
            <div role="img" aria-label={`Telemetry received in the last ${rangeLabel}: ${snapshot.total_events} events`}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={snapshot.buckets} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0c" vertical={false} />
                  <XAxis dataKey="timestamp" tickFormatter={timeLabel} tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={32} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip position={{ x: 0, y: 0 }} wrapperStyle={{ maxWidth: '100%' }} contentStyle={tooltipStyle} labelFormatter={value => `${formatSocTimestamp(String(value))} · bucket start`} />
                  <Area type="linear" dataKey="attacker" name="Attacker events" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.08} strokeWidth={2} isAnimationActive={false} />
                  <Area type="linear" dataKey="victim" name="Victim events" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm text-white font-semibold">What the VMs are reporting</h3>
            <p className="text-[11px] text-softwhite/50 mt-1 mb-4">Event counts in the same time window</p>
            <div role="img" aria-label={snapshot.categories.map(item => `${item.name}: ${item.count}`).join(', ')}>
              <ResponsiveContainer width="100%" height={245}>
                <BarChart data={snapshot.categories} layout="vertical" margin={{ left: 0, right: 28, top: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip position={{ x: 0, y: 0 }} wrapperStyle={{ maxWidth: '100%' }} contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} label={{ position: 'right', fill: '#e2e8f0', fontSize: 11 }}>
                    {snapshot.categories.map((item, index) => <Cell key={item.name} fill={colors[index]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="min-h-10">{snapshot.total_events === 0 && <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-softwhite/70">No real VM telemetry arrived in this window. Choose a longer range or check the guest collectors.</p>}</div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/5 pt-3 text-[10px] text-softwhite/45">
          <span>Authentic VM logs only · counts use received time · refreshes every 10 seconds</span>
          <span>Updated {formatSocTimestamp(snapshot.updated_at)}</span>
        </div>
      </>}
    </section>
  );
});
