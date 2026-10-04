import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Sidebar } from './components/layout/Sidebar';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { AlertsPage } from './pages/AlertsPage';
import { AlertDetailPage } from './pages/AlertDetailPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import ThreatHuntingPage from './pages/ThreatHuntingPage';
import DetectionRulesPage from './pages/DetectionRulesPage';
import DetectionCoveragePage from './pages/DetectionCoveragePage';
import SimulationsPage from './pages/SimulationsPage';
import BlueTeamTrainingPage from './pages/BlueTeamTrainingPage';
import IOCVaultPage from './pages/IOCVaultPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SettingsPage from './pages/SettingsPage';

// Protected layout wrapper
function AppLayout() {
  const { isAuthenticated } = useAuth();
  const { latestAlert, clearLatestAlert } = useNotifications();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar now as Top Navbar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Real-time WebSocket Alert Toast Banner */}
        {latestAlert && (
          <div className="bg-rose-950/90 border-b border-rose-600 px-6 py-2.5 flex items-center justify-between text-rose-200 text-xs animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>
                <strong>CRITICAL ALERT TRIGGERED:</strong> {latestAlert.title || 'Suspicious detection match'} on host <code className="font-mono text-white">{latestAlert.affected_hosts?.[0] || 'lab-linux-01'}</code>
              </span>
            </div>
            <button
              onClick={clearLatestAlert}
              className="text-rose-400 hover:text-white text-xs font-semibold uppercase px-2 py-0.5 rounded bg-rose-900/60"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/alerts/:id" element={<AlertDetailPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/investigation/:id" element={<IncidentDetailPage />} />
            <Route path="/hunting" element={<ThreatHuntingPage />} />
            <Route path="/detections" element={<DetectionRulesPage />} />
            <Route path="/coverage" element={<DetectionCoveragePage />} />
            <Route path="/simulations" element={<SimulationsPage />} />
            <Route path="/training" element={<BlueTeamTrainingPage />} />
            <Route path="/iocs" element={<IOCVaultPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit" element={<AuditLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

