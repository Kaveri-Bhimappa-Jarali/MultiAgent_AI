import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Layout } from './components/layout/Layout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { Ingestion } from './pages/Ingestion';
import { Detections } from './pages/Detections';
import { Agents } from './pages/Agents';
import { Incidents } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { Responses } from './pages/Responses';
import { ThreatIntel } from './pages/ThreatIntel';
import { EvaluationLab } from './pages/EvaluationLab';
import { DemoLab } from './pages/DemoLab';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { IngestionHealth } from './pages/IngestionHealth';
import { VirtualLab } from './pages/VirtualLab';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center text-softwhite font-mono text-xs">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="ingestion" element={<Ingestion />} />
              <Route path="health-monitor" element={<IngestionHealth />} />
              <Route path="detections" element={<Detections />} />
              <Route path="agents" element={<Agents />} />
              <Route path="incidents" element={<Incidents />} />
              <Route path="incidents/:incidentId" element={<IncidentDetail />} />
              <Route path="responses" element={<Responses />} />
              <Route path="intelligence" element={<ThreatIntel />} />
              <Route path="evaluation" element={<EvaluationLab />} />
              <Route path="demo" element={<DemoLab />} />
              <Route path="virtual-lab" element={<VirtualLab />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;
