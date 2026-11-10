import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Dashboard } from './pages/Dashboard'
import { Events } from './pages/Events'
import { Correlation } from './pages/Correlation'
import { AIAnalysis } from './pages/AIAnalysis'
import { Incidents } from './pages/Incidents'
import { IncidentDetail } from './pages/IncidentDetail'
import { Agents } from './pages/Agents'
import { Detections } from './pages/Detections'
import { Responses } from './pages/Responses'
import { ThreatIntel } from './pages/ThreatIntel'
import { AttackSimulation } from './pages/AttackSimulation'
import { VirtualLab } from './pages/VirtualLab'
import { DemoLab } from './pages/DemoLab'
import { EvaluationLab } from './pages/EvaluationLab'
import { IngestionHealth } from './pages/IngestionHealth'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { PipelinePage } from './pages/Pipeline'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dedicated Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout with all SOC Operations */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="correlation" element={<Correlation />} />
          <Route path="ai-analysis" element={<AIAnalysis />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="incidents/:incidentId" element={<IncidentDetail />} />

          {/* Newly integrated advanced features from frontend */}
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="agents" element={<Agents />} />
          <Route path="detections" element={<Detections />} />
          <Route path="responses" element={<Responses />} />
          <Route path="intelligence" element={<ThreatIntel />} />
          <Route path="simulation" element={<AttackSimulation />} />
          <Route path="virtual-lab" element={<VirtualLab />} />
          <Route path="demo" element={<DemoLab />} />
          <Route path="evaluation" element={<EvaluationLab />} />
          <Route path="health-monitor" element={<IngestionHealth />} />
          <Route path="ingestion" element={<IngestionHealth />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />

          {/* Fallback alias routes */}
          <Route path="alerts" element={<Navigate to="/events" replace />} />
          <Route path="threats" element={<Navigate to="/correlation" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
