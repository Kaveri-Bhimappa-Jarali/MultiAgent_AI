import React, { useState } from 'react'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { EventTable } from '../components/events/EventTable'
import { EventDetails } from '../components/events/EventDetails'
import { Button } from '../components/ui/Button'
import { Inbox, Radio, Shield, Zap } from 'lucide-react'

export function Events() {
  const { events, isSimulating, toggleSimulation } = useLiveEvents()
  const [selectedEvent, setSelectedEvent] = useState(events[0])

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Inbox className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Event Monitoring & Collection
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Raw security telemetry ingestion, schema normalization, and automated pre-filtering
          </p>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={isSimulating ? 'glow' : 'secondary'}
            size="sm"
            onClick={toggleSimulation}
            className="flex items-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{isSimulating ? 'Live Ingest: Running' : 'Simulation: Paused'}</span>
          </Button>

          <span className="text-xs font-mono text-purple-400 bg-[#0d121c] border border-[#1e2736] px-3 py-1.5 rounded-lg hidden sm:block">
            Buffer: {events.length} Events
          </span>
        </div>
      </div>

      {/* Main Grid: Event Table + Event Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EventTable
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />
        </div>

        <div className="lg:col-span-1">
          <EventDetails
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        </div>
      </div>
    </div>
  )
}
