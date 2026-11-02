import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Dashboard } from './pages/Dashboard'
import { Events } from './pages/Events'
import { Correlation } from './pages/Correlation'
import { AIAnalysis } from './pages/AIAnalysis'
import { Incidents } from './pages/Incidents'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="correlation" element={<Correlation />} />
          <Route path="ai-analysis" element={<AIAnalysis />} />
          <Route path="incidents" element={<Incidents />} />
          {/* Fallback alias routes */}
          <Route path="alerts" element={<Navigate to="/events" replace />} />
          <Route path="threats" element={<Navigate to="/correlation" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
